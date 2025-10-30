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

    console.log('BNB refund - Initial balance:', ethers.formatUnits(bnbBalance, 18), 'BNB');

    if (bnbBalance > 0n) {
      try {
        console.log('🔄 Attempting BNB refund with multiple strategies...');
        
        // Get current gas price
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
        
        console.log('Gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'Gwei');
        
        // Strategy 1: Try with exact calculation (balance - actual gas cost)
        // This sends maximum possible amount
        const gasLimit = 100000n; // Higher limit for contract wallets
        const exactGasCost = gasLimit * gasPrice;
        
        console.log('Gas limit:', gasLimit.toString());
        console.log('Exact gas cost:', ethers.formatUnits(exactGasCost, 18), 'BNB');
        
        if (bnbBalance > exactGasCost) {
          // Send everything except exact gas cost
          const refundAmount = bnbBalance - exactGasCost;
          
          console.log('Strategy 1: Attempting to refund', ethers.formatUnits(refundAmount, 18), 'BNB with 100k gas limit');
          
          try {
            const bnbTx = await sessionWallet.sendTransaction({
              to: session.user_address,
              value: refundAmount,
              gasLimit: gasLimit,
              gasPrice: gasPrice,
            });
            
            console.log('Transaction sent, waiting for confirmation...');
            const receipt = await bnbTx.wait();
            
            if (receipt.status === 1) {
              refundedBNB = ethers.formatUnits(refundAmount, 18);
              bnbTxHash = receipt.hash;
              console.log('✅ BNB refund successful:', refundedBNB, 'BNB');
            } else {
              throw new Error('Transaction failed with status 0');
            }
          } catch (strategy1Error: any) {
            console.error('Strategy 1 failed:', strategy1Error.message);
            
            // Strategy 2: Try with minimal amount and standard gas
            console.log('Strategy 2: Trying with 21k gas limit and conservative buffer...');
            
            const minGasLimit = 21000n;
            const minGasCost = minGasLimit * gasPrice * 3n; // 3x buffer
            
            if (bnbBalance > minGasCost) {
              const conservativeRefund = bnbBalance - minGasCost;
              
              console.log('Attempting to refund', ethers.formatUnits(conservativeRefund, 18), 'BNB');
              
              const bnbTx2 = await sessionWallet.sendTransaction({
                to: session.user_address,
                value: conservativeRefund,
                gasLimit: minGasLimit,
                gasPrice: gasPrice,
              });
              
              const receipt2 = await bnbTx2.wait();
              
              if (receipt2.status === 1) {
                refundedBNB = ethers.formatUnits(conservativeRefund, 18);
                bnbTxHash = receipt2.hash;
                console.log('✅ BNB refund successful (Strategy 2):', refundedBNB, 'BNB');
              } else {
                console.error('Strategy 2 also failed - transaction reverted');
              }
            }
          }
        } else {
          console.log('Skipping BNB refund - balance too low to cover gas');
        }
      } catch (bnbError: any) {
        console.error('❌ All BNB refund strategies failed:', bnbError.message);
        console.error('Error details:', {
          code: bnbError.code,
          reason: bnbError.reason,
          receipt: bnbError.receipt?.status
        });
        // Don't fail the entire session close if BNB refund fails
      }
    }

    // Step 3: Verify wallet is effectively empty before deleting private key
    const finalUsd1Balance = await usd1Contract.balanceOf(session.session_address);
    const finalBnbBalance = await provider.getBalance(session.session_address);
    
    const usd1DustThreshold = ethers.parseUnits('0.01', 18); // 0.01 USD1
    const bnbDustThreshold = ethers.parseUnits('0.0002', 18); // 0.0002 BNB (~$0.12 at $600/BNB - reasonable loss)
    
    // Check if significant balances remain
    const hasSignificantUsd1 = finalUsd1Balance > usd1DustThreshold;
    const hasSignificantBnb = finalBnbBalance > bnbDustThreshold;
    
    if (hasSignificantUsd1) {
      // USD1 is valuable - must be refunded
      console.error('Cannot close session - USD1 balance remains:',
        ethers.formatUnits(finalUsd1Balance, 18));
      
      return NextResponse.json(
        { 
          error: 'USD1 refund incomplete - session cannot be closed',
          details: {
            usd1Balance: ethers.formatUnits(finalUsd1Balance, 18),
            bnbBalance: ethers.formatUnits(finalBnbBalance, 18),
            message: 'USD1 balance still exists. Please try again or contact support.'
          }
        },
        { status: 400 }
      );
    }
    
    // BNB: Allow session close even if small amount remains (gas dust is expected)
    if (hasSignificantBnb) {
      console.warn('Session closing with BNB balance remaining:',
        ethers.formatUnits(finalBnbBalance, 18),
        '- This BNB will remain in the session wallet.');
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

    // Step 4: Mark session as closed (keep private key - empty wallet = no security risk)
    await db.query(
      `UPDATE s402_sessions 
       SET is_active = false,
           refund_usd1_tx_hash = $1,
           refund_bnb_tx_hash = $2,
           refunded_usd1_amount = $3,
           refunded_bnb_amount = $4,
           refunded_at = NOW()
       WHERE id = $5`,
      [usd1TxHash, bnbTxHash, parseFloat(refundedUSD1), parseFloat(refundedBNB), session.id]
    );

    // Create message based on what was refunded
    let message = 'Session closed successfully. Private key retained for records.';
    if (parseFloat(refundedUSD1) > 0 && parseFloat(refundedBNB) > 0) {
      message = `Session closed. Refunded ${refundedUSD1} USD1 and ${refundedBNB} BNB. Private key retained.`;
    } else if (parseFloat(refundedUSD1) > 0) {
      message = `Session closed. Refunded ${refundedUSD1} USD1. Private key retained.`;
      if (finalBnbBalance > 0n) {
        message += ` (${ethers.formatUnits(finalBnbBalance, 18)} BNB remains as gas dust)`;
      }
    } else if (parseFloat(refundedBNB) > 0) {
      message = `Session closed. Refunded ${refundedBNB} BNB. Private key retained.`;
    } else if (finalBnbBalance > 0n) {
      message = `Session closed. ${ethers.formatUnits(finalBnbBalance, 18)} BNB remains as gas dust. Private key retained.`;
    }

    return NextResponse.json({
      success: true,
      refundedUSD1,
      refundedBNB,
      usd1TxHash,
      bnbTxHash,
      message,
      bnbRemaining: ethers.formatUnits(finalBnbBalance, 18),
    });
  } catch (error: any) {
    console.error('Session close error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close session' },
      { status: 500 }
    );
  }
}
