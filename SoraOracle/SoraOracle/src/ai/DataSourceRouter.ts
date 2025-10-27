import OpenAI from 'openai';
import { X402Client } from '../sdk/X402Client';

/**
 * Intelligent Data Source Router
 * Uses AI to analyze questions and dynamically select relevant data sources
 */

export interface DataSourceMetadata {
  name: string;
  endpoint: string;
  categories: string[]; // e.g., ['crypto', 'finance'], ['weather'], ['sports']
  costPerCall: number;
  description: string;
  exampleQuestions: string[];
  x402Enabled: boolean;
}

export interface QuestionAnalysis {
  category: string;          // 'crypto', 'weather', 'sports', 'politics', etc.
  keywords: string[];
  recommendedSources: string[];
  confidence: number;
  reasoning: string;
}

export class DataSourceRouter {
  private openai: OpenAI;
  private x402Client: X402Client;
  private sourceRegistry: Map<string, DataSourceMetadata>;

  constructor(openaiApiKey: string, x402Client: X402Client) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.x402Client = x402Client;
    this.sourceRegistry = new Map();

    // Initialize source registry with categorized APIs
    this.initializeSourceRegistry();
  }

  /**
   * Initialize the data source registry with categorized APIs
   */
  private initializeSourceRegistry(): void {
    // Crypto APIs
    this.registerSource({
      name: 'CoinGecko',
      endpoint: 'https://api.coingecko.com/api/v3',
      categories: ['crypto', 'finance', 'price'],
      costPerCall: 0.02,
      description: 'Cryptocurrency prices, market caps, and historical data',
      exampleQuestions: [
        'Will BTC reach $100K?',
        'Will ETH surpass $10K by 2025?',
        'Will Dogecoin hit $1?'
      ],
      x402Enabled: true
    });

    this.registerSource({
      name: 'CryptoCompare',
      endpoint: 'https://min-api.cryptocompare.com/data',
      categories: ['crypto', 'finance', 'trading'],
      costPerCall: 0.03,
      description: 'Cryptocurrency market data and trading volume',
      exampleQuestions: [
        'Will Bitcoin dominance exceed 50%?',
        'Will Ethereum trading volume increase?'
      ],
      x402Enabled: true
    });

    // News & Events APIs
    this.registerSource({
      name: 'NewsAPI',
      endpoint: 'https://newsapi.org/v2',
      categories: ['news', 'events', 'politics', 'business'],
      costPerCall: 0.02,
      description: 'Breaking news from 80,000+ sources worldwide',
      exampleQuestions: [
        'Will the US pass crypto regulation?',
        'Will Tesla announce new product?',
        'Will SpaceX launch successfully?'
      ],
      x402Enabled: true
    });

    // Social Media APIs
    this.registerSource({
      name: 'TwitterAPI',
      endpoint: 'https://api.twitter.com/2',
      categories: ['social', 'sentiment', 'trends'],
      costPerCall: 0.05,
      description: 'Twitter sentiment analysis and trending topics',
      exampleQuestions: [
        'Will #Bitcoin trend on Twitter?',
        'Will Elon Musk tweet about Dogecoin?'
      ],
      x402Enabled: true
    });

    // Weather APIs
    this.registerSource({
      name: 'OpenWeatherMap',
      endpoint: 'https://api.openweathermap.org/data/3.0',
      categories: ['weather', 'climate'],
      costPerCall: 0.01,
      description: 'Weather forecasts and historical weather data',
      exampleQuestions: [
        'Will it rain in Tokyo tomorrow?',
        'Will temperature exceed 100°F in Phoenix?'
      ],
      x402Enabled: true
    });

    // Sports APIs
    this.registerSource({
      name: 'SportsData',
      endpoint: 'https://api.sportsdata.io',
      categories: ['sports', 'nfl', 'nba', 'soccer'],
      costPerCall: 0.04,
      description: 'Live sports scores, stats, and odds',
      exampleQuestions: [
        'Will Lakers win the championship?',
        'Will Tom Brady return to NFL?'
      ],
      x402Enabled: true
    });

    // Stock Market APIs
    this.registerSource({
      name: 'AlphaVantage',
      endpoint: 'https://www.alphavantage.co/query',
      categories: ['stocks', 'finance', 'trading'],
      costPerCall: 0.03,
      description: 'Stock prices, forex, and financial indicators',
      exampleQuestions: [
        'Will Tesla stock reach $500?',
        'Will S&P 500 hit new highs?'
      ],
      x402Enabled: true
    });

    // Real Estate APIs
    this.registerSource({
      name: 'Zillow',
      endpoint: 'https://api.bridgedataoutput.com/api/v2',
      categories: ['realestate', 'housing', 'property'],
      costPerCall: 0.03,
      description: 'Home prices and real estate market data',
      exampleQuestions: [
        'Will median home price exceed $500K in SF?',
        'Will housing inventory increase?'
      ],
      x402Enabled: true
    });

    // Government/Economic APIs
    this.registerSource({
      name: 'FRED',
      endpoint: 'https://api.stlouisfed.org/fred',
      categories: ['economics', 'government', 'inflation'],
      costPerCall: 0.02,
      description: 'US economic data from Federal Reserve',
      exampleQuestions: [
        'Will inflation exceed 5%?',
        'Will unemployment rate drop below 3%?'
      ],
      x402Enabled: true
    });
  }

  /**
   * Register a new data source
   */
  registerSource(metadata: DataSourceMetadata): void {
    this.sourceRegistry.set(metadata.name, metadata);
  }

  /**
   * Analyze question using GPT-4 to determine relevant data sources
   * This is the KEY intelligence layer!
   */
  async analyzeQuestion(question: string): Promise<QuestionAnalysis> {
    console.log(`🤖 Analyzing question: "${question}"`);

    // Build context for GPT-4 with all available data sources
    const sourceList = Array.from(this.sourceRegistry.values())
      .map(source => {
        return `- ${source.name}: ${source.description}\n  Categories: ${source.categories.join(', ')}\n  Cost: $${source.costPerCall}`;
      })
      .join('\n');

    const prompt = `You are an AI data source router for a prediction market platform.

QUESTION: "${question}"

AVAILABLE DATA SOURCES:
${sourceList}

YOUR TASK:
1. Analyze the question and determine its category (crypto, weather, sports, politics, etc.)
2. Extract key keywords from the question
3. Recommend the 2-4 MOST RELEVANT data sources that could verify this question
4. Provide your confidence score (0-1) in this analysis
5. Explain your reasoning

Respond in JSON format:
{
  "category": "primary category",
  "keywords": ["keyword1", "keyword2"],
  "recommendedSources": ["Source1", "Source2"],
  "confidence": 0.95,
  "reasoning": "explanation of why these sources are relevant"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing questions and selecting relevant data sources. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent routing
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');

      console.log(`✅ Analysis complete:`);
      console.log(`   Category: ${analysis.category}`);
      console.log(`   Recommended sources: ${analysis.recommendedSources.join(', ')}`);
      console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      return analysis;
    } catch (error) {
      console.error('❌ Question analysis failed:', error);
      
      // Fallback: Use keyword matching if GPT fails
      return this.fallbackAnalysis(question);
    }
  }

  /**
   * Fallback analysis using keyword matching if GPT fails
   */
  private fallbackAnalysis(question: string): QuestionAnalysis {
    const lowerQuestion = question.toLowerCase();
    const keywords: string[] = [];
    const recommendedSources: string[] = [];

    // Crypto keywords
    if (lowerQuestion.match(/btc|bitcoin|eth|ethereum|crypto|coin|defi|nft/)) {
      keywords.push('crypto');
      recommendedSources.push('CoinGecko', 'CryptoCompare');
    }

    // Weather keywords
    if (lowerQuestion.match(/rain|snow|temperature|weather|storm|forecast/)) {
      keywords.push('weather');
      recommendedSources.push('OpenWeatherMap');
    }

    // Sports keywords
    if (lowerQuestion.match(/nfl|nba|soccer|football|championship|game|team/)) {
      keywords.push('sports');
      recommendedSources.push('SportsData');
    }

    // News keywords
    if (lowerQuestion.match(/news|announce|launch|regulation|government/)) {
      keywords.push('news');
      recommendedSources.push('NewsAPI');
    }

    // Stock keywords
    if (lowerQuestion.match(/stock|tesla|apple|s&p|nasdaq|trading/)) {
      keywords.push('stocks');
      recommendedSources.push('AlphaVantage');
    }

    // Default to crypto if nothing matches
    if (recommendedSources.length === 0) {
      recommendedSources.push('CoinGecko', 'NewsAPI');
    }

    return {
      category: keywords[0] || 'general',
      keywords,
      recommendedSources,
      confidence: 0.6, // Lower confidence for fallback
      reasoning: 'Fallback keyword matching (GPT analysis unavailable)'
    };
  }

  /**
   * Get data source metadata by name
   */
  getSource(name: string): DataSourceMetadata | undefined {
    return this.sourceRegistry.get(name);
  }

  /**
   * Get all sources in a category
   */
  getSourcesByCategory(category: string): DataSourceMetadata[] {
    return Array.from(this.sourceRegistry.values()).filter(source =>
      source.categories.includes(category)
    );
  }

  /**
   * Calculate total cost for recommended sources
   */
  calculateCost(sourceNames: string[]): number {
    return sourceNames.reduce((total, name) => {
      const source = this.sourceRegistry.get(name);
      return total + (source?.costPerCall || 0);
    }, 0);
  }

  /**
   * Get all registered sources
   */
  getAllSources(): DataSourceMetadata[] {
    return Array.from(this.sourceRegistry.values());
  }
}
