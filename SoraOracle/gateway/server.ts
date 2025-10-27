/**
 * x402 API Gateway Server
 * 
 * Accepts x402 payments from agents and proxies requests to external APIs
 * 
 * Flow:
 * 1. Agent pays gateway via x402 on BNB Chain
 * 2. Gateway calls external API with traditional API key
 * 3. Gateway returns data to agent
 * 
 * Revenue Model:
 * - Agent pays: $0.03 USDC
 * - External API costs: $0.02
 * - Gateway profit: $0.01 per call
 * 
 * Run:
 * npx tsx gateway/server.ts
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { X402Middleware } from '../src/middleware/x402';
import { CostTracker } from './cost-tracker';
import dotenv from 'dotenv';

dotenv.config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  port: process.env.GATEWAY_PORT || 3000,
  
  // x402 settings
  facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
  usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  gatewayWallet: process.env.GATEWAY_WALLET_ADDRESS || '',
  settlementKey: process.env.GATEWAY_SETTLEMENT_KEY || process.env.PRIVATE_KEY || '',
  network: (process.env.NETWORK || 'testnet') as 'mainnet' | 'testnet',
  
  // External API keys
  apiKeys: {
    coingecko: process.env.COINGECKO_API_KEY || '',
    openweather: process.env.OPENWEATHER_API_KEY || '',
    newsapi: process.env.NEWSAPI_KEY || '',
    alphavantage: process.env.ALPHAVANTAGE_API_KEY || '',
  },
  
  // Pricing (in USDC)
  pricing: {
    coingecko: 0.03,
    openweather: 0.02,
    newsapi: 0.03,
    alphavantage: 0.03,
    default: 0.03
  }
};

// =============================================================================
// INITIALIZE APP
// =============================================================================

const app = express();
app.use(cors());
app.use(express.json());

// Initialize cost tracker
const costTracker = new CostTracker();

// Initialize wallet
const provider = new ethers.JsonRpcProvider(
  CONFIG.network === 'mainnet' 
    ? 'https://bsc-dataseed.binance.org'
    : 'https://data-seed-prebsc-1-s1.binance.org:8545'
);

const wallet = new ethers.Wallet(
  CONFIG.settlementKey || ethers.Wallet.createRandom().privateKey,
  provider
);

// Use wallet address as gateway recipient if not configured
const gatewayRecipient = CONFIG.gatewayWallet || wallet.address;

console.log('\n🌉 x402 API Gateway');
console.log('==================');
console.log(`Gateway Wallet: ${gatewayRecipient}`);
console.log(`Network: ${CONFIG.network}`);
console.log(`Facilitator: ${CONFIG.facilitatorAddress}`);

// =============================================================================
// X402 MIDDLEWARE INSTANCES
// =============================================================================

// Different pricing tiers for different APIs
const createX402Middleware = (priceInUSDC: number) => {
  return new X402Middleware({
    facilitatorAddress: CONFIG.facilitatorAddress,
    usdcAddress: CONFIG.usdcAddress,
    recipientAddress: gatewayRecipient,
    priceInUSDC,
    network: CONFIG.network,
    enableLogging: true,
    privateKey: CONFIG.settlementKey
  });
};

const x402CoinGecko = createX402Middleware(CONFIG.pricing.coingecko);
const x402Weather = createX402Middleware(CONFIG.pricing.openweather);
const x402News = createX402Middleware(CONFIG.pricing.newsapi);
const x402Alpha = createX402Middleware(CONFIG.pricing.alphavantage);

// =============================================================================
// PROXY ENDPOINTS
// =============================================================================

/**
 * CoinGecko Proxy
 * Pricing: $0.03 USDC per call
 */
