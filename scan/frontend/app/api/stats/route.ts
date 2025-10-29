import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get overall stats
    const statsQuery = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(value_usd), 0) as total_volume_usd,
        COALESCE(SUM(platform_fee_usd), 0) as total_fees_usd,
        COUNT(DISTINCT from_address) as unique_payers,
        COUNT(DISTINCT to_address) as unique_providers,
        COALESCE(AVG(value_usd), 0) as avg_payment_usd
      FROM s402_payments
    `);

    // Get 24h stats
    const last24hQuery = await db.query(`
      SELECT 
        COUNT(*) as payments_last_24h,
        COALESCE(SUM(value_usd), 0) as volume_last_24h
      FROM s402_payments
      WHERE block_timestamp >= NOW() - INTERVAL '24 hours'
    `);

    // Get active agents count (placeholder - will implement later)
    const activeAgents = 0;

    const stats = {
      totalPayments: parseInt(statsQuery.rows[0].total_payments),
      totalVolumeUSD: parseFloat(statsQuery.rows[0].total_volume_usd),
      totalFeesUSD: parseFloat(statsQuery.rows[0].total_fees_usd),
      uniquePayers: parseInt(statsQuery.rows[0].unique_payers),
      uniqueProviders: parseInt(statsQuery.rows[0].unique_providers),
      avgPaymentUSD: parseFloat(statsQuery.rows[0].avg_payment_usd),
      paymentsLast24h: parseInt(last24hQuery.rows[0].payments_last_24h),
      volumeLast24h: parseFloat(last24hQuery.rows[0].volume_last_24h),
      activeAgents,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
