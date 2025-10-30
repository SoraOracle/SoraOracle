import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userAddress } = await request.json();

    if (!sessionId || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
