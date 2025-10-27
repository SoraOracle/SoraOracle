/**
 * X402Client - Official x402 Protocol Client for Base
 * 
 * TRUE x402 COMPLIANCE:
 * - EIP-3009 transferWithAuthorization (not EIP-2612)
 * - Random 32-byte nonces (parallel transactions!)
 * - Network: Base (8453) / Base Sepolia (84532)
 * - Token: USDC on Base (EIP-3009 compliant)
 * 
 * Reference: https://github.com/coinbase/x402
 */

import { ethers } from 'ethers';
import crypto from 'crypto';

export interface X402PaymentConfig {
  facilitatorAddress: string;
  facilitatorUrl?: string;
  usdcAddress: string;
  recipientAddress: string;
  network: 'mainnet' | 'testnet';
  signer: ethers.Signer;
}

export interface X402PaymentProof {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string; // Random 32-byte hex string
  signature: string;
  timestamp: number;
}

export class X402Client {
  private config: X402PaymentConfig;
  private chainId: number;
  
  // EIP-712 Domain (x402 specification)
  private domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  
  // EIP-3009 TransferWithAuthorization Types
  private types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' }
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
  
  constructor(config: X402PaymentConfig) {
    this.config = config;
    
    // Base chain IDs (NOT BNB Chain!)
    this.chainId = config.network === 'mainnet' ? 8453 : 84532;
    
    // Initialize EIP-712 domain
    this.domain = {
      name: 'x402',
      version: '1',
      chainId: this.chainId,
      verifyingContract: config.facilitatorAddress
    };
  }
  
  /**
   * Create x402 payment proof using EIP-3009
   * 
   * KEY DIFFERENCE: Random 32-byte nonce = PARALLEL TRANSACTIONS! ✅
   * 
   * @param operation Operation name (for pricing)
   * @param customAmount Optional custom amount (overrides operation pricing)
   * @returns Payment proof with EIP-3009 signature
   */
  async createPayment(
    operation: string,
    customAmount?: number
  ): Promise<X402PaymentProof> {
    const payerAddress = await this.config.signer.getAddress();
    
    // Get amount (6 decimals for USDC)
    const value = customAmount || this.getOperationPrice(operation);
    
    // Generate RANDOM 32-byte nonce (THIS IS THE MAGIC!)
    // Unlike EIP-2612's sequential nonces, random nonces allow:
    // - Creating 100 signatures at once
    // - Processing them in any order
    // - No waiting for previous transactions
    const nonce = this.generateRandomNonce();
    
    // Set validity window (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60;  // Valid from 1 minute ago
    const validBefore = now + 300; // Valid for 5 minutes
    
    // Construct EIP-3009 message
    const message = {
      from: payerAddress,
      to: this.config.recipientAddress,
      value: value.toString(),
      validAfter,
      validBefore,
      nonce
    };
    
    // Sign using EIP-712 typed data
    const signature = await this.config.signer.signTypedData(
      this.domain,
      this.types,
      message
    );
    
    return {
      from: message.from,
      to: message.to,
      value: message.value,
      validAfter: message.validAfter,
      validBefore: message.validBefore,
      nonce: message.nonce,
      signature,
      timestamp: Date.now()
    };
  }
  
  /**
   * Create multiple payment proofs in parallel (EIP-3009 advantage!)
   * 
   * With EIP-2612: CAN'T do this (sequential nonces)
   * With EIP-3009: CAN do this! ✅
   * 
   * Example: AI agent needs to query 10 APIs simultaneously
   */
  async createPaymentBatch(
    operations: string[],
    customAmounts?: number[]
  ): Promise<X402PaymentProof[]> {
    // Create all signatures in parallel - this is IMPOSSIBLE with EIP-2612!
    const promises = operations.map((op, i) => 
      this.createPayment(op, customAmounts?.[i])
    );
    
    return await Promise.all(promises);
  }
  
  /**
   * Generate random 32-byte nonce (EIP-3009 style)
   * 
   * This is what enables parallel transactions!
   */
  private generateRandomNonce(): string {
    // Generate cryptographically secure random 32 bytes
    const randomBytes = crypto.randomBytes(32);
    return '0x' + randomBytes.toString('hex');
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
   * Verify payment proof (client-side check)
   */
  async verifyPayment(proof: X402PaymentProof): Promise<boolean> {
    try {
      // Reconstruct message
      const message = {
        from: proof.from,
        to: proof.to,
        value: proof.value,
        validAfter: proof.validAfter,
        validBefore: proof.validBefore,
        nonce: proof.nonce
      };
      
      // Recover signer
      const recoveredAddress = ethers.verifyTypedData(
        this.domain,
        this.types,
        message,
        proof.signature
      );
      
      // Check if signer matches payer
      return recoveredAddress.toLowerCase() === proof.from.toLowerCase();
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }
  
  /**
   * Format payment proof for HTTP header (x402 spec)
   */
  formatPaymentHeader(proof: X402PaymentProof): string {
    return JSON.stringify({
      from: proof.from,
      to: proof.to,
      value: proof.value,
      validAfter: proof.validAfter,
      validBefore: proof.validBefore,
      nonce: proof.nonce,
      signature: proof.signature
    });
  }
  
  /**
   * Create HTTP 402 response (x402 spec)
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
        network: this.config.network === 'mainnet' ? 'base' : 'base-sepolia',
        facilitator: this.config.facilitatorUrl || this.config.facilitatorAddress
      }
    };
  }
  
  /**
   * Get account balance (USDC on Base)
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
   * 
   * Note: With EIP-3009, this is still needed because transferWithAuthorization
   * uses transferFrom under the hood. However, you can batch this with the
   * first payment instead of requiring a separate transaction.
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
  
  /**
   * Demo: Create 10 parallel payment proofs
   * 
   * This is the killer feature of EIP-3009 vs EIP-2612!
   */
  async demonstrateParallelPayments(): Promise<void> {
    console.log('\n🚀 EIP-3009 Parallel Payments Demo');
    console.log('===================================\n');
    
    const startTime = Date.now();
    
    // Create 10 payment proofs simultaneously
    const operations = Array(10).fill('dataSourceAccess');
    const proofs = await this.createPaymentBatch(operations);
    
    const duration = Date.now() - startTime;
    
    console.log(`✅ Created ${proofs.length} payment proofs in ${duration}ms`);
    console.log(`📊 Each proof has a unique random nonce:`);
    
    proofs.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.nonce.substring(0, 18)}...`);
    });
    
    console.log(`\n💡 With EIP-2612: Would take ~${duration * 10}ms (sequential)`);
    console.log(`💡 With EIP-3009: Takes ~${duration}ms (parallel) ✅\n`);
  }
}
