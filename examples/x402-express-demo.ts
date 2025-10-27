/**
 * Real Coinbase x402-express Integration Demo
 * 
 * This demonstrates using the OFFICIAL x402-express package
 * instead of our custom implementation.
 * 
 * Run:
 * PAYMENT_RECIPIENT_ADDRESS=0xYourAddress npm run start:x402-demo
 */

import express from 'express';
import { paymentMiddleware } from 'x402-express';

const app = express();
app.use(express.json());

// ✅ REAL x402-express middleware
app.use(paymentMiddleware(
  // Payment recipient address
  (process.env.PAYMENT_RECIPIENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0') as `0x${string}`,
  
  // Route configurations with pricing
  {
    '/api/createMarket': {
      price: '$0.05',              // $0.05 USDC
      network: 'base-sepolia',
      config: {
        description: 'Create a prediction market',
        maxTimeoutSeconds: 60
      }
    },
    '/api/placeBet': {
      price: '$0.01',
      network: 'base-sepolia',
      config: {
        description: 'Place a bet on a market'
      }
    },
    '/api/resolveMarket': {
      price: '$0.10',              // Higher price for AI oracle
      network: 'base-sepolia',
      config: {
        description: 'Resolve market with AI-powered oracle'
      }
    },
    '/api/ai/research': {
      price: '$0.02',
      network: 'base-sepolia',
      config: {
        description: 'AI-powered market research'
      }
    }
  },
  
  // Facilitator configuration
  {
    url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator'
  },
  
  // Optional: Paywall configuration
  {
    cdpClientKey: process.env.CDP_CLIENT_KEY,
    appName: 'Sora Oracle SDK',
    appLogo: '/logo.png',
    sessionTokenEndpoint: '/api/x402/session-token'  // For Coinbase Onramp
  }
));

// ==========================================
// Protected Routes (Payment Required)
// ==========================================

app.post('/api/createMarket', async (req, res) => {
  console.log('✅ Payment verified! Creating market...');
  console.log('Market data:', req.body);
  
  res.json({
    success: true,
    message: 'Market created successfully',
    marketId: Math.random().toString(36).substring(7)
  });
});

app.post('/api/placeBet', async (req, res) => {
  console.log('✅ Payment verified! Placing bet...');
  
  res.json({
    success: true,
    message: 'Bet placed successfully',
    betId: Math.random().toString(36).substring(7)
  });
});

app.post('/api/resolveMarket', async (req, res) => {
  console.log('✅ Payment verified! Resolving market with AI oracle...');
  
  // Simulate AI oracle resolution
  const result = {
    success: true,
    answer: 'YES',
    confidence: 0.85,
    sources: ['CoinGecko', 'CryptoCompare', 'Binance'],
    consensusMethod: 'MAD statistical outlier detection'
  };
  
  res.json(result);
});

app.post('/api/ai/research', async (req, res) => {
  console.log('✅ Payment verified! Running AI research...');
  
  res.json({
    success: true,
    question: req.body.question,
    analysis: 'AI-powered analysis would go here',
    sources: 10,
    confidence: 0.92
  });
});

// ==========================================
// Public Routes (No Payment Required)
// ==========================================

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Sora Oracle - x402 Payment Demo</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #0a0a0a;
            color: #fff;
          }
          h1 { color: #ff6b00; }
          .endpoint {
            background: #1a1a1a;
            border-left: 3px solid #ff6b00;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
          }
          .price { color: #00ff88; font-weight: bold; }
          code {
            background: #2a2a2a;
            padding: 2px 6px;
            border-radius: 3px;
            color: #ff6b00;
          }
          button {
            background: #ff6b00;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
          }
          button:hover { background: #ff8533; }
          #result {
            background: #1a1a1a;
            padding: 15px;
            margin-top: 20px;
            border-radius: 5px;
            min-height: 100px;
          }
        </style>
      </head>
      <body>
        <h1>🔮 Sora Oracle - x402 Payment Demo</h1>
        <p>This demo uses the <strong>real Coinbase x402-express</strong> package for micropayments.</p>
        
        <h2>Protected Endpoints (Payment Required):</h2>
        
        <div class="endpoint">
          <strong>POST /api/createMarket</strong><br>
          Price: <span class="price">$0.05 USDC</span><br>
          Create a new prediction market<br>
          <button onclick="testEndpoint('/api/createMarket', { question: 'Will BTC hit $100K?' })">
            Test Create Market
          </button>
        </div>
        
        <div class="endpoint">
          <strong>POST /api/placeBet</strong><br>
          Price: <span class="price">$0.01 USDC</span><br>
          Place a bet on a market<br>
          <button onclick="testEndpoint('/api/placeBet', { marketId: 'test', amount: 100 })">
            Test Place Bet
          </button>
        </div>
        
        <div class="endpoint">
          <strong>POST /api/resolveMarket</strong><br>
          Price: <span class="price">$0.10 USDC</span><br>
          Resolve market with AI-powered oracle<br>
          <button onclick="testEndpoint('/api/resolveMarket', { marketId: 'test' })">
            Test Resolve Market
          </button>
        </div>
        
        <div class="endpoint">
          <strong>POST /api/ai/research</strong><br>
          Price: <span class="price">$0.02 USDC</span><br>
          AI-powered market research<br>
          <button onclick="testEndpoint('/api/ai/research', { question: 'Oil price trends?' })">
            Test AI Research
          </button>
        </div>
        
        <h2>Test Result:</h2>
        <div id="result">Click a button above to test an endpoint...</div>
        
        <h2>How It Works:</h2>
        <ol>
          <li>Click a test button above</li>
          <li>If no payment, you'll see a <strong>402 Payment Required</strong> response</li>
          <li>x402-express will show a paywall UI</li>
          <li>Connect your wallet and pay with USDC</li>
          <li>Request automatically retries with payment proof</li>
          <li>Access granted! 🎉</li>
        </ol>
        
        <p><strong>Note:</strong> This uses Base Sepolia testnet. Get test USDC from a faucet.</p>
        
        <script>
          async function testEndpoint(endpoint, data) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>🔄 Sending request...</p>';
            
            try {
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              if (response.status === 402) {
                // Payment required - x402 paywall will be shown
                const html = await response.text();
                resultDiv.innerHTML = '<p>⚠️ <strong>402 Payment Required</strong></p>' +
                  '<p>x402-express would show paywall UI here.</p>' +
                  '<p>In production, this opens a wallet connection UI.</p>';
                return;
              }
              
              const result = await response.json();
              resultDiv.innerHTML = '<p>✅ <strong>Success!</strong></p>' +
                '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                
            } catch (error) {
              resultDiv.innerHTML = '<p>❌ <strong>Error:</strong> ' + error.message + '</p>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    x402: 'enabled',
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    network: 'base-sepolia'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🔮 Sora Oracle x402 Demo Server Running
========================================

✅ Real Coinbase x402-express integration
✅ Payment protection enabled
✅ Built-in paywall UI

Server: http://localhost:${PORT}
Facilitator: ${process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator'}
Network: base-sepolia

Protected Endpoints:
  POST /api/createMarket     → $0.05 USDC
  POST /api/placeBet         → $0.01 USDC
  POST /api/resolveMarket    → $0.10 USDC
  POST /api/ai/research      → $0.02 USDC

Test the UI: http://localhost:${PORT}
  `);
});
