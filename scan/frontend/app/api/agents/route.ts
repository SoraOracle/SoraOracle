import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');

  try {
    let query = 'SELECT * FROM s402_agents';
    let params: any[] = [];

    if (owner) {
      query += ' WHERE LOWER(owner_address) = LOWER($1)';
      params = [owner];
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, owner_address, data_sources } = await request.json();

    const agentId = '0x' + randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO s402_agents (id, name, description, owner_address, data_sources)
       VALUES ($1, $2, $3, $4, $5)`,
      [agentId, name, description, owner_address, JSON.stringify(data_sources)]
    );

    return NextResponse.json({ id: agentId, name, description, owner_address });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
