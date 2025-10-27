/**
 * S402-Enabled Oracle Server
 * Oracle endpoints that require micropayments via s402
 */

const express = require('express');
const { ethers } = require('ethers');
const { S402Middleware } = require('./s402-middleware');

const router = express.Router();

// Initialize s402 middleware
const provider = new ethers.JsonRpcProvider(
  process.env.BNB_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545'
);

const facilitatorAddress = process.env.S402_FACILITATOR_ADDRESS;
const usdcAddress = '0x64544969ed7EBf5f083679233325356EbE738930'; // BNB Testnet USDC

if (!facilitatorAddress) {
  console.warn('⚠️  S402_FACILITATOR_ADDRESS not set - s402 payments disabled');
}

const s402 = new S402Middleware(facilitatorAddress, usdcAddress, provider);

/**
 * Protected Oracle Endpoints (Require s402 Payment)
 */

// Get oracle data (paid API)
router.get('/oracle/data/:source', 
  s402.requirePayment('dataSourceAccess'),
  async (req, res) => {
    const { source } = req.params;
    
    console.log(`✅ Payment received from ${req.s402Payment.permit.owner}`);
    console.log(`📊 Fetching oracle data: ${source}`);
    
    // Simulate oracle data fetch
    const oracleData = {
      source: source,
      price: Math.random() * 1000,
      timestamp: Date.now(),
      confidence: 0.95,
      providers: ['PancakeSwap', 'Binance', 'CoinGecko'],
      paidBy: req.s402Payment.permit.owner
    };

    res.json({
      success: true,
      data: oracleData,
      payment: {
        from: req.s402Payment.permit.owner,
        amount: ethers.formatUnits(req.s402Payment.permit.value, 6),
        operation: 'dataSourceAccess'
      }
    });
  }
);

// Batch oracle query (paid)
router.post('/oracle/batch',
  s402.requirePayment('batchQuery'),
  async (req, res) => {
    const { sources } = req.body;
    
    console.log(`✅ Batch payment received from ${req.s402Payment.permit.owner}`);
    console.log(`📊 Fetching data for ${sources?.length || 0} sources`);
    
    // Simulate batch data fetch
    const results = (sources || []).map(source => ({
      source: source,
      price: Math.random() * 1000,
      timestamp: Date.now(),
      confidence: 0.95
    }));

    res.json({
      success: true,
      results: results,
      payment: {
        from: req.s402Payment.permit.owner,
        amount: ethers.formatUnits(req.s402Payment.permit.value, 6),
        operation: 'batchQuery'
      }
    });
  }
);

// Create prediction market (paid)
router.post('/market/create',
  s402.requirePayment('marketCreation'),
  async (req, res) => {
    const { question, outcomes } = req.body;
    
    console.log(`✅ Market creation payment received from ${req.s402Payment.permit.owner}`);
    console.log(`🎯 Creating market: ${question}`);
    
    // Simulate market creation
    const market = {
      id: `market_${Date.now()}`,
      question: question,
      outcomes: outcomes || ['Yes', 'No'],
      creator: req.s402Payment.permit.owner,
      createdAt: Date.now(),
      status: 'active'
    };

    res.json({
      success: true,
      market: market,
      payment: {
        from: req.s402Payment.permit.owner,
        amount: ethers.formatUnits(req.s402Payment.permit.value, 6),
        operation: 'marketCreation'
      }
    });
  }
);

// Resolve market (paid - requires higher payment)
router.post('/market/:id/resolve',
  s402.requirePayment('marketResolution'),
  async (req, res) => {
    const { id } = req.params;
    const { answer } = req.body;
    
    console.log(`✅ Resolution payment received from ${req.s402Payment.permit.owner}`);
    console.log(`🎯 Resolving market ${id}: ${answer}`);
    
    // Simulate market resolution
    const resolution = {
      marketId: id,
      answer: answer,
      resolvedBy: req.s402Payment.permit.owner,
      resolvedAt: Date.now(),
      confidence: 0.99
    };

    res.json({
      success: true,
      resolution: resolution,
      payment: {
        from: req.s402Payment.permit.owner,
        amount: ethers.formatUnits(req.s402Payment.permit.value, 6),
        operation: 'marketResolution'
      }
    });
  }
);

/**
 * Free Endpoints (No Payment Required)
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    s402Enabled: !!facilitatorAddress,
    facilitator: facilitatorAddress,
    usdc: usdcAddress,
    network: 'bsc-testnet'
  });
});

// Get pricing info
router.get('/pricing', (req, res) => {
  const { OPERATION_PRICES } = require('./s402-middleware');
  
  const pricing = {};
  for (const [operation, amount] of Object.entries(OPERATION_PRICES)) {
    pricing[operation] = ethers.formatUnits(amount, 6);
  }

  res.json({
    currency: 'USDC',
    decimals: 6,
    operations: pricing,
    facilitator: facilitatorAddress,
    network: 'bsc-testnet'
  });
});

module.exports = router;
