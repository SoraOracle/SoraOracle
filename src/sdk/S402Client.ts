/**
 * S402Client - True EIP-2612 Implementation for BNB Chain
 * 
 * CORRECT s402 FLOW:
 * 1. Sign EIP-2612 permit (owner/spender/value/nonce/deadline) against USDC contract
 * 2. Submit permit + transferFrom to S402Facilitator
 * 3. Facilitator executes: permit() then transferFrom()
 * 
 * Network: BNB Chain (56) / BNB Testnet (97)
 * Token: USDC on BNB Chain (EIP-2612 compliant)
 * 
 * Reference: https://eips.ethereum.org/EIPS/eip-2612
 */

import { ethers } from 'ethers';

export interface S402PaymentConfig {
  facilitatorAddress: string;    // S402Facilitator contract
  facilitatorUrl?: string;        // API endpoint (optional)
  usdcAddress: string;            // USDC token contract on BNB Chain
  recipientAddress: string;       // Service provider address
  network: 'mainnet' | 'testnet'; // BNB Chain mainnet (56) or testnet (97)
  signer: ethers.Signer;
}

/**
 * EIP-2612 Permit Signature
 * This is signed against the USDC TOKEN contract, not the facilitator!
 */
export interface EIP2612Permit {
  owner: string;      // User's address
  spender: string;    // S402Facilitator address (approved to spend)
  value: string;      // Amount in USDC atomic units (6 decimals)
  nonce: number;      // Sequential nonce from USDC.nonces(owner)
  deadline: number;   // Expiration timestamp
  v: number;          // Signature components
  r: string;
  s: string;
}

/**
 * s402 Payment Proof (includes permit + metadata)
 */
export interface S402PaymentProof {
  permit: EIP2612Permit;
  recipient: string;        // Final recipient (service provider)
  operation: string;        // Operation name (for tracking)
  timestamp: number;        // Creation time
  chainId: number;          // 56 (mainnet) or 97 (testnet)
}

export class S402Client {
  private config: S402PaymentConfig;
  private chainId: number;
  
  // EIP-712 Domain for USDC contract (not facilitator!)
  private domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string; // USDC address
  };
  
  // EIP-2612 Permit Types
  private types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
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
    
    // CRITICAL: Domain is USDC contract, not facilitator!
    this.domain = {
      name: 'USD Coin',           // USDC token name
      version: '2',                // USDC version
      chainId: this.chainId,
      verifyingContract: config.usdcAddress // USDC address!
    };
  }
  
  /**
   * Create EIP-2612 permit signature
   * 
   * @param operation Operation name (for pricing)
   * @param customAmount Optional custom amount (overrides operation pricing)
   * @returns Payment proof with EIP-2612 permit
   */
  async createPayment(
    operation: string,
    customAmount?: number
  ): Promise<S402PaymentProof> {
    const owner = await this.config.signer.getAddress();
    
    // Get amount (6 decimals for USDC)
    const value = customAmount || this.getOperationPrice(operation);
    
    // Get current nonce from USDC contract
    const nonce = await this.getCurrentNonce(owner);
    
    // Set deadline (1 hour from now)
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    // Construct EIP-2612 permit message
    const permitMessage = {
      owner,
      spender: this.config.facilitatorAddress, // Facilitator approved to spend
      value: value.toString(),
      nonce,
      deadline
    };
    
    // Sign using EIP-712 typed data (against USDC contract!)
    const signature = await this.config.signer.signTypedData(
      this.domain,
      this.types,
      permitMessage
    );
    
    // Split signature into v, r, s
    const sig = ethers.Signature.from(signature);
    
    return {
      permit: {
        owner: permitMessage.owner,
        spender: permitMessage.spender,
        value: permitMessage.value,
        nonce: permitMessage.nonce,
        deadline: permitMessage.deadline,
        v: sig.v,
        r: sig.r,
        s: sig.s
      },
      recipient: this.config.recipientAddress,
      operation,
      timestamp: Date.now(),
      chainId: this.chainId
    };
  }
  
  /**
   * Get current nonce from USDC contract for a user
   */
  async getCurrentNonce(owner: string): Promise<number> {
    const usdcContract = new ethers.Contract(
      this.config.usdcAddress,
      ['function nonces(address owner) view returns (uint256)'],
      this.config.signer
    );
    
    const nonce = await usdcContract.nonces(owner);
    return Number(nonce);
  }
  
  /**
   * Verify EIP-2612 permit signature (client-side check)
   */
  async verifyPermit(proof: S402PaymentProof): Promise<boolean> {
    try {
      const permitMessage = {
        owner: proof.permit.owner,
        spender: proof.permit.spender,
        value: proof.permit.value,
        nonce: proof.permit.nonce,
        deadline: proof.permit.deadline
      };
      
      // Reconstruct signature
      const signature = ethers.Signature.from({
        v: proof.permit.v,
        r: proof.permit.r,
        s: proof.permit.s
      }).serialized;
      
      // Recover signer
      const recoveredAddress = ethers.verifyTypedData(
        this.domain,
        this.types,
        permitMessage,
        signature
      );
      
      // Check if signer matches owner
      return recoveredAddress.toLowerCase() === proof.permit.owner.toLowerCase();
    } catch (error) {
      console.error('Permit verification failed:', error);
      return false;
    }
  }
  
  /**
   * Execute permit + transferFrom on-chain
   * This is called by the facilitator or can be called directly
   */
  async executePermit(proof: S402PaymentProof): Promise<ethers.TransactionReceipt> {
    const facilitatorContract = new ethers.Contract(
      this.config.facilitatorAddress,
      [
        `function settlePaymentWithPermit(
          address owner,
          address spender,
          uint256 value,
          uint256 deadline,
          uint8 v,
          bytes32 r,
          bytes32 s,
          address recipient
        ) external returns (bool)`
      ],
      this.config.signer
    );
    
    const tx = await facilitatorContract.settlePaymentWithPermit(
      proof.permit.owner,
      proof.permit.spender,
      proof.permit.value,
      proof.permit.deadline,
      proof.permit.v,
      proof.permit.r,
      proof.permit.s,
      proof.recipient
    );
    
    return await tx.wait();
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
   * Format payment proof for HTTP header (for gateway use)
   */
  formatPaymentHeader(proof: S402PaymentProof): string {
    return JSON.stringify({
      owner: proof.permit.owner,
      spender: proof.permit.spender,
      value: proof.permit.value,
      nonce: proof.permit.nonce,
      deadline: proof.permit.deadline,
      v: proof.permit.v,
      r: proof.permit.r,
      s: proof.permit.s,
      recipient: proof.recipient,
      operation: proof.operation
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
        facilitator: this.config.facilitatorUrl || this.config.facilitatorAddress,
        protocol: 's402',
        standard: 'EIP-2612'
      }
    };
  }
  
  /**
   * Get USDC balance
   */
  async getBalance(): Promise<string> {
    const usdcContract = new ethers.Contract(
      this.config.usdcAddress,
      ['function balanceOf(address) view returns (uint256)'],
      this.config.signer
    );
    
    const address = await this.config.signer.getAddress();
    const balance = await usdcContract.balanceOf(address);
    
    return ethers.formatUnits(balance, 6);
  }
  
  /**
   * Check USDC allowance for facilitator
   * Note: With EIP-2612, users don't need to pre-approve!
   * Permit does the approval in the same transaction.
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

// Export legacy names for backward compatibility
export { S402Client as X402Client, S402PaymentProof as X402PaymentProof, S402PaymentConfig as X402PaymentConfig };
