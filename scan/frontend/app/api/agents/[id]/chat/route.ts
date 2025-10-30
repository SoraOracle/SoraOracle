import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await pool.query(
      'SELECT * FROM s402_agent_chats WHERE agent_id = $1 ORDER BY created_at ASC',
      [id]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { message, payment_proof, session_id } = await request.json();
    const agentId = id;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const agentResult = await pool.query(
      'SELECT * FROM s402_agents WHERE id = $1',
      [agentId]
    );

    if (agentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agentResult.rows[0];

    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
      [agentId, session_id, 'user', message]
    );

    const historyResult = await pool.query(
      'SELECT role, content, tool_calls, tool_output FROM s402_agent_chats WHERE agent_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT 20',
      [agentId, session_id]
    );

    // Build conversation history with proper tool_use/tool_result pairing
    const conversationHistory: any[] = [];
    const rows = historyResult.rows;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const role = row.role === 'user' ? 'user' : 'assistant';
      
      // Include text messages
      if (row.content && !row.tool_calls && !row.tool_output) {
        conversationHistory.push({
          role,
          content: row.content,
        });
      }
      
      // Include tool_use blocks ONLY if followed by tool_result
      if (row.tool_calls && row.role === 'assistant') {
        // Check if next message is a tool_result
        const nextRow = rows[i + 1];
        const hasMatchingResult = nextRow && nextRow.role === 'user' && nextRow.tool_output;
        
        if (hasMatchingResult) {
          const toolCalls = typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls;
          conversationHistory.push({
            role: 'assistant',
            content: toolCalls.map((tc: any) => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.input
            }))
          });
        }
        // Skip orphaned tool_use blocks
      }
      
      // Include tool_result blocks ONLY if preceded by tool_use
      if (row.tool_output && row.role === 'user') {
        const prevRow = rows[i - 1];
        const hasMatchingToolUse = prevRow && prevRow.role === 'assistant' && prevRow.tool_calls;
        
        if (hasMatchingToolUse) {
          const toolOutput = typeof row.tool_output === 'string' ? JSON.parse(row.tool_output) : row.tool_output;
          conversationHistory.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolOutput.tool_use_id,
              content: JSON.stringify(toolOutput.result)
            }]
          });
        }
        // Skip orphaned tool_result blocks
      }
    }

    const toolsResult = await pool.query(
      'SELECT id, name, description, input_schema, cost_usd FROM s402_tools WHERE is_active = true'
    );

    const tools = toolsResult.rows.map(tool => ({
      name: tool.id,
      description: `${tool.description} (Cost: $${tool.cost_usd})`,
      input_schema: tool.input_schema,
    }));

    // Retry helper with exponential backoff for transient errors
    const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
      const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
      let lastError;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error: any) {
          lastError = error;
          const is529 = error.status === 529;
          const isTransient = error.status >= 500 && error.status < 600;
          
          // Only retry on 529 or transient server errors
          if ((is529 || isTransient) && i < maxRetries - 1) {
            console.log(`⚠️ Anthropic API ${error.status} error, retrying in ${delays[i]}ms (attempt ${i + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delays[i]));
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    };

    // === PHASE 1: PLANNER ===
    // Claude analyzes the request and returns a structured plan
    const plannerPrompt = `You are a task planner for "${agent.name}".

Available Tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Analyze the user's request and create a plan. Return ONLY valid JSON (no markdown, no explanation):

{
  "summary": "brief description of what you'll do",
  "tasks": [
    {
      "tool_id": "tool_name",
      "input": {...},
      "reason": "why this tool is needed"
    }
  ]
}

If no tools are needed, return: {"summary": "response", "tasks": []}`;

    const plannerResponse = await retryWithBackoff(() =>
      anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1024,
        system: plannerPrompt,
        messages: conversationHistory as any,
      })
    );

    const planText = plannerResponse.content.find((c: any) => c.type === 'text');
    let plan;
    
    try {
      const planContent = (planText as any).text.trim();
      // Remove markdown code blocks if present
      const jsonMatch = planContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || planContent.match(/(\{[\s\S]*\})/);
      plan = JSON.parse(jsonMatch ? jsonMatch[1] : planContent);
    } catch (e) {
      console.error('Failed to parse planner response:', e);
      // Fallback to simple response
      plan = { summary: 'I can help with that.', tasks: [] };
    }

    console.log('📋 Plan:', JSON.stringify(plan, null, 2));

    // If no tools needed, return simple text response
    if (!plan.tasks || plan.tasks.length === 0) {
      await pool.query(
        'INSERT INTO s402_agent_chats (agent_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
        [agentId, session_id, 'assistant', plan.summary || 'How can I help you?']
      );
      
      return NextResponse.json({
        type: 'message',
        content: plan.summary || 'How can I help you?'
      });
    }

    // === PHASE 2: EXECUTION (Simplified - One tool at a time) ===
    // Return first tool for payment (frontend will handle execution)
    // When tool completes, frontend calls this endpoint again
    // We detect completion and trigger synthesis
    
    const firstTask = plan.tasks[0];
    const toolResult = await pool.query(
      'SELECT * FROM s402_tools WHERE id = $1',
      [firstTask.tool_id]
    );

    if (toolResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const tool = toolResult.rows[0];

    // Generate tool_call_id ONCE and store it
    const toolCallId = `toolu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the plan and tool request
    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content, tool_calls) VALUES ($1, $2, $3, $4, $5)',
      [agentId, session_id, 'assistant', '', JSON.stringify([{
        id: toolCallId,
        type: 'tool_use',
        name: firstTask.tool_id,
        input: firstTask.input
      }])]
    );

    // Store plan metadata separately for synthesis later
    await pool.query(
      'UPDATE s402_chat_sessions SET metadata = $1 WHERE id = $2',
      [JSON.stringify({ plan, tools_completed: 0, total_tools: plan.tasks.length }), session_id]
    );

    return NextResponse.json({
      type: 'payment_required',
      assistant_message: plan.summary,
      tool: {
        id: tool.id,
        name: tool.name,
        cost_usd: parseFloat(tool.cost_usd),
        provider_address: tool.provider_address || '0x0000000000000000000000000000000000000000',
        input: firstTask.input,
      },
      tool_call_id: toolCallId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
