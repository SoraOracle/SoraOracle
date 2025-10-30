import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
    // Find all expired sessions that are still active
    const expiredSessions = await db.query(
      `SELECT 
        id,
        user_address,
        session_address,
        session_private_key
      FROM s402_sessions
      WHERE is_active = true 
        AND expires_at < NOW()
      ORDER BY expires_at ASC
      LIMIT 10`,
      []
    );

    const results = [];

    for (const session of expiredSessions.rows) {
      try {
        // Decrypt session private key
        const privateKey = decryptPrivateKey(session.session_private_key);
        
        // Connect to BSC
        const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
        const sessionWallet = new ethers.Wallet(privateKey, provider);

        let refundedUSD1 = '0';
        let refundedBNB = '0';
        const txHashes: string[] = [];

        // Check USD1 balance
        const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, sessionWallet);
        const usd1Balance = await usd1Contract.balanceOf(session.session_address);

        if (usd1Balance > 0) {
          const transferTx = await usd1Contract.transfer(session.user_address, usd1Balance);
          const receipt = await transferTx.wait();
          refundedUSD1 = ethers.formatUnits(usd1Balance, 18);
          txHashes.push(receipt.hash);
        }

        // Check BNB balance
        const bnbBalance = await provider.getBalance(session.session_address);
        
        // Leave a small amount for gas (0.0001 BNB)
        const gasReserve = ethers.parseUnits('0.0001', 18);
        
        if (bnbBalance > gasReserve) {
          const refundAmount = bnbBalance - gasReserve;
          const bnbTx = await sessionWallet.sendTransaction({
            to: session.user_address,
            value: refundAmount,
          });
          const receipt = await bnbTx.wait();
          refundedBNB = ethers.formatUnits(refundAmount, 18);
          txHashes.push(receipt?.hash || '');
        }

        // Mark session as inactive
        await db.query(
          `UPDATE s402_sessions 
           SET is_active = false 
           WHERE id = $1`,
          [session.id]
        );

        results.push({
          sessionId: session.id,
          userAddress: session.user_address,
          refundedUSD1,
          refundedBNB,
          txHashes,
        });

        console.log(`✅ Auto-refunded expired session ${session.id}: $${refundedUSD1} USD1, ${refundedBNB} BNB`);
      } catch (error: any) {
        console.error(`❌ Failed to refund session ${session.id}:`, error.message);
        results.push({
          sessionId: session.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredSessions.rows.length,
      results,
    });
  } catch (error: any) {
    console.error('Session cleanup error:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}
