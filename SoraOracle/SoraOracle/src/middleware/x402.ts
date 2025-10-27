import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { NonceStore, getNonceStore } from '../utils/nonceStore';

export interface X402Config {
  facilitatorAddress: string;  // Smart contract address
  usdcAddress: string;
  recipientAddress: string;    // Service provider address (who receives payment)
  priceInUSDC: number; // e.g., 0.05 for $0.05
  network: 'testnet' | 'mainnet';
  rpcUrl?: string; // Optional custom RPC
  enableLogging?: boolean; // Detailed logging for debugging
  privateKey?: string; // For calling settlePayment (optional, can use read-only verification)
}

export interface X402PaymentProof {
  nonce: string;
  amount: string;
  token: string;
  from: string;
  to: string;
  signature: string;
  timestamp: number;
}

/**
 * x402 Micropayments Middleware for BNB Chain
 * Implements HTTP 402 Payment Required with USDC on BNB Chain
 * Uses on-chain facilitator contract for payment settlement
 * 
 * Production Features:
 * - On-chain signature verification via facilitator contract
 * - Atomic nonce claiming (prevents race conditions)
 * - Comprehensive error handling
 * - Detailed logging for debugging
 * - Payment tracking and monitoring
 */
export class X402Middleware {
  private config: X402Config;
  private provider: ethers.Provider;
  private facilitatorContract: ethers.Contract;
  private paymentStats: Map<string, { count: number; totalUSDC: number }>;

  // Facilitator contract ABI (minimal)
  private readonly FACILITATOR_ABI = [
    'function verifyPayment(bytes32 nonce, uint256 amount, address token, address payer, address recipient, bytes signature) view returns (bool)',
    'function settlePayment(bytes32 nonce, uint256 amount, address token, address payer, address recipient, bytes signature)',
    'function isNonceUsed(bytes32 nonce) view returns (bool)',
    'event PaymentSettled(address indexed payer, address indexed recipient, uint256 amount, bytes32 nonce)'
  ];

  constructor(config: X402Config) {
    this.config = config;
    this.paymentStats = new Map();

    // Setup provider
    const rpcUrl = config.rpcUrl || (config.network === 'mainnet' 
      ? 'https://bsc-dataseed.binance.org'
      : 'https://data-seed-prebsc-1-s1.binance.org:8545');
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Setup facilitator contract
    this.facilitatorContract = new ethers.Contract(
      config.facilitatorAddress,
      this.FACILITATOR_ABI,
      this.provider
    );

    this.log('✅ X402Middleware initialized', {
      facilitator: config.facilitatorAddress,
      usdc: config.usdcAddress,
      price: `$${config.priceInUSDC}`,
      network: config.network
    });
  }

