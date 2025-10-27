import { X402Client, X402PaymentProof } from '../sdk/X402Client';
import { DataSourceRouter, QuestionAnalysis } from './DataSourceRouter';
import { ethers } from 'ethers';

/**
 * Intelligent AI Research Agent
 * Uses GPT-4 to analyze questions and dynamically select relevant data sources
 * Replaces hardcoded source selection with AI-powered routing
 */

export interface IntelligentResearchResult {
  outcome: boolean;
  confidence: number;
  sources: string[];
  reasoning: string;
  totalCost: number;
  payments: X402PaymentProof[];
  questionAnalysis: QuestionAnalysis;  // NEW: Shows AI's question understanding
  dataPoints: DataPoint[];              // NEW: Raw data from each source
}

export interface DataPoint {
  source: string;
  data: any;
  outcome: boolean;
  confidence: number;
  reasoning: string;
}

export class IntelligentResearchAgent {
  private x402Client: X402Client;
  private router: DataSourceRouter;

  constructor(openaiApiKey: string, x402Client: X402Client) {
    this.x402Client = x402Client;
    this.router = new DataSourceRouter(openaiApiKey, x402Client);
  }

  /**
   * Research a market question with intelligent source selection
   * This is the main entry point that shows the magic!
   */
  async researchMarket(
    question: string,
    options?: {
      maxCost?: number;
      minConfidence?: number;
      maxSources?: number;
    }
  ): Promise<IntelligentResearchResult> {
    console.log(`\n🤖 Intelligent Research Agent Activated`);
    console.log(`📝 Question: "${question}"\n`);

    const maxCost = options?.maxCost || 0.25;
    const minConfidence = options?.minConfidence || 0.8;
    const maxSources = options?.maxSources || 4;

    // STEP 1: Analyze question to determine relevant sources (THE KEY INNOVATION!)
    console.log(`🔍 Step 1: Analyzing question with GPT-4...`);
    const analysis = await this.router.analyzeQuestion(question);

    console.log(`\n✅ Analysis Results:`);
    console.log(`   Category: ${analysis.category}`);
    console.log(`   Keywords: ${analysis.keywords.join(', ')}`);
    console.log(`   AI Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`   Recommended: ${analysis.recommendedSources.join(', ')}`);
    console.log(`   Reasoning: ${analysis.reasoning}\n`);

    // STEP 2: Fetch data from recommended sources (with x402 payments)
    console.log(`💰 Step 2: Querying data sources (with x402 payments)...`);

    let totalCost = 0;
    const payments: X402PaymentProof[] = [];
    const dataPoints: DataPoint[] = [];
    const sourcesUsed: string[] = [];

    // Limit to maxSources and budget
    const sourcesToQuery = analysis.recommendedSources.slice(0, maxSources);

    for (const sourceName of sourcesToQuery) {
      const sourceMetadata = this.router.getSource(sourceName);
      if (!sourceMetadata) continue;

      // Check budget
      if (totalCost + sourceMetadata.costPerCall > maxCost) {
        console.log(`   ⚠️  Budget limit reached. Skipping ${sourceName}`);
        break;
      }

      try {
        console.log(`   📡 Querying ${sourceName} (cost: $${sourceMetadata.costPerCall})...`);

        // Create x402 payment for this API call
        const payment = await this.x402Client.createPayment('dataSourceAccess');
        payments.push(payment);

        // Fetch data from the source
        const dataPoint = await this.fetchFromSource(
          sourceName,
          sourceMetadata.endpoint,
          question,
          payment
        );

        dataPoints.push(dataPoint);
        sourcesUsed.push(sourceName);
        totalCost += sourceMetadata.costPerCall;

        console.log(`   ✅ ${sourceName}: ${dataPoint.outcome ? 'YES' : 'NO'} (${(dataPoint.confidence * 100).toFixed(1)}% confidence)`);

      } catch (error) {
        console.error(`   ❌ ${sourceName} failed:`, error);
      }
    }

    // STEP 3: Aggregate results from all sources
    console.log(`\n🧮 Step 3: Aggregating multi-source consensus...`);
    const { outcome, confidence, reasoning } = this.aggregateResults(dataPoints);

    console.log(`\n📊 Final Result:`);
    console.log(`   Outcome: ${outcome ? 'YES' : 'NO'}`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
    console.log(`   Sources queried: ${sourcesUsed.length}`);
    console.log(`   Total cost: $${totalCost.toFixed(4)}`);
    console.log(`   Reasoning: ${reasoning}\n`);

    return {
      outcome,
      confidence,
      sources: sourcesUsed,
      reasoning,
      totalCost,
      payments,
      questionAnalysis: analysis,
      dataPoints
    };
  }

  /**
   * Fetch data from a specific source (mocked for now, would be real API calls)
   */
  private async fetchFromSource(
    sourceName: string,
    endpoint: string,
    question: string,
    payment: X402PaymentProof
  ): Promise<DataPoint> {
    // In production, this would make actual HTTP requests with x402 payment headers
    // For now, we'll simulate responses based on source type

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock responses based on source type
    // In production, these would be real API calls with proper parsing

    if (sourceName === 'CoinGecko') {
      // Mock crypto price check
      return {
        source: sourceName,
        data: { price: 98500, timestamp: Date.now() },
        outcome: question.toLowerCase().includes('100k') ? false : true,
        confidence: 0.92,
        reasoning: 'Current BTC price is $98,500, below $100K target'
      };
    }

    if (sourceName === 'OpenWeatherMap') {
      // Mock weather forecast
      return {
        source: sourceName,
        data: { forecast: 'clear', precipitation: 0.1 },
        outcome: question.toLowerCase().includes('rain') ? false : true,
        confidence: 0.85,
        reasoning: '10% chance of rain according to 7-day forecast'
      };
    }

    if (sourceName === 'NewsAPI') {
      // Mock news search
      return {
        source: sourceName,
        data: { articles: 5, sentiment: 'neutral' },
        outcome: Math.random() > 0.5,
        confidence: 0.78,
        reasoning: 'No major breaking news found related to query'
      };
    }

    // Default response
    return {
      source: sourceName,
      data: {},
      outcome: Math.random() > 0.5,
      confidence: 0.75,
      reasoning: `${sourceName} data analysis complete`
    };
  }

  /**
   * Aggregate results from multiple sources into consensus
   */
  private aggregateResults(dataPoints: DataPoint[]): {
    outcome: boolean;
    confidence: number;
    reasoning: string;
  } {
    if (dataPoints.length === 0) {
      return {
        outcome: false,
        confidence: 0,
        reasoning: 'No data sources returned results'
      };
    }

    // Count YES vs NO votes
    const yesVotes = dataPoints.filter(dp => dp.outcome).length;
    const noVotes = dataPoints.length - yesVotes;

    // Weighted confidence scoring
    const totalConfidence = dataPoints.reduce((sum, dp) => {
      return sum + (dp.outcome ? dp.confidence : -dp.confidence);
    }, 0);

    const avgConfidence = Math.abs(totalConfidence) / dataPoints.length;
    const outcome = totalConfidence > 0;

    // Build reasoning
    const breakdown = dataPoints
      .map(dp => `${dp.source}: ${dp.outcome ? 'YES' : 'NO'} (${(dp.confidence * 100).toFixed(1)}%)`)
      .join(', ');

    const reasoning = `Consensus from ${dataPoints.length} sources: ${yesVotes} YES, ${noVotes} NO. ${breakdown}`;

    return {
      outcome,
      confidence: avgConfidence,
      reasoning
    };
  }

  /**
   * Register a custom data source at runtime
   */
  registerCustomSource(metadata: {
    name: string;
    endpoint: string;
    categories: string[];
    costPerCall: number;
    description: string;
  }): void {
    this.router.registerSource({
      ...metadata,
      exampleQuestions: [],
      x402Enabled: true
    });
    console.log(`✅ Registered custom data source: ${metadata.name}`);
  }
}
