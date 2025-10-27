/**
 * Multi-Wallet S402 Pool
 * 
 * Enables parallel s402 transactions on BNB Chain by distributing operations
 * across multiple worker wallets, each with independent nonce sequences.
 * 
 * Solves EIP-2612 sequential nonce limitation:
 * - Each wallet processes transactions independently
 * - N wallets = N parallel transaction streams
 * - Round-robin distribution for load balancing
 */

import { ethers } from 'ethers';
import { S402Client, S402PaymentConfig, S402PaymentProof } from './S402Client';

export interface MultiWalletPoolConfig {
  masterWallet: ethers.Wallet;
  facilitatorConfig: S402PaymentConfig;
  walletCount?: number;
  autoFund?: boolean;
  fundingAmountUSDC?: string;
}

export class MultiWalletS402Pool {
  private wallets: ethers.HDNodeWallet[] = [];
  private s402Clients: S402Client[] = [];
  private currentWalletIndex = 0;
  private usdcContract: ethers.Contract;
  
  constructor(
    private config: MultiWalletPoolConfig
  ) {
    const walletCount = config.walletCount || 10;
    
    // Create worker wallets
    this.wallets = Array(walletCount).fill(null).map(() => 
      ethers.Wallet.createRandom().connect(config.masterWallet.provider!)
    );
    
    // Create s402 client for each wallet
    this.s402Clients = this.wallets.map(wallet => 
      new S402Client({
        ...config.facilitatorConfig,
        signer: wallet
      })
    );
    
    // USDC contract for fund management
    this.usdcContract = new ethers.Contract(
      config.facilitatorConfig.usdcAddress,
      [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
      ],
      config.masterWallet
    );
  }
  
  /**
   * Initialize pool by funding worker wallets
   */
  async initialize(): Promise<void> {
    if (this.config.autoFund && this.config.fundingAmountUSDC) {
      await this.fundWorkers(this.config.fundingAmountUSDC);
    }
    
    console.log(`✅ Multi-wallet pool initialized with ${this.wallets.length} workers`);
  }
  
  /**
   * Fund all worker wallets with USDC from master wallet
   * 
   * @param amountPerWallet - USDC amount per wallet (e.g., "10" = 10 USDC)
   */
  async fundWorkers(amountPerWallet: string): Promise<void> {
    const amount = ethers.parseUnits(amountPerWallet, 6); // USDC has 6 decimals
    
    console.log(`📤 Funding ${this.wallets.length} workers with ${amountPerWallet} USDC each...`);
    
    // Transfer USDC to each worker wallet in parallel
    const txPromises = this.wallets.map(wallet =>
      this.usdcContract.transfer(wallet.address, amount)
    );
    
    const receipts = await Promise.all(txPromises.map(tx => tx.then((t: any) => t.wait())));
    
    console.log(`✅ Successfully funded ${receipts.length} worker wallets`);
  }
  
  /**
   * Check balances of all worker wallets
   */
  async getWorkerBalances(): Promise<Array<{ address: string; balance: string }>> {
    const balancePromises = this.wallets.map(async wallet => {
      const balance = await this.usdcContract.balanceOf(wallet.address);
      return {
        address: wallet.address,
        balance: ethers.formatUnits(balance, 6)
      };
    });
    
    return await Promise.all(balancePromises);
  }
  
  /**
   * Get next available wallet (round-robin distribution)
   */
  private getNextWallet(): { wallet: ethers.HDNodeWallet; client: S402Client; index: number } {
    const index = this.currentWalletIndex;
    this.currentWalletIndex = (this.currentWalletIndex + 1) % this.wallets.length;
    
    return {
      wallet: this.wallets[index],
      client: this.s402Clients[index],
      index
    };
  }
  
  /**
   * Create a single s402 payment using next available wallet
   */
  async createPayment(
    operation: string,
    amount?: number
  ): Promise<{ proof: S402PaymentProof; walletIndex: number }> {
    const { client, index } = this.getNextWallet();
    const proof = await client.createPayment(operation, amount);
    
    return { proof, walletIndex: index };
  }
  
