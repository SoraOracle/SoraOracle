import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT 
        owner_address as address,
        COUNT(*) as agent_count,
        SUM(query_count) as total_queries
      FROM s402_agents
      WHERE is_public = TRUE
      GROUP BY owner_address
      HAVING COUNT(*) > 0
      ORDER BY agent_count DESC, total_queries DESC
      LIMIT 20`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch top composers:', error);
    return NextResponse.json({ error: 'Failed to fetch top composers' }, { status: 500 });
  }
}
