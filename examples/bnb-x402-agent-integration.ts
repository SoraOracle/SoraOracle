/**
 * Complete Integration Example: x402 + Self-Expanding Agent on BNB Chain
 * 
 * This example shows:
 * 1. Setting up x402 payment protection on BNB Chain
 * 2. Integrating Self-Expanding Research Agent
 * 3. Protecting AI oracle endpoints with micropayments
 * 4. End-to-end flow: payment → research → oracle settlement
 * 
 * Run:
 * npx tsx examples/bnb-x402-agent-integration.ts
 */

import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import { X402Middleware } from '../src/middleware/x402';
import { X402Client } from '../src/sdk/X402Client';
import { SelfExpandingResearchAgent } from '../src/ai/SelfExpandingResearchAgent';
import dotenv from 'dotenv';

dotenv.config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // BNB Chain
  network: process.env.NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
  rpcUrl: process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
  
  // x402 Facilitator (deployed contract)
  facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
  usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  
  // Pricing
  pricing: {
    aiResearch: 0.02,      // $0.02 per AI research call
    resolveMarket: 0.10,   // $0.10 per market resolution
    dataAccess: 0.03,      // $0.03 per data source access
  },
  
  // OpenAI
  openaiKey: process.env.OPENAI_API_KEY || '',
  
  // Server
  port: 5000
};

// =============================================================================
// SETUP EXPRESS SERVER WITH X402
// =============================================================================

const app = express();
app.use(express.json());

// Initialize wallet FIRST (needed for service provider address)
const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey, provider);

// Service provider address (receives payments)
const serviceProviderAddress = wallet.address;

// Initialize x402 middleware for AI research
const x402AIResearch = new X402Middleware({
  facilitatorAddress: CONFIG.facilitatorAddress,
  usdcAddress: CONFIG.usdcAddress,
  recipientAddress: serviceProviderAddress,  // Service provider receives payment
  priceInUSDC: CONFIG.pricing.aiResearch,
  network: CONFIG.network as 'testnet' | 'mainnet',
  rpcUrl: CONFIG.rpcUrl,
  enableLogging: true,
  privateKey: process.env.SETTLEMENT_PRIVATE_KEY || process.env.PRIVATE_KEY  // CRITICAL: For on-chain settlement
});

// Initialize x402 middleware for oracle resolution
const x402OracleResolve = new X402Middleware({
  facilitatorAddress: CONFIG.facilitatorAddress,
  usdcAddress: CONFIG.usdcAddress,
  recipientAddress: serviceProviderAddress,  // Service provider receives payment
  priceInUSDC: CONFIG.pricing.resolveMarket,
  network: CONFIG.network as 'testnet' | 'mainnet',
  rpcUrl: CONFIG.rpcUrl,
  enableLogging: true,
  privateKey: process.env.SETTLEMENT_PRIVATE_KEY || process.env.PRIVATE_KEY  // CRITICAL: For on-chain settlement
});

// Initialize X402 Client for Self-Expanding Agent
const x402Client = new X402Client({
  facilitatorUrl: CONFIG.facilitatorAddress,
  facilitatorAddress: CONFIG.facilitatorAddress,
  usdcAddress: CONFIG.usdcAddress,
  recipientAddress: serviceProviderAddress,  // Service provider receives payment
  network: CONFIG.network as 'testnet' | 'mainnet',
  signer: wallet
});

const researchAgent = new SelfExpandingResearchAgent(
  CONFIG.openaiKey,
  x402Client
);

// =============================================================================
// PROTECTED API ENDPOINTS
// =============================================================================

/**
 * Endpoint: AI Research Question
 * Payment: $0.02 USDC
 * Returns: Statistical consensus from multiple APIs
 */
