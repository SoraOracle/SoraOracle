import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT, validateSessionAccess } from '../auth';
import { ethers } from 'ethers';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-cbc';

function decryptPrivateKey(encryptedKey: string): string {
  const [ivHex, encryptedHex] = encryptedKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const S402_FACILITATOR_ADDRESS = '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3';
const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';

const USD1_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address owner) external view returns (uint256)',
];

/**
 * Activate session: Pre-approve all USD1 in session wallet to S402Facilitator
 * This is called after funding to enable zero-approval tool payments
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress, sessionId } = await request.json();

    // Verify JWT and authenticate user
    const authHeader = request.headers.get('authorization');
    const authenticatedAddress = verifyJWT(authHeader);
    
    if (!authenticatedAddress || !validateSessionAccess(authenticatedAddress, userAddress)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Get session with encrypted private key
    const sessionResult = await db.query(
      `SELECT 
        id,
        session_address,
        session_private_key,
        max_usd1_amount
      FROM s402_sessions
      WHERE id = $1 
        AND user_address = $2
        AND is_active = true
      LIMIT 1`,
      [sessionId, userAddress.toLowerCase()]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const session = sessionResult.rows[0];

    // Decrypt session private key
    const privateKey = decryptPrivateKey(session.session_private_key);
    
    // Connect to BSC
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
    const sessionWallet = new ethers.Wallet(privateKey, provider);

    const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, sessionWallet);
    
    // Check session wallet's USD1 balance
    const balance = await usd1Contract.balanceOf(session.session_address);
    
    if (balance === 0n) {
      return NextResponse.json(
        { error: 'Session wallet has no USD1 balance' },
        { status: 400 }
      );
    }

    // Approve the ENTIRE balance to S402Facilitator (eliminates per-payment approvals)
    // Using balance instead of max uint to be more precise and gas-efficient
    // Let ethers estimate gas for approval (typically ~50k gas)
    const approveTx = await usd1Contract.approve(S402_FACILITATOR_ADDRESS, balance);
    const receipt = await approveTx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      approvedAmount: ethers.formatUnits(balance, 18),
      sessionAddress: session.session_address,
    });
  } catch (error: any) {
    console.error('Session activation error:', error);
    return NextResponse.json(
      { error: error.message || 'Activation failed' },
      { status: 500 }
    );
  }
}
