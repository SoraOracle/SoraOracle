import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, validateSessionAccess } from '../auth';
import { ethers } from 'ethers';

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';

const USD1_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing userAddress parameter' },
        { status: 400 }
      );
    }

    // Verify JWT and authenticate user
    const authHeader = request.headers.get('authorization');
    const authenticatedAddress = verifyJWT(authHeader);
    
    if (!authenticatedAddress || !validateSessionAccess(authenticatedAddress, userAddress)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Get all closed sessions for this user
    const result = await db.query(
      `SELECT 
        id,
        session_address,
        max_usd1_amount,
        spent_amount,
        created_at,
        refunded_at,
        refunded_usd1_amount,
        refunded_bnb_amount
      FROM s402_sessions
      WHERE user_address = $1 
        AND is_active = false
      ORDER BY created_at DESC
      LIMIT 50`,
      [userAddress.toLowerCase()]
    );

    // Connect to BSC to check current balances
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
    const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, provider);

    // Check balances for each session
    const sessions = await Promise.all(
      result.rows.map(async (session) => {
        const usd1Balance = await usd1Contract.balanceOf(session.session_address);
        const bnbBalance = await provider.getBalance(session.session_address);
        
        const currentUsd1 = parseFloat(ethers.formatUnits(usd1Balance, 18));
        const currentBnb = parseFloat(ethers.formatUnits(bnbBalance, 18));
        
        return {
          id: session.id,
          sessionAddress: session.session_address,
          maxUsd1Amount: parseFloat(session.max_usd1_amount),
          spentAmount: parseFloat(session.spent_amount),
          createdAt: session.created_at,
          refundedAt: session.refunded_at,
          refundedUsd1Amount: session.refunded_usd1_amount ? parseFloat(session.refunded_usd1_amount) : null,
          refundedBnbAmount: session.refunded_bnb_amount ? parseFloat(session.refunded_bnb_amount) : null,
          currentUsd1Balance: currentUsd1,
          currentBnbBalance: currentBnb,
          // Only allow refund if balance exceeds gas costs
          // BSC gas: ~21,000 * 3 gwei = 0.000063 BNB (~$0.013)
          // Set threshold at 0.0001 BNB and 0.01 USD1 to ensure refund > gas cost
          canRefund: currentUsd1 >= 0.01 || currentBnb >= 0.0001,
        };
      })
    );

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('Error fetching session history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session history' },
      { status: 500 }
    );
  }
}
