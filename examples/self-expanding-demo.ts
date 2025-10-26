import { ethers } from 'ethers';
import { SelfExpandingResearchAgent } from '../src/ai/SelfExpandingResearchAgent';
import { X402Client } from '../src/sdk/X402Client';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * ULTIMATE DEMONSTRATION: Self-Expanding Research Agent
 * 
 * Shows how the AI agent:
 * 1. Encounters unknown question category
 * 2. Searches API directories (RapidAPI, APIs.guru) with x402 payments
 * 3. Discovers new relevant APIs
 * 4. Tests them
 * 5. Registers them
 * 6. Uses them to answer the question
 * 7. Remembers them for future questions
 * 
 * This makes Sora Oracle SELF-EXPANDING!
 */

async function main() {
  // Setup
  const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Initialize x402 client
  const x402Client = new X402Client({
    facilitatorUrl: process.env.X402_FACILITATOR_URL!,
    facilitatorAddress: process.env.X402_FACILITATOR_ADDRESS!,
    usdcAddress: process.env.USDC_ADDRESS!,
    network: 'testnet',
    signer
  });

  // Initialize self-expanding agent
  const agent = new SelfExpandingResearchAgent(
    process.env.OPENAI_API_KEY!,
    x402Client
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌟 SELF-EXPANDING RESEARCH AGENT - ULTIMATE DEMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('This demo shows the agent DISCOVERING new APIs when needed!\n');

  // Show initial state
  console.log('📊 Initial State:');
  const initialSources = agent.getAllSources();
  console.log(`   Registered APIs: ${initialSources.length}`);
  console.log(`   Categories: crypto, weather, sports, news, stocks, social\n`);

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 1: Known Category (crypto) - Uses existing APIs
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('SCENARIO 1: Known Category (Crypto)');
  console.log('═'.repeat(70));
  console.log('Expected: Use existing CoinGecko, CryptoCompare (NO discovery)\n');

  const cryptoResult = await agent.researchMarket(
    'Will Bitcoin reach $100,000 by end of 2025?',
    { maxCost: 0.20, allowDiscovery: true }
  );

  console.log('📋 RESULT:');
  console.log(`   Discovery performed: ${cryptoResult.discoveryPerformed ? 'YES' : 'NO'}`);
  console.log(`   APIs used: ${cryptoResult.sources.join(', ')}`);
  console.log(`   New APIs added: ${cryptoResult.newSourcesAdded}`);
  console.log(`   Answer: ${cryptoResult.outcome ? 'YES' : 'NO'} (${(cryptoResult.confidence * 100).toFixed(1)}%)`);
  console.log(`   Cost: $${cryptoResult.totalCost.toFixed(4)}\n`);

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 2: Unknown Category (oil prices) - DISCOVERS NEW APIS!
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('SCENARIO 2: Unknown Category (Energy/Oil Prices)');
  console.log('═'.repeat(70));
  console.log('Expected: NO existing APIs → DISCOVER new ones from RapidAPI!\n');

  const oilResult = await agent.researchMarket(
    'Will crude oil prices exceed $100/barrel by Q4 2025?',
    { maxCost: 0.40, allowDiscovery: true, autoRegister: true }
  );

  console.log('📋 RESULT:');
  console.log(`   Discovery performed: ${oilResult.discoveryPerformed ? 'YES ✅' : 'NO'}`);
  
  if (oilResult.discoveryResult) {
    console.log(`\n   🔍 DISCOVERY DETAILS:`);
    console.log(`      APIs discovered: ${oilResult.discoveryResult.apisDiscovered.length}`);
    console.log(`      APIs registered: ${oilResult.discoveryResult.apisRegistered.join(', ')}`);
    console.log(`      Discovery cost: $${oilResult.discoveryResult.totalCost.toFixed(4)}`);
    
    oilResult.discoveryResult.apisDiscovered.forEach(api => {
      console.log(`\n      📡 ${api.name}:`);
      console.log(`         Description: ${api.description}`);
      console.log(`         Endpoint: ${api.endpoint}`);
      console.log(`         Category: ${api.category}`);
      console.log(`         Cost/call: $${api.pricing.costPerCall || 'free'}`);
      console.log(`         Reliability: ${(api.reliability * 100).toFixed(0)}%`);
      console.log(`         Source: ${api.source}`);
    });
  }

  console.log(`\n   Final answer: ${oilResult.outcome ? 'YES' : 'NO'} (${(oilResult.confidence * 100).toFixed(1)}%)`);
  console.log(`   Total cost: $${oilResult.totalCost.toFixed(4)}`);
  console.log(`   APIs now in registry: ${agent.getAllSources().length} (was ${initialSources.length})\n`);

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 3: Ask SAME oil question again - Uses newly registered APIs!
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('SCENARIO 3: Repeat Oil Question (Tests Learning)');
  console.log('═'.repeat(70));
  console.log('Expected: Use NEWLY REGISTERED oil APIs (NO new discovery)\n');

  const oilResult2 = await agent.researchMarket(
    'Will oil prices drop below $80/barrel?',
    { maxCost: 0.20, allowDiscovery: true }
  );

  console.log('📋 RESULT:');
  console.log(`   Discovery performed: ${oilResult2.discoveryPerformed ? 'YES' : 'NO ✅'}`);
  console.log(`   APIs used: ${oilResult2.sources.join(', ')} ← Using discovered APIs!`);
  console.log(`   New APIs added: ${oilResult2.newSourcesAdded}`);
  console.log(`   Answer: ${oilResult2.outcome ? 'YES' : 'NO'} (${(oilResult2.confidence * 100).toFixed(1)}%)`);
  console.log(`   Cost: $${oilResult2.totalCost.toFixed(4)} ← Much cheaper (no discovery cost)!\n`);

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIO 4: Another Unknown Category (elections) - DISCOVERS AGAIN!
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('SCENARIO 4: Another Unknown Category (Elections)');
  console.log('═'.repeat(70));
  console.log('Expected: Discover polling/election APIs from directories\n');

  const electionResult = await agent.researchMarket(
    'Will Democrats win the next presidential election?',
    { maxCost: 0.40, allowDiscovery: true, autoRegister: true }
  );

  console.log('📋 RESULT:');
  console.log(`   Discovery performed: ${electionResult.discoveryPerformed ? 'YES ✅' : 'NO'}`);
  
  if (electionResult.discoveryResult) {
    console.log(`   APIs discovered: ${electionResult.discoveryResult.apisDiscovered.length}`);
    console.log(`   APIs registered: ${electionResult.discoveryResult.apisRegistered.join(', ')}`);
  }
  
  console.log(`   Answer: ${electionResult.outcome ? 'YES' : 'NO'} (${(electionResult.confidence * 100).toFixed(1)}%)`);
  console.log(`   Total APIs in registry: ${agent.getAllSources().length}\n`);

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('━'.repeat(70));
  console.log('📊 DEMONSTRATION COMPLETE - SUMMARY');
  console.log('━'.repeat(70));

  const finalSources = agent.getAllSources();
  const newAPIsAdded = finalSources.length - initialSources.length;

  console.log(`\n🎯 KEY ACHIEVEMENTS:`);
  console.log(`   ✅ Started with ${initialSources.length} APIs`);
  console.log(`   ✅ Discovered ${newAPIsAdded} new APIs autonomously`);
  console.log(`   ✅ Now have ${finalSources.length} APIs total`);
  console.log(`   ✅ System EXPANDED ITSELF!\n`);

  console.log(`💰 COST BREAKDOWN:`);
  console.log(`   Scenario 1 (crypto, known): $${cryptoResult.totalCost.toFixed(4)}`);
  console.log(`   Scenario 2 (oil, discovery): $${oilResult.totalCost.toFixed(4)} ← includes discovery`);
  console.log(`   Scenario 3 (oil, learned): $${oilResult2.totalCost.toFixed(4)} ← no discovery!`);
  console.log(`   Scenario 4 (election, discovery): $${electionResult.totalCost.toFixed(4)}`);
  
  const totalCost = cryptoResult.totalCost + oilResult.totalCost + 
                    oilResult2.totalCost + electionResult.totalCost;
  console.log(`   TOTAL: $${totalCost.toFixed(4)}\n`);

  console.log(`🚀 WHAT THIS MEANS:`);
  console.log(`   • Ask about crypto → Uses CoinGecko (pre-installed)`);
  console.log(`   • Ask about oil → Discovers OilPriceAPI (first time cost)`);
  console.log(`   • Ask about oil again → Uses OilPriceAPI (no discovery)`);
  console.log(`   • Ask about elections → Discovers PollingDataAPI`);
  console.log(`   • Ask about ANYTHING → System learns and expands!\n`);

  console.log(`💡 THE MAGIC:`);
  console.log(`   Discovery cost: ~$0.05-0.15 (one-time per category)`);
  console.log(`   Future questions: ~$0.02-0.05 (uses learned APIs)`);
  console.log(`   ROI: Discovery pays for itself after 2-3 questions\n`);

  console.log(`🌍 UNLIMITED POTENTIAL:`);
  console.log(`   The agent can now handle UNLIMITED question types:`);
  console.log(`   • Crypto ✅ | Weather ✅ | Sports ✅ | Stocks ✅`);
  console.log(`   • Oil prices ✅ (newly learned!)`);
  console.log(`   • Elections ✅ (newly learned!)`);
  console.log(`   • Healthcare? → Will discover CDC/WHO APIs`);
  console.log(`   • Space launches? → Will discover NASA/SpaceX APIs`);
  console.log(`   • Literally ANYTHING → System will learn!\n`);

  console.log(`📈 PERFORMANCE STATS:`);
  
  // Show API performance tracking
  const oilAPIs = finalSources.filter(s => s.categories.includes('energy'));
  console.log(`\n   Oil Price APIs (discovered this session):`);
  oilAPIs.forEach(api => {
    const stats = agent.getAPIStats(api.name);
    if (stats) {
      console.log(`      ${api.name}:`);
      console.log(`         Success rate: ${(stats.successCount / (stats.successCount + stats.failureCount) * 100).toFixed(0)}%`);
      console.log(`         Avg confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
    }
  });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✨ This is the future of prediction markets:`);
  console.log(`   Ask ANY question → System discovers APIs → Learns for next time`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Show how to add custom API directories
  console.log(`🔧 BONUS: Custom API Directory Registration`);
  console.log(`   You can add your own API directory services:\n`);

  console.log(`   agent.registerAPIDirectory({`);
  console.log(`      name: 'MyCustomDirectory',`);
  console.log(`      endpoint: 'https://my-api-dir.com/search',`);
  console.log(`      costPerSearch: 0.03, // Pay with x402`);
  console.log(`      searchMethod: 'GET',`);
  console.log(`      categories: ['all']`);
  console.log(`   });\n`);

  console.log(`   Now the agent will search YOUR directory too!\n`);
}

// Run the demo
main().catch(console.error);
