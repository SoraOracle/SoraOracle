import { X402Client, X402PaymentProof } from '../sdk/X402Client';
import { DataSourceRouter, QuestionAnalysis } from './DataSourceRouter';
import { APIDiscoveryAgent, DiscoveryResult } from './APIDiscoveryAgent';
import { IntelligentResearchResult, DataPoint } from './IntelligentResearchAgent';

/**
 * Self-Expanding Research Agent
 * 
 * The ULTIMATE evolution: Not only intelligently routes to existing APIs,
 * but AUTONOMOUSLY DISCOVERS and REGISTERS new APIs when encountering unknown topics.
 * 
 * Flow:
 * 1. User asks: "Will oil prices exceed $100/barrel?"
 * 2. Agent realizes: "I don't have oil price APIs"
 * 3. Agent searches RapidAPI/APIs.guru (pays with x402)
 * 4. Agent finds: OilPriceAPI, EIA API
 * 5. Agent tests them
 * 6. Agent registers them
 * 7. Agent uses them to answer the question
 * 8. Future oil questions = instant (already registered!)
 * 
 * This makes the system SELF-EXPANDING!
 */

export interface SelfExpandingResult extends IntelligentResearchResult {
  discoveryPerformed: boolean;
  discoveryResult?: DiscoveryResult;
  newSourcesAdded: number;
}

export class SelfExpandingResearchAgent {
  private x402Client: X402Client;
  private router: DataSourceRouter;
  private discoveryAgent: APIDiscoveryAgent;
  
  // Learning: Track API performance over time
  private apiPerformance: Map<string, {
    successCount: number;
    failureCount: number;
    avgConfidence: number;
  }>;

  constructor(openaiApiKey: string, x402Client: X402Client) {
    this.x402Client = x402Client;
    this.router = new DataSourceRouter(openaiApiKey, x402Client);
    this.discoveryAgent = new APIDiscoveryAgent(openaiApiKey, x402Client, this.router);
    this.apiPerformance = new Map();
  }

  /**
   * MAIN METHOD: Research any question, discover new APIs if needed
   * 
   * This is the complete self-expanding intelligence!
   */
  async researchMarket(
    question: string,
    options?: {
      maxCost?: number;
      minConfidence?: number;
      allowDiscovery?: boolean; // Allow discovering new APIs
      autoRegister?: boolean;   // Auto-register discovered APIs
    }
  ): Promise<SelfExpandingResult> {
    console.log(`\n🌟 SELF-EXPANDING RESEARCH AGENT`);
    console.log(`📝 Question: "${question}"\n`);

    const maxCost = options?.maxCost || 0.50; // Higher budget for discovery
    const minConfidence = options?.minConfidence || 0.8;
    const allowDiscovery = options?.allowDiscovery ?? true;
    const autoRegister = options?.autoRegister ?? true;

    let totalCost = 0;
    const allPayments: X402PaymentProof[] = [];
    let discoveryPerformed = false;
    let discoveryResult: DiscoveryResult | undefined;

    // PHASE 1: Analyze question with existing sources
    console.log(`🔍 Phase 1: Analyzing question with existing sources...`);
    const analysis = await this.router.analyzeQuestion(question);

    console.log(`   Category: ${analysis.category}`);
    console.log(`   Recommended sources: ${analysis.recommendedSources.join(', ') || 'NONE'}\n`);

    // PHASE 2: Check if we have sufficient sources
    const hasAdequateSources = analysis.recommendedSources.length >= 2;

    if (!hasAdequateSources && allowDiscovery) {
      console.log(`⚠️  Insufficient sources for category: ${analysis.category}`);
      console.log(`🔬 Phase 2: Initiating API Discovery...\n`);

      // DISCOVER NEW APIS!
      discoveryResult = await this.discoveryAgent.discoverAPIsForQuestion(
        question,
        analysis.category,
        {
          maxCost: maxCost * 0.4, // Use 40% of budget for discovery
          maxAPIsToDiscover: 5,
          autoRegister
        }
      );

      discoveryPerformed = true;
      totalCost += discoveryResult.totalCost;
      allPayments.push(...discoveryResult.payments);

      // Re-analyze question with newly discovered sources
      console.log(`\n🔄 Re-analyzing question with new sources...`);
      const updatedAnalysis = await this.router.analyzeQuestion(question);
      
      // Use updated recommendations
      analysis.recommendedSources = updatedAnalysis.recommendedSources;
      
      console.log(`   Updated recommendations: ${analysis.recommendedSources.join(', ')}\n`);
    }

    // PHASE 3: Query data sources (existing + newly discovered)
    console.log(`💰 Phase 3: Querying data sources (with x402)...`);

    const dataPoints: DataPoint[] = [];
    const sourcesUsed: string[] = [];
    const remainingBudget = maxCost - totalCost;

    for (const sourceName of analysis.recommendedSources.slice(0, 4)) {
      const source = this.router.getSource(sourceName);
      if (!source) continue;

      // Check remaining budget
      if (totalCost + source.costPerCall > maxCost) {
        console.log(`   ⚠️  Budget limit reached`);
        break;
      }

      try {
        console.log(`   📡 ${sourceName} (cost: $${source.costPerCall})...`);

        // Pay with x402
        const payment = await this.x402Client.createPayment('dataSourceAccess');
        allPayments.push(payment);

        // Fetch data
        const dataPoint = await this.fetchFromSource(sourceName, source.endpoint, question, payment);
        
        dataPoints.push(dataPoint);
        sourcesUsed.push(sourceName);
        totalCost += source.costPerCall;

        // Track performance
        this.updateAPIPerformance(sourceName, dataPoint.confidence, true);

        console.log(`   ✅ ${dataPoint.outcome ? 'YES' : 'NO'} (${(dataPoint.confidence * 100).toFixed(1)}%)`);

      } catch (error) {
        console.error(`   ❌ ${sourceName} failed`);
        this.updateAPIPerformance(sourceName, 0, false);
      }
    }

    // PHASE 4: Aggregate results
    console.log(`\n🧮 Phase 4: Multi-source consensus...`);
    const { outcome, confidence, reasoning } = this.aggregateResults(dataPoints);

    console.log(`\n📊 FINAL RESULT:`);
    console.log(`   Outcome: ${outcome ? 'YES' : 'NO'}`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
    console.log(`   Sources: ${sourcesUsed.length}`);
    console.log(`   Discovery: ${discoveryPerformed ? 'YES' : 'NO'}`);
    console.log(`   New APIs: ${discoveryResult?.apisRegistered.length || 0}`);
    console.log(`   Total cost: $${totalCost.toFixed(4)}\n`);

    return {
      outcome,
      confidence,
      sources: sourcesUsed,
      reasoning,
      totalCost,
      payments: allPayments,
      questionAnalysis: analysis,
      dataPoints,
      discoveryPerformed,
      discoveryResult,
      newSourcesAdded: discoveryResult?.apisRegistered.length || 0
    };
  }

  /**
   * Fetch data from a source (mocked, would be real API calls)
   */
  private async fetchFromSource(
    sourceName: string,
    endpoint: string,
    question: string,
    payment: X402PaymentProof
  ): Promise<DataPoint> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock responses
    const lowerQuestion = question.toLowerCase();

    // Oil/Energy APIs
    if (sourceName.includes('Oil') || sourceName.includes('Energy')) {
      return {
        source: sourceName,
        data: { price: 95.50, trend: 'rising' },
        outcome: lowerQuestion.includes('100') ? false : true,
        confidence: 0.89,
        reasoning: 'Current oil price $95.50, below $100 threshold'
      };
    }

    // Election/Politics APIs
    if (sourceName.includes('Polling') || sourceName.includes('Election')) {
      return {
        source: sourceName,
        data: { polls: 'dem +3', confidence: 0.82 },
        outcome: Math.random() > 0.5,
        confidence: 0.82,
        reasoning: 'Polling data shows Democratic lead in latest surveys'
      };
    }

    // Health APIs
    if (sourceName.includes('CDC') || sourceName.includes('Health')) {
      return {
        source: sourceName,
        data: { cases: 1250, trend: 'declining' },
        outcome: lowerQuestion.includes('increase') ? false : true,
        confidence: 0.91,
        reasoning: 'CDC data shows declining case numbers'
      };
    }

    // Default
    return {
      source: sourceName,
      data: {},
      outcome: Math.random() > 0.5,
      confidence: 0.75,
      reasoning: `${sourceName} data analyzed`
    };
  }

