const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Replicate = require('replicate');
const jwt = require('jsonwebtoken');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set - cannot start server');
}

const ADMIN_WALLET = '0x89907F51bE80c12E63Eb62fa7680c3960aC0C18f';
const IMAGE_COST_USD = 0.05;
const PAYMENT_VALIDITY_SECONDS = 30;

app.use(cors());
app.use(express.json());

app.post('/api/generate-image', async (req, res) => {
  try {
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

    const { prompt, aspect_ratio, tx_hash } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!tx_hash) {
      return res.status(402).json({
        error: 'Payment required',
        message: 'Please include tx_hash from your 402 payment',
        payment_details: {
          recipient: ADMIN_WALLET,
          amount_usd: IMAGE_COST_USD,
          description: 'Seedream 4 Image Generation'
        }
      });
    }

    const paymentCheck = await pool.query(
      `SELECT tx_hash, from_address, to_address, value_usd, block_timestamp 
       FROM s402_payments 
       WHERE tx_hash = $1`,
      [tx_hash]
    );

    if (paymentCheck.rows.length === 0) {
      return res.status(402).json({ error: 'Payment not found on-chain' });
    }

    const payment = paymentCheck.rows[0];

    if (payment.from_address.toLowerCase() !== authenticatedAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Payment sender does not match authenticated wallet',
        authenticated_wallet: authenticatedAddress,
        payment_sender: payment.from_address,
        message: 'The wallet that made the payment must match your authenticated wallet'
      });
    }

    if (payment.to_address.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return res.status(402).json({ 
        error: 'Payment sent to wrong recipient',
        expected: ADMIN_WALLET,
        actual: payment.to_address
      });
    }

    if (parseFloat(payment.value_usd) < IMAGE_COST_USD) {
      return res.status(402).json({ 
        error: 'Insufficient payment amount',
        required: IMAGE_COST_USD,
        received: parseFloat(payment.value_usd)
      });
    }

    const paymentAge = (Date.now() - new Date(payment.block_timestamp).getTime()) / 1000;
    if (paymentAge > PAYMENT_VALIDITY_SECONDS) {
      return res.status(402).json({ 
        error: 'Payment too old',
        max_age_seconds: PAYMENT_VALIDITY_SECONDS,
        payment_age_seconds: Math.floor(paymentAge)
      });
    }

    const usageCheck = await pool.query(
      `SELECT id FROM s402_proxy_usage WHERE tx_hash = $1`,
      [tx_hash]
    );

    if (usageCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Payment already used' });
    }

    await pool.query(
      `INSERT INTO s402_proxy_usage (tx_hash, payer_address, service, request_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [tx_hash, authenticatedAddress, 'replicate-seedream', JSON.stringify({ prompt, aspect_ratio })]
    );

    console.log(`✅ Payment verified for ${authenticatedAddress}: ${tx_hash}`);

    const input = {
      prompt: prompt,
      aspect_ratio: aspect_ratio || '4:3'
    };

    console.log(`🎨 Generating image with prompt: "${prompt}"`);
    const output = await replicate.run("bytedance/seedream-4", { input });

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

    await pool.query(
      `UPDATE s402_proxy_usage 
       SET response_data = $1, completed_at = NOW(), status = 'completed'
       WHERE tx_hash = $2`,
      [JSON.stringify({ image_url: imageUrl }), tx_hash]
    );

    console.log(`✅ Image generated: ${imageUrl}`);

    return res.json({
      success: true,
      image_url: imageUrl,
      prompt: prompt,
      tx_hash: tx_hash
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
    if (req.body.tx_hash) {
      await pool.query(
        `UPDATE s402_proxy_usage 
         SET status = 'failed', response_data = $1
         WHERE tx_hash = $2`,
        [JSON.stringify({ error: error.message }), req.body.tx_hash]
      ).catch(console.error);
    }

    return res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 's402-replicate-proxy' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 S402 Replicate Proxy running on port ${PORT}`);
  console.log(`💰 Payment recipient: ${ADMIN_WALLET}`);
  console.log(`💵 Cost per image: $${IMAGE_COST_USD}`);
});
