const { ethers } = require('hardhat');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SORA_ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS || '';
const WEB_SEARCH_ENABLED = process.env.AI_WEB_SEARCH_ENABLED !== 'false';
const CONFIDENCE_THRESHOLD = parseInt(process.env.AI_CONFIDENCE_THRESHOLD || '90');

/**
 * Generate optimal search query from market question
 */
async function generateSearchQuery(question, deadline) {
  console.log('\n🔍 Generating search query...');
  
  const prompt = `Convert this prediction market question into an optimal web search query to find factual evidence for the answer.

Question: "${question}"
Deadline: ${deadline}

Return a concise, specific search query that would find current, verifiable information.

Examples:
- "Will Bitcoin exceed $100k by Dec 31, 2025?" → "Bitcoin price December 31 2025"
- "Will the Lakers win 2025 NBA championship?" → "2025 NBA championship winner Lakers"
- "Did SpaceX launch Starship in 2024?" → "SpaceX Starship launch 2024"

Return JSON: { "query": "search terms", "rationale": "why this query" }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    console.log('Search query:', result.query);
    console.log('Rationale:', result.rationale);
    return result.query;
  } catch (error) {
    console.error('Error generating search query:', error.message);
    // Fallback: use the question as-is
    return question;
  }
}

/**
 * Simulate web search (in production, use real web search API)
 * 
 * NOTE: This is a placeholder. In production, you would:
 * 1. Use Replit's web_search tool (available in Agent environment)
 * 2. Or integrate with Google Custom Search API
 * 3. Or use Brave Search API
 * 4. Or use Perplexity API
 */
async function searchWeb(query) {
  console.log('\n🌐 Searching web for:', query);
  
  // PRODUCTION: Replace this with actual web search
  // Example with Google Custom Search:
  // const response = await fetch(
  //   `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${query}`
  // );
  // return response.json();
  
  // For now, return simulated results as example
  console.log('⚠️  Using simulated search results (implement real search in production)');
  console.log('📝 To implement:');
  console.log('   1. Add web search integration (Google, Brave, or Perplexity)');
  console.log('   2. Or use Replit Agent web_search tool');
  console.log('   3. Update this function to return real results\n');
  
  return {
    results: [
      {
        title: 'Example search result',
        snippet: 'This is a simulated result. Replace with real web search.',
        url: 'https://example.com'
      }
    ],
    searchQuery: query,
    timestamp: new Date().toISOString()
  };
}

/**
 * Verify outcome using AI with web search capabilities
 */
async function verifyOutcomeWithWebSearch(question, contextData = {}) {
  console.log('\n🤖 AI Oracle with Web Search');
  console.log('═══════════════════════════════════════');
  console.log('Question:', question);
  console.log('Deadline:', contextData.deadline || 'Not specified');
  console.log('Web Search:', WEB_SEARCH_ENABLED ? 'Enabled ✓' : 'Disabled');
  
  let webSearchResults = null;
  
  // Step 1: Search the web for current information (if enabled)
  if (WEB_SEARCH_ENABLED) {
    try {
      const searchQuery = await generateSearchQuery(question, contextData.deadline);
      webSearchResults = await searchWeb(searchQuery);
    } catch (error) {
      console.warn('⚠️  Web search failed, falling back to AI knowledge only');
      console.warn('Error:', error.message);
    }
  }
  
  // Step 2: AI analyzes question + web results
  const prompt = `You are an expert oracle for prediction markets. Analyze the question and determine if it can be definitively answered.

Question: "${question}"
${contextData.deadline ? `Deadline: ${contextData.deadline}` : ''}
Current Date: ${new Date().toISOString()}

${webSearchResults ? `Web Search Results:
${JSON.stringify(webSearchResults, null, 2)}

Use these search results as your PRIMARY source of truth for current information.
` : ''}

${Object.keys(contextData).length > 0 ? `Additional Context:
${JSON.stringify(contextData, null, 2)}` : ''}

Instructions:
1. ${webSearchResults ? 'Analyze web search results for factual, verifiable information' : 'Search your knowledge base for factual information'}
2. If the outcome is definitively determinable, respond with "YES" or "NO"
3. If you cannot determine the outcome with high confidence, respond with "UNCERTAIN"
4. Provide clear reasoning citing specific sources
5. Only answer confidently when evidence is STRONG

Respond in JSON format:
{
  "answer": "YES" | "NO" | "UNCERTAIN",
  "confidence": 0-100,
  "reasoning": "detailed explanation citing sources",
  "sources": ["URL1", "URL2", "specific data points"],
  "evidenceQuality": "STRONG" | "MODERATE" | "WEAK",
  "searchUsed": true/false,
  "requiresManualReview": true/false
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a factual, unbiased oracle that uses web search results and verifiable data to answer prediction market questions. You must be extremely cautious and only provide definitive answers when evidence is strong and unambiguous. When in doubt, mark as UNCERTAIN.'
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
    console.log('Evidence Quality:', result.evidenceQuality);
    console.log('Reasoning:', result.reasoning);
    console.log('Sources:', result.sources);
    console.log('Manual Review Needed:', result.requiresManualReview ? 'YES ⚠️' : 'NO');
    
    return result;
  } catch (error) {
    console.error('❌ AI Oracle Error:', error.message);
    return {
      answer: 'UNCERTAIN',
      confidence: 0,
      reasoning: 'Failed to get AI response: ' + error.message,
      sources: [],
      evidenceQuality: 'WEAK',
      searchUsed: false,
      requiresManualReview: true
    };
  }
}

