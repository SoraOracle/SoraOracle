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

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const USD1_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userAddress } = await request.json();

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
        user_address
      FROM s402_sessions
      WHERE id = $1 AND user_address = $2
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

    let refundedUSD1 = '0';
    let refundedBNB = '0';
    let usd1TxHash: string | null = null;
    let bnbTxHash: string | null = null;

    // Check USD1 balance
    const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, sessionWallet);
    const usd1Balance = await usd1Contract.balanceOf(session.session_address);

    if (usd1Balance > 0n) {
      const transferTx = await usd1Contract.transfer(userAddress, usd1Balance);
      const receipt = await transferTx.wait();
      refundedUSD1 = ethers.formatUnits(usd1Balance, 18);
      usd1TxHash = receipt.hash;
    }

    // Check BNB balance
    const bnbBalance = await provider.getBalance(session.session_address);
    
    // Leave a small amount for gas (0.0001 BNB)
    const gasReserve = ethers.parseUnits('0.0001', 18);
    
    if (bnbBalance > gasReserve) {
      const refundAmount = bnbBalance - gasReserve;
      const bnbTx = await sessionWallet.sendTransaction({
        to: userAddress,
        value: refundAmount,
      });
      const receipt = await bnbTx.wait();
      refundedBNB = ethers.formatUnits(refundAmount, 18);
      bnbTxHash = receipt?.hash || null;
    }

    // Ensure refund columns exist (idempotent)
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='refund_usd1_tx_hash') THEN
          ALTER TABLE s402_sessions ADD COLUMN refund_usd1_tx_hash varchar(66);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='refund_bnb_tx_hash') THEN
          ALTER TABLE s402_sessions ADD COLUMN refund_bnb_tx_hash varchar(66);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='refunded_at') THEN
          ALTER TABLE s402_sessions ADD COLUMN refunded_at timestamp;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='refunded_usd1_amount') THEN
          ALTER TABLE s402_sessions ADD COLUMN refunded_usd1_amount numeric(20, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='s402_sessions' AND column_name='refunded_bnb_amount') THEN
          ALTER TABLE s402_sessions ADD COLUMN refunded_bnb_amount numeric(20, 8);
        END IF;
      END $$;
    `);

    // Mark session as refunded and record refund details (tx hashes + amounts)
    await db.query(
      `UPDATE s402_sessions 
       SET is_active = false,
           refund_usd1_tx_hash = $1,
           refund_bnb_tx_hash = $2,
           refunded_usd1_amount = $3,
           refunded_bnb_amount = $4,
           refunded_at = NOW()
       WHERE id = $5`,
      [usd1TxHash, bnbTxHash, parseFloat(refundedUSD1), parseFloat(refundedBNB), sessionId]
    );

    return NextResponse.json({
      success: true,
      refundedUSD1,
      refundedBNB,
      usd1TxHash,
      bnbTxHash,
    });
  } catch (error: any) {
    console.error('Session refund error:', error);
    return NextResponse.json(
      { error: error.message || 'Refund failed' },
      { status: 500 }
    );
  }
}
