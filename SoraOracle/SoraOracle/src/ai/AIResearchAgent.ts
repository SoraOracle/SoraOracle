import { X402Client, X402PaymentProof } from '../sdk/X402Client';
import { ethers } from 'ethers';

/**
 * AI Research Agent with x402 Integration
 * Pays for external data sources to provide accurate market settlements
 */

export interface DataSourceConfig {
  name: string;
  endpoint: string;
  apiKeyRequired: boolean;
  costPerCall: number; // In USDC
  x402Enabled: boolean;
}

export interface ResearchResult {
  outcome: boolean;
  confidence: number;
  sources: string[];
  reasoning: string;
  totalCost: number;
  payments: X402PaymentProof[];
}

export class AIResearchAgent {
  private x402Client: X402Client;
  private dataSources: Map<string, DataSourceConfig>;

  constructor(x402Client: X402Client) {
    this.x402Client = x402Client;
    this.dataSources = new Map();

    // Register default data sources
    this.registerDataSource({
      name: 'CoinGecko',
      endpoint: 'https://api.coingecko.com/api/v3',
      apiKeyRequired: false,
      costPerCall: 0.02,
      x402Enabled: true
    });

    this.registerDataSource({
      name: 'CryptoCompare',
      endpoint: 'https://min-api.cryptocompare.com/data',
      apiKeyRequired: true,
      costPerCall: 0.03,
      x402Enabled: true
    });

    this.registerDataSource({
      name: 'NewsAPI',
      endpoint: 'https://newsapi.org/v2',
      apiKeyRequired: true,
      costPerCall: 0.02,
      x402Enabled: true
    });

    this.registerDataSource({
      name: 'TwitterAPI',
      endpoint: 'https://api.twitter.com/2',
      apiKeyRequired: true,
      costPerCall: 0.05,
      x402Enabled: true
    });
  }

  /**
   * Register a data source
   */
  registerDataSource(config: DataSourceConfig): void {
    this.dataSources.set(config.name, config);
  }

  /**
   * Research a market question using x402-enabled data sources
   */
  async researchMarket(
    question: string,
    oracleFeed: string,
    options?: {
      maxCost?: number;      // Maximum spend in USDC
      minConfidence?: number; // Minimum confidence threshold (0-1)
      preferredSources?: string[];
    }
  ): Promise<ResearchResult> {
    console.log(`AI Research Agent analyzing: ${question}`);

    const maxCost = options?.maxCost || 0.25; // Default max: $0.25
    const minConfidence = options?.minConfidence || 0.8; // Default: 80%
    const preferredSources = options?.preferredSources || ['CoinGecko', 'CryptoCompare'];

    let totalCost = 0;
    const payments: X402PaymentProof[] = [];
    const sourcesUsed: string[] = [];
    let aggregatedData: any[] = [];

    // Query each preferred data source with x402 payment
    for (const sourceName of preferredSources) {
      const source = this.dataSources.get(sourceName);
      if (!source) continue;

      // Check budget
      if (totalCost + source.costPerCall > maxCost) {
        console.log(`Budget limit reached. Skipping ${sourceName}`);
        break;
      }

      try {
        console.log(`Querying ${sourceName} (cost: $${source.costPerCall})...`);

        // Create x402 payment for data access
        const payment = await this.x402Client.createPayment('dataSourceAccess');

        // Fetch data with payment header
        const data = await this.fetchDataSource(source, question, payment);

        if (data) {
          aggregatedData.push(data);
          sourcesUsed.push(sourceName);
          payments.push(payment);
          totalCost += source.costPerCall;
        }
      } catch (error) {
        console.error(`Failed to query ${sourceName}:`, error);
      }
    }

    // Analyze aggregated data with AI
    const analysis = await this.analyzeData(question, aggregatedData);

    console.log(`Research complete. Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`Total cost: $${totalCost.toFixed(4)}`);

    return {
      outcome: analysis.outcome,
      confidence: analysis.confidence,
      sources: sourcesUsed,
      reasoning: analysis.reasoning,
      totalCost,
      payments
    };
  }

  /**
   * Fetch data from a source with x402 payment
   */
  private async fetchDataSource(
    source: DataSourceConfig,
    query: string,
    payment: X402PaymentProof
  ): Promise<any> {
    try {
      // In production, this would make actual HTTP requests with x402 headers
      // For now, simulate data fetching

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-402-Payment': JSON.stringify(payment)
      };

      // Simulate API call (in production, use fetch)
      console.log(`Fetching from ${source.endpoint} with x402 payment...`);

      // Mock response based on source
      if (source.name === 'CoinGecko') {
        return {
          source: 'CoinGecko',
          data: { price: 95000, trend: 'bullish', confidence: 0.85 }
        };
      } else if (source.name === 'CryptoCompare') {
        return {
          source: 'CryptoCompare',
          data: { price: 94800, sentiment: 'positive', confidence: 0.82 }
        };
      } else if (source.name === 'NewsAPI') {
        return {
          source: 'NewsAPI',
          data: { sentiment: 'bullish', articles: 127, confidence: 0.78 }
        };
      }

      return null;
    } catch (error) {
      console.error(`Data fetch failed:`, error);
      return null;
    }
  }

  /**
   * Analyze aggregated data to determine market outcome
   */
  private async analyzeData(
    question: string,
    data: any[]
  ): Promise<{ outcome: boolean; confidence: number; reasoning: string }> {
    if (data.length === 0) {
      return {
        outcome: false,
        confidence: 0,
        reasoning: 'Insufficient data from sources'
      };
    }

    // Simple consensus algorithm (in production, use GPT-4 or Claude)
    let totalConfidence = 0;
    let positiveCount = 0;

    for (const item of data) {
      if (item.data.price && item.data.price > 90000) {
        positiveCount++;
      }
      totalConfidence += item.data.confidence || 0.5;
    }

    const outcome = positiveCount > data.length / 2;
    const confidence = totalConfidence / data.length;

    const reasoning = `Analyzed ${data.length} sources. ${positiveCount}/${data.length} indicate positive outcome. Average confidence: ${(confidence * 100).toFixed(1)}%`;

    return { outcome, confidence, reasoning };
  }

  /**
   * Get total costs for a research operation
   */
  estimateCost(sources: string[]): number {
    let total = 0;
    for (const sourceName of sources) {
      const source = this.dataSources.get(sourceName);
      if (source) {
        total += source.costPerCall;
      }
    }
    return total;
  }

  /**
   * List available data sources
   */
  getAvailableSources(): DataSourceConfig[] {
    return Array.from(this.dataSources.values());
  }
}