/**
 * Settle market with AI + web search
 */
async function settleMarketWithWebSearch(questionHash, question, oracleAddress, contextData = {}) {
  console.log('\n🔮 AI-Powered Market Settlement (Web Search Enhanced)');
  console.log('═══════════════════════════════════════');
  console.log('Confidence Threshold:', CONFIDENCE_THRESHOLD + '%');
  
  const [signer] = await ethers.getSigners();
  const SoraOracle = await ethers.getContractFactory('SoraOracle');
  const oracle = SoraOracle.attach(oracleAddress);
  
  // Get AI verification with web search
  const aiResult = await verifyOutcomeWithWebSearch(question, contextData);
  
  // Check if we can auto-settle
  if (aiResult.answer === 'UNCERTAIN') {
    console.log('\n⚠️  Market cannot be auto-settled: UNCERTAIN');
    console.log('Reason:', aiResult.reasoning);
    console.log('\n📋 Action Required: Manual resolution needed');
    return { success: false, reason: 'UNCERTAIN', aiResult };
  }
  
  if (aiResult.confidence < CONFIDENCE_THRESHOLD) {
    console.log('\n⚠️  Market cannot be auto-settled: Low confidence');
    console.log('Confidence:', aiResult.confidence + '%');
    console.log('Threshold:', CONFIDENCE_THRESHOLD + '%');
    console.log('\n📋 Action Required: Manual review or wait for more data');
    return { success: false, reason: 'LOW_CONFIDENCE', aiResult };
  }
  
  if (aiResult.evidenceQuality === 'WEAK') {
    console.log('\n⚠️  Market cannot be auto-settled: Weak evidence');
    console.log('Evidence quality:', aiResult.evidenceQuality);
    console.log('\n📋 Action Required: Need stronger evidence for auto-settlement');
    return { success: false, reason: 'WEAK_EVIDENCE', aiResult };
  }
  
  // Settle on-chain
  console.log('\n✅ Confidence and evidence quality meet thresholds');
  console.log('📝 Submitting answer to blockchain...');
  const answer = aiResult.answer === 'YES' ? 'yes' : 'no';
  
  try {
    const tx = await oracle.provideAnswer(questionHash, answer, {
      gasLimit: 200000
    });
    
    console.log('Transaction hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Market settled on-chain!');
    console.log('Block:', receipt.blockNumber);
    console.log('Answer:', answer.toUpperCase());
    console.log('Confidence:', aiResult.confidence + '%');
    console.log('Evidence:', aiResult.evidenceQuality);
    
    return {
      success: true,
      answer,
      aiResult,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('❌ Blockchain settlement failed:', error.message);
    return { success: false, reason: 'TX_FAILED', error: error.message, aiResult };
  }
}

// Example usage
async function main() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.error('❌ OpenAI integration not configured');
    console.error('Please set up Replit AI Integrations');
    process.exit(1);
  }
  
  console.log('🧪 Testing AI Oracle with Web Search\n');
  console.log('Configuration:');
  console.log('- Web Search:', WEB_SEARCH_ENABLED ? 'Enabled' : 'Disabled');
  console.log('- Confidence Threshold:', CONFIDENCE_THRESHOLD + '%');
  console.log('- Oracle Address:', SORA_ORACLE_ADDRESS || 'Not set');
  console.log();
  
  // Test questions
  const testQuestions = [
    {
      question: 'Will Bitcoin price exceed $100,000 by December 31, 2025?',
      deadline: '2025-12-31T23:59:59Z'
    },
    {
      question: 'Did Ethereum successfully merge to Proof of Stake in 2022?',
      deadline: '2022-12-31T23:59:59Z'
    }
  ];
  
  for (const test of testQuestions) {
    await verifyOutcomeWithWebSearch(test.question, { deadline: test.deadline });
    console.log('\n' + '─'.repeat(80) + '\n');
  }
  
  // If oracle address and question provided, settle a real market
  if (SORA_ORACLE_ADDRESS && process.argv[2] && process.argv[3]) {
    const questionHash = process.argv[2];
    const question = process.argv[3];
    const deadline = process.argv[4];
    
    await settleMarketWithWebSearch(
      questionHash, 
      question, 
      SORA_ORACLE_ADDRESS,
      { deadline }
    );
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
  verifyOutcomeWithWebSearch,
  settleMarketWithWebSearch,
  generateSearchQuery,
  searchWeb
};
