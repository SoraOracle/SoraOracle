/**
 * S402 Payment Middleware for Express
 * Verifies s402 payment proofs before granting access to protected routes
 */

const { ethers } = require('ethers');

// Operation pricing (in USDC, 6 decimals)
const OPERATION_PRICES = {
  dataSourceAccess: ethers.parseUnits('0.03', 6),    // $0.03 per API call
  marketCreation: ethers.parseUnits('0.05', 6),      // $0.05 to create market
  marketResolution: ethers.parseUnits('0.10', 6),    // $0.10 to resolve market
  oracleQuery: ethers.parseUnits('0.01', 6),         // $0.01 per oracle query
  batchQuery: ethers.parseUnits('0.05', 6)           // $0.05 for batch queries
};

class S402Middleware {
  constructor(facilitatorAddress, usdcAddress, provider) {
    this.facilitatorAddress = facilitatorAddress;
    this.usdcAddress = usdcAddress;
    this.provider = provider;
    
    // S402Facilitator contract ABI
    this.facilitatorABI = [
      'function settlePaymentWithPermit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s, address recipient) external returns (bool)',
      'function isPermitUsed(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external view returns (bool)',
      'event PaymentSettled(address indexed from, address indexed to, uint256 value, uint256 platformFee, uint256 nonce)'
    ];
    
    this.facilitator = new ethers.Contract(
      facilitatorAddress,
      this.facilitatorABI,
      provider
    );
  }

  /**
   * Express middleware factory
   * Returns middleware function that checks for valid s402 payment
   */
  requirePayment(operation, customAmount = null) {
    return async (req, res, next) => {
      try {
        // Check for X-PAYMENT header
        const paymentHeader = req.headers['x-payment'];
        
        if (!paymentHeader) {
          return res.status(402).json({
            error: 'Payment Required',
            message: 'This endpoint requires s402 payment',
            operation: operation,
            amount: ethers.formatUnits(
              customAmount || OPERATION_PRICES[operation] || OPERATION_PRICES.dataSourceAccess,
              6
            ),
            facilitator: this.facilitatorAddress,
            usdc: this.usdcAddress,
            network: 'bsc-testnet',
            chainId: 97
          });
        }

        // Parse payment proof from header
        let paymentProof;
        try {
          paymentProof = JSON.parse(paymentHeader);
        } catch (error) {
          return res.status(400).json({
            error: 'Invalid Payment Format',
            message: 'X-PAYMENT header must be valid JSON'
          });
        }

        // Verify payment proof
        const isValid = await this.verifyPaymentProof(
          paymentProof,
          operation,
          customAmount
        );

        if (!isValid) {
          return res.status(402).json({
            error: 'Invalid Payment',
            message: 'Payment proof verification failed'
          });
        }

        // Payment verified! Attach proof to request
        req.s402Payment = paymentProof;
        
        // Continue to route handler
        next();
      } catch (error) {
        console.error('S402 middleware error:', error);
        return res.status(500).json({
          error: 'Payment Verification Failed',
          message: error.message
        });
      }
    };
  }

  /**
   * Verify s402 payment proof
   */
  async verifyPaymentProof(proof, operation, customAmount = null) {
    try {
      const { permit, recipient, timestamp } = proof;
      
      // Check required fields
      if (!permit || !permit.owner || !permit.spender || !permit.value) {
        console.log('❌ Missing required fields in payment proof');
        return false;
      }

      // Verify amount matches operation price
      const expectedAmount = customAmount || OPERATION_PRICES[operation] || OPERATION_PRICES.dataSourceAccess;
      const providedAmount = BigInt(permit.value);
      
      if (providedAmount < expectedAmount) {
        console.log(`❌ Insufficient payment: ${providedAmount} < ${expectedAmount}`);
        return false;
      }

      // Verify spender is our facilitator
      if (permit.spender.toLowerCase() !== this.facilitatorAddress.toLowerCase()) {
        console.log('❌ Invalid spender address');
        return false;
      }

      // Check if permit was already used
      const isUsed = await this.facilitator.isPermitUsed(
        permit.owner,
        permit.spender,
        permit.value,
        permit.deadline,
        permit.v,
        permit.r,
        permit.s
      );

      if (isUsed) {
        console.log('❌ Permit already used (replay attack detected)');
        return false;
      }

      // Check deadline
      if (Math.floor(Date.now() / 1000) > permit.deadline) {
        console.log('❌ Permit expired');
        return false;
      }

      console.log('✅ Payment proof verified');
      return true;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  /**
   * Execute payment settlement on-chain (optional - for immediate settlement)
   */
  async settlePayment(proof, signer) {
    const { permit, recipient } = proof;
    
    const tx = await this.facilitator.connect(signer).settlePaymentWithPermit(
      permit.owner,
      permit.spender,
      permit.value,
      permit.deadline,
      permit.v,
      permit.r,
      permit.s,
      recipient
    );

    const receipt = await tx.wait();
    console.log(`✅ Payment settled: ${receipt.hash}`);
    
    return receipt;
  }
}

module.exports = { S402Middleware, OPERATION_PRICES };
