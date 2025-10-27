/**
 * Multi-Wallet S402 Pool Demo
 * 
 * Demonstrates parallel s402 transactions on BNB Chain using
 * multiple worker wallets to overcome EIP-2612 sequential nonces.
 */

import { ethers } from 'ethers';
import { S402Client } from '../src/sdk/S402Client';
import { MultiWalletS402Pool } from '../src/sdk/MultiWalletS402Pool';

// BNB Testnet configuration
const BNB_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const BNB_TESTNET_USDC = '0x64544969ed7EBf5f083679233325356EbE738930'; // Example
const FACILITATOR_ADDRESS = '0x...'; // Your S402Facilitator contract

async function multiWalletDemo() {
  console.log('\n🚀 Multi-Wallet S402 Pool Demo\n');
  console.log('Demonstrating 10x parallel transaction speedup on BNB Chain\n');
  
  // Step 1: Setup master wallet
  const provider = new ethers.JsonRpcProvider(BNB_TESTNET_RPC);
  const masterWallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log(`💼 Master Wallet: ${masterWallet.address}`);
  
  // Step 2: Create multi-wallet pool
  const pool = new MultiWalletS402Pool({
    masterWallet,
    facilitatorConfig: {
      facilitatorAddress: FACILITATOR_ADDRESS,
      usdcAddress: BNB_TESTNET_USDC,
      recipientAddress: masterWallet.address,
      network: 'testnet',
      signer: masterWallet
    },
    walletCount: 10, // 10 worker wallets
    autoFund: true,
    fundingAmountUSDC: '10' // $10 USDC per wallet
  });
  
  await pool.initialize();
  
  // Step 3: Check worker balances
  const balances = await pool.getWorkerBalances();
  console.log('\n💰 Worker Wallet Balances:');
  balances.forEach((b, i) => {
    console.log(`   Wallet ${i + 1}: ${b.balance} USDC`);
  });
  
  // Step 4: Execute 10 parallel API calls
  console.log('\n⚡ Executing 10 parallel oracle API requests...\n');
  
  const apiOperations = Array(10).fill('dataSourceAccess');
  
  const { totalTimeMs, receipts } = await pool.executeParallelOperations(apiOperations);
  
  // Step 5: Show results
  console.log('\n📊 RESULTS:');
  console.log(`   ✅ Processed: ${receipts.length} transactions`);
  console.log(`   ⏱️  Total Time: ${totalTimeMs}ms (${(totalTimeMs / 1000).toFixed(2)}s)`);
  console.log(`   📈 Average: ${(totalTimeMs / receipts.length).toFixed(1)}ms per operation`);
  
  // Calculate speedup
  const sequentialTime = receipts.length * 2000; // 2s per sequential operation
  const speedup = sequentialTime / totalTimeMs;
  console.log(`   🚀 Speedup: ${speedup.toFixed(1)}x faster than sequential`);
  console.log(`   💾 Gas Saved: ~${(receipts.length - 1)} approval transactions\n`);
  
  // Step 6: Show pool statistics
  const stats = await pool.getStats();
  console.log('📈 Pool Statistics:');
  console.log(`   Total Wallets: ${stats.totalWallets}`);
  console.log(`   Total Balance: ${stats.totalBalanceUSDC} USDC`);
  console.log(`   Average Balance: ${stats.averageBalanceUSDC} USDC per wallet\n`);
  
  console.log('✅ Demo complete!\n');
}

// Sequential comparison for reference
async function sequentialDemo() {
  console.log('\n📉 Sequential S402 Demo (for comparison)\n');
  
  const provider = new ethers.JsonRpcProvider(BNB_TESTNET_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  const client = new S402Client({
    facilitatorAddress: FACILITATOR_ADDRESS,
    usdcAddress: BNB_TESTNET_USDC,
    recipientAddress: wallet.address,
    network: 'testnet',
    signer: wallet
  });
  
  console.log('⏱️  Processing 10 operations sequentially...\n');
  
  const startTime = Date.now();
  
  for (let i = 0; i < 10; i++) {
    const proof = await client.createPayment('dataSourceAccess');
    await client.executePermit(proof);
    console.log(`   ${i + 1}/10 complete...`);
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log(`\n⏱️  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Average: ${(totalTime / 10).toFixed(1)}ms per operation\n`);
}

// Run both demos
async function main() {
  try {
    // Sequential approach
    await sequentialDemo();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Parallel approach with multi-wallet pool
    await multiWalletDemo();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
