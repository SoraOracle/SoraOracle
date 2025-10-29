import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        p.tx_hash,
        p.from_address,
        p.to_address,
        p.value_usd,
        p.platform_fee_usd,
        p.block_number,
        p.block_timestamp,
        t.name as service_name,
        t.category as service_category
      FROM s402_payments p
      LEFT JOIN s402_tools t ON LOWER(p.to_address) = LOWER(t.provider_address)
      ORDER BY p.block_timestamp DESC
      LIMIT 100
    `);

    const transactions = result.rows.map(row => ({
      txHash: row.tx_hash,
      from: row.from_address,
      to: row.to_address,
      valueUSD: parseFloat(row.value_usd),
      platformFeeUSD: parseFloat(row.platform_fee_usd),
      blockNumber: parseInt(row.block_number),
      timestamp: row.block_timestamp,
      serviceName: row.service_name || null,
      serviceCategory: row.service_category || null,
    }));

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
