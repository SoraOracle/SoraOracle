import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT id, title, created_at, updated_at 
       FROM s402_chat_sessions 
       WHERE agent_id = $1 AND LOWER(user_address) = LOWER($2)
       ORDER BY updated_at DESC`,
      [id, userAddress]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user_address } = await request.json();

    if (!user_address) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const sessionId = '0x' + randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO s402_chat_sessions (id, agent_id, user_address, title)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, id, user_address, 'New Chat']
    );

    return NextResponse.json({
      id: sessionId,
      agent_id: id,
      user_address,
      title: 'New Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