app.post('/proxy/coingecko',
  x402CoinGecko.requirePayment(),
  async (req: Request, res: Response) => {
    try {
      const { endpoint, params } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
      }

      console.log(`\n📊 CoinGecko Request: ${endpoint}`);
      
      // Call CoinGecko API
      const url = new URL(`https://api.coingecko.com/api/v3${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      // Add API key if configured
      if (CONFIG.apiKeys.coingecko) {
        url.searchParams.append('x_cg_pro_api_key', CONFIG.apiKeys.coingecko);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Track revenue and costs
      const payment = (req as any).x402Payment;
      await costTracker.recordTransaction({
        api: 'coingecko',
        revenue: CONFIG.pricing.coingecko,
        cost: 0, // Free tier
        profit: CONFIG.pricing.coingecko,
        payer: payment.from,
        timestamp: Date.now()
      });

      console.log(`✅ CoinGecko: Returned data (revenue: $${CONFIG.pricing.coingecko})`);

      res.json({
        success: true,
        data,
        cost: CONFIG.pricing.coingecko,
        api: 'coingecko'
      });
    } catch (error) {
      console.error('❌ CoinGecko proxy error:', error);
      res.status(500).json({
        error: 'CoinGecko request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * OpenWeatherMap Proxy
 * Pricing: $0.02 USDC per call
 */
app.post('/proxy/openweather',
  x402Weather.requirePayment(),
  async (req: Request, res: Response) => {
    try {
      const { endpoint, params } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
      }

      console.log(`\n🌤️  OpenWeather Request: ${endpoint}`);

      // Call OpenWeather API
      const url = new URL(`https://api.openweathermap.org/data/2.5${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      // Add API key
      if (CONFIG.apiKeys.openweather) {
        url.searchParams.append('appid', CONFIG.apiKeys.openweather);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Track transaction
      const payment = (req as any).x402Payment;
      await costTracker.recordTransaction({
        api: 'openweather',
        revenue: CONFIG.pricing.openweather,
        cost: 0,
        profit: CONFIG.pricing.openweather,
        payer: payment.from,
        timestamp: Date.now()
      });

      console.log(`✅ OpenWeather: Returned data (revenue: $${CONFIG.pricing.openweather})`);

      res.json({
        success: true,
        data,
        cost: CONFIG.pricing.openweather,
        api: 'openweather'
      });
    } catch (error) {
      console.error('❌ OpenWeather proxy error:', error);
      res.status(500).json({
        error: 'OpenWeather request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * NewsAPI Proxy
 * Pricing: $0.03 USDC per call
 */
app.post('/proxy/newsapi',
  x402News.requirePayment(),
  async (req: Request, res: Response) => {
    try {
      const { endpoint, params } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
      }

      console.log(`\n📰 NewsAPI Request: ${endpoint}`);

      // Call NewsAPI
      const url = new URL(`https://newsapi.org/v2${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const headers: Record<string, string> = {};
      if (CONFIG.apiKeys.newsapi) {
        headers['X-Api-Key'] = CONFIG.apiKeys.newsapi;
      }

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.statusText}`);
      }

      const data = await response.json();

      // Track transaction
      const payment = (req as any).x402Payment;
      await costTracker.recordTransaction({
        api: 'newsapi',
        revenue: CONFIG.pricing.newsapi,
        cost: 0,
        profit: CONFIG.pricing.newsapi,
        payer: payment.from,
        timestamp: Date.now()
      });

      console.log(`✅ NewsAPI: Returned data (revenue: $${CONFIG.pricing.newsapi})`);

      res.json({
        success: true,
        data,
        cost: CONFIG.pricing.newsapi,
        api: 'newsapi'
      });
    } catch (error) {
      console.error('❌ NewsAPI proxy error:', error);
      res.status(500).json({
        error: 'NewsAPI request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Alpha Vantage Proxy
 * Pricing: $0.03 USDC per call
 */
app.post('/proxy/alphavantage',
  x402Alpha.requirePayment(),
  async (req: Request, res: Response) => {
    try {
      const { params } = req.body;

      if (!params) {
        return res.status(400).json({ error: 'Params required' });
      }

      console.log(`\n📈 Alpha Vantage Request: ${params.function || 'unknown'}`);

      // Call Alpha Vantage API
      const url = new URL('https://www.alphavantage.co/query');
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      if (CONFIG.apiKeys.alphavantage) {
        url.searchParams.append('apikey', CONFIG.apiKeys.alphavantage);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Track transaction
      const payment = (req as any).x402Payment;
      await costTracker.recordTransaction({
        api: 'alphavantage',
        revenue: CONFIG.pricing.alphavantage,
        cost: 0,
        profit: CONFIG.pricing.alphavantage,
        payer: payment.from,
        timestamp: Date.now()
      });

      console.log(`✅ Alpha Vantage: Returned data (revenue: $${CONFIG.pricing.alphavantage})`);

      res.json({
        success: true,
        data,
        cost: CONFIG.pricing.alphavantage,
        api: 'alphavantage'
      });
    } catch (error) {
      console.error('❌ Alpha Vantage proxy error:', error);
      res.status(500).json({
        error: 'Alpha Vantage request failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =============================================================================
// MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    gateway: gatewayRecipient,
    network: CONFIG.network,
    facilitator: CONFIG.facilitatorAddress,
    timestamp: new Date().toISOString()
  });
});

/**
 * Gateway statistics
 */
app.get('/stats', async (req: Request, res: Response) => {
  const stats = await costTracker.getStats();
  
  res.json({
    ...stats,
    gateway: gatewayRecipient,
    uptime: process.uptime()
  });
});

/**
 * API pricing
 */
app.get('/pricing', (req: Request, res: Response) => {
  res.json({
    apis: [
      { name: 'coingecko', price: CONFIG.pricing.coingecko, endpoint: '/proxy/coingecko' },
      { name: 'openweather', price: CONFIG.pricing.openweather, endpoint: '/proxy/openweather' },
      { name: 'newsapi', price: CONFIG.pricing.newsapi, endpoint: '/proxy/newsapi' },
      { name: 'alphavantage', price: CONFIG.pricing.alphavantage, endpoint: '/proxy/alphavantage' }
    ],
    currency: 'USDC',
    network: CONFIG.network,
    chainId: CONFIG.network === 'mainnet' ? 56 : 97
  });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(CONFIG.port, () => {
  console.log(`\n✅ Gateway running on http://localhost:${CONFIG.port}`);
  console.log('\n📋 Available Endpoints:');
  console.log(`   POST /proxy/coingecko - $${CONFIG.pricing.coingecko} USDC`);
  console.log(`   POST /proxy/openweather - $${CONFIG.pricing.openweather} USDC`);
  console.log(`   POST /proxy/newsapi - $${CONFIG.pricing.newsapi} USDC`);
  console.log(`   POST /proxy/alphavantage - $${CONFIG.pricing.alphavantage} USDC`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /stats - Gateway statistics`);
  console.log(`   GET  /pricing - API pricing`);
  
  console.log('\n💡 Test:');
  console.log(`   curl http://localhost:${CONFIG.port}/health`);
  console.log(`   curl http://localhost:${CONFIG.port}/pricing`);
  
  if (process.env.NODE_ENV !== 'development') {
    console.log('\n⚠️  Production mode: x402 payments required');
  } else {
    console.log('\n⚠️  Development mode: x402 payments bypassed');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
});

export { app, costTracker };
