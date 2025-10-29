import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        t.name,
        t.category,
        t.cost_usd,
        COUNT(p.id) as query_count,
        SUM(p.value_usd) as total_volume
      FROM s402_tools t
      LEFT JOIN s402_payments p ON LOWER(p.to_address) = LOWER(t.provider_address)
        AND p.block_timestamp >= NOW() - INTERVAL '24 hours'
      WHERE t.is_active = true
      GROUP BY t.id, t.name, t.category, t.cost_usd
      ORDER BY query_count DESC, total_volume DESC
      LIMIT 5
    `);

    const services = result.rows.map(row => ({
      name: row.name,
      category: row.category,
      queries: parseInt(row.query_count) || 0,
      volume: parseFloat(row.total_volume) || 0,
      avgCost: parseFloat(row.cost_usd),
      reliability: 99.9,
    }));

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