  /**
   * Middleware to protect endpoints with x402 micropayments
   * Usage: app.post('/launchMarket', x402.requirePayment(), handler)
   */
  requirePayment() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      try {
        const paymentProof = req.headers['x-402-payment'] as string;

        if (!paymentProof) {
          this.log('❌ No payment proof provided', { path: req.path });
          return this.sendPaymentRequired(res);
        }

        // Parse payment proof
        let proof: X402PaymentProof;
        try {
          proof = JSON.parse(paymentProof);
        } catch (error) {
          this.log('❌ Invalid payment proof format', { error });
          return res.status(402).json({
            error: 'Invalid payment proof',
            message: 'Payment proof must be valid JSON'
          });
        }

        // Verify payment
        const isValid = await this.verifyPayment(proof);

        if (!isValid) {
          this.log('❌ Payment verification failed', { 
            from: proof.from,
            nonce: proof.nonce
          });
          return res.status(402).json({
            error: 'Invalid payment proof',
            message: 'Payment verification failed. Please try again.'
          });
        }

        const duration = Date.now() - startTime;
        this.log('✅ Payment verified', {
          from: proof.from,
          amount: this.formatUSDC(proof.amount),
          nonce: proof.nonce.substring(0, 10) + '...',
          duration: `${duration}ms`
        });

        // Update stats
        this.updateStats(proof.from, parseFloat(this.formatUSDC(proof.amount)));

        // Payment verified, attach proof to request
        (req as any).x402Payment = proof;
        next();
      } catch (error) {
        const duration = Date.now() - startTime;
        this.log('❌ Payment processing error', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${duration}ms`
        });
        
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
    const chainId = this.config.network === 'mainnet' ? 56 : 97;
    
    const paymentDetails = {
      amount: this.config.priceInUSDC.toString(),
      token: this.config.usdcAddress,
      recipient: this.config.recipientAddress,  // CRITICAL: Service provider receives payment
      facilitator: this.config.facilitatorAddress,
      network: this.config.network,
      chainId,
      instructions: {
        step1: 'Generate a payment proof using X402Client',
        step2: 'Sign the message with your wallet (sign for recipient, NOT facilitator)',
        step3: 'Include the proof in X-402-Payment header',
        step4: 'Retry the request'
      },
      example: {
        header: 'X-402-Payment',
        value: JSON.stringify({
          nonce: '0x...',
          amount: (this.config.priceInUSDC * 1e6).toString(),
          token: this.config.usdcAddress,
          from: '0x... (your address)',
          to: this.config.recipientAddress,  // CRITICAL: Pay to recipient, NOT facilitator
          signature: '0x...',
          timestamp: Date.now()
        }, null, 2)
      }
    };

    res.status(402).json({
      error: 'Payment Required',
      payment: paymentDetails,
      message: `This endpoint requires a payment of $${this.config.priceInUSDC} USDC to ${this.config.recipientAddress.substring(0, 10)}...`
    });
  }

  /**
   * Verify payment proof with facilitator contract
   */
  private async verifyPayment(proof: X402PaymentProof): Promise<boolean> {
    try {
      // 1. Basic validation
      this.validateProof(proof);

      // 2. Atomically claim nonce BEFORE on-chain verification
      const nonceStore = getNonceStore();
      const claimed = nonceStore.claimNonce(proof.nonce, proof.from);
      
      if (!claimed) {
        throw new Error('Nonce already used - replay attack detected');
      }

      try {
        // 3. Check on-chain nonce status
        const isUsedOnChain = await this.facilitatorContract.isNonceUsed(proof.nonce);
        
        if (isUsedOnChain) {
          nonceStore.releaseNonce(proof.nonce);
          throw new Error('Nonce already used on-chain');
        }

        // 4. Verify signature locally (gas-free)
        const isValidSignature = await this.verifySignatureLocally(proof);
        
        if (!isValidSignature) {
          nonceStore.releaseNonce(proof.nonce);
          throw new Error('Invalid signature');
        }

        // 5. Verify with on-chain facilitator
        const isValid = await this.verifyWithFacilitator(proof);

        if (!isValid) {
          nonceStore.releaseNonce(proof.nonce);
          return false;
        }

        // 6. CRITICAL: Settle payment on-chain (actually move USDC)
        const settled = await this.settlePaymentOnChain(proof);

        if (!settled) {
          nonceStore.releaseNonce(proof.nonce);
          throw new Error('Payment settlement failed');
        }

        // Confirm nonce after successful settlement
        nonceStore.confirmNonce(proof.nonce);
        return true;
      } catch (error) {
        // Release nonce on any error
        nonceStore.releaseNonce(proof.nonce);
        throw error;
      }
    } catch (error) {
      this.log('❌ Payment verification error', { 
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return false;
    }
  }

  /**
   * Validate payment proof structure and values
   */
  private validateProof(proof: X402PaymentProof): void {
    // Verify payment amount
    const expectedAmount = BigInt(Math.floor(this.config.priceInUSDC * 1e6));
    const actualAmount = BigInt(proof.amount);

    if (actualAmount < expectedAmount) {
      throw new Error(`Insufficient payment: expected ${this.formatUSDC(expectedAmount.toString())}, got ${this.formatUSDC(proof.amount)}`);
    }

    // Verify token is USDC
    if (proof.token.toLowerCase() !== this.config.usdcAddress.toLowerCase()) {
      throw new Error('Invalid payment token - must be USDC');
    }

    // Verify recipient is service provider
    if (proof.to.toLowerCase() !== this.config.recipientAddress.toLowerCase()) {
      throw new Error('Invalid payment recipient - must be service provider');
    }

    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now();
    if (now - proof.timestamp > 300000) {
      throw new Error('Payment proof expired (max 5 minutes)');
    }

    // Verify valid Ethereum addresses
    if (!ethers.isAddress(proof.from) || !ethers.isAddress(proof.to)) {
      throw new Error('Invalid Ethereum address');
    }
  }

  /**
   * Verify signature locally (gas-free) before on-chain call
   */
  private async verifySignatureLocally(proof: X402PaymentProof): Promise<boolean> {
    try {
      // Reconstruct message hash (must match client signing)
      const messageHash = ethers.solidityPackedKeccak256(
        ['bytes32', 'uint256', 'address', 'address', 'address'],
        [proof.nonce, proof.amount, proof.token, proof.from, proof.to]
      );

      // Recover signer
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        proof.signature
      );

      // Verify signer matches claimed sender
      return recoveredAddress.toLowerCase() === proof.from.toLowerCase();
    } catch (error) {
      this.log('❌ Local signature verification failed', { error });
      return false;
    }
  }

  /**
   * Verify payment with on-chain facilitator contract
   */
  private async verifyWithFacilitator(proof: X402PaymentProof): Promise<boolean> {
    try {
      // Call verifyPayment on facilitator contract (view function, no gas)
      const isValid = await this.facilitatorContract.verifyPayment(
        proof.nonce,
        proof.amount,
        proof.token,
        proof.from,
        proof.to,
        proof.signature
      );

      return isValid;
    } catch (error) {
      this.log('❌ Facilitator verification error', { error });
      
      // In development, allow bypassing facilitator verification
      if (process.env.NODE_ENV === 'development') {
        this.log('⚠️ Bypassing facilitator verification in development mode');
        return true;
      }
      
      return false;
    }
  }

  /**
   * CRITICAL: Settle payment on-chain (actually move USDC)
   * This is called AFTER verification to transfer funds from payer to recipient
   */
  private async settlePaymentOnChain(proof: X402PaymentProof): Promise<boolean> {
    try {
      // In development, skip on-chain settlement
      if (process.env.NODE_ENV === 'development') {
        this.log('⚠️ Skipping on-chain settlement in development mode');
        return true;
      }

      // Check if private key configured for settlement
      if (!this.config.privateKey) {
        const errorMsg = 'No private key configured for settlement - payments cannot be processed';
        this.log('❌ ' + errorMsg);
        this.log('   Configure SETTLEMENT_PRIVATE_KEY environment variable');
        throw new Error(errorMsg);
      }

      this.log('💰 Settling payment on-chain...', {
        from: proof.from,
        to: proof.to,
        amount: this.formatUSDC(proof.amount)
      });

      // Create wallet for settlement
      const wallet = new ethers.Wallet(this.config.privateKey, this.provider);
      const facilitatorWithSigner = this.facilitatorContract.connect(wallet);

      // Call settlePayment (this moves USDC from payer to recipient)
      const tx = await facilitatorWithSigner.settlePayment(
        proof.nonce,
        proof.amount,
        proof.token,
        proof.from,
        proof.to,
        proof.signature
      );

      this.log('📝 Settlement transaction sent:', { hash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait();

      this.log('✅ Payment settled on-chain', {
        block: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString()
      });

      return true;
    } catch (error) {
      this.log('❌ On-chain settlement error', { 
        error: error instanceof Error ? error.message : 'Unknown'
      });
      
      // If settlement fails, the request should fail too
      return false;
    }
  }

  /**
   * Update payment statistics
   */
  private updateStats(address: string, amountUSDC: number): void {
    const stats = this.paymentStats.get(address) || { count: 0, totalUSDC: 0 };
    stats.count++;
    stats.totalUSDC += amountUSDC;
    this.paymentStats.set(address, stats);
  }

  /**
   * Get payment statistics
   */
  getStats(): Map<string, { count: number; totalUSDC: number }> {
    return this.paymentStats;
  }

  /**
   * Get stats for specific address
   */
  getAddressStats(address: string): { count: number; totalUSDC: number } | null {
    return this.paymentStats.get(address) || null;
  }

  /**
   * Format USDC amount (6 decimals)
   */
  private formatUSDC(amount: string): string {
    return (parseInt(amount) / 1e6).toFixed(6);
  }

  /**
   * Logging helper
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging === false) return;

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [X402] ${message}`);
    
    if (data) {
      console.log('  ', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Monitor facilitator contract events
   */
  async startEventMonitoring(): Promise<void> {
    this.log('🔍 Starting facilitator event monitoring');

    this.facilitatorContract.on('PaymentSettled', (payer, recipient, amount, nonce) => {
      this.log('💰 Payment Settled Event', {
        payer,
        recipient,
        amount: this.formatUSDC(amount.toString()),
        nonce: nonce.substring(0, 10) + '...'
      });
    });
  }

  /**
   * Stop event monitoring
   */
  stopEventMonitoring(): void {
    this.facilitatorContract.removeAllListeners();
    this.log('🛑 Stopped facilitator event monitoring');
  }
}

/**
 * Example Express setup with x402
 */
export function setupX402(app: any) {
  const x402 = new X402Middleware({
    facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS!,
    usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    recipientAddress: process.env.SERVICE_PROVIDER_ADDRESS!,  // Service provider receives payment
    priceInUSDC: 0.05,
    network: process.env.NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
    enableLogging: true,
    privateKey: process.env.SETTLEMENT_PRIVATE_KEY  // Optional: for automatic on-chain settlement
  });

  // Start monitoring events
  x402.startEventMonitoring().catch(console.error);

  // Protected endpoint example
  app.post('/api/createMarket', x402.requirePayment(), async (req: Request, res: Response) => {
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

  // Stats endpoint
  app.get('/api/x402/stats', (req: Request, res: Response) => {
    const stats = x402.getStats();
    const statsArray = Array.from(stats.entries()).map(([address, data]) => ({
      address,
      ...data
    }));

    res.json({
      totalUsers: stats.size,
      payments: statsArray,
      totalVolume: statsArray.reduce((sum, s) => sum + s.totalUSDC, 0)
    });
  });

  return x402;
}
