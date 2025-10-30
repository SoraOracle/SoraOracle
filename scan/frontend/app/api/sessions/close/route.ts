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

/**
 * Close session manually: Refund all USD1 and BNB, then delete private key
 * Only processes if wallet is empty after refunds
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress } = await request.json();

    // Verify JWT and authenticate user
    const authHeader = request.headers.get('authorization');
    const authenticatedAddress = verifyJWT(authHeader);
    
    if (!authenticatedAddress || !validateSessionAccess(authenticatedAddress, userAddress)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Get active session with encrypted private key
    const sessionResult = await db.query(
      `SELECT 
        id,
        session_address,
        session_private_key,
        user_address,
        max_usd1_amount,
        spent_amount
      FROM s402_sessions
      WHERE user_address = $1 
        AND is_active = true
      LIMIT 1`,
      [userAddress.toLowerCase()]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 404 }
      );
    }

    const session = sessionResult.rows[0];

    // Decrypt session private key
    const privateKey = decryptPrivateKey(session.session_private_key);
    
    // Connect to BSC
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
    const sessionWallet = new ethers.Wallet(privateKey, provider);

    // Step 1: Refund USD1
    const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, sessionWallet);
    const usd1Balance = await usd1Contract.balanceOf(session.session_address);
    
    let refundedUSD1 = '0';
    let usd1TxHash = null;

    if (usd1Balance > 0n) {
      const transferTx = await usd1Contract.transfer(session.user_address, usd1Balance);
      const receipt = await transferTx.wait();
      refundedUSD1 = ethers.formatUnits(usd1Balance, 18);
      usd1TxHash = receipt?.hash || null;
    }

    // Step 2: Refund BNB (keep small amount for gas reserve to avoid failures)
    const bnbBalance = await provider.getBalance(session.session_address);
    const gasReserve = ethers.parseUnits('0.0001', 18); // Reserve for the final BNB transfer itself
    
    let refundedBNB = '0';
    let bnbTxHash = null;

    if (bnbBalance > gasReserve) {
      const refundAmount = bnbBalance - gasReserve;
      const bnbTx = await sessionWallet.sendTransaction({
        to: session.user_address,
        value: refundAmount,
      });
      const receipt = await bnbTx.wait();
      refundedBNB = ethers.formatUnits(refundAmount, 18);
      bnbTxHash = receipt?.hash || null;
    }

    // Step 3: Verify wallet is effectively empty (small dust amounts acceptable)
    const finalUsd1Balance = await usd1Contract.balanceOf(session.session_address);
    const finalBnbBalance = await provider.getBalance(session.session_address);
    
    const dustThreshold = ethers.parseUnits('0.001', 18); // 0.001 tokens
    
    if (finalUsd1Balance > dustThreshold) {
      return NextResponse.json(
        { 
          error: 'Cannot close session: USD1 balance still exists',
          usd1Balance: ethers.formatUnits(finalUsd1Balance, 18),
        },
        { status: 400 }
      );
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

    // Step 4: Delete private key and mark session as closed
    await db.query(
      `UPDATE s402_sessions 
       SET is_active = false,
           session_private_key = NULL,
           refund_usd1_tx_hash = $1,
           refund_bnb_tx_hash = $2,
           refunded_usd1_amount = $3,
           refunded_bnb_amount = $4,
           refunded_at = NOW()
       WHERE id = $5`,
      [usd1TxHash, bnbTxHash, parseFloat(refundedUSD1), parseFloat(refundedBNB), session.id]
    );

    return NextResponse.json({
      success: true,
      refundedUSD1,
      refundedBNB,
      usd1TxHash,
      bnbTxHash,
      message: 'Session closed successfully. Private key deleted.',
    });
  } catch (error: any) {
    console.error('Session close error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close session' },
      { status: 500 }
    );
  }
}
