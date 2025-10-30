import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, validateSessionAccess } from '../auth';

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

    // Verify JWT and authenticate user
    const authHeader = request.headers.get('authorization');
    const authenticatedAddress = verifyJWT(authHeader);
    
    if (!authenticatedAddress) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Ensure authenticated user matches the requested userAddress
    if (!validateSessionAccess(authenticatedAddress, userAddress)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access another user\'s session' },
        { status: 403 }
      );
    }

    // Find active session for this user
    // Note: Sessions no longer expire automatically (expires_at is nullable)
    const result = await db.query(
      `SELECT 
        id,
        user_address,
        session_address,
        max_usd1_amount,
        spent_amount,
        created_at,
        last_used_at
      FROM s402_sessions
      WHERE user_address = $1 
        AND is_active = true
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
