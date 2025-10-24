const { ethers } = require('hardhat');
const { verifyOutcomeWithAI, settleMarketWithAI } = require('./ai-oracle-settler');

const PREDICTION_MARKET_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS || '';
const SORA_ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS || '';

async function monitorAndSettleMarkets() {
  console.log('\n🔍 AI Market Monitor Starting...');
  console.log('═══════════════════════════════════════\n');
  
  if (!PREDICTION_MARKET_ADDRESS || !SORA_ORACLE_ADDRESS) {
    console.error('❌ Contract addresses not configured');
    console.error('Set PREDICTION_MARKET_ADDRESS and SORA_ORACLE_ADDRESS');
    process.exit(1);
  }
  
  const [signer] = await ethers.getSigners();
  const SimplePredictionMarket = await ethers.getContractFactory('SimplePredictionMarket');
  const market = SimplePredictionMarket.attach(PREDICTION_MARKET_ADDRESS);
  
  // Get market details
  const question = await market.question();
  const deadline = await market.deadline();
  const resolved = await market.resolved();
  
  console.log('Market Question:', question);
  console.log('Deadline:', new Date(Number(deadline) * 1000).toLocaleString());
  console.log('Resolved:', resolved);
  console.log();
  
  if (resolved) {
    console.log('✅ Market already resolved');
    return;
  }
  
  const now = Math.floor(Date.now() / 1000);
  if (now < deadline) {
    const hoursLeft = Math.floor((Number(deadline) - now) / 3600);
    console.log(`⏰ Market not yet expired (${hoursLeft} hours remaining)`);
    return;
  }
  
  console.log('🎯 Market ready for settlement!\n');
  
  // Get question hash from oracle
  const questionHash = ethers.keccak256(ethers.toUtf8Bytes(question));
  
  // Verify with AI
  const aiResult = await verifyOutcomeWithAI(question, {
    deadline: new Date(Number(deadline) * 1000).toISOString(),
    marketAddress: PREDICTION_MARKET_ADDRESS
  });
  
  if (aiResult.answer === 'UNCERTAIN' || aiResult.confidence < 80) {
    console.log('\n⚠️  Cannot auto-settle: Low confidence');
    console.log('Manual review required');
    return;
  }
  
  // Settle market
  const settlement = await settleMarketWithAI(questionHash, question, SORA_ORACLE_ADDRESS);
  
  if (settlement?.success) {
    console.log('\n🎉 Market successfully settled!');
    console.log('Answer:', settlement.answer.toUpperCase());
    console.log('TX:', settlement.txHash);
  }
}

async function runContinuousMonitoring(intervalMinutes = 60) {
  console.log(`\n🤖 Starting continuous monitoring (every ${intervalMinutes} minutes)\n`);
  
  while (true) {
    try {
      await monitorAndSettleMarkets();
    } catch (error) {
      console.error('❌ Monitoring error:', error.message);
    }
    
    console.log(`\n⏳ Waiting ${intervalMinutes} minutes...\n`);
    await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
  }
}

async function main() {
  const continuous = process.argv.includes('--continuous');
  const interval = parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '60');
  
  if (continuous) {
    await runContinuousMonitoring(interval);
  } else {
    await monitorAndSettleMarkets();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { monitorAndSettleMarkets };
