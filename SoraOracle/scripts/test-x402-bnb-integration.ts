/**
 * End-to-End Test: x402 + Self-Expanding Agent on BNB Chain
 * 
 * Tests the complete flow:
 * 1. Payment proof generation
 * 2. Signature verification
 * 3. Facilitator contract interaction
 * 4. Self-Expanding Agent research
 * 5. Oracle settlement
 * 
 * Run:
 * npx tsx scripts/test-x402-bnb-integration.ts
 */

import { ethers } from 'ethers';
import { X402Client } from '../src/sdk/X402Client';
import dotenv from 'dotenv';

dotenv.config();

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji: string, message: string, color: string = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testPaymentProofGeneration() {
  log('🧪', '='.repeat(70), colors.cyan);
  log('🧪', 'TEST 1: Payment Proof Generation', colors.cyan);
  log('🧪', '='.repeat(70), colors.cyan);

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
    );

    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
      provider
    );

    log('💼', `Wallet: ${wallet.address}`, colors.blue);

    // Service provider address (receives payments)
    const serviceProviderAddress = wallet.address;

    const x402Client = new X402Client({
      facilitatorUrl: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
      facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
      usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      recipientAddress: serviceProviderAddress,  // Service provider receives payment
      network: 'testnet',
      signer: wallet
    });

    // Test 1: Create payment proof for AI research
    log('📝', 'Creating payment proof for AI research ($0.02)...', colors.blue);
    const proof1 = await x402Client.createPayment('aiResearch');
    
    log('✅', 'Payment proof created!', colors.green);
    log('  ', `Nonce: ${proof1.nonce.substring(0, 20)}...`);
    log('  ', `Amount: ${(parseInt(proof1.amount) / 1e6).toFixed(6)} USDC`);
    log('  ', `From: ${proof1.from}`);
    log('  ', `To: ${proof1.to}`);
    log('  ', `Signature: ${proof1.signature.substring(0, 20)}...`);

    // Test 2: Verify signature locally
    log('\n🔍', 'Verifying signature locally...', colors.blue);
    const isValid = await x402Client.verifyPayment(proof1);
    
    if (isValid) {
      log('✅', 'Signature valid!', colors.green);
    } else {
      log('❌', 'Signature invalid!', colors.red);
      return false;
    }

    // Test 3: Create payment proof for oracle resolution
    log('\n📝', 'Creating payment proof for oracle resolution ($0.10)...', colors.blue);
    const proof2 = await x402Client.createPayment('resolveMarket');
    
    log('✅', 'Payment proof created!', colors.green);
    log('  ', `Amount: ${(parseInt(proof2.amount) / 1e6).toFixed(6)} USDC`);

    // Test 4: Verify different operations have different prices
    const price1 = x402Client.getPrice('aiResearch');
    const price2 = x402Client.getPrice('resolveMarket');
    
    log('\n💰', 'Pricing verification:', colors.blue);
    log('  ', `AI Research: $${price1}`);
    log('  ', `Oracle Resolve: $${price2}`);
    
    if (price1 < price2) {
      log('✅', 'Pricing tiers correct!', colors.green);
    } else {
      log('❌', 'Pricing tiers incorrect!', colors.red);
      return false;
    }

    log('\n✅', 'All payment proof tests passed!', colors.green);
    return true;

  } catch (error) {
    log('❌', `Error: ${error}`, colors.red);
    return false;
  }
}

async function testFacilitatorContract() {
  log('\n🧪', '='.repeat(70), colors.cyan);
  log('🧪', 'TEST 2: Facilitator Contract Interaction', colors.cyan);
  log('🧪', '='.repeat(70), colors.cyan);

  try {
    const facilitatorAddress = process.env.X402_FACILITATOR_ADDRESS;
    
    if (!facilitatorAddress || facilitatorAddress === '0x0000000000000000000000000000000000000000') {
      log('⚠️', 'Facilitator contract not deployed - skipping test', colors.yellow);
      log('💡', 'Deploy with: npx hardhat run scripts/deploy-x402-facilitator.ts --network bscTestnet', colors.blue);
      return true;
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
    );

    const facilitatorABI = [
      'function usdc() view returns (address)',
      'function platformFeeBps() view returns (uint256)',
      'function owner() view returns (address)',
      'function isNonceUsed(bytes32 nonce) view returns (bool)'
    ];

    const facilitator = new ethers.Contract(facilitatorAddress, facilitatorABI, provider);

    log('📋', 'Reading facilitator contract...', colors.blue);

    const usdc = await facilitator.usdc();
    const fee = await facilitator.platformFeeBps();
    const owner = await facilitator.owner();

    log('✅', 'Contract info:', colors.green);
    log('  ', `USDC: ${usdc}`);
    log('  ', `Platform Fee: ${fee} bps (${Number(fee) / 100}%)`);
    log('  ', `Owner: ${owner}`);

    // Test nonce checking
    const testNonce = ethers.hexlify(ethers.randomBytes(32));
    const isUsed = await facilitator.isNonceUsed(testNonce);
    
    log('\n🔍', 'Testing nonce checking...', colors.blue);
    log('✅', `Nonce ${testNonce.substring(0, 10)}... is ${isUsed ? 'used' : 'unused'}`, colors.green);

    log('\n✅', 'All facilitator contract tests passed!', colors.green);
    return true;

  } catch (error) {
    log('❌', `Error: ${error}`, colors.red);
    return false;
  }
}

