import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set - cannot start server');
}

const JWT_EXPIRY = '24h';

export async function POST(request: NextRequest) {
  try {
    const { address, signature, message } = await request.json();

    if (!address || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recoveredAddress = recoverPersonalSignature({
      data: message,
      signature: signature,
    });

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const messageTimestamp = parseInt(message.split('Timestamp: ')[1]);
    const now = Date.now();
    if (now - messageTimestamp > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Signature expired (5 minute limit)' }, { status: 403 });
    }

    const token = jwt.sign(
      {
        address: address.toLowerCase(),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      },
      JWT_SECRET
    );

    return NextResponse.json({ token, address: address.toLowerCase() });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
