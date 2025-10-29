import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { tool_call_id, tool_id, tx_hash, input } = await request.json();
    const agentId = params.id;

    const paymentResult = await pool.query(
      'SELECT * FROM s402_payments WHERE tx_hash = $1',
      [tx_hash]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const toolResult = await pool.query(
      'SELECT * FROM s402_tools WHERE id = $1',
      [tool_id]
    );

    if (toolResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const tool = toolResult.rows[0];

    let url = tool.endpoint_url;
    const headers: any = {
      'Content-Type': 'application/json',
      'X-S402-TxID': tx_hash,
      ...tool.auth_headers,
    };

    let toolOutput;
    try {
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

    await pool.query(
      `INSERT INTO s402_tool_payments (agent_id, tool_id, tx_hash, payer_address, amount_usd, tool_input, tool_output, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [agentId, tool_id, tx_hash, paymentResult.rows[0].from_address, parseFloat(tool.cost_usd), JSON.stringify(input), JSON.stringify(toolOutput), 'completed']
    );

    const historyResult = await pool.query(
      'SELECT role, content, tool_calls FROM s402_agent_chats WHERE agent_id = $1 ORDER BY created_at ASC LIMIT 20',
      [agentId]
    );

    const conversationHistory = historyResult.rows.map(row => {
      if (row.tool_calls) {
        return {
          role: 'assistant',
          content: row.tool_calls,
        };
      }
      return {
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.content,
      };
    });

    conversationHistory.push({
      role: 'user' as const,
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: tool_call_id,
          content: JSON.stringify(toolOutput),
        },
      ],
    });

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 2048,
      messages: conversationHistory as any,
    });

    const textContent = response.content.find(c => c.type === 'text');
    const reply = textContent ? (textContent as any).text : 'I received the data but could not process it.';

    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, role, content) VALUES ($1, $2, $3)',
      [agentId, 'assistant', reply]
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
