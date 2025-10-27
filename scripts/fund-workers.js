/**
 * Fund Worker Wallets with USDC
 * Distributes USDC from master wallet to all worker wallets
 */

const { ethers } = require('ethers');
require('dotenv').config();

const USDC_MAINNET = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const WORKER_COUNT = 10;

async function main() {
  const args = process.argv.slice(2);
  const amountPerWallet = args.find(arg => arg.startsWith('--amount='))?.split('=')[1] || '100';
  
  console.log(`\n💰 Funding ${WORKER_COUNT} worker wallets with ${amountPerWallet} USDC each...\n`);

  // Connect to BNB Chain
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  const masterWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`📝 Master Wallet: ${masterWallet.address}`);
  
  // Check master balance
  const usdc = new ethers.Contract(
    USDC_MAINNET,
    [
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)'
    ],
    masterWallet
  );
  
  const masterBalance = await usdc.balanceOf(masterWallet.address);
  console.log(`💵 Master Balance: ${ethers.formatUnits(masterBalance, 6)} USDC\n`);
  
  const totalNeeded = ethers.parseUnits((parseFloat(amountPerWallet) * WORKER_COUNT).toString(), 6);
  
  if (masterBalance < totalNeeded) {
    throw new Error(`❌ Insufficient USDC! Need ${ethers.formatUnits(totalNeeded, 6)} USDC, have ${ethers.formatUnits(masterBalance, 6)} USDC`);
  }
  
  // Load or generate worker wallets
  const workers = [];
  for (let i = 0; i < WORKER_COUNT; i++) {
    const wallet = ethers.Wallet.createRandom().connect(provider);
    workers.push(wallet);
  }
  
  // Fund each worker
  const amount = ethers.parseUnits(amountPerWallet, 6);
  
  console.log('📤 Transferring USDC to workers...\n');
  
  for (let i = 0; i < workers.length; i++) {
    const worker = workers[i];
    console.log(`Worker ${i}: ${worker.address}`);
    
    const tx = await usdc.transfer(worker.address, amount);
    const receipt = await tx.wait();
    
    console.log(`  ✅ Sent ${amountPerWallet} USDC (tx: ${receipt.hash.slice(0, 10)}...)`);
  }
  
  console.log(`\n✅ Successfully funded ${WORKER_COUNT} workers!`);
  console.log(`\n💾 Save these worker private keys securely:\n`);
  
  workers.forEach((w, i) => {
    console.log(`Worker ${i}: ${w.privateKey}`);
  });
  
  console.log('\n⚠️  Store these keys in secure vault!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Funding failed!');
    console.error(error);
    process.exit(1);
  });
