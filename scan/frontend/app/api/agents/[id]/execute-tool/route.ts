import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tool_call_id, tool_id, tx_hash, input, payer_address, session_id } = await request.json();
    const agentId = id;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
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
    console.log('Payment verified:', tx_hash);

    let toolOutput: any;
    
    // Handle specific tool types
    if (tool_id === 'replicate_seedream4') {
      // Use Replicate for image generation
      try {
        const Replicate = require('replicate');
        const replicate = new Replicate({
          auth: process.env.REPLICATE_API_TOKEN,
        });

        console.log('🎨 Generating image with prompt:', input.prompt);
        
        const output = await replicate.run(
          "lucataco/seedream-4",
          {
            input: {
              prompt: input.prompt,
              aspect_ratio: input.aspect_ratio || "1:1",
              num_outputs: 1,
            }
          }
        );

        toolOutput = {
          success: true,
          images: Array.isArray(output) ? output : [output],
          prompt: input.prompt,
          aspect_ratio: input.aspect_ratio || "1:1",
        };
        
        console.log('✅ Image generated successfully:', toolOutput.images[0]);
      } catch (error) {
        console.error('❌ Replicate API error:', error);
        toolOutput = { 
          success: false, 
          error: 'Failed to generate image',
          details: String(error),
        };
      }
    } else {
      // Generic HTTP tool execution
      try {
        let url = tool.endpoint_url;
        const headers: any = {
          'Content-Type': 'application/json',
          'X-S402-TxID': tx_hash,
          ...tool.auth_headers,
        };

        if (tool.http_method === 'GET') {
          const params = new URLSearchParams(input);
          url = `${url}?${params.toString()}`;
          const response = await fetch(url, { headers });
          toolOutput = await response.json();
        } else {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(input),
          });
          toolOutput = await response.json();
        }
      } catch (error) {
        console.error('Tool execution error:', error);
        toolOutput = { error: 'Failed to execute tool' };
      }
    }

    await pool.query(
      `INSERT INTO s402_tool_payments (agent_id, tool_id, tx_hash, payer_address, amount_usd, tool_input, tool_output, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [agentId, tool_id, tx_hash, payer_address, parseFloat(tool.cost_usd), JSON.stringify(input), JSON.stringify(toolOutput), 'completed']
    );

    const historyResult = await pool.query(
      'SELECT role, content, tool_calls FROM s402_agent_chats WHERE agent_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT 20',
      [agentId, session_id]
    );

    const conversationHistory: any[] = [];
    
    for (const row of historyResult.rows) {
      if (row.tool_calls) {
        const toolCallsArray = Array.isArray(row.tool_calls) ? row.tool_calls : [row.tool_calls];
        conversationHistory.push({
          role: 'assistant',
          content: toolCallsArray,
        });
      } else if (row.content) {
        conversationHistory.push({
          role: row.role === 'user' ? 'user' : 'assistant',
          content: row.content,
        });
      }
    }

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

    const agentResult = await pool.query(
      'SELECT description FROM s402_agents WHERE id = $1',
      [agentId]
    );

    const systemPrompt = agentResult.rows[0]?.description || 'You are a helpful AI assistant powered by s402 oracle data.';

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationHistory,
    });

    const textContent = response.content.find(c => c.type === 'text');
    const reply = textContent ? (textContent as any).text : 'I received the data but could not process it.';

    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content) VALUES ($1, $2, $3, $4)',
      [agentId, session_id, 'assistant', reply]
    );

    await pool.query(
      'UPDATE s402_agents SET total_spent_usd = total_spent_usd + $1 WHERE id = $2',
      [parseFloat(tool.cost_usd), agentId]
    );

    return NextResponse.json({ type: 'message', content: reply, tool_output: toolOutput });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json({ error: 'Failed to execute tool' }, { status: 500 });
  }
}
