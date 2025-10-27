/**
 * X402Client - Official x402 Protocol Client for BNB Chain
 * 
 * Implements Coinbase x402 specification with EIP-712 typed data signing
 * 
 * Reference: https://github.com/coinbase/x402
 */

import { ethers } from 'ethers';

export interface X402PaymentConfig {
  facilitatorAddress: string;
  facilitatorUrl?: string;  // Optional HTTP endpoint
  usdcAddress: string;
  recipientAddress: string;
  network: 'mainnet' | 'testnet';
  signer: ethers.Signer;
}

export interface X402PaymentProof {
  recipient: string;
  amount: string;
  assetContract: string;
  nonce: string;
  expiration: number;
  signature: string;
  payer: string;
  timestamp: number;
}

export interface X402PermitData {
  deadline: number;
  v: number;
  r: string;
  s: string;
}

export class X402Client {
  private config: X402PaymentConfig;
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
  
  constructor(config: X402PaymentConfig) {
    this.config = config;
    this.chainId = config.network === 'mainnet' ? 56 : 97; // BNB Chain IDs
    
    // Initialize EIP-712 domain
    this.domain = {
      name: 'x402',
      version: '1',
      chainId: this.chainId,
      verifyingContract: config.facilitatorAddress
    };
  }
  
  /**
   * Create x402 payment proof using EIP-712 typed data signing
   * 
   * @param operation Operation name (for pricing)
   * @param customAmount Optional custom amount (overrides operation pricing)
   * @returns Payment proof with signature
   */
  async createPayment(
    operation: string,
    customAmount?: number
  ): Promise<X402PaymentProof> {
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
   * Create payment with EIP-2612 Permit (gasless approval)
   * 
   * @param operation Operation name
   * @param customAmount Optional custom amount
   * @returns Payment proof + permit data
   */
  async createPaymentWithPermit(
    operation: string,
    customAmount?: number
  ): Promise<{ payment: X402PaymentProof; permit: X402PermitData }> {
    // Create payment proof
    const payment = await this.createPayment(operation, customAmount);
    
    // Create permit signature for EIP-2612
    const permit = await this.createPermitSignature(
      parseInt(payment.amount),
      payment.expiration
    );
    
    return { payment, permit };
  }
  
  /**
   * Create EIP-2612 Permit signature (gasless USDC approval)
   */
  private async createPermitSignature(
    amount: number,
    deadline: number
  ): Promise<X402PermitData> {
    const ownerAddress = await this.config.signer.getAddress();
    
    // Get current nonce from USDC contract
    const usdcContract = new ethers.Contract(
      this.config.usdcAddress,
      [
        'function nonces(address) view returns (uint256)',
        'function name() view returns (string)',
        'function DOMAIN_SEPARATOR() view returns (bytes32)'
      ],
      this.config.signer
    );
    
    const nonce = await usdcContract.nonces(ownerAddress);
    const tokenName = await usdcContract.name();
    
    // EIP-2612 Permit domain
    const permitDomain = {
      name: tokenName,
      version: '1',
      chainId: this.chainId,
      verifyingContract: this.config.usdcAddress
    };
    
    // EIP-2612 Permit types
    const permitTypes = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    // Permit message
    const permitMessage = {
      owner: ownerAddress,
      spender: this.config.facilitatorAddress,
      value: amount,
      nonce: nonce.toString(),
      deadline
    };
    
    // Sign permit
    const signature = await this.config.signer.signTypedData(
      permitDomain,
      permitTypes,
      permitMessage
    );
    
    // Split signature into v, r, s
    const sig = ethers.Signature.from(signature);
    
    return {
      deadline,
      v: sig.v,
      r: sig.r,
      s: sig.s
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
  async verifyPayment(proof: X402PaymentProof): Promise<boolean> {
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
  formatPaymentHeader(proof: X402PaymentProof): string {
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
