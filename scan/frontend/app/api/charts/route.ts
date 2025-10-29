import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        DATE_TRUNC('hour', block_timestamp) as hour,
        COUNT(*) as txn_count,
        COALESCE(SUM(value_usd), 0) as volume
      FROM s402_payments
      WHERE block_timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC
    `);

    const chartData = result.rows.map(row => ({
      time: new Date(row.hour).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      txns: parseInt(row.txn_count),
      volume: parseFloat(row.volume),
    }));

    if (chartData.length === 0) {
      return NextResponse.json([
        { time: '00:00', txns: 0, volume: 0 }
      ]);
    }

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
