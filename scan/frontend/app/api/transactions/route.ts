import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        tx_hash,
        from_address,
        to_address,
        value_usd,
        platform_fee_usd,
        block_number,
        block_timestamp
      FROM s402_payments
      ORDER BY block_timestamp DESC
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
