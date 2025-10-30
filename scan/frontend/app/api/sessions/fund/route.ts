import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, validateSessionAccess } from '../auth';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userAddress, usd1TxHash, bnbTxHash } = await request.json();

    // Verify JWT and authenticate user
    const authHeader = request.headers.get('authorization');
    const authenticatedAddress = verifyJWT(authHeader);
    
    if (!authenticatedAddress || !validateSessionAccess(authenticatedAddress, userAddress)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Ensure columns exist (idempotent operation)
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='usd1_tx_hash') THEN
          ALTER TABLE s402_sessions ADD COLUMN usd1_tx_hash varchar(66);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='bnb_tx_hash') THEN
          ALTER TABLE s402_sessions ADD COLUMN bnb_tx_hash varchar(66);
        END IF;
      END $$;
    `);

    // Update session with transaction hashes
    const result = await db.query(
      `UPDATE s402_sessions 
       SET usd1_tx_hash = $1, bnb_tx_hash = $2 
       WHERE id = $3 AND user_address = $4
       RETURNING id`,
      [usd1TxHash, bnbTxHash, sessionId, userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session funding recorded',
    });
  } catch (error: any) {
    console.error('Session funding tracking error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track funding' },
      { status: 500 }
    );
  }
}