  /**
   * Aggregate multiple data points
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
        reasoning: 'No data sources available'
      };
    }

    // Weighted voting based on confidence and historical performance
    let weightedSum = 0;
    let totalWeight = 0;

    for (const dp of dataPoints) {
      // Get historical performance weight
      const perfData = this.apiPerformance.get(dp.source);
      const reliabilityWeight = perfData
        ? (perfData.successCount / (perfData.successCount + perfData.failureCount))
        : 0.5;

      const weight = dp.confidence * reliabilityWeight;
      weightedSum += (dp.outcome ? 1 : -1) * weight;
      totalWeight += weight;
    }

    const outcome = weightedSum > 0;
    const confidence = Math.abs(weightedSum) / (totalWeight || 1);

    const breakdown = dataPoints
      .map(dp => `${dp.source}: ${dp.outcome ? 'YES' : 'NO'} (${(dp.confidence * 100).toFixed(1)}%)`)
      .join(', ');

    return {
      outcome,
      confidence,
      reasoning: `Multi-source consensus from ${dataPoints.length} APIs: ${breakdown}`
    };
  }

  /**
   * Update API performance tracking (learning mechanism)
   */
  private updateAPIPerformance(
    sourceName: string,
    confidence: number,
    success: boolean
  ): void {
    const current = this.apiPerformance.get(sourceName) || {
      successCount: 0,
      failureCount: 0,
      avgConfidence: 0
    };

    if (success) {
      current.successCount++;
      // Update rolling average confidence
      current.avgConfidence =
        (current.avgConfidence * (current.successCount - 1) + confidence) /
        current.successCount;
    } else {
      current.failureCount++;
    }

    this.apiPerformance.set(sourceName, current);
  }

  /**
   * Get performance stats for an API
   */
  getAPIStats(sourceName: string) {
    return this.apiPerformance.get(sourceName);
  }

  /**
   * Get all registered sources
   */
  getAllSources() {
    return this.router.getAllSources();
  }

  /**
   * Register custom API directory for discovery
   */
  registerAPIDirectory(directory: {
    name: string;
    endpoint: string;
    costPerSearch: number;
    searchMethod: 'GET' | 'POST';
    categories: string[];
  }): void {
    this.discoveryAgent.registerAPIDirectory(directory);
  }
}
