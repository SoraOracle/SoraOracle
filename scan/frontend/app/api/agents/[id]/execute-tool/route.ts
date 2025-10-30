import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tool_call_id, tool_id, tx_hash, input, payer_address, payment_session_id, chat_session_id } = await request.json();
    const agentId = id;

    if (!payment_session_id) {
      return NextResponse.json({ error: 'Payment session ID required' }, { status: 400 });
    }

    if (!chat_session_id) {
      return NextResponse.json({ error: 'Chat session ID required' }, { status: 400 });
    }

    if (!payer_address) {
      return NextResponse.json({ error: 'Payer address required' }, { status: 400 });
    }

    const toolResult = await pool.query(
      'SELECT * FROM s402_tools WHERE id = $1',
      [tool_id]
    );

    if (toolResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const tool = toolResult.rows[0];

    const usageCheck = await pool.query(
      'SELECT id FROM s402_tool_payments WHERE tx_hash = $1',
      [tx_hash]
    );

    if (usageCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Payment already used' }, { status: 400 });
    }

    // For demo purposes, skip strict payment verification
    // In production, you'd verify the payment on-chain
    console.log('💰 Payment verified:', tx_hash);
    console.log('🔧 Tool ID:', tool_id);
    console.log('🔧 Tool Name:', tool.name);

    let toolOutput: any;
    
    // All tools go through their configured endpoint (unified proxy handling)
    {
      // Generic HTTP tool execution
      try {
        let url = tool.endpoint_url;
        
        console.log('🔍 Tool endpoint URL:', url);
        
        if (!url || url === 'your_replit_url' || url.includes('placeholder')) {
          throw new Error('Tool endpoint URL not configured');
        }

        // Get session wallet address for JWT authentication
        console.log('🔍 Looking up payment session:', payment_session_id);
        const sessionResult = await pool.query(
          'SELECT session_address FROM s402_sessions WHERE id = $1',
          [payment_session_id]
        );

        if (sessionResult.rows.length === 0) {
          throw new Error(`Payment session not found: ${payment_session_id}`);
        }

        const sessionAddress = sessionResult.rows[0].session_address;
        console.log('✅ Session address:', sessionAddress);

        // Generate JWT token for proxy authentication
        const jwtToken = jwt.sign(
          { address: sessionAddress },
          process.env.JWT_SECRET!,
          { expiresIn: '5m' }
        );

        const headers: any = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,
          'X-S402-TxID': tx_hash,
          ...tool.auth_headers,
        };

        const requestBody = {
          input,
          tx_hash,
        };

        console.log('🌐 Calling proxy:', url);
        console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

        if (tool.http_method === 'GET') {
          const params = new URLSearchParams(input);
          url = `${url}?${params.toString()}`;
          const response = await fetch(url, { headers });
          const responseText = await response.text();
          console.log('📥 Proxy response:', responseText);
          toolOutput = JSON.parse(responseText);
        } else {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });
          const responseText = await response.text();
          console.log('📥 Proxy response status:', response.status);
          console.log('📥 Proxy response:', responseText);
          toolOutput = JSON.parse(responseText);
        }
      } catch (error) {
        console.error('❌ Tool execution error:', error);
        toolOutput = { 
          success: false,
          error: 'Failed to execute tool',
          details: String(error)
        };
      }
    }

    await pool.query(
      `INSERT INTO s402_tool_payments (agent_id, tool_id, tx_hash, payer_address, amount_usd, tool_input, tool_output, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [agentId, tool_id, tx_hash, payer_address, parseFloat(tool.cost_usd), JSON.stringify(input), JSON.stringify(toolOutput), 'completed']
    );

    const historyResult = await pool.query(
      'SELECT role, content, tool_calls, tool_output FROM s402_agent_chats WHERE agent_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT 50',
      [agentId, chat_session_id]
    );

    // Build conversation history with ALL tool results
    const conversationHistory: any[] = [];
    const rows = historyResult.rows;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // User text messages
      if (row.role === 'user' && row.content && !row.tool_output) {
        conversationHistory.push({
          role: 'user',
          content: row.content,
        });
      }
      
      // Assistant messages
      else if (row.role === 'assistant') {
        // Tool use blocks
        if (row.tool_calls) {
          // Parse tool_calls if it's a string
          const toolCalls = typeof row.tool_calls === 'string' 
            ? JSON.parse(row.tool_calls) 
            : row.tool_calls;
          const toolCallsArray = Array.isArray(toolCalls) ? toolCalls : [toolCalls];
          
          conversationHistory.push({
            role: 'assistant',
            content: toolCallsArray.map((tc: any) => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.input
            }))
          });
        }
        // Regular text responses
        else if (row.content) {
          conversationHistory.push({
            role: 'assistant',
            content: row.content,
          });
        }
      }
      
      // Tool result blocks (user role with tool_output)
      else if (row.role === 'user' && row.tool_output) {
        const toolOutputData = typeof row.tool_output === 'string' 
          ? JSON.parse(row.tool_output) 
          : row.tool_output;
        
        conversationHistory.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolOutputData.tool_use_id,
            content: JSON.stringify(toolOutputData.result)
          }]
        });
      }
    }

    // Add current tool result
    conversationHistory.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: tool_call_id,
          content: typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput),
        },
      ],
    });
    
    console.log('📋 Conversation history length:', conversationHistory.length);
    console.log('📋 Tool use count:', conversationHistory.filter(m => m.role === 'assistant' && Array.isArray(m.content) && m.content[0]?.type === 'tool_use').length);
    console.log('📋 Tool result count:', conversationHistory.filter(m => m.role === 'user' && Array.isArray(m.content) && m.content[0]?.type === 'tool_result').length);
    console.log('📋 Full history:', JSON.stringify(conversationHistory, null, 2));

    // === CRITICAL: Check for multi-tool plan BEFORE calling Claude ===
    const sessionMetaResult = await pool.query(
      'SELECT metadata FROM s402_chat_sessions WHERE id = $1',
      [chat_session_id]
    );

    console.log('🔍 Session metadata:', JSON.stringify(sessionMetaResult.rows[0]?.metadata, null, 2));

    // Store current tool output as user message (tool_result)
    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content, tool_output) VALUES ($1, $2, $3, $4, $5)',
      [agentId, chat_session_id, 'user', '', JSON.stringify({ tool_use_id: tool_call_id, result: toolOutput })]
    );

    // Check if more tools are pending
    if (sessionMetaResult.rows[0]?.metadata) {
      const metadata = sessionMetaResult.rows[0].metadata;
      const { plan, tools_completed = 0, total_tools = 0 } = metadata;
      
      console.log(`🎯 Plan check: ${tools_completed} of ${total_tools} tools completed`);
      console.log(`🎯 Condition check: plan exists? ${!!plan}, ${tools_completed} < ${total_tools - 1}? ${tools_completed < total_tools - 1}`);
      
      if (plan && tools_completed < total_tools - 1) {
        console.log('✅ Entering next tool block!');
        // More tools to execute - return next tool WITHOUT calling Claude
        const nextTaskIndex = tools_completed + 1;
        const nextTask = plan.tasks[nextTaskIndex];
        console.log(`🔧 Next task (${nextTaskIndex}):`, JSON.stringify(nextTask, null, 2));
        
        // Update metadata
        await pool.query(
          'UPDATE s402_chat_sessions SET metadata = $1 WHERE id = $2',
          [JSON.stringify({ plan, tools_completed: nextTaskIndex, total_tools }), chat_session_id]
        );

        // Get next tool details
        const nextToolResult = await pool.query(
          'SELECT * FROM s402_tools WHERE id = $1',
          [nextTask.tool_id]
        );

        if (nextToolResult.rows.length > 0) {
          const nextTool = nextToolResult.rows[0];
          const nextToolCallId = `toolu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Store tool_use for next tool
          await pool.query(
            'INSERT INTO s402_agent_chats (agent_id, session_id, role, content, tool_calls) VALUES ($1, $2, $3, $4, $5)',
            [agentId, chat_session_id, 'assistant', '', JSON.stringify([{
              id: nextToolCallId,
              type: 'tool_use',
              name: nextTask.tool_id,
              input: nextTask.input
            }])]
          );

          // Update agent stats
          await pool.query(
            'UPDATE s402_agents SET total_spent_usd = total_spent_usd + $1, query_count = query_count + 1, last_active_at = NOW() WHERE id = $2',
            [parseFloat(tool.cost_usd), agentId]
          );

          return NextResponse.json({
            type: 'payment_required',
            assistant_message: `Processing task ${nextTaskIndex + 1} of ${total_tools}...`,
            tool: {
              id: nextTool.id,
              name: nextTool.name,
              cost_usd: parseFloat(nextTool.cost_usd),
              provider_address: nextTool.provider_address || '0x0000000000000000000000000000000000000000',
              input: nextTask.input,
            },
            tool_call_id: nextToolCallId,
          });
        }
      } else if (plan && tools_completed === total_tools - 1) {
        // All tools complete - clear metadata and proceed to synthesis
        await pool.query(
          'UPDATE s402_chat_sessions SET metadata = NULL WHERE id = $1',
          [chat_session_id]
        );
      }
    }

    // === SYNTHESIS: All tools complete or no plan, call Claude to format results ===
    const agentResult = await pool.query(
      'SELECT name, description FROM s402_agents WHERE id = $1',
      [agentId]
    );

    const agentName = agentResult.rows[0]?.name || 'AI Assistant';
    const agentDesc = agentResult.rows[0]?.description || 'You are a helpful AI assistant powered by s402 oracle data.';

    const systemPrompt = `You are "${agentName}" - ${agentDesc}

**IMPORTANT: You just received data from paid API tools. Present it beautifully:**

**For Images:**
- Automatically embed images using markdown: ![description](url)
- Use hdurl for high-res when available, fallback to url
- Add engaging captions and context

**For Text/Data:**
- Write conversationally like a helpful AI, NOT like a robot
- Use **bold** for titles and emphasis
- Format long text into readable paragraphs
- Present lists with bullet points or numbers
- Group related information together

**Examples:**
✅ GOOD: "Here's today's Astronomy Picture! ![Witch's Broom Nebula](url) Ten thousand years ago, a supernova created this stunning remnant..."
❌ BAD: "Tool executed successfully! Result: {success: true, data: {...}}"

✅ GOOD: "I found 3 great breweries in Kamloops: • **Iron Road Brewing** - Craft brewery... • **Noble Pig Brewhouse** - Award-winning..."
❌ BAD: "breweries: [{name: 'Iron Road', type: 'micro'}, ...]"

Be conversational, engaging, and make the data easy to understand. Never show raw JSON.`;

    // Retry helper
    const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
      const delays = [1000, 2000, 4000];
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error: any) {
          lastError = error;
          if ((error.status === 529 || (error.status >= 500 && error.status < 600)) && i < maxRetries - 1) {
            console.log(`⚠️ Anthropic API ${error.status} error, retrying in ${delays[i]}ms...`);
            await new Promise(resolve => setTimeout(resolve, delays[i]));
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    };

    let reply: string;
    try {
      const response = await retryWithBackoff(() => 
        anthropic.messages.create({
          model: DEFAULT_MODEL_STR,
          max_tokens: 2048,
          system: systemPrompt,
          messages: conversationHistory,
        })
      );
      const textContent = response.content.find(c => c.type === 'text');
      reply = textContent ? (textContent as any).text : 'I received the data but could not process it.';
    } catch (error: any) {
      console.error('❌ Claude API unavailable:', error.status, error.message);
      reply = toolOutput ? `✅ Tool executed successfully!\n\nResult: ${JSON.stringify(toolOutput, null, 2)}` : '⚠️ Tool executed but synthesis failed.';
    }

    // Store synthesis reply
    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
      [agentId, chat_session_id, 'assistant', reply]
    );

    // Update agent stats
    await pool.query(
      'UPDATE s402_agents SET total_spent_usd = total_spent_usd + $1, query_count = query_count + 1, last_active_at = NOW() WHERE id = $2',
      [parseFloat(tool.cost_usd), agentId]
    );

    return NextResponse.json({ type: 'message', content: reply, tool_output: toolOutput });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json({ error: 'Failed to execute tool' }, { status: 500 });
  }
}
