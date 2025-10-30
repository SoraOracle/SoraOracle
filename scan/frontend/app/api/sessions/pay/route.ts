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

const S402_ABI = [
  'function settlePayment((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)',
];

const USD1_ABI = [
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address owner) external view returns (uint256)',
];

export async function POST(request: NextRequest) {
  try {
    const { userAddress, costUSD, recipientAddress } = await request.json();

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
        max_usd1_amount,
        spent_amount
      FROM s402_sessions
      WHERE user_address = $1 
        AND is_active = true 
        AND expires_at > NOW()
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
    const spentAmount = parseFloat(session.spent_amount);
    const maxAmount = parseFloat(session.max_usd1_amount);

    // Check spending limit
    if (spentAmount + costUSD > maxAmount) {
      return NextResponse.json(
        { error: `Insufficient session balance. Spent: $${spentAmount.toFixed(3)}, Limit: $${maxAmount.toFixed(3)}` },
        { status: 402 }
      );
    }

    // Decrypt session private key
    const privateKey = decryptPrivateKey(session.session_private_key);
    
    // Connect to BSC
    const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
    const sessionWallet = new ethers.Wallet(privateKey, provider);

    const amountInUnits = ethers.parseUnits(costUSD.toString(), 18);
    
    // Check session wallet's actual USD1 balance (we transferred USD1 to it during session creation)
    const usd1Contract = new ethers.Contract(USD1_ADDRESS, USD1_ABI, sessionWallet);
    const sessionBalance = await usd1Contract.balanceOf(session.session_address);
    
    // Verify session has enough USD1
    if (sessionBalance < amountInUnits) {
      return NextResponse.json(
        { 
          error: 'Insufficient session balance',
          required: costUSD,
          available: ethers.formatUnits(sessionBalance, 18),
        },
        { status: 402 }
      );
    }
    
    // Check allowance and approve facilitator if needed (first time only)
    const allowance = await usd1Contract.allowance(session.session_address, S402_FACILITATOR_ADDRESS);
    if (allowance < amountInUnits) {
      const maxApproval = ethers.parseUnits('1000000', 18);
      const approveTx = await usd1Contract.approve(S402_FACILITATOR_ADDRESS, maxApproval);
      await approveTx.wait();
    }

    // Generate nonce
    const randomBytes = crypto.randomBytes(32);
    const nonce = '0x' + randomBytes.toString('hex');

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const deadline = currentTimestamp + 3600; // 1 hour

    // Create EIP-712 signature for payment authorization
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

    // Payment authorization signed by session wallet (which owns the USD1)
    const authMessage = {
      owner: session.session_address, // Session wallet owns the USD1
      spender: S402_FACILITATOR_ADDRESS,
      value: amountInUnits,
      deadline: deadline,
      recipient: recipientAddress,
      nonce: nonce
    };

    const authSigRaw = await sessionWallet.signTypedData(authDomain, authTypes, authMessage);
    const authSig = ethers.Signature.from(authSigRaw);

    const payment = {
      owner: session.session_address, // Session wallet owns the USD1
      value: amountInUnits,
      deadline: deadline,
      recipient: recipientAddress,
      nonce: nonce
    };

    const authSigStruct = {
      v: authSig.v,
      r: authSig.r,
      s: authSig.s
    };

    // Submit to S402 Facilitator
    const facilitator = new ethers.Contract(S402_FACILITATOR_ADDRESS, S402_ABI, sessionWallet);
    const tx = await facilitator.settlePayment(payment, authSigStruct);
    const receipt = await tx.wait();

    // Update spent amount
    await db.query(
      `UPDATE s402_sessions 
       SET spent_amount = spent_amount + $1,
           last_used_at = NOW()
       WHERE id = $2`,
      [costUSD, session.id]
    );

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      sessionAddress: session.session_address,
      amountSpent: costUSD,
      remainingBalance: maxAmount - (spentAmount + costUSD),
    });
  } catch (error: any) {
    console.error('Session payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment failed' },
      { status: 500 }
    );
  }
}
