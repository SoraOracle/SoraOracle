import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get user address from query params
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing userAddress parameter' },
        { status: 400 }
      );
    }

    // Validate user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find active session for this user
    const result = await db.query(
      `SELECT 
        id,
        user_address,
        session_address,
        max_usd1_amount,
        spent_amount,
        duration_seconds,
        expires_at,
        created_at,
        last_used_at
      FROM s402_sessions
      WHERE user_address = $1 
        AND is_active = true 
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
      [userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        hasActiveSession: false,
        session: null,
      });
    }

    const session = result.rows[0];

    // Check if session has exceeded spending limit
    const spentAmount = parseFloat(session.spent_amount);
    const maxAmount = parseFloat(session.max_usd1_amount);
    const hasExceededLimit = spentAmount >= maxAmount;

    // If exceeded, deactivate the session
    if (hasExceededLimit) {
      await db.query(
        `UPDATE s402_sessions SET is_active = false WHERE id = $1`,
        [session.id]
      );

      return NextResponse.json({
        hasActiveSession: false,
        session: null,
        reason: 'Spending limit exceeded',
      });
    }

    return NextResponse.json({
      hasActiveSession: true,
      session: {
        id: session.id,
        userAddress: session.user_address,
        sessionAddress: session.session_address,
        maxUsd1Amount: maxAmount,
        spentAmount: spentAmount,
        remainingAmount: maxAmount - spentAmount,
        durationSeconds: session.duration_seconds,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
        lastUsedAt: session.last_used_at,
      },
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}
