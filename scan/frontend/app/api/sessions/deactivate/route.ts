import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, validateSessionAccess } from '../auth';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userAddress } = await request.json();

    if (!sessionId || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        { error: 'Forbidden: Cannot deactivate another user\'s session' },
        { status: 403 }
      );
    }

    // Deactivate the session
    const result = await db.query(
      `UPDATE s402_sessions 
       SET is_active = false 
       WHERE id = $1 AND user_address = $2
       RETURNING id`,
      [sessionId, userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating session:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate session' },
      { status: 500 }
    );
  }
}