  /**
   * Create multiple s402 payments in parallel across all wallets
   * 
   * @param operations - Array of operation types (e.g., ['dataSourceAccess', 'dataSourceAccess'])
   * @param amounts - Optional array of custom amounts
   * @returns Array of payment proofs with wallet indices
   */
  async createParallelPayments(
    operations: string[],
    amounts?: number[]
  ): Promise<Array<{ proof: S402PaymentProof; walletIndex: number }>> {
    console.log(`🔄 Creating ${operations.length} parallel payments across ${this.wallets.length} wallets...`);
    
    const startTime = Date.now();
    
    // Distribute operations across wallets
    const paymentPromises = operations.map((op, i) => {
      const { client, index } = this.getNextWallet();
      return client.createPayment(op, amounts?.[i]).then(proof => ({
        proof,
        walletIndex: index
      }));
    });
    
    const results = await Promise.all(paymentPromises);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Created ${operations.length} payments in ${elapsed}ms (${(elapsed / operations.length).toFixed(1)}ms avg)`);
    
    return results;
  }
  
  /**
   * Execute s402 permits in parallel
   * 
   * @param proofs - Array of payment proofs to execute
   */
  async executeParallelPermits(
    proofs: Array<{ proof: S402PaymentProof; walletIndex: number }>
  ): Promise<ethers.TransactionReceipt[]> {
    console.log(`⚡ Executing ${proofs.length} permits in parallel...`);
    
    const startTime = Date.now();
    
    // Execute all permits in parallel
    const permitPromises = proofs.map(({ proof, walletIndex }) => {
      const client = this.s402Clients[walletIndex];
      return client.executePermit(proof);
    });
    
    const receipts = await Promise.all(permitPromises);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Executed ${proofs.length} permits in ${elapsed}ms (${(elapsed / proofs.length).toFixed(1)}ms avg)`);
    
    return receipts;
  }
  
  /**
   * All-in-one: Create and execute parallel s402 payments
   * 
   * Perfect for oracle API calls - handles everything automatically
   */
  async executeParallelOperations(
    operations: string[],
    amounts?: number[]
  ): Promise<{
    proofs: Array<{ proof: S402PaymentProof; walletIndex: number }>;
    receipts: ethers.TransactionReceipt[];
    totalTimeMs: number;
  }> {
    console.log(`\n🚀 Executing ${operations.length} parallel s402 operations...`);
    
    const startTime = Date.now();
    
    // Step 1: Create all payment proofs in parallel
    const proofs = await this.createParallelPayments(operations, amounts);
    
    // Step 2: Execute all permits in parallel
    const receipts = await this.executeParallelPermits(proofs);
    
    const totalTimeMs = Date.now() - startTime;
    
    console.log(`\n✅ COMPLETE: ${operations.length} operations in ${totalTimeMs}ms`);
    console.log(`   Average: ${(totalTimeMs / operations.length).toFixed(1)}ms per operation`);
    console.log(`   Speedup: ${(operations.length * 2000 / totalTimeMs).toFixed(1)}x vs sequential\n`);
    
    return { proofs, receipts, totalTimeMs };
  }
  
  /**
   * Rebalance USDC across worker wallets
   * 
   * Redistributes funds from high-balance wallets to low-balance ones
   */
  async rebalance(): Promise<void> {
    const balances = await this.getWorkerBalances();
    const avgBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0) / balances.length;
    
    console.log(`⚖️ Rebalancing wallets (target: ${avgBalance.toFixed(2)} USDC)...`);
    
    // TODO: Implement rebalancing logic
    // For now, just log the balances
    balances.forEach((b, i) => {
      const diff = parseFloat(b.balance) - avgBalance;
      console.log(`  Wallet ${i}: ${b.balance} USDC (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`);
    });
  }
  
  /**
   * Sweep all funds back to master wallet
   */
  async sweepToMaster(): Promise<void> {
    console.log(`🧹 Sweeping funds from ${this.wallets.length} workers to master wallet...`);
    
    const balances = await this.getWorkerBalances();
    
    // Transfer all USDC back to master
    const sweepPromises = balances.map((b, i) => {
      const balance = ethers.parseUnits(b.balance, 6);
      if (balance > 0n) {
        const workerUsdc = this.usdcContract.connect(this.wallets[i]) as ethers.Contract;
        return workerUsdc.transfer(this.config.masterWallet.address, balance);
      }
      return Promise.resolve(null);
    });
    
    await Promise.all(sweepPromises);
    console.log(`✅ Sweep complete`);
  }
  
  /**
   * Get pool statistics
   */
  async getStats(): Promise<{
    totalWallets: number;
    totalBalanceUSDC: string;
    averageBalanceUSDC: string;
    walletAddresses: string[];
  }> {
    const balances = await this.getWorkerBalances();
    const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);
    
    return {
      totalWallets: this.wallets.length,
      totalBalanceUSDC: totalBalance.toFixed(2),
      averageBalanceUSDC: (totalBalance / balances.length).toFixed(2),
      walletAddresses: this.wallets.map(w => w.address)
    };
  }
}
