import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ isAdmin: false });
    }

    const result = await pool.query(
      'SELECT address FROM s402_admin_wallets WHERE LOWER(address) = LOWER($1) AND is_active = true',
      [address]
    );

    return NextResponse.json({ isAdmin: result.rows.length > 0 });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
