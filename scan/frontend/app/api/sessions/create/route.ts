import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { verifyJWT, validateSessionAccess } from '../auth';

// Encryption configuration
const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encryptPrivateKey(privateKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function POST(request: NextRequest) {
  try {
    const { userAddress, maxUsd1Amount, durationSeconds } = await request.json();

    // Validate inputs
    if (!userAddress || !maxUsd1Amount || !durationSeconds) {
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
        { error: 'Forbidden: Cannot create session for another user' },
        { status: 403 }
      );
    }

    // Deactivate any existing active sessions for this user
    await db.query(
      `UPDATE s402_sessions 
       SET is_active = false 
       WHERE user_address = $1 AND is_active = true`,
      [userAddress.toLowerCase()]
    );

    // Generate new ephemeral wallet for this session
    const sessionWallet = ethers.Wallet.createRandom();
    const sessionId = ethers.id(
      `${userAddress}-${Date.now()}-${sessionWallet.address}`
    );

    // Encrypt the private key before storing
    const encryptedPrivateKey = encryptPrivateKey(sessionWallet.privateKey);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    // Create session in database
    const result = await db.query(
      `INSERT INTO s402_sessions (
        id,
        user_address,
        session_address,
        session_private_key,
        max_usd1_amount,
        spent_amount,
        duration_seconds,
        expires_at,
        is_active,
        created_at,
        last_used_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, user_address, session_address, max_usd1_amount, spent_amount, duration_seconds, expires_at, created_at`,
      [
        sessionId,
        userAddress.toLowerCase(),
        sessionWallet.address.toLowerCase(),
        encryptedPrivateKey,
        maxUsd1Amount,
        0, // spent_amount starts at 0
        durationSeconds,
        expiresAt,
        true, // is_active
      ]
    );

    const session = result.rows[0];

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        userAddress: session.user_address,
        sessionAddress: session.session_address,
        maxUsd1Amount: parseFloat(session.max_usd1_amount),
        spentAmount: parseFloat(session.spent_amount),
        durationSeconds: session.duration_seconds,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
