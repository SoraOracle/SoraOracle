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

    const dataMap = new Map();
    result.rows.forEach(row => {
      const hour = new Date(row.hour);
      dataMap.set(hour.getTime(), {
        txns: parseInt(row.txn_count),
        volume: parseFloat(row.volume),
      });
    });

    const now = new Date();
    const chartData = [];
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(now.getHours() - i, 0, 0, 0);
      
      const data = dataMap.get(hour.getTime()) || { txns: 0, volume: 0 };
      
      chartData.push({
        time: hour.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        txns: data.txns,
        volume: data.volume,
      });
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
