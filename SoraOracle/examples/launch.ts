import { TokenFactory } from '../src/sdk/TokenFactory';
import { OracleClient } from '@sora-oracle/sdk';
import { X402Middleware } from '../src/middleware/x402';
import { ethers } from 'ethers';
import { createWalletClient, http, parseEther } from 'viem';
import { bscTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Example: Launch a prediction market with token and x402 payment
 * Usage: node examples/launch.ts --market "BTC-100K" --supply 1000000000
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const marketName = args[args.indexOf('--market') + 1] || 'BTC-100K';
  const supply = parseInt(args[args.indexOf('--supply') + 1] || '1000000000');

  console.log('🚀 Sora Oracle - Token Minting Factory');
  console.log('=====================================\n');
  console.log(`Market: ${marketName}`);
  console.log(`Initial Supply: ${supply.toLocaleString()}`);
  console.log(`Network: BNB Chain Testnet\n`);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(
    process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545/'
  );
  
  const signer = new ethers.Wallet(
    process.env.PRIVATE_KEY!,
    provider
  );

  console.log(`Wallet: ${await signer.getAddress()}\n`);

  // Initialize Oracle Client
  const oracleClient = new OracleClient({
    contractAddress: process.env.ORACLE_ADDRESS || '0x4124227dEf2A0c9BBa315dF13CD7B546f5839516',
    provider
  });

  // Initialize Token Factory
  const tokenFactory = new TokenFactory({
    provider,
    factoryAddress: process.env.TOKEN_FACTORY_ADDRESS!,
    oracleClient,
    signer
  });

  try {
    // Step 1: Prepare x402 payment
    console.log('Step 1: Preparing x402 payment...');
    
    const payment = await X402Middleware.createPaymentProof({
      amount: 0.05, // $0.05 USDC
      token: process.env.USDC_ADDRESS! as `0x${string}`,
      to: process.env.PAYMENT_RECIPIENT! as `0x${string}`,
      from: await signer.getAddress() as `0x${string}`,
      privateKey: process.env.PRIVATE_KEY as `0x${string}`
    });

    console.log('✅ Payment proof created');
    console.log(`   Nonce: ${payment.nonce}`);
    console.log(`   Amount: ${payment.amount} (0.05 USDC)\n`);

    // Step 2: Call /launchMarket endpoint with payment
    console.log('Step 2: Calling /launchMarket endpoint...');
    
    const response = await fetch('http://localhost:3001/launchMarket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payment': JSON.stringify(payment)
      },
      body: JSON.stringify({
        marketName,
        initialSupply: supply,
        oracleFeed: process.env.ORACLE_FEED_ADDRESS!
      })
    });

    if (response.status === 402) {
      const error = await response.json();
      console.error('❌ Payment required:');
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error);
      return;
    }

    const result = await response.json();
    console.log('✅ Market creation successful!');
    console.log(`   Token Address: ${result.tokenAddress}`);
    console.log(`   Settlement Hash: ${result.settlementHash}\n`);

    // Step 3: Deploy token directly (alternative flow)
    console.log('Step 3: Direct token deployment...');
    
    const deployment = await tokenFactory.deployToken(
      marketName,
      supply,
      process.env.ORACLE_FEED_ADDRESS!
    );

    console.log('\n✅ Token Deployment Complete!');
    console.log('===============================');
    console.log(`Token Address: ${deployment.address}`);
    console.log(`Symbol: ${deployment.symbol}`);
    console.log(`Total Supply: ${deployment.totalSupply}`);
    console.log(`Oracle Feed: ${deployment.oracleFeed}`);
    console.log(`Deployment Tx: ${deployment.deploymentTx}`);
    console.log(`\nMetadata saved to: output/tokens/${deployment.symbol}_${deployment.address.slice(0, 8)}.json`);
    
    console.log('\n🎉 Launch complete! Ready for community trading.');
    console.log(`\nTweet this:\n`);
    console.log(`Just launched ${marketName} on @SoraOracle with ${supply.toLocaleString()} tokens! 🚀`);
    console.log(`Token: ${deployment.address}`);
    console.log(`Join the BNB prediction market meta! 📊`);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);
