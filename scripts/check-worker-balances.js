/**
 * Check Worker Wallet Balances
 * Monitors USDC balances across all worker wallets
 */

const { ethers } = require('ethers');
require('dotenv').config();

const USDC_MAINNET = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';

async function main() {
  console.log('\n🔍 Checking worker wallet balances...\n');

  // Read worker addresses from environment or config
  const workerAddresses = process.env.WORKER_ADDRESSES?.split(',') || [];
  
  if (workerAddresses.length === 0) {
    console.log('❌ No worker addresses configured!');
    console.log('Set WORKER_ADDRESSES in .env as comma-separated list\n');
    process.exit(1);
  }

  // Connect to BNB Chain
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  
  const usdc = new ethers.Contract(
    USDC_MAINNET,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  
  let totalBalance = 0;
  let lowBalanceCount = 0;
  const balances = [];
  
  console.log('Worker Balances:');
  console.log('━'.repeat(60));
  
  for (let i = 0; i < workerAddresses.length; i++) {
    const address = workerAddresses[i].trim();
    const balance = await usdc.balanceOf(address);
    const balanceUSDC = parseFloat(ethers.formatUnits(balance, 6));
    
    totalBalance += balanceUSDC;
    balances.push(balanceUSDC);
    
    let status = '✅';
    if (balanceUSDC < 10) {
      status = '⚠️  LOW';
      lowBalanceCount++;
    } else if (balanceUSDC > 500) {
      status = '⚠️  HIGH';
    }
    
    console.log(`Worker ${i}: ${address.slice(0, 10)}... | ${balanceUSDC.toFixed(2)} USDC ${status}`);
  }
  
  console.log('━'.repeat(60));
  
  const avgBalance = totalBalance / workerAddresses.length;
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  
  console.log(`\n📊 Statistics:`);
  console.log(`Total Balance:   ${totalBalance.toFixed(2)} USDC`);
  console.log(`Average Balance: ${avgBalance.toFixed(2)} USDC`);
  console.log(`Min Balance:     ${minBalance.toFixed(2)} USDC`);
  console.log(`Max Balance:     ${maxBalance.toFixed(2)} USDC`);
  console.log(`Low Balance:     ${lowBalanceCount} wallets < $10 USDC`);
  
  if (lowBalanceCount > 0) {
    console.log(`\n⚠️  WARNING: ${lowBalanceCount} worker(s) need refunding!`);
    console.log(`Run: node scripts/fund-workers.js --amount=100`);
  } else {
    console.log('\n✅ All workers have sufficient balance');
  }
  
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Balance check failed!');
    console.error(error);
    process.exit(1);
  });
