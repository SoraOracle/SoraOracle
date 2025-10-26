import { ethers } from 'ethers';
import { PredictionMarketSDK } from '../src/sdk/PredictionMarketSDK';
import { AIResearchAgent } from '../src/ai/AIResearchAgent';
import { OracleClient } from '@sora-oracle/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Example: Using the Prediction Market SDK with x402 Payments
 * 
 * This demonstrates:
 * 1. Creating markets WITHOUT token factory (traditional)
 * 2. Creating markets WITH token factory (optional)
 * 3. Placing bets with x402 micropayments
 * 4. Resolving markets with AI research agent
 */

async function main() {
  // Setup
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log('🚀 Sora Oracle SDK - V5.0 Examples\n');
  console.log(`Wallet: ${await signer.getAddress()}`);
  console.log(`Balance: ${ethers.formatEther(await provider.getBalance(await signer.getAddress()))} BNB\n`);

  // Initialize Oracle Client (required)
  const oracleClient = new OracleClient({
    provider,
    oracleAddress: process.env.ORACLE_ADDRESS!
  });

  // Initialize SDK (with optional token factory)
  const sdk = new PredictionMarketSDK({
    provider,
    signer,
    marketContractAddress: process.env.PREDICTION_MARKET_ADDRESS!,
    oracleClient,
    x402Config: {
      facilitatorUrl: process.env.X402_FACILITATOR_URL!,
      facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS!, // REQUIRED: Contract address
      usdcAddress: process.env.USDC_ADDRESS!,
      network: 'testnet'
    },
    tokenFactoryAddress: process.env.TOKEN_FACTORY_ADDRESS // Optional!
  });

  console.log('📊 SDK Pricing (x402 micropayments):');
  const pricing = sdk.getPricing();
  console.log(`  - Create Market: $${pricing.createMarket.toFixed(2)}`);
  console.log(`  - Place Bet: $${pricing.placeBet.toFixed(2)}`);
  console.log(`  - Resolve Market: $${pricing.resolveMarket.toFixed(2)}`);
  console.log(`  - AI Research: $${pricing.aiResearch.toFixed(2)} per call`);
  console.log(`  - Data Source: $${pricing.dataSourceAccess.toFixed(2)} per API\n`);

  // Example 1: Create traditional market (NO token factory)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Example 1: Traditional Market (No Token)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const traditionalMarket = await sdk.createMarket({
      question: 'Will BTC reach $100K by end of 2025?',
      oracleFeed: process.env.ORACLE_FEED_ADDRESS!,
      resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year
      useTokenFactory: false // Traditional market
    });

    console.log('✅ Traditional Market Created:');
    console.log(`  Market ID: ${traditionalMarket.marketId}`);
    console.log(`  Transaction: ${traditionalMarket.transactionHash}`);
    console.log(`  Payment: $${pricing.createMarket} USDC paid\n`);
  } catch (error) {
    console.error('❌ Failed to create traditional market:', error);
  }

  // Example 2: Create market WITH token factory
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Example 2: Market with Token Minting');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const tokenMarket = await sdk.createMarket({
      question: 'Will ETH reach $10K by end of 2025?',
      oracleFeed: process.env.ORACLE_FEED_ADDRESS!,
      resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 365,
      useTokenFactory: true,        // Enable token minting!
      tokenSupply: '1000000000'     // 1 billion tokens
    });

    console.log('✅ Token Market Created:');
    console.log(`  Market ID: ${tokenMarket.marketId}`);
    console.log(`  Token Address: ${tokenMarket.tokenAddress}`);
    console.log(`  Token Symbol: ETH10K`);
    console.log(`  Transaction: ${tokenMarket.transactionHash}`);
    console.log(`  Payment: $${pricing.createMarket} USDC paid\n`);
  } catch (error) {
    console.error('❌ Failed to create token market:', error);
  }

  // Example 3: Place a bet (with x402 payment)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Example 3: Place Bet with x402');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const bet = await sdk.placeBet({
      marketId: 1,
      position: true, // YES
      amount: '0.1'   // 0.1 BNB
    });

    console.log('✅ Bet Placed:');
    console.log(`  Position: YES`);
    console.log(`  Amount: 0.1 BNB`);
    console.log(`  Transaction: ${bet.transactionHash}`);
    console.log(`  Micropayment: $${pricing.placeBet} USDC paid\n`);
  } catch (error) {
    console.error('❌ Failed to place bet:', error);
  }

  // Example 4: Resolve market with AI research
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Example 4: AI-Powered Market Resolution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Initialize AI Research Agent
    const aiAgent = new AIResearchAgent(sdk['x402Client']);

    console.log('🤖 Available Data Sources:');
    const sources = aiAgent.getAvailableSources();
    sources.forEach(source => {
      console.log(`  - ${source.name}: $${source.costPerCall} per call`);
    });
    console.log();

    // Research market question
    const research = await aiAgent.researchMarket(
      'Will BTC reach $100K by end of 2025?',
      process.env.ORACLE_FEED_ADDRESS!,
      {
        maxCost: 0.25,
        minConfidence: 0.75,
        preferredSources: ['CoinGecko', 'CryptoCompare', 'NewsAPI']
      }
    );

    console.log('📊 AI Research Results:');
    console.log(`  Outcome: ${research.outcome ? 'YES' : 'NO'}`);
    console.log(`  Confidence: ${(research.confidence * 100).toFixed(1)}%`);
    console.log(`  Sources Used: ${research.sources.join(', ')}`);
    console.log(`  Reasoning: ${research.reasoning}`);
    console.log(`  Total Cost: $${research.totalCost.toFixed(4)}`);
    console.log(`  Payments Made: ${research.payments.length}\n`);

    // Resolve market with AI result
    const resolution = await sdk.resolveMarket({
      marketId: 1,
      useAI: true
    });

    console.log('✅ Market Resolved:');
    console.log(`  Outcome: ${resolution.outcome ? 'YES' : 'NO'}`);
    console.log(`  AI Research Used: ${resolution.aiResearchUsed}`);
    console.log(`  Transaction: ${resolution.transactionHash}`);
    console.log(`  Total Payment: $${pricing.resolveMarket} USDC\n`);
  } catch (error) {
    console.error('❌ Failed to resolve market:', error);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary: x402 Micropayment Costs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const totalCost = 
    pricing.createMarket * 2 +  // 2 markets
    pricing.placeBet +          // 1 bet
    pricing.resolveMarket +     // 1 resolution
    0.06;                       // AI research (~$0.06)

  console.log(`Total spent in examples: ~$${totalCost.toFixed(2)} USDC`);
  console.log('\nAll operations protected by x402 micropayments ✅');
  console.log('Token factory is OPTIONAL - use when you need it! 🎯\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
