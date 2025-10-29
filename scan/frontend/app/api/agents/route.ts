import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set - cannot start server');
}

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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { name, description, data_sources } = await request.json();
    const ownerAddress = decoded.address;

    const agentId = '0x' + randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO s402_agents (id, name, description, owner_address, data_sources)
       VALUES ($1, $2, $3, $4, $5)`,
      [agentId, name, description, ownerAddress, JSON.stringify(data_sources)]
    );

    return NextResponse.json({ id: agentId, name, description, owner_address: ownerAddress });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
