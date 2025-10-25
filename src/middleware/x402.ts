import { Request, Response, NextFunction } from 'express';
import { createPublicClient, createWalletClient, http, parseUnits, Address } from 'viem';
import { bscTestnet, bsc } from 'viem/chains';
import { NonceStore, getNonceStore } from '../utils/nonceStore';

export interface X402Config {
  facilitatorUrl: string;
  usdcAddress: string;
  priceInUSDC: number; // e.g., 0.05 for $0.05
  network: 'testnet' | 'mainnet';
}

export interface X402PaymentProof {
  nonce: string;
  amount: string;
  token: string;
  from: Address;
  to: Address;
  signature: string;
  timestamp: number;
}

/**
 * x402 Micropayments Middleware for BNB Chain
 * Implements HTTP 402 Payment Required with USDC on BNB Chain
 * Uses Coinbase x402 facilitator for payment settlement
 */
export class X402Middleware {
  private config: X402Config;
  private chain: typeof bscTestnet | typeof bsc;

  constructor(config: X402Config) {
    this.config = config;
    this.chain = config.network === 'testnet' ? bscTestnet : bsc;
  }

  /**
   * Middleware to protect endpoints with x402 micropayments
   * Usage: app.post('/launchMarket', x402.requirePayment(), handler)
   */
  requirePayment() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const paymentProof = req.headers['x-402-payment'] as string;

        if (!paymentProof) {
          return this.sendPaymentRequired(res);
        }

        // Parse and verify payment proof
        const proof: X402PaymentProof = JSON.parse(paymentProof);
        const isValid = await this.verifyPayment(proof);

        if (!isValid) {
          return res.status(402).json({
            error: 'Invalid payment proof',
            message: 'Payment verification failed. Please try again.'
          });
        }

        // Payment verified, attach proof to request
        (req as any).x402Payment = proof;
        next();
      } catch (error) {
        console.error('x402 payment error:', error);
        return res.status(402).json({
          error: 'Payment processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  }

  /**
   * Send 402 Payment Required response with payment details
   */
  private sendPaymentRequired(res: Response) {
    const paymentDetails = {
      amount: this.config.priceInUSDC.toString(),
      token: this.config.usdcAddress,
      facilitator: this.config.facilitatorUrl,
      network: this.config.network,
      chainId: this.chain.id,
      instructions: {
        step1: 'Sign a payment message with your wallet',
        step2: 'Include the signature in X-402-Payment header',
        step3: 'Retry the request with payment proof'
      }
    };

    res.status(402).json({
      error: 'Payment Required',
      payment: paymentDetails,
      message: `This endpoint requires a payment of ${this.config.priceInUSDC} USDC`
    });
  }

  /**
   * Verify payment proof with facilitator
   */
  private async verifyPayment(proof: X402PaymentProof): Promise<boolean> {
    try {
      // Verify payment amount
      const expectedAmount = parseUnits(
        this.config.priceInUSDC.toString(),
        6 // USDC has 6 decimals
      );

      if (BigInt(proof.amount) < expectedAmount) {
        throw new Error('Insufficient payment amount');
      }

      // Verify token is USDC
      if (proof.token.toLowerCase() !== this.config.usdcAddress.toLowerCase()) {
        throw new Error('Invalid payment token');
      }

      // Atomically claim nonce BEFORE verification - prevents concurrent replay
      const nonceStore = getNonceStore();
      const claimed = nonceStore.claimNonce(proof.nonce, proof.from);
      
      if (!claimed) {
        throw new Error('Nonce already used - replay attack detected');
      }

      // Verify timestamp is recent (within 5 minutes)
      const now = Date.now();
      if (now - proof.timestamp > 300000) {
        nonceStore.releaseNonce(proof.nonce); // Release if expired
        throw new Error('Payment proof expired');
      }

      try {
        // Verify signature with facilitator
        const isValid = await this.verifyWithFacilitator(proof);

        if (isValid) {
          // Confirm nonce after successful verification
          nonceStore.confirmNonce(proof.nonce);
          console.log(`[x402] Payment verified and nonce confirmed: ${proof.nonce}`);
          return true;
        } else {
          // Release nonce if verification failed
          nonceStore.releaseNonce(proof.nonce);
          return false;
        }
      } catch (error) {
        // Release nonce on verification error
        nonceStore.releaseNonce(proof.nonce);
        throw error;
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  /**
   * Verify payment with x402 facilitator
   */
  private async verifyWithFacilitator(proof: X402PaymentProof): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          proof,
          chainId: this.chain.id
        })
      });

      if (!response.ok) {
        throw new Error(`Facilitator verification failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error('Facilitator verification error:', error);
      // In development, allow bypassing facilitator verification
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Bypassing facilitator verification in development mode');
        return true;
      }
      return false;
    }
  }

  /**
   * Create payment proof (client-side helper)
   */
  static async createPaymentProof(
    config: {
      amount: number;
      token: Address;
      to: Address;
      from: Address;
      privateKey: `0x${string}`;
    }
  ): Promise<X402PaymentProof> {
    const walletClient = createWalletClient({
      account: config.from,
      chain: bscTestnet,
      transport: http()
    });

    const nonce = Date.now().toString();
    const amount = parseUnits(config.amount.toString(), 6);

    // Create payment message
    const message = `Pay ${config.amount} USDC for market creation\nNonce: ${nonce}\nTo: ${config.to}`;

    // Sign message
    const signature = await walletClient.signMessage({
      account: config.from,
      message
    });

    return {
      nonce,
      amount: amount.toString(),
      token: config.token,
      from: config.from,
      to: config.to,
      signature,
      timestamp: Date.now()
    };
  }
}

/**
 * Example Express setup with x402
 */
export function setupX402(app: any) {
  const x402 = new X402Middleware({
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC mainnet USDC
    priceInUSDC: 0.05,
    network: process.env.NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
  });

  // Protected endpoint example
  app.post('/launchMarket', x402.requirePayment(), async (req: Request, res: Response) => {
    const payment = (req as any).x402Payment as X402PaymentProof;
    
    res.json({
      success: true,
      message: 'Market creation initiated',
      payment: {
        from: payment.from,
        amount: payment.amount,
        nonce: payment.nonce
      }
    });
  });

  return x402;
}
