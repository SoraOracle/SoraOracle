import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const { address, signature, message } = await request.json();

    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    const timestamp = parseInt(timestampMatch[1]);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const oneMinute = 60 * 1000;

    if (timestamp > now + oneMinute) {
      return NextResponse.json({ error: 'Invalid timestamp: future not allowed' }, { status: 401 });
    }

    if (now - timestamp > fiveMinutes) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    const recoveredAddress = recoverPersonalSignature({
      data: message,
      signature: signature,
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const result = await pool.query(
      'SELECT address FROM s402_admin_wallets WHERE LOWER(address) = LOWER($1) AND is_active = true',
      [address]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Unauthorized wallet' }, { status: 403 });
    }

    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
