/**
 * Deploy X402 Facilitator Contract to BNB Chain
 * 
 * This script deploys the x402 payment facilitator contract that enables
 * micropayments for API access on BNB Chain.
 * 
 * Run:
 * npx hardhat run scripts/deploy-x402-facilitator.ts --network bscTestnet
 * npx hardhat run scripts/deploy-x402-facilitator.ts --network bscMainnet
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('\n🚀 Deploying X402 Facilitator to BNB Chain...\n');

  // Get network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);

  // USDC addresses on BNB Chain
  const USDC_ADDRESSES: Record<string, string> = {
    // BSC Mainnet USDC
    '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    // BSC Testnet USDC (if available, otherwise use mock)
    '97': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // Update with testnet USDC
  };

  const usdcAddress = USDC_ADDRESSES[network.chainId.toString()];
  
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for chain ID ${network.chainId}`);
  }

  console.log(`USDC Address: ${usdcAddress}\n`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} BNB\n`);

  // Deploy contract
  console.log('📝 Deploying X402Facilitator contract...');
  
  const X402Facilitator = await ethers.getContractFactory('X402Facilitator');
  const facilitator = await X402Facilitator.deploy(usdcAddress);
  
  await facilitator.waitForDeployment();
  const facilitatorAddress = await facilitator.getAddress();

  console.log(`✅ X402Facilitator deployed to: ${facilitatorAddress}\n`);

  // Verify deployment
  console.log('🔍 Verifying deployment...');
  
  const deployedUsdc = await facilitator.usdc();
  const platformFee = await facilitator.platformFeeBps();
  const owner = await facilitator.owner();

  console.log(`   USDC Token: ${deployedUsdc}`);
  console.log(`   Platform Fee: ${platformFee} bps (${Number(platformFee) / 100}%)`);
  console.log(`   Owner: ${owner}\n`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    facilitatorAddress,
    usdcAddress: deployedUsdc,
    platformFee: platformFee.toString(),
    owner,
    deployer: deployer.address,
    deploymentBlock: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  console.log('📋 Deployment Summary:');
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Environment variable instructions
  console.log('\n' + '='.repeat(70));
  console.log('⚙️  NEXT STEPS');
  console.log('='.repeat(70));
  console.log('\n1. Add to your .env file:');
  console.log(`   X402_FACILITATOR_ADDRESS=${facilitatorAddress}`);
  console.log(`   USDC_ADDRESS=${deployedUsdc}`);
  console.log(`   X402_FACILITATOR_NETWORK=${network.name}`);
  
  console.log('\n2. Update your X402Middleware configuration:');
  console.log(`   const x402 = new X402Middleware({`);
  console.log(`     facilitatorAddress: '${facilitatorAddress}',`);
  console.log(`     usdcAddress: '${deployedUsdc}',`);
  console.log(`     network: '${network.chainId === BigInt(56) ? 'mainnet' : 'testnet'}'`);
  console.log(`   });`);

  console.log('\n3. Grant USDC approval for users:');
  console.log(`   Users need to approve the facilitator to spend USDC:`);
  console.log(`   await usdc.approve('${facilitatorAddress}', amount);`);

  if (network.chainId === BigInt(97)) {
    console.log('\n4. Get testnet USDC:');
    console.log('   Use BSC testnet faucet to get test BNB');
    console.log('   Swap for USDC on testnet DEX or use mock USDC');
  }

  console.log('\n5. Verify contract on BSCScan (optional):');
  console.log(`   npx hardhat verify --network ${network.name} ${facilitatorAddress} ${deployedUsdc}`);

  console.log('\n' + '='.repeat(70) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
