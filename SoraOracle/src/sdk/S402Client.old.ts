/**
 * S402Client - Sora's HTTP 402 Protocol Client for BNB Chain
 * 
 * S402 (Sora 402):
 * - Inspired by Coinbase's x402
 * - Optimized for BNB Chain (not Base)
 * - Uses EIP-2612 (not EIP-3009)
 * - Sequential nonces + NoncePoolManager for parallel operations
 * 
 * Reference: S402_SPECIFICATION.md
 */

import { ethers } from 'ethers';

export interface S402PaymentConfig {
  facilitatorAddress: string;
  facilitatorUrl?: string;
  usdcAddress: string;
  recipientAddress: string;
  network: 'mainnet' | 'testnet';
  signer: ethers.Signer;
}

export interface S402PaymentProof {
  recipient: string;
  amount: string;
  assetContract: string;
  nonce: string;
  expiration: number;
  signature: string;
  payer: string;
  timestamp: number;
}

export class S402Client {
  private config: S402PaymentConfig;
  private chainId: number;
  
  // EIP-712 Domain
  private domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  
  // EIP-712 Types
  private types = {
    Payment: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'assetContract', type: 'address' },
      { name: 'nonce', type: 'string' },
      { name: 'expiration', type: 'uint256' }
    ]
  };
  
  // Operation pricing (in USDC, 6 decimals)
  private operationPrices: Record<string, number> = {
    'createMarket': 50000,        // $0.05 USDC
    'placeBet': 10000,            // $0.01 USDC
    'resolveMarket': 100000,      // $0.10 USDC
    'dataSourceAccess': 30000,    // $0.03 USDC (gateway)
    'batchOperations': 150000,    // $0.15 USDC
    'default': 10000              // $0.01 USDC
  };
  
  constructor(config: S402PaymentConfig) {
    this.config = config;
    this.chainId = config.network === 'mainnet' ? 56 : 97; // BNB Chain IDs
    
    // Initialize EIP-712 domain
    this.domain = {
      name: 's402',
      version: '1',
      chainId: this.chainId,
      verifyingContract: config.facilitatorAddress
    };
  }
  
  /**
   * Create s402 payment proof using EIP-712 typed data signing
   * 
   * @param operation Operation name (for pricing)
   * @param customAmount Optional custom amount (overrides operation pricing)
   * @returns Payment proof with signature
   */
  async createPayment(
    operation: string,
    customAmount?: number
  ): Promise<S402PaymentProof> {
    const payerAddress = await this.config.signer.getAddress();
    
    // Get amount (6 decimals for USDC)
    const amount = customAmount || this.getOperationPrice(operation);
    
    // Generate unique nonce
    const nonce = this.generateNonce(operation);
    
    // Set expiration (1 hour from now)
    const expiration = Math.floor(Date.now() / 1000) + 3600;
    
    // Construct message
    const message = {
      recipient: this.config.recipientAddress,
      amount: amount.toString(),
      assetContract: this.config.usdcAddress,
      nonce,
      expiration
    };
    
    // Sign using EIP-712 typed data
    const signature = await this.config.signer.signTypedData(
      this.domain,
      this.types,
      message
    );
    
    return {
      recipient: message.recipient,
      amount: message.amount,
      assetContract: message.assetContract,
      nonce: message.nonce,
      expiration: message.expiration,
      signature,
      payer: payerAddress,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get operation price in USDC (6 decimals)
   */
  getOperationPrice(operation: string): number {
    return this.operationPrices[operation] || this.operationPrices['default'];
  }
  
  /**
   * Set custom operation price
   */
  setOperationPrice(operation: string, priceUSDC: number): void {
    // Convert dollars to 6-decimal USDC
    this.operationPrices[operation] = Math.floor(priceUSDC * 1_000_000);
  }
  
  /**
   * Generate unique nonce for payment
   */
  private generateNonce(operation: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${operation}-${timestamp}-${random}`;
  }
  
  /**
   * Verify payment proof (client-side check)
   */
  async verifyPayment(proof: S402PaymentProof): Promise<boolean> {
    try {
      // Reconstruct message
      const message = {
        recipient: proof.recipient,
        amount: proof.amount,
        assetContract: proof.assetContract,
        nonce: proof.nonce,
        expiration: proof.expiration
      };
      
      // Recover signer
      const recoveredAddress = ethers.verifyTypedData(
        this.domain,
        this.types,
        message,
        proof.signature
      );
      
      // Check if signer matches payer
      return recoveredAddress.toLowerCase() === proof.payer.toLowerCase();
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }
  
  /**
   * Format payment proof for HTTP header
   */
  formatPaymentHeader(proof: S402PaymentProof): string {
    return JSON.stringify({
      recipient: proof.recipient,
      amount: proof.amount,
      assetContract: proof.assetContract,
      nonce: proof.nonce,
      expiration: proof.expiration,
      signature: proof.signature,
      payer: proof.payer
    });
  }
  
  /**
   * Create HTTP 402 response (for server use)
   */
  create402Response(resource: string, price: number): object {
    return {
      status: 402,
      message: 'Payment Required',
      paymentRequired: {
        recipient: this.config.recipientAddress,
        chainId: this.chainId.toString(),
        assetContract: this.config.usdcAddress,
        amount: price.toString(),
        resource,
        network: this.config.network === 'mainnet' ? 'bsc' : 'bsc-testnet',
        facilitator: this.config.facilitatorUrl || this.config.facilitatorAddress
      }
    };
  }
  
  /**
   * Get account balance (USDC)
   */
  async getBalance(): Promise<string> {
    const usdcContract = new ethers.Contract(
      this.config.usdcAddress,
      ['function balanceOf(address) view returns (uint256)'],
      this.config.signer
    );
    
    const address = await this.config.signer.getAddress();
    const balance = await usdcContract.balanceOf(address);
    
    // Convert from 6 decimals to human-readable
    return ethers.formatUnits(balance, 6);
  }
  
  /**
   * Approve facilitator to spend USDC (required before first payment)
   */
  async approveUSDC(amount?: number): Promise<ethers.TransactionReceipt> {
    const usdcContract = new ethers.Contract(
      this.config.usdcAddress,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      this.config.signer
    );
    
    // Approve max if no amount specified
    const approvalAmount = amount || ethers.MaxUint256;
    
    const tx = await usdcContract.approve(
      this.config.facilitatorAddress,
      approvalAmount
    );
    
    return await tx.wait();
  }
  
  /**
   * Check USDC allowance
   */
  async checkAllowance(): Promise<string> {
    const usdcContract = new ethers.Contract(
      this.config.usdcAddress,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      this.config.signer
    );
    
    const address = await this.config.signer.getAddress();
    const allowance = await usdcContract.allowance(
      address,
      this.config.facilitatorAddress
    );
    
    return ethers.formatUnits(allowance, 6);
  }
}

// Export legacy name for backward compatibility
export { S402Client as X402Client, S402PaymentProof as X402PaymentProof, S402PaymentConfig as X402PaymentConfig };
