import { Contract, Provider, Signer, EventLog } from 'ethers';
import { SoraConfig, TransactionOptions, PredictionMarket } from '../types';
import { PREDICTION_MARKET_ABI } from '../utils/abis';
import { calculateOdds, calculatePotentialPayout } from '../utils/parsers';

export class PredictionMarketClient {
  private contract: Contract;
  private provider: Provider;
  private signer?: Signer;
  public readonly address: string;

  constructor(config: SoraConfig, signerOrProvider: Signer | Provider) {
    if (!config.predictionMarketAddress) {
      throw new Error('PredictionMarket address not configured');
    }

    this.address = config.predictionMarketAddress;
    
    if ('getAddress' in signerOrProvider) {
      this.signer = signerOrProvider as Signer;
      this.provider = signerOrProvider.provider!;
    } else {
      this.provider = signerOrProvider as Provider;
    }
    
    this.contract = new Contract(
      config.predictionMarketAddress,
      PREDICTION_MARKET_ABI,
      this.signer || this.provider
    );
  }

  /**
   * Create a new prediction market
   */
  async createMarket(
    questionId: string,
    question: string,
    deadline: number,
    options?: TransactionOptions
  ): Promise<string> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.createMarket(questionId, question, deadline, options);
    const receipt = await tx.wait();
    
    const event = receipt.logs.find((log: any) => 
      log.fragment && log.fragment.name === 'MarketCreated'
    ) as EventLog;
    
    return event?.args?.marketId || '';
  }

  /**
   * Take a position in a prediction market
   */
  async takePosition(
    marketId: string,
    isYes: boolean,
    amount: bigint,
    options?: TransactionOptions
  ): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.takePosition(marketId, isYes, {
      value: amount,
      ...options
    });
    
    await tx.wait();
  }

  /**
   * Resolve a market using oracle answer
   */
  async resolveMarket(marketId: string, options?: TransactionOptions): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.resolveMarket(marketId, options);
    await tx.wait();
  }

  /**
   * Claim winnings from a resolved market
   */
  async claimWinnings(marketId: string, options?: TransactionOptions): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.claimWinnings(marketId, options);
    await tx.wait();
  }

  /**
   * Get total number of markets created
   */
  async getMarketCount(): Promise<bigint> {
    return await this.contract.marketCounter();
  }

  /**
   * Get raw market data by ID from blockchain
   */
  async getMarketById(marketId: number | string): Promise<{
    question: string;
    questionId: bigint;
    resolutionTime: bigint;
    yesPool: bigint;
    noPool: bigint;
    status: number;
    outcome: number;
    totalFees: bigint;
  }> {
    const market = await this.contract.markets(marketId);
    return {
      question: market[0],
      questionId: market[1],
      resolutionTime: market[2],
      yesPool: market[3],
      noPool: market[4],
      status: market[5],
      outcome: market[6],
      totalFees: market[7]
    };
  }

  /**
   * Get all markets from blockchain
   */
  async getAllMarkets(): Promise<any[]> {
    const count = await this.getMarketCount();
    const markets = [];
    
    for (let i = 0; i < Number(count); i++) {
      try {
        const market = await this.getMarketById(i);
        markets.push({
          id: i.toString(),
          question: market.question,
          questionId: market.questionId.toString(),
          deadline: Number(market.resolutionTime),
          totalYes: market.yesPool,
          totalNo: market.noPool,
          totalPool: market.yesPool + market.noPool,
          status: market.status,
          outcome: market.outcome,
          resolved: market.status === 2, // RESOLVED = 2
          winningOutcome: market.outcome === 1, // YES = 1
        });
      } catch (error) {
        console.warn(`Failed to load market ${i}:`, error);
      }
    }
    
    return markets;
  }

  /**
   * Calculate potential winnings for a user
   */
  async calculateWinnings(marketId: string, userAddress: string): Promise<bigint> {
    try {
      const winnings = await this.contract.calculateWinnings(marketId, userAddress);
      return winnings;
    } catch (error) {
      console.warn(`Failed to calculate winnings for market ${marketId}:`, error);
      return BigInt(0);
    }
  }

  /**
   * Get user's position and check if already claimed
   */
  async getPosition(marketId: string, userAddress: string): Promise<{
    isYes: boolean;
    amount: bigint;
    claimed: boolean;
  }> {
    try {
      const result = await this.contract.getPosition(marketId, userAddress);
      return {
        isYes: result[0],
        amount: result[1],
        claimed: result[2]
      };
    } catch (error) {
      console.warn(`Failed to get position for market ${marketId}:`, error);
      return {
        isYes: false,
        amount: BigInt(0),
        claimed: false
      };
    }
  }

  /**
   * Get market details
   */
  async getMarket(marketId: string, userAddress?: string): Promise<PredictionMarket | null> {
    try {
      const result = await this.contract.getMarket(marketId);
      
      const totalYes = result[2];
      const totalNo = result[3];
      const { yesOdds, noOdds } = calculateOdds(totalYes, totalNo);

      const market: PredictionMarket = {
        id: marketId,
        questionId: result[0],
        question: result[1],
        totalYes,
        totalNo,
        totalPool: result[4],
        resolved: result[5],
        outcome: result[5] ? result[6] : undefined,
        deadline: Number(result[7]),
        yesOdds,
        noOdds
      };

      if (userAddress) {
        const position = await this.contract.getUserPosition(marketId, userAddress);
        if (position[2]) {
          market.userPosition = {
            isYes: position[0],
            amount: position[1],
            potentialPayout: calculatePotentialPayout(position[1], position[0], totalYes, totalNo)
          };
        }
      }

      return market;
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  /**
   * Get user position in a market
   */
  async getUserPosition(marketId: string, userAddress: string): Promise<{
    isYes: boolean;
    amount: bigint;
    hasPosition: boolean;
  }> {
    const result = await this.contract.getUserPosition(marketId, userAddress);
    return {
      isYes: result[0],
      amount: result[1],
      hasPosition: result[2]
    };
  }

  /**
   * Listen to MarketCreated events
   */
  onMarketCreated(callback: (market: Partial<PredictionMarket>) => void): void {
    const eventFilter = this.contract.filters.MarketCreated();
    
    this.contract.on(eventFilter, (marketId, questionId, question, deadline) => {
      callback({
        id: marketId,
        questionId,
        question,
        deadline: Number(deadline)
      });
    });
  }

  /**
   * Listen to PositionTaken events
   */
  onPositionTaken(callback: (marketId: string, user: string, isYes: boolean, amount: bigint) => void): void {
    const eventFilter = this.contract.filters.PositionTaken();
    
    this.contract.on(eventFilter, (marketId, user, isYes, amount) => {
      callback(marketId, user, isYes, amount);
    });
  }

  /**
   * Listen to MarketResolved events
   */
  onMarketResolved(callback: (marketId: string, outcome: boolean) => void): void {
    const eventFilter = this.contract.filters.MarketResolved();
    
    this.contract.on(eventFilter, (marketId, outcome) => {
      callback(marketId, outcome);
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}
