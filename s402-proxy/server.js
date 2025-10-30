const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Replicate = require('replicate');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { ethers } = require('ethers');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// BSC Provider for on-chain verification
const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set - cannot start server');
}

const ADMIN_WALLET = '0x89907F51bE80c12E63Eb62fa7680c3960aC0C18f';
const PAYMENT_VALIDITY_SECONDS = 300;
const S402_FACILITATOR = '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3';

// S402 Facilitator ABI (PaymentSettled event only)
const S402_ABI = [
  'event PaymentSettled(address indexed from, address indexed to, uint256 value, bytes32 nonce, uint256 timestamp)'
];

app.use(cors());
app.use(express.json());

// Tool definitions with handlers
const TOOLS = {
  'seedream4_generator': {
    cost: 0.05,
    handler: async (input) => {
      const { prompt, aspect_ratio } = input;
      const output = await replicate.run("bytedance/seedream-4", { 
        input: { prompt, aspect_ratio: aspect_ratio || '4:3' }
      });
      
      let imageUrl = null;
      if (output && output[0]) {
        if (typeof output[0] === 'string') {
          imageUrl = output[0];
        } else if (output[0].url) {
          imageUrl = typeof output[0].url === 'function' ? output[0].url() : output[0].url;
        } else {
          imageUrl = String(output[0]);
        }
      }
      
      return { success: true, image_url: imageUrl };
    }
  },
  
  'rest_countries': {
    cost: 0.01,
    handler: async (input) => {
      const { country_name } = input;
      const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(country_name)}`;
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, data: data[0] };
    }
  },
  
  'joke_api': {
    cost: 0.01,
    handler: async (input) => {
      const { category } = input;
      const cat = category || 'Any';
      const url = `https://v2.jokeapi.dev/joke/${cat}?safe-mode`;
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, data };
    }
  },
  
  'dog_image': {
    cost: 0.01,
    handler: async (input) => {
      const { breed } = input;
      const url = breed 
        ? `https://dog.ceo/api/breed/${breed}/images/random`
        : 'https://dog.ceo/api/breeds/image/random';
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, image_url: data.message };
    }
  },
  
  'cat_facts': {
    cost: 0.01,
    handler: async (input) => {
      const url = 'https://catfact.ninja/fact';
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, fact: data.fact };
    }
  },
  
  'brewery_search': {
    cost: 0.02,
    handler: async (input) => {
      const { city, type } = input;
      let url = 'https://api.openbrewerydb.org/v1/breweries?';
      if (city) url += `by_city=${encodeURIComponent(city)}&`;
      if (type) url += `by_type=${type}&`;
      url += 'per_page=10';
      
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, breweries: data };
    }
  },
  
  'nasa_apod': {
    cost: 0.02,
    handler: async (input) => {
      const url = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY';
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, data };
    }
  },
  
  'random_user': {
    cost: 0.01,
    handler: async (input) => {
      const { nat, gender } = input;
      let url = 'https://randomuser.me/api/?';
      if (nat) url += `nat=${nat}&`;
      if (gender) url += `gender=${gender}&`;
      
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, user: data.results[0] };
    }
  },
  
  'advice_slip': {
    cost: 0.01,
    handler: async (input) => {
      const url = 'https://api.adviceslip.com/advice';
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, advice: data.slip.advice };
    }
  },
  
  'bored_api': {
    cost: 0.01,
    handler: async (input) => {
      const { type, participants } = input;
      let url = 'https://www.boredapi.com/api/activity?';
      if (type) url += `type=${type}&`;
      if (participants) url += `participants=${participants}&`;
      
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, activity: data };
    }
  },
  
  'quote_api': {
    cost: 0.01,
    handler: async (input) => {
      const url = 'https://api.quotable.io/random';
      const response = await fetch(url);
      const data = await response.json();
      return { success: true, quote: data.content, author: data.author };
    }
  }
};

