const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const AUTO_APPROVE_THRESHOLD = parseInt(process.env.MARKET_AUTO_APPROVE_THRESHOLD || '70');
const AUTO_REJECT_THRESHOLD = parseInt(process.env.MARKET_AUTO_REJECT_THRESHOLD || '40');

/**
 * Evaluate market question quality
 */
async function evaluateMarketQuality(question, deadline) {
  console.log('\n📋 Market Quality Evaluation');
  console.log('═══════════════════════════════════════');
  console.log('Question:', question);
  console.log('Deadline:', new Date(deadline * 1000).toLocaleString());
  
  const prompt = `You are an expert evaluator for prediction markets. Analyze this market question for quality and feasibility.

Question: "${question}"
Deadline: ${new Date(deadline * 1000).toISOString()}

Evaluate the question on these criteria (0-100 points each):

1. VERIFIABILITY (40 points max):
   - Can this outcome be objectively verified?
   - Is there a clear, measurable result?
   - Are verification sources available?
   
2. CLARITY (20 points max):
   - Is the question unambiguous?
   - Are the resolution criteria clear?
   - Would reasonable people agree on the outcome?
   
3. FEASIBILITY (20 points max):
   - Can the answer be determined by the deadline?
   - Is real-time data available for resolution?
   - Is the timeframe realistic?
   
4. LEGITIMACY (20 points max):
   - Is this a serious, meaningful prediction?
   - Does it have public interest or value?
   - Is it spam/joke/nonsense?

Calculate total score (0-100) and provide recommendation:
- Score ≥70: AUTO_APPROVE (high quality, ready to launch)
- Score 40-69: MANUAL_REVIEW (needs clarification or review)
- Score <40: AUTO_REJECT (poor quality, should not be listed)

Return JSON:
{
  "score": 0-100,
  "scores": {
    "verifiability": 0-40,
    "clarity": 0-20,
    "feasibility": 0-20,
    "legitimacy": 0-20
  },
  "recommendation": "AUTO_APPROVE" | "MANUAL_REVIEW" | "AUTO_REJECT",
  "issues": ["list of problems found"],
  "suggestions": ["how to improve the question"],
  "resolutionCriteria": "how should this market resolve",
  "reasoning": "detailed explanation of the evaluation"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a strict quality evaluator for prediction markets. Your goal is to ensure only high-quality, verifiable markets are approved. Be critical and thorough in your evaluation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log('\n📊 Evaluation Results:');
    console.log('Total Score:', result.score + '/100');
    console.log('Breakdown:');
    console.log('  - Verifiability:', result.scores.verifiability + '/40');
    console.log('  - Clarity:', result.scores.clarity + '/20');
    console.log('  - Feasibility:', result.scores.feasibility + '/20');
    console.log('  - Legitimacy:', result.scores.legitimacy + '/20');
    console.log('\n🎯 Recommendation:', result.recommendation);
    
    if (result.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      result.issues.forEach(issue => console.log('  -', issue));
    }
    
    if (result.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      result.suggestions.forEach(suggestion => console.log('  -', suggestion));
    }
    
    console.log('\n📝 Resolution Criteria:', result.resolutionCriteria);
    console.log('\n💬 Reasoning:', result.reasoning);
    
    return result;
  } catch (error) {
    console.error('❌ Quality check failed:', error.message);
    return {
      score: 0,
      recommendation: 'MANUAL_REVIEW',
      issues: ['Failed to evaluate: ' + error.message],
      suggestions: ['Manual review required'],
      resolutionCriteria: 'Unknown',
      reasoning: 'Evaluation failed'
    };
  }
}

/**
 * Batch evaluate multiple markets
 */
async function batchEvaluateMarkets(markets) {
  console.log('\n🚀 Batch Market Quality Check');
  console.log('Evaluating', markets.length, 'markets...\n');
  
  const results = [];
  
  for (const market of markets) {
    const result = await evaluateMarketQuality(market.question, market.deadline);
    results.push({
      question: market.question,
      evaluation: result
    });
    console.log('\n' + '─'.repeat(80) + '\n');
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  const approved = results.filter(r => r.evaluation.recommendation === 'AUTO_APPROVE').length;
  const review = results.filter(r => r.evaluation.recommendation === 'MANUAL_REVIEW').length;
  const rejected = results.filter(r => r.evaluation.recommendation === 'AUTO_REJECT').length;
  
  console.log('\n📊 Batch Evaluation Summary');
  console.log('═══════════════════════════════════════');
  console.log('Total:', results.length);
  console.log('Auto-Approved:', approved, '(' + Math.round(approved/results.length*100) + '%)');
  console.log('Manual Review:', review, '(' + Math.round(review/results.length*100) + '%)');
  console.log('Auto-Rejected:', rejected, '(' + Math.round(rejected/results.length*100) + '%)');
  
  return results;
}

// Example usage
async function main() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.error('❌ OpenAI integration not configured');
    console.error('Please set up Replit AI Integrations');
    process.exit(1);
  }
  
  console.log('🧪 Testing Market Quality Checker\n');
  console.log('Configuration:');
  console.log('- Auto-Approve Threshold:', AUTO_APPROVE_THRESHOLD);
  console.log('- Auto-Reject Threshold:', AUTO_REJECT_THRESHOLD);
  console.log();
  
  // Test markets with varying quality
  const testMarkets = [
    {
      question: 'Will Bitcoin price exceed $100,000 on Coinbase by December 31, 2025?',
      deadline: Math.floor(new Date('2025-12-31').getTime() / 1000)
    },
    {
      question: 'Will Apple release a new iPhone?',
      deadline: Math.floor(new Date('2025-12-31').getTime() / 1000)
    },
    {
      question: 'Will I be happy tomorrow?',
      deadline: Math.floor(Date.now() / 1000) + 86400
    },
    {
      question: 'Will aliens land on Earth by 2030?',
      deadline: Math.floor(new Date('2030-12-31').getTime() / 1000)
    },
    {
      question: 'Will Ethereum successfully complete the Dencun upgrade before March 2024?',
      deadline: Math.floor(new Date('2024-03-31').getTime() / 1000)
    }
  ];
  
  await batchEvaluateMarkets(testMarkets);
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
  evaluateMarketQuality,
  batchEvaluateMarkets
};