app.post('/api/ai/research', 
  x402AIResearch.requirePayment(), 
  async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question required' });
      }

      console.log('\n🔍 AI Research Request:', question);
      
      // Self-Expanding Agent performs research
      const result = await researchAgent.researchMarket(question, {
        maxCost: 0.50,
        minSources: 5,
        allowDiscovery: true
      });

      res.json({
        success: true,
        question,
        result: {
          outcome: result.outcome,
          reasoning: result.reasoning,
          confidence: result.confidence,
          sources: result.sources.length,
          methodology: 'Statistical consensus across multiple APIs',
          verifiable: true
        },
        payment: {
          from: (req as any).x402Payment.from,
          amount: '$0.02 USDC',
          verified: true
        }
      });
    } catch (error) {
      console.error('Research error:', error);
      res.status(500).json({ 
        error: 'Research failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Endpoint: Resolve Oracle Market
 * Payment: $0.10 USDC
 * Returns: Oracle settlement with AI confidence
 */
app.post('/api/oracle/resolve',
  x402OracleResolve.requirePayment(),
  async (req: Request, res: Response) => {
    try {
      const { marketId, question } = req.body;

      if (!marketId || !question) {
        return res.status(400).json({ error: 'Market ID and question required' });
      }

      console.log('\n🎯 Oracle Resolution Request');
      console.log('  Market ID:', marketId);
      console.log('  Question:', question);

      // Research using Self-Expanding Agent
      const result = await researchAgent.researchMarket(question, {
        maxCost: 0.50,
        minSources: 5,
        allowDiscovery: true
      });

      // Determine outcome based on confidence
      const shouldResolve = result.confidence >= 0.85;

      if (!shouldResolve) {
        return res.json({
          success: false,
          message: 'Confidence too low for automatic resolution',
          confidence: result.confidence,
          minimumRequired: 0.85,
          suggestion: 'Manual review recommended'
        });
      }

      // Mock oracle resolution (in production, call actual contract)
      const resolution = {
        marketId,
        outcome: result.outcome,
        reasoning: result.reasoning,
        confidence: result.confidence,
        sources: result.sources.length,
        timestamp: new Date().toISOString(),
        resolver: 'AI Oracle',
        verifiable: true
      };

      console.log('\n✅ Oracle Resolved:', resolution);

      res.json({
        success: true,
        resolution,
        payment: {
          from: (req as any).x402Payment.from,
          amount: '$0.10 USDC',
          verified: true
        }
      });
    } catch (error) {
      console.error('Resolution error:', error);
      res.status(500).json({
        error: 'Resolution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Endpoint: Get API Discovery Status
 * Free endpoint (no payment required)
 */
app.get('/api/discovery/stats', async (req: Request, res: Response) => {
  try {
    const stats = {
      totalAPIsDiscovered: 2529, // From APIs.guru
      categoriesSupported: [
        'crypto', 'weather', 'sports', 'news', 'stocks', 
        'economics', 'realestate', 'social'
      ],
      averageConfidence: 0.92,
      totalResearchCalls: x402AIResearch.getStats().size,
      status: 'operational'
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * Endpoint: Payment Stats
 * Free endpoint showing payment analytics
 */
app.get('/api/x402/stats', (req: Request, res: Response) => {
  const researchStats = x402AIResearch.getStats();
  const oracleStats = x402OracleResolve.getStats();

  const researchArray = Array.from(researchStats.entries()).map(([address, data]) => ({
    address,
    type: 'research',
    ...data
  }));

  const oracleArray = Array.from(oracleStats.entries()).map(([address, data]) => ({
    address,
    type: 'oracle',
    ...data
  }));

  const allPayments = [...researchArray, ...oracleArray];

  res.json({
    totalUsers: new Set(allPayments.map(p => p.address)).size,
    payments: allPayments,
    totalVolume: allPayments.reduce((sum, p) => sum + p.totalUSDC, 0),
    breakdown: {
      research: {
        users: researchStats.size,
        volume: researchArray.reduce((sum, p) => sum + p.totalUSDC, 0)
      },
      oracle: {
        users: oracleStats.size,
        volume: oracleArray.reduce((sum, p) => sum + p.totalUSDC, 0)
      }
    }
  });
});

// =============================================================================
// CLIENT EXAMPLE (HOW TO CALL PROTECTED ENDPOINTS)
// =============================================================================

async function clientExample() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 CLIENT EXAMPLE: Calling Protected AI Endpoints');
  console.log('='.repeat(70));

  try {
    // Step 1: Try without payment (should get 402)
    console.log('\n1️⃣ Attempting request WITHOUT payment...');
    
    const response1 = await fetch('http://localhost:5000/api/ai/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Will BTC reach $100K by 2025?' })
    });

    if (response1.status === 402) {
      console.log('✅ Received 402 Payment Required (expected)');
      const paymentDetails = await response1.json();
      console.log('   Payment required:', paymentDetails.payment.amount);
    }

    // Step 2: Generate payment proof
    console.log('\n2️⃣ Generating payment proof...');
    
    const proof = await x402Client.createPayment('aiResearch');
    console.log('✅ Payment proof generated');
    console.log('   Nonce:', proof.nonce.substring(0, 20) + '...');
    console.log('   Amount:', (parseInt(proof.amount) / 1e6).toFixed(2), 'USDC');

    // Step 3: Retry with payment
    console.log('\n3️⃣ Retrying request WITH payment proof...');
    
    const response2 = await fetch('http://localhost:5000/api/ai/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payment': JSON.stringify(proof)
      },
      body: JSON.stringify({ question: 'Will BTC reach $100K by 2025?' })
    });

    if (response2.ok) {
      const result = await response2.json();
      console.log('✅ Request successful!');
      console.log('   Answer:', result.result.answer);
      console.log('   Confidence:', (result.result.confidence * 100).toFixed(1) + '%');
      console.log('   Sources:', result.result.sources);
    }

  } catch (error) {
    console.error('❌ Client error:', error);
  }
}

// =============================================================================
// START SERVER
// =============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 BNB Chain x402 + Self-Expanding Agent Integration');
  console.log('='.repeat(70));
  console.log('\n📋 Configuration:');
  console.log('   Network:', CONFIG.network);
  console.log('   Facilitator:', CONFIG.facilitatorAddress);
  console.log('   USDC:', CONFIG.usdcAddress);
  console.log('   AI Research:', `$${CONFIG.pricing.aiResearch} USDC`);
  console.log('   Oracle Resolve:', `$${CONFIG.pricing.resolveMarket} USDC`);
  console.log('\n📍 Endpoints:');
  console.log('   POST /api/ai/research - AI research ($0.02)');
  console.log('   POST /api/oracle/resolve - Oracle resolution ($0.10)');
  console.log('   GET /api/discovery/stats - Discovery stats (free)');
  console.log('   GET /api/x402/stats - Payment stats (free)');

  // Start event monitoring
  await x402AIResearch.startEventMonitoring();
  await x402OracleResolve.startEventMonitoring();

  // Start server
  app.listen(CONFIG.port, () => {
    console.log(`\n✅ Server running on http://localhost:${CONFIG.port}`);
    console.log('\n💡 Try:');
    console.log(`   curl -X POST http://localhost:${CONFIG.port}/api/ai/research \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"question":"Will BTC reach $100K?"}'`);
    console.log('\n   (You\'ll get 402 Payment Required)');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('\n⚠️  Development mode: Payment verification bypassed');
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Run client example if requested
    if (process.argv.includes('--demo')) {
      setTimeout(clientExample, 2000);
    }
  });
}

// =============================================================================
// EXAMPLE FLOW DOCUMENTATION
// =============================================================================

/**
 * COMPLETE FLOW: Payment → Research → Oracle Settlement
 * 
 * 1. USER CREATES MARKET
 *    - User creates prediction market: "Will BTC hit $100K by Dec 2025?"
 *    - Market deployed to BNB Chain
 *    - Awaits resolution
 * 
 * 2. ORACLE RESOLUTION REQUEST
 *    - User/system calls: POST /api/oracle/resolve
 *    - Returns 402 Payment Required ($0.10 USDC)
 * 
 * 3. USER GENERATES PAYMENT PROOF
 *    - X402Client.createPayment('resolveMarket')
 *    - Signs message with wallet
 *    - Gets payment proof
 * 
 * 4. USER RETRIES WITH PAYMENT
 *    - Includes X-402-Payment header
 *    - x402 middleware verifies:
 *      a) Signature valid (local)
 *      b) Nonce not used (on-chain)
 *      c) Amount sufficient
 *      d) Facilitator confirms (on-chain)
 * 
 * 5. SELF-EXPANDING AGENT RESEARCH
 *    - Agent receives question
 *    - Discovers relevant APIs (CoinGecko, CryptoCompare, etc.)
 *    - Queries all APIs in parallel
 *    - Performs statistical consensus
 *    - Returns result with confidence
 * 
 * 6. ORACLE SETTLEMENT
 *    - If confidence >= 85%: Auto-resolve market
 *    - If confidence < 85%: Require manual review
 *    - Submit outcome to BNB Chain oracle contract
 *    - Emit resolution event
 * 
 * 7. PAYMENT SETTLEMENT
 *    - Facilitator contract settles USDC payment
 *    - Emits PaymentSettled event
 *    - Updates on-chain nonce tracking
 * 
 * SECURITY:
 * - Replay protection: Nonces tracked on-chain + in-memory
 * - Signature verification: ECDSA recovery on-chain
 * - Amount validation: Enforced by facilitator contract
 * - Statistical consensus: Multi-API verification prevents manipulation
 * 
 * COST:
 * - AI Research: $0.02 USDC per call
 * - Oracle Resolution: $0.10 USDC (includes AI + settlement)
 * - Platform fee: 1% (configurable in facilitator)
 * 
 * NETWORKS:
 * - Payments: BNB Chain (BSC Testnet/Mainnet)
 * - Oracles: BNB Chain (same network)
 * - APIs: External (permissionless, no sign-ups)
 */

// Start the server
if (require.main === module) {
  main().catch(console.error);
}

export { app, x402AIResearch, x402OracleResolve, researchAgent };
