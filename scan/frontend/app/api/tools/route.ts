import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT id, name, description, category, COALESCE(icon_url, icon) as icon, cost_usd
      FROM s402_tools
      WHERE is_active = true
      ORDER BY name ASC
    `);

    const tools = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      icon: row.icon || '🔧',
      costUSD: parseFloat(row.cost_usd),
    }));

    return NextResponse.json(tools);
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}
