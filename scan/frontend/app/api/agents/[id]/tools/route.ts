import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get agent's tools
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT at.tool_id, t.name as tool_name, t.description as tool_description, t.cost_usd
       FROM s402_agent_tools at
       JOIN s402_tools t ON at.tool_id = t.id
       WHERE at.agent_id = $1
       ORDER BY t.name`,
      [id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to get agent tools:', error);
    return NextResponse.json({ error: 'Failed to get tools' }, { status: 500 });
  }
}

// POST - Add tool to agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tool_id } = await request.json();

    // Check if tool already exists
    const existing = await pool.query(
      'SELECT 1 FROM s402_agent_tools WHERE agent_id = $1 AND tool_id = $2',
      [id, tool_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Tool already added' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO s402_agent_tools (agent_id, tool_id) VALUES ($1, $2)',
      [id, tool_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add tool:', error);
    return NextResponse.json({ error: 'Failed to add tool' }, { status: 500 });
  }
}

// DELETE - Remove tool from agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tool_id } = await request.json();

    await pool.query(
      'DELETE FROM s402_agent_tools WHERE agent_id = $1 AND tool_id = $2',
      [id, tool_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove tool:', error);
    return NextResponse.json({ error: 'Failed to remove tool' }, { status: 500 });
  }
}
