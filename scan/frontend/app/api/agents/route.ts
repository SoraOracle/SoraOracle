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
  const authHeader = request.headers.get('Authorization');
  
  let authenticatedAddress: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded: any = jwt.verify(token, JWT_SECRET);
      authenticatedAddress = decoded.address?.toLowerCase();
    } catch (error) {
      // Invalid token, continue without authentication
    }
  }

  try {
    let query = 'SELECT * FROM s402_agents';
    let params: any[] = [];

    if (owner) {
      const ownerLower = owner.toLowerCase();
      // If querying specific owner, check if requester is authenticated as that owner
      if (authenticatedAddress === ownerLower) {
        // Owner viewing their own agents - show all (public and private)
        query += ' WHERE LOWER(owner_address) = $1';
        params = [ownerLower];
      } else {
        // Non-owner viewing someone else's agents - only show public ones
        query += ' WHERE LOWER(owner_address) = $1 AND is_public = TRUE';
        params = [ownerLower];
      }
    } else {
      // General listing - only show public agents or agents owned by the authenticated user
      if (authenticatedAddress) {
        query += ' WHERE (is_public = TRUE OR LOWER(owner_address) = $1)';
        params = [authenticatedAddress];
      } else {
        query += ' WHERE is_public = TRUE';
      }
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

    const { name, description, data_sources, is_public, icon } = await request.json();
    const ownerAddress = decoded.address;

    const agentId = '0x' + randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO s402_agents (id, name, description, owner_address, data_sources, is_public, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [agentId, name, description, ownerAddress, JSON.stringify(data_sources), is_public ?? true, icon ?? '🤖']
    );

    return NextResponse.json({ id: agentId, name, description, owner_address: ownerAddress, is_public, icon });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