// Generic tool execution endpoint
app.post('/api/tool/:tool_id', async (req, res) => {
  try {
    const { tool_id } = req.params;
    
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No JWT token provided' });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired JWT token' });
    }

    if (!decodedToken.address || typeof decodedToken.address !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload - missing address' });
    }

    const authenticatedAddress = decodedToken.address;
    const { input, tx_hash } = req.body;

    // Check if tool exists
    const tool = TOOLS[tool_id];
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    if (!tx_hash) {
      return res.status(402).json({
        error: 'Payment required',
        message: 'Please include tx_hash from your 402 payment',
        payment_details: {
          recipient: ADMIN_WALLET,
          amount_usd: tool.cost,
          tool_id: tool_id
        }
      });
    }

    // Verify payment on-chain (fast path: check database first, fallback to blockchain)
    let paymentCheck = await pool.query(
      `SELECT tx_hash, from_address, to_address, value_usd, block_timestamp 
       FROM s402_payments 
       WHERE tx_hash = $1`,
      [tx_hash]
    );

    let payment;
    
    if (paymentCheck.rows.length > 0) {
      // Fast path: payment already indexed
      payment = paymentCheck.rows[0];
      console.log('✅ Payment found in database (cached)');
    } else {
      // Slow path: verify directly on BSC blockchain
      console.log('🔍 Payment not in database, checking blockchain...');
      
      try {
        const receipt = await bscProvider.getTransactionReceipt(tx_hash);
        
        if (!receipt) {
          return res.status(402).json({ 
            error: 'Transaction not found on blockchain',
            message: 'Invalid transaction hash or transaction not yet confirmed'
          });
        }

        console.log(`📜 Transaction has ${receipt.logs.length} logs`);

        // Parse PaymentSettled event from logs
        const facilitatorContract = new ethers.Interface(S402_ABI);
        let paymentEvent = null;
        
        for (const log of receipt.logs) {
          console.log(`🔍 Checking log from ${log.address} (looking for ${S402_FACILITATOR})`);
          
          if (log.address.toLowerCase() === S402_FACILITATOR.toLowerCase()) {
            console.log('✅ Found log from S402 Facilitator');
            try {
              const parsed = facilitatorContract.parseLog(log);
              console.log(`📋 Parsed event: ${parsed.name}`);
              if (parsed.name === 'PaymentSettled') {
                paymentEvent = parsed;
                break;
              }
            } catch (e) {
              console.log(`⚠️ Failed to parse log: ${e.message}`);
            }
          }
        }

        if (!paymentEvent) {
          console.log('❌ No PaymentSettled event found in transaction');
          return res.status(402).json({ 
            error: 'Not a valid S402 payment',
            message: 'Transaction does not contain a PaymentSettled event'
          });
        }

        // Extract payment details from event
        const block = await bscProvider.getBlock(receipt.blockNumber);
        payment = {
          tx_hash: tx_hash,
          from_address: paymentEvent.args.from,
          to_address: paymentEvent.args.to,
          value_usd: parseFloat(ethers.formatUnits(paymentEvent.args.value, 18)),
          block_timestamp: new Date(block.timestamp * 1000)
        };
        
        console.log('✅ Payment verified on-chain:', {
          from: payment.from_address,
          to: payment.to_address,
          amount: payment.value_usd
        });
      } catch (error) {
        console.error('❌ Blockchain verification failed:', error);
        return res.status(402).json({ 
          error: 'Payment verification failed',
          message: error.message
        });
      }
    }

    // Verify payment sender
    if (payment.from_address.toLowerCase() !== authenticatedAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Payment sender does not match authenticated wallet',
        authenticated_wallet: authenticatedAddress,
        payment_sender: payment.from_address
      });
    }

    // Verify payment recipient
    if (payment.to_address.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return res.status(402).json({ 
        error: 'Payment sent to wrong recipient',
        expected: ADMIN_WALLET,
        actual: payment.to_address
      });
    }

    // Verify payment amount
    if (parseFloat(payment.value_usd) < tool.cost) {
      return res.status(402).json({ 
        error: 'Insufficient payment amount',
        required: tool.cost,
        received: parseFloat(payment.value_usd)
      });
    }

    // Verify payment age
    const paymentAge = (Date.now() - new Date(payment.block_timestamp).getTime()) / 1000;
    if (paymentAge > PAYMENT_VALIDITY_SECONDS) {
      return res.status(402).json({ 
        error: 'Payment too old',
        max_age_seconds: PAYMENT_VALIDITY_SECONDS,
        payment_age_seconds: Math.floor(paymentAge)
      });
    }

    // Check if payment already used
    const usageCheck = await pool.query(
      `SELECT id FROM s402_proxy_usage WHERE tx_hash = $1`,
      [tx_hash]
    );

    if (usageCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Payment already used' });
    }

    // Record usage
    await pool.query(
      `INSERT INTO s402_proxy_usage (tx_hash, payer_address, service, request_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [tx_hash, authenticatedAddress, tool_id, JSON.stringify(input)]
    );

    console.log(`✅ Payment verified for ${authenticatedAddress}: ${tx_hash} (${tool_id})`);

    // Execute tool
    const result = await tool.handler(input);

    // Update usage record
    await pool.query(
      `UPDATE s402_proxy_usage 
       SET response_data = $1, completed_at = NOW(), status = 'completed'
       WHERE tx_hash = $2`,
      [JSON.stringify(result), tx_hash]
    );

    console.log(`✅ Tool executed: ${tool_id}`);

    return res.json(result);

  } catch (error) {
    console.error('Error executing tool:', error);
    
    if (req.body.tx_hash) {
      await pool.query(
        `UPDATE s402_proxy_usage 
         SET status = 'failed', response_data = $1
         WHERE tx_hash = $2`,
        [JSON.stringify({ error: error.message }), req.body.tx_hash]
      ).catch(console.error);
    }

    return res.status(500).json({ 
      error: 'Failed to execute tool',
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 's402-tool-proxy',
    tools: Object.keys(TOOLS).length
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 S402 Tool Proxy running on port ${PORT}`);
  console.log(`💰 Payment recipient: ${ADMIN_WALLET}`);
  console.log(`🔧 Available tools: ${Object.keys(TOOLS).length}`);
  Object.entries(TOOLS).forEach(([id, tool]) => {
    console.log(`   - ${id}: $${tool.cost}`);
  });
});
