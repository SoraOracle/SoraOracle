import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Fetch S402 payment transactions
    const paymentsResult = await db.query(`
      SELECT 
        p.tx_hash,
        p.from_address,
        p.to_address,
        p.value_usd,
        p.platform_fee_usd,
        p.block_number,
        p.block_timestamp,
        t.name as service_name,
        t.category as service_category,
        t.icon_url as service_icon,
        'payment' as type
      FROM s402_payments p
      LEFT JOIN s402_proxy_usage u ON u.tx_hash = p.tx_hash
      LEFT JOIN s402_tools t ON t.id = u.service
      ORDER BY p.block_timestamp DESC
      LIMIT 100
    `);

    // Fetch session funding transactions (if columns exist)
    let sessionFundingResult;
    try {
      sessionFundingResult = await db.query(`
        SELECT 
          usd1_tx_hash as tx_hash,
          user_address as from_address,
          session_address as to_address,
          max_usd1_amount::text as value_usd,
          '0' as platform_fee_usd,
          0 as block_number,
          created_at as block_timestamp,
          'Session Funding' as service_name,
          'session' as service_category,
          'session_funding' as type
        FROM s402_sessions
        WHERE usd1_tx_hash IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 50
      `);
    } catch (e) {
      // Columns don't exist yet, skip session funding transactions
      sessionFundingResult = { rows: [] };
    }

    // Fetch session refund transactions - USD1 and BNB separately (if columns exist)
    let sessionRefundUSD1Result;
    let sessionRefundBNBResult;
    try {
      // USD1 refunds - use actual refunded amount if available, fallback to max
      sessionRefundUSD1Result = await db.query(`
        SELECT 
          refund_usd1_tx_hash as tx_hash,
          session_address as from_address,
          user_address as to_address,
          COALESCE(refunded_usd1_amount::text, max_usd1_amount::text) as value_usd,
          '0' as platform_fee_usd,
          0 as block_number,
          refunded_at as block_timestamp,
          'Session Refund (USD1)' as service_name,
          'session' as service_category,
          'session_refund' as type
        FROM s402_sessions
        WHERE refund_usd1_tx_hash IS NOT NULL
        ORDER BY refunded_at DESC
        LIMIT 50
      `);

      // BNB refunds (separate query to ensure they appear even if USD1 hash is null)
      sessionRefundBNBResult = await db.query(`
        SELECT 
          refund_bnb_tx_hash as tx_hash,
          session_address as from_address,
          user_address as to_address,
          COALESCE(refunded_bnb_amount::text, '0') as value_bnb,
          '0' as platform_fee_usd,
          0 as block_number,
          refunded_at as block_timestamp,
          'Session Refund (BNB)' as service_name,
          'session' as service_category,
          'session_refund_bnb' as type
        FROM s402_sessions
        WHERE refund_bnb_tx_hash IS NOT NULL
        ORDER BY refunded_at DESC
        LIMIT 50
      `);
    } catch (e) {
      // Columns don't exist yet, skip session refund transactions
      sessionRefundUSD1Result = { rows: [] };
      sessionRefundBNBResult = { rows: [] };
    }

    const payments = paymentsResult.rows.map(row => ({
      txHash: row.tx_hash,
      from: row.from_address,
      to: row.to_address,
      valueUSD: parseFloat(row.value_usd),
      platformFeeUSD: parseFloat(row.platform_fee_usd),
      blockNumber: parseInt(row.block_number),
      timestamp: row.block_timestamp,
      serviceName: row.service_name || null,
      serviceCategory: row.service_category || null,
      serviceIcon: row.service_icon || null,
      type: 'payment',
    }));

    const sessionFundings = sessionFundingResult.rows.map(row => ({
      txHash: row.tx_hash,
      from: row.from_address,
      to: row.to_address,
      valueUSD: parseFloat(row.value_usd),
      platformFeeUSD: 0,
      blockNumber: 0,
      timestamp: row.block_timestamp,
      serviceName: 'Session Funding',
      serviceCategory: 'session',
      type: 'session_funding',
    }));

    const sessionRefundsUSD1 = sessionRefundUSD1Result.rows.map(row => ({
      txHash: row.tx_hash,
      from: row.from_address,
      to: row.to_address,
      valueUSD: parseFloat(row.value_usd),
      platformFeeUSD: 0,
      blockNumber: 0,
      timestamp: row.block_timestamp,
      serviceName: row.service_name,
      serviceCategory: 'session',
      type: 'session_refund',
    }));

    const sessionRefundsBNB = sessionRefundBNBResult.rows.map(row => ({
      txHash: row.tx_hash,
      from: row.from_address,
      to: row.to_address,
      valueUSD: 0, // BNB amount stored separately
      valueBNB: parseFloat(row.value_bnb || '0'), // Actual BNB refunded
      platformFeeUSD: 0,
      blockNumber: 0,
      timestamp: row.block_timestamp,
      serviceName: row.service_name,
      serviceCategory: 'session',
      type: 'session_refund_bnb',
    }));

    // Merge and sort by timestamp
    const allTransactions = [...payments, ...sessionFundings, ...sessionRefundsUSD1, ...sessionRefundsBNB]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100);

    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
