import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const result = await pool.query(
      `SELECT role, content, tool_output, created_at 
       FROM s402_agent_chats 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
