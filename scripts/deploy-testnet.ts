import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * Deploy TokenFactory and PredictionMarketV5 to BNB Testnet
 * Usage: npx hardhat run scripts/deploy-testnet.ts --network bscTestnet
 */
async function main() {
  console.log('🚀 Deploying Sora Oracle V5.0 to BNB Testnet');
  console.log('===========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} BNB\n`);

  // Configuration
  const X402_FACILITATOR = process.env.X402_FACILITATOR || '0x0000000000000000000000000000000000000001';
  const USDC_ADDRESS = process.env.USDC_TESTNET || '0x64544969ed7EBf5f083679233325356EbE738930'; // BSC Testnet USDC

  // Deploy TokenFactory
  console.log('Deploying TokenFactory...');
  const TokenFactory = await ethers.getContractFactory('TokenFactory');
  const tokenFactory = await TokenFactory.deploy();
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  
  console.log(`✅ TokenFactory deployed to: ${tokenFactoryAddress}`);
  console.log(`   Transaction: ${tokenFactory.deploymentTransaction()?.hash}\n`);

  // Deploy PredictionMarketV5
  console.log('Deploying PredictionMarketV5...');
  const PredictionMarket = await ethers.getContractFactory('PredictionMarketV5');
  const predictionMarket = await PredictionMarket.deploy(
    tokenFactoryAddress,
    X402_FACILITATOR,
    USDC_ADDRESS
  );
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  
  console.log(`✅ PredictionMarketV5 deployed to: ${predictionMarketAddress}`);
  console.log(`   Transaction: ${predictionMarket.deploymentTransaction()?.hash}\n`);

  // Save deployment addresses
  const deploymentInfo = {
    network: 'bscTestnet',
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      TokenFactory: {
        address: tokenFactoryAddress,
        tx: tokenFactory.deploymentTransaction()?.hash
      },
      PredictionMarketV5: {
        address: predictionMarketAddress,
        tx: predictionMarket.deploymentTransaction()?.hash
      }
    },
    configuration: {
      x402Facilitator: X402_FACILITATOR,
      usdcToken: USDC_ADDRESS
    }
  };

  const deploymentsDir = path.join(process.cwd(), 'deployments');
  await fs.promises.mkdir(deploymentsDir, { recursive: true });

  const filename = `testnet-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  await fs.promises.writeFile(
    filepath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('Deployment Summary');
  console.log('==================');
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${filepath}`);

  // Update .env.example
  console.log('\n📝 Add these to your .env file:');
  console.log(`TOKEN_FACTORY_ADDRESS=${tokenFactoryAddress}`);
  console.log(`PREDICTION_MARKET_ADDRESS=${predictionMarketAddress}`);
  console.log(`X402_FACILITATOR=${X402_FACILITATOR}`);
  console.log(`USDC_ADDRESS=${USDC_ADDRESS}`);

  console.log('\n✅ Deployment complete!');
  console.log('\nNext steps:');
  console.log('1. Verify contracts on BSCScan');
  console.log('2. Update .env with contract addresses');
  console.log('3. Run: node examples/launch.ts --market "BTC-100K" --supply 1000000000');
  console.log('4. Test market creation with x402 payments');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
