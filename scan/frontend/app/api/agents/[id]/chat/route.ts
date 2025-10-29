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
      'SELECT role, content FROM s402_agent_chats WHERE agent_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT 20',
      [agentId, session_id]
    );

    const conversationHistory = historyResult.rows.map(row => ({
      role: row.role === 'user' ? 'user' : 'assistant',
      content: row.content,
    }));

    const toolsResult = await pool.query(
      'SELECT id, name, description, input_schema, cost_usd FROM s402_tools WHERE is_active = true'
    );

    const tools = toolsResult.rows.map(tool => ({
      name: tool.id,
      description: `${tool.description} (Cost: $${tool.cost_usd})`,
      input_schema: tool.input_schema,
    }));

    const systemPrompt = `You are an s402-powered AI agent named "${agent.name}". 
${agent.description}

You have access to the following paid API tools. Each tool requires a 402 micropayment to use:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

When you need to call a tool:
1. Request the tool by using tool_use
2. The user will be prompted to make a 402 payment
3. After payment is confirmed, you'll receive the tool's response
4. Use the data to answer the user's question

Focus on providing valuable insights using s402 oracle data. Be concise and helpful.`;

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationHistory as any,
      tools: tools as any,
    });

    // Check for tool_use in ANY content block (Claude can return text + tool_use)
    const toolUseBlock = response.content.find((c: any) => c.type === 'tool_use');
    const textContent = response.content.find((c: any) => c.type === 'text');
    const textReply = textContent ? (textContent as any).text : '';

    if (toolUseBlock) {
      const toolCall = toolUseBlock as any;

      const toolResult = await pool.query(
        'SELECT * FROM s402_tools WHERE id = $1',
        [toolCall.name]
      );

      if (toolResult.rows.length === 0) {
        return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
      }

      const tool = toolResult.rows[0];

      // Store the text reply if present, then store the tool call
      if (textReply) {
        await pool.query(
          'INSERT INTO s402_agent_chats (agent_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
          [agentId, session_id, 'assistant', textReply]
        );
      }

      await pool.query(
        'INSERT INTO s402_agent_chats (agent_id, session_id, role, content, tool_calls) VALUES ($1, $2, $3, $4, $5)',
        [agentId, session_id, 'assistant', '', JSON.stringify([toolCall])]
      );

      return NextResponse.json({
        type: 'payment_required',
        assistant_message: textReply || null,
        tool: {
          id: tool.id,
          name: tool.name,
          cost_usd: parseFloat(tool.cost_usd),
          provider_address: tool.provider_address || '0x0000000000000000000000000000000000000000',
          input: toolCall.input,
        },
        tool_call_id: toolCall.id,
      });
    }

    const reply = textReply || 'I apologize, but I could not generate a response.';

    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
      [agentId, session_id, 'assistant', reply]
    );

    // Update session timestamp
    await pool.query(
      'UPDATE s402_chat_sessions SET updated_at = NOW() WHERE id = $1',
      [session_id]
    );

    await pool.query(
      'UPDATE s402_agents SET query_count = query_count + 1, last_active_at = NOW() WHERE id = $1',
      [agentId]
    );

    return NextResponse.json({ type: 'message', content: reply });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
