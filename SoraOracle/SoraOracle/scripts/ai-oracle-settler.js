const { ethers } = require('hardhat');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SORA_ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS || '';

async function verifyOutcomeWithAI(question, contextData = {}) {
  console.log('\n🤖 AI Oracle Processing...');
  console.log('Question:', question);
  
  const prompt = `You are an expert oracle for prediction markets. Analyze the following question and determine if it can be definitively answered as YES, NO, or UNCERTAIN based on current factual information.

Question: "${question}"

${Object.keys(contextData).length > 0 ? `Additional Context:\n${JSON.stringify(contextData, null, 2)}` : ''}

Instructions:
1. Search your knowledge base for factual, verifiable information
2. If the outcome is definitively determinable, respond with "YES" or "NO"
3. If the outcome cannot be determined yet or is ambiguous, respond with "UNCERTAIN"
4. Provide clear reasoning for your answer

Respond in JSON format:
{
  "answer": "YES" | "NO" | "UNCERTAIN",
  "confidence": 0-100,
  "reasoning": "detailed explanation",
  "sources": ["list of factual bases for the answer"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a factual, unbiased oracle that provides definitive answers to prediction market questions based on verifiable information. Always be truthful and transparent about uncertainty.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('\n✅ AI Analysis Complete:');
    console.log('Answer:', result.answer);
    console.log('Confidence:', result.confidence + '%');
    console.log('Reasoning:', result.reasoning);
    console.log('Sources:', result.sources);
    
    return result;
  } catch (error) {
    console.error('❌ AI Oracle Error:', error.message);
    return {
      answer: 'UNCERTAIN',
      confidence: 0,
      reasoning: 'Failed to get AI response',
      sources: []
    };
  }
}

async function settleMarketWithAI(questionHash, question, oracleAddress) {
  console.log('\n🔮 AI-Powered Market Settlement');
  console.log('═══════════════════════════════════════');
  
  const [signer] = await ethers.getSigners();
  const SoraOracle = await ethers.getContractFactory('SoraOracle');
  const oracle = SoraOracle.attach(oracleAddress);
  
  // Get AI verification
  const aiResult = await verifyOutcomeWithAI(question);
  
  if (aiResult.answer === 'UNCERTAIN' || aiResult.confidence < 80) {
    console.log('\n⚠️  Market cannot be settled yet');
    console.log('Reason:', aiResult.reasoning);
    return null;
  }
  
  // Settle on-chain
  console.log('\n📝 Submitting answer to blockchain...');
  const answer = aiResult.answer === 'YES' ? 'yes' : 'no';
  
  try {
    const tx = await oracle.provideAnswer(questionHash, answer, {
      gasLimit: 200000
    });
    
    console.log('Transaction hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Market settled on-chain!');
    console.log('Block:', receipt.blockNumber);
    
    return {
      success: true,
      answer,
      aiResult,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('❌ Blockchain settlement failed:', error.message);
    return null;
  }
}

async function batchSettleMarkets(markets, oracleAddress) {
  console.log('\n🚀 Batch AI Settlement');
  console.log('Processing', markets.length, 'markets...\n');
  
  const results = [];
  
  for (const market of markets) {
    const result = await settleMarketWithAI(
      market.questionHash,
      market.question,
      oracleAddress
    );
    
    results.push({
      question: market.question,
      result
    });
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Batch Settlement Complete');
  console.log('═══════════════════════════════════════');
  console.log('Total markets:', results.length);
  console.log('Settled:', results.filter(r => r.result?.success).length);
  console.log('Uncertain:', results.filter(r => !r.result || !r.result.success).length);
  
  return results;
}

// Example usage
async function main() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.error('❌ OpenAI integration not configured');
    console.error('Please set up Replit AI Integrations');
    process.exit(1);
  }
  
  // Example: Test AI verification
  const testQuestions = [
    'Will BTC price exceed $100,000 by end of 2024?',
    'Did Bitcoin reach an all-time high in 2024?',
    'Will Ethereum switch to proof-of-stake consensus?'
  ];
  
  console.log('🧪 Testing AI Oracle Verification\n');
  
  for (const question of testQuestions) {
    await verifyOutcomeWithAI(question);
    console.log('\n' + '─'.repeat(60) + '\n');
  }
  
  // If oracle address is provided, settle a real market
  if (SORA_ORACLE_ADDRESS) {
    const questionHash = process.argv[2];
    const question = process.argv[3];
    
    if (questionHash && question) {
      await settleMarketWithAI(questionHash, question, SORA_ORACLE_ADDRESS);
    }
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

module.exports = {
  verifyOutcomeWithAI,
  settleMarketWithAI,
  batchSettleMarkets
};
