/**
 * x402 Gateway + Self-Expanding Agent Demo
 * 
 * Shows complete flow:
 * 1. Agent pays gateway via x402 on BNB Chain
 * 2. Gateway proxies to external APIs
 * 3. Agent performs consensus research
 * 4. Oracle settlement
 * 
 * Run:
 * # Terminal 1: Start gateway
 * npm run gateway:start
 * 
 * # Terminal 2: Run demo
 * npm run gateway:demo
 */

import { ethers } from 'ethers';
import { X402Client } from '../src/sdk/X402Client';
import { SelfExpandingResearchAgent } from '../src/ai/SelfExpandingResearchAgent';
import { GatewayClient } from '../gateway/client';
import dotenv from 'dotenv';

dotenv.config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Gateway
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:3000',
  
  // BNB Chain
  network: (process.env.NETWORK || 'testnet') as 'mainnet' | 'testnet',
  rpcUrl: process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
  
  // x402
  facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
  usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  gatewayRecipient: process.env.GATEWAY_WALLET_ADDRESS || '',
  
  // OpenAI
  openaiKey: process.env.OPENAI_API_KEY || ''
};

// =============================================================================
// SETUP
// =============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🌉 x402 Gateway + Self-Expanding Agent Demo');
  console.log('='.repeat(70));

  // Initialize wallet
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
    provider
  );

  console.log(`\n💼 Agent Wallet: ${wallet.address}`);
  console.log(`🌉 Gateway: ${CONFIG.gatewayUrl}`);
  console.log(`💰 Gateway Recipient: ${CONFIG.gatewayRecipient || 'Not configured'}`);

  // Initialize x402 client
  const x402Client = new X402Client({
    facilitatorUrl: CONFIG.facilitatorAddress,
    facilitatorAddress: CONFIG.facilitatorAddress,
    usdcAddress: CONFIG.usdcAddress,
    recipientAddress: CONFIG.gatewayRecipient || wallet.address,
    network: CONFIG.network,
    signer: wallet
  });

  // Initialize gateway client
  const gatewayClient = new GatewayClient({
    gatewayUrl: CONFIG.gatewayUrl,
    x402Client
  });

  // Initialize research agent
  const agent = new SelfExpandingResearchAgent(
    CONFIG.openaiKey,
    x402Client
  );

  // =============================================================================
  // TEST 1: Gateway Health Check
  // =============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('🏥 TEST 1: Gateway Health Check');
  console.log('='.repeat(70));

  const isHealthy = await gatewayClient.healthCheck();
  console.log(`Gateway status: ${isHealthy ? '✅ Healthy' : '❌ Down'}`);

  if (!isHealthy) {
    console.log('\n❌ Gateway is not running!');
    console.log('💡 Start gateway first: npm run gateway:start');
    process.exit(1);
  }

  // =============================================================================
  // TEST 2: Get Gateway Pricing
  // =============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('💵 TEST 2: Gateway Pricing');
  console.log('='.repeat(70));

  const pricing = await gatewayClient.getPricing();
  console.log('\nAvailable APIs:');
  pricing.apis.forEach((api: any) => {
    console.log(`  • ${api.name.padEnd(15)} - $${api.price} USDC  (${api.endpoint})`);
  });

  // =============================================================================
  // TEST 3: Call API via Gateway (with x402 payment)
  // =============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('🔐 TEST 3: Call API via Gateway (x402 payment)');
  console.log('='.repeat(70));

  console.log('\n📊 Calling CoinGecko via gateway...');
  console.log('  Question: What is the current Bitcoin price?');

  try {
    // Agent pays gateway, gateway calls CoinGecko
    const btcPrice = await gatewayClient.callCoinGecko('/simple/price', {
      ids: 'bitcoin',
      vs_currencies: 'usd'
    });

    console.log('\n✅ Received data from gateway:');
    console.log(`  Bitcoin price: $${btcPrice.bitcoin.usd.toLocaleString()}`);
    console.log(`  Payment: $0.03 USDC (agent → gateway)`);
    console.log(`  Gateway cost: $0 (free tier CoinGecko)`);
    console.log(`  Gateway profit: $0.03`);

  } catch (error) {
    console.log('\n❌ Gateway call failed:', error instanceof Error ? error.message : error);
    console.log('\n💡 In development mode, x402 payments are bypassed');
    console.log('💡 In production, agent must approve USDC and pay gateway');
  }

  // =============================================================================
  // TEST 4: Research Question (Full Oracle Flow)
  // =============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('🔬 TEST 4: Self-Expanding Agent Research');
  console.log('='.repeat(70));

  const question = 'Will Bitcoin reach $100,000 by end of 2025?';
  console.log(`\n📝 Question: "${question}"`);
  console.log('\n🤖 Agent will:');
  console.log('  1. Analyze question → identify "crypto" category');
  console.log('  2. Query CoinGecko, CryptoCompare (via gateway with x402)');
  console.log('  3. Perform statistical consensus');
  console.log('  4. Return high-confidence answer');

  try {
    console.log('\n⏳ Researching...\n');
    
    const result = await agent.researchMarket(question, {
      maxCost: 0.50,
      minSources: 3,
      allowDiscovery: false // Use existing sources only
    });

    console.log('\n✅ Research Complete!');
    console.log(`  Outcome: ${result.outcome ? 'YES' : 'NO'}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  Sources queried: ${result.sources.length}`);
    console.log(`  Reasoning: ${result.reasoning}`);
    console.log(`  Total cost: $${result.totalCost.toFixed(4)} USDC`);

    if (result.confidence >= 0.85) {
      console.log('\n🎯 Confidence threshold met → Oracle can auto-settle');
    } else {
      console.log('\n⚠️  Confidence too low → Manual review recommended');
    }

  } catch (error) {
    console.log('\n❌ Research failed:', error instanceof Error ? error.message : error);
  }

  // =============================================================================
  // TEST 5: Gateway Statistics
  // =============================================================================

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST 5: Gateway Statistics');
  console.log('='.repeat(70));

  try {
    const stats = await gatewayClient.getStats();
    
    console.log(`\n💰 Total Revenue: $${stats.totalRevenue.toFixed(4)} USDC`);
    console.log(`💸 Total Costs: $${stats.totalCost.toFixed(4)} USDC`);
    console.log(`📈 Total Profit: $${stats.totalProfit.toFixed(4)} USDC`);
    console.log(`📊 Profit Margin: ${stats.profitMargin.toFixed(1)}%`);
    console.log(`🔢 Total Calls: ${stats.totalTransactions}`);

    if (stats.apiBreakdown && stats.apiBreakdown.length > 0) {
      console.log('\n📋 API Breakdown:');
      stats.apiBreakdown.forEach((api: any) => {
        console.log(`  • ${api.name}: ${api.totalCalls} calls, $${api.totalRevenue.toFixed(4)} revenue`);
      });
    }

  } catch (error) {
    console.log('\n❌ Could not fetch stats');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Demo complete!');
  console.log('='.repeat(70) + '\n');
}

// =============================================================================
// RUN
// =============================================================================

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
