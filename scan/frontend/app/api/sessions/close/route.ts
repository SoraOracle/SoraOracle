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
const S402_FACILITATOR_ADDRESS = '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3';

const USD1_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
];

const S402_ABI = [
  'function settlePayment((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)',
];

/**
 * Close session manually: Refund all USD1 and BNB, then delete private key
 * Only processes if wallet is empty after refunds
 */
export async function POST(request: NextRequest) {
  try {
    // Verify JWT and authenticate user
    const authHeader = request.headers.get('authorization');
    const authenticatedAddress = verifyJWT(authHeader);
    
    if (!authenticatedAddress) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    const userAddress = authenticatedAddress;

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

    // Step 1: Refund USD1 through S402 Facilitator (matches payment flow)
    const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, sessionWallet);
    const usd1Balance = await usd1Contract.balanceOf(session.session_address);
    
    let refundedUSD1 = '0';
    let usd1TxHash = null;

    if (usd1Balance > 0n) {
      // Use S402 Facilitator for refund (ensures proper tracking and platform fees)
      const nonce = '0x' + crypto.randomBytes(32).toString('hex');
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Create EIP-712 signature for refund authorization
      const authDomain = {
        name: 'S402Facilitator',
        version: '1',
        chainId: 56,
        verifyingContract: S402_FACILITATOR_ADDRESS
      };

      const authTypes = {
        PaymentAuthorization: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'nonce', type: 'bytes32' }
        ]
      };

      const authMessage = {
        owner: session.session_address,
        spender: S402_FACILITATOR_ADDRESS,
        value: usd1Balance,
        deadline: deadline,
        recipient: session.user_address,
        nonce: nonce
      };

      const authSigRaw = await sessionWallet.signTypedData(authDomain, authTypes, authMessage);
      const authSig = ethers.Signature.from(authSigRaw);

      const payment = {
        owner: session.session_address,
        value: usd1Balance,
        deadline: deadline,
        recipient: session.user_address,
        nonce: nonce
      };

      const authSigStruct = {
        v: authSig.v,
        r: authSig.r,
        s: authSig.s
      };

      // Submit refund through S402 Facilitator
      const facilitator = new ethers.Contract(S402_FACILITATOR_ADDRESS, S402_ABI, sessionWallet);
      const transferTx = await facilitator.settlePayment(payment, authSigStruct);
      const receipt = await transferTx.wait();
      refundedUSD1 = ethers.formatUnits(usd1Balance, 18);
      usd1TxHash = receipt?.hash || null;
    }

    // Step 2: Refund BNB (calculate precise gas reserve)
    const bnbBalance = await provider.getBalance(session.session_address);
    
    let refundedBNB = '0';
    let bnbTxHash = null;

    if (bnbBalance > 0n) {
      // BNB transfer uses exactly 21000 gas (standard transfer)
      const gasLimit = 21000n;
      
      // Get current gas price
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei'); // Default 3 gwei if null
      
      // Calculate exact gas cost for this transaction
      const exactGasCost = gasLimit * gasPrice;
      
      // Add 50% buffer for safety (gas price fluctuations)
      const gasCostWithBuffer = exactGasCost * 150n / 100n;
      
      // Only refund if balance exceeds buffered gas cost
      if (bnbBalance > gasCostWithBuffer) {
        // Send everything except the gas cost (no buffer on the send amount)
        const refundAmount = bnbBalance - exactGasCost;
        
        const bnbTx = await sessionWallet.sendTransaction({
          to: session.user_address,
          value: refundAmount,
          gasLimit: gasLimit,
        });
        const receipt = await bnbTx.wait();
        refundedBNB = ethers.formatUnits(refundAmount, 18);
        bnbTxHash = receipt?.hash || null;
      }
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