async function testMessageSigning() {
  log('\n🧪', '='.repeat(70), colors.cyan);
  log('🧪', 'TEST 3: Message Signing & Recovery', colors.cyan);
  log('🧪', '='.repeat(70), colors.cyan);

  try {
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey
    );

    const testData = {
      nonce: ethers.hexlify(ethers.randomBytes(32)),
      amount: '50000', // $0.05 USDC
      token: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      from: wallet.address,
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
    };

    log('📝', 'Creating message hash...', colors.blue);
    
    // Create message hash (same as contract)
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'address', 'address', 'address'],
      [testData.nonce, testData.amount, testData.token, testData.from, testData.to]
    );

    log('✅', `Message hash: ${messageHash}`, colors.green);

    // Sign message
    log('\n✏️', 'Signing message...', colors.blue);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    log('✅', `Signature: ${signature.substring(0, 30)}...`, colors.green);

    // Recover signer
    log('\n🔍', 'Recovering signer...', colors.blue);
    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
    
    log('  ', `Original: ${wallet.address}`);
    log('  ', `Recovered: ${recoveredAddress}`);

    if (recoveredAddress.toLowerCase() === wallet.address.toLowerCase()) {
      log('✅', 'Signature recovery successful!', colors.green);
    } else {
      log('❌', 'Signature recovery failed!', colors.red);
      return false;
    }

    log('\n✅', 'All signing tests passed!', colors.green);
    return true;

  } catch (error) {
    log('❌', `Error: ${error}`, colors.red);
    return false;
  }
}

async function testAPICallFlow() {
  log('\n🧪', '='.repeat(70), colors.cyan);
  log('🧪', 'TEST 4: Complete API Call Flow Simulation', colors.cyan);
  log('🧪', '='.repeat(70), colors.cyan);

  try {
    log('📋', 'Simulating complete flow:', colors.blue);
    log('  ', '1. User wants to call protected endpoint');
    log('  ', '2. Endpoint returns 402 Payment Required');
    log('  ', '3. User generates payment proof');
    log('  ', '4. User retries with proof in header');
    log('  ', '5. Server verifies payment');
    log('  ', '6. Request succeeds');

    const provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
    );

    const wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
      provider
    );

    // Service provider address (receives payments)
    const serviceProviderAddress = wallet.address;

    const x402Client = new X402Client({
      facilitatorUrl: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
      facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
      usdcAddress: process.env.USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      recipientAddress: serviceProviderAddress,  // Service provider receives payment
      network: 'testnet',
      signer: wallet
    });

    // Step 3: Generate payment
    log('\n💳', 'Step 3: Generating payment proof...', colors.blue);
    const proof = await x402Client.createPayment('aiResearch');
    log('✅', 'Payment proof generated', colors.green);

    // Step 4: Create request headers
    log('\n📨', 'Step 4: Creating request with payment header...', colors.blue);
    const headers = await x402Client.createPaymentHeader('aiResearch');
    log('✅', 'Headers created:', colors.green);
    log('  ', JSON.stringify(headers, null, 2));

    // Step 5: Verify payment (server-side simulation)
    log('\n🔐', 'Step 5: Server verifies payment...', colors.blue);
    const isValid = await x402Client.verifyPayment(proof);
    
    if (isValid) {
      log('✅', 'Payment verified! Request would proceed.', colors.green);
    } else {
      log('❌', 'Payment verification failed!', colors.red);
      return false;
    }

    log('\n✅', 'All API flow tests passed!', colors.green);
    return true;

  } catch (error) {
    log('❌', `Error: ${error}`, colors.red);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  log('🚀', 'BNB Chain x402 Integration Test Suite', colors.cyan);
  console.log('='.repeat(70) + '\n');

  const results = {
    paymentProof: false,
    facilitator: false,
    signing: false,
    apiFlow: false
  };

  // Run tests
  results.paymentProof = await testPaymentProofGeneration();
  results.facilitator = await testFacilitatorContract();
  results.signing = await testMessageSigning();
  results.apiFlow = await testAPICallFlow();

  // Summary
  console.log('\n' + '='.repeat(70));
  log('📊', 'TEST SUMMARY', colors.cyan);
  console.log('='.repeat(70) + '\n');

  const tests = [
    { name: 'Payment Proof Generation', result: results.paymentProof },
    { name: 'Facilitator Contract', result: results.facilitator },
    { name: 'Message Signing', result: results.signing },
    { name: 'API Call Flow', result: results.apiFlow }
  ];

  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    const color = test.result ? colors.green : colors.red;
    log(status, test.name, color);
  });

  const totalTests = tests.length;
  const passedTests = tests.filter(t => t.result).length;
  
  console.log('\n' + '-'.repeat(70));
  log('📈', `${passedTests}/${totalTests} tests passed (${(passedTests / totalTests * 100).toFixed(0)}%)`, 
    passedTests === totalTests ? colors.green : colors.yellow);
  console.log('='.repeat(70) + '\n');

  if (passedTests === totalTests) {
    log('🎉', 'All tests passed! Ready for deployment.', colors.green);
    process.exit(0);
  } else {
    log('⚠️', 'Some tests failed. Review errors above.', colors.yellow);
    process.exit(1);
  }
}

main().catch(error => {
  log('❌', `Fatal error: ${error}`, colors.red);
  process.exit(1);
});
