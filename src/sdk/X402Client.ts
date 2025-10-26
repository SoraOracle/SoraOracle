import { ethers } from 'ethers';
import { randomBytes } from 'crypto';

/**
 * X402 Payment Client for SDK
 * Handles micropayments for all SDK operations
 */

export interface X402PaymentConfig {
  facilitatorUrl: string;
  facilitatorAddress: string;  // x402 facilitator contract address
  usdcAddress: string;
  network: 'mainnet' | 'testnet';
  signer: ethers.Signer;
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

export interface X402PricingTier {
  createMarket: number;      // $0.05 USDC
  placeBet: number;          // $0.01 USDC
  resolveMarket: number;     // $0.10 USDC (higher for oracle validation)
  aiResearch: number;        // $0.02 USDC per API call
  dataSourceAccess: number;  // $0.03 USDC per external API
}

export class X402Client {
  private config: X402PaymentConfig;
  private pricing: X402PricingTier;

  constructor(config: X402PaymentConfig) {
    this.config = config;
    
    // Default pricing (in USDC, 6 decimals)
    this.pricing = {
      createMarket: 0.05,      // 5 cents to create market
      placeBet: 0.01,          // 1 cent to place bet
      resolveMarket: 0.10,     // 10 cents to resolve (includes AI)
      aiResearch: 0.02,        // 2 cents per AI research call
      dataSourceAccess: 0.03   // 3 cents per external data API
    };
  }

  /**
   * Generate payment proof for an operation
   * NOTE: This generates the proof that will be formatted for the contract
   */
  async createPayment(
    operation: keyof X402PricingTier
  ): Promise<X402PaymentProof> {
    const amount = this.pricing[operation];
    const amountInUSDC = Math.floor(amount * 1e6).toString(); // Convert to 6 decimals

    // Generate unique nonce
    const nonce = `0x${randomBytes(32).toString('hex')}`;

    // Get signer address
    const from = await this.config.signer.getAddress();

    // Create payment message (NO timestamp in contract version)
    const message = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'address', 'address', 'address'],
      [nonce, amountInUSDC, this.config.usdcAddress, from, this.config.facilitatorAddress]
    );

    // Sign payment proof
    const signature = await this.config.signer.signMessage(ethers.getBytes(message));

    const proof: X402PaymentProof = {
      nonce,
      amount: amountInUSDC,
      token: this.config.usdcAddress,
      from,
      to: this.config.facilitatorAddress,  // MUST be facilitator address
      signature,
      timestamp: Date.now()  // For client-side tracking only
    };

    return proof;
  }

  /**
   * Create payment header for HTTP requests
   */
  async createPaymentHeader(
    operation: keyof X402PricingTier
  ): Promise<{ 'X-402-Payment': string }> {
    const proof = await this.createPayment(operation);
    return {
      'X-402-Payment': JSON.stringify(proof)
    };
  }

  /**
   * Get pricing for an operation
   */
  getPrice(operation: keyof X402PricingTier): number {
    return this.pricing[operation];
  }

  /**
   * Update pricing tier (for custom deployments)
   */
  setPricing(pricing: Partial<X402PricingTier>): void {
    this.pricing = { ...this.pricing, ...pricing };
  }

  /**
   * Verify payment proof (for server-side validation)
   * NOTE: Uses same message format as createPayment (NO timestamp)
   */
  async verifyPayment(proof: X402PaymentProof): Promise<boolean> {
    try {
      // Reconstruct message (MUST match createPayment format)
      const message = ethers.solidityPackedKeccak256(
        ['bytes32', 'uint256', 'address', 'address', 'address'],
        [proof.nonce, proof.amount, proof.token, proof.from, proof.to]
      );

      // Recover signer
      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), proof.signature);

      // Verify signer matches claimed sender
      return recoveredAddress.toLowerCase() === proof.from.toLowerCase();
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }
}
