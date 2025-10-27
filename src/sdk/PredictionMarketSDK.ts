import { ethers } from 'ethers';
import { TokenFactory } from './TokenFactory';
import { S402Client, S402PaymentProof } from './S402Client';

// OracleClient placeholder - replace with actual implementation
interface OracleClient {
  getLatestAnswer(feed: string): Promise<{ answer: string }>;
}

/**
 * Enhanced Prediction Market SDK with Optional Token Factory and s402 Payments
 */

export interface SDKConfig {
  provider: ethers.Provider;
  signer: ethers.Signer;
  marketContractAddress: string;
  oracleClient: OracleClient;
  s402Config: {
    facilitatorUrl: string;
    facilitatorAddress: string;  // REQUIRED: s402 facilitator contract address
    usdcAddress: string;
    recipientAddress: string;    // REQUIRED: Service provider address (who receives payment)
    network: 'mainnet' | 'testnet';
  };
  tokenFactoryAddress?: string; // Optional!
}

export interface CreateMarketOptions {
  question: string;
  oracleFeed: string;
  resolutionTime: number;
  useTokenFactory?: boolean;      // NEW: Optional token minting
  tokenSupply?: string | number;  // Only needed if useTokenFactory = true
}

export interface PlaceBetOptions {
  marketId: number;
  position: boolean;
  amount: string;
}

export interface ResolveMarketOptions {
  marketId: number;
  useAI?: boolean; // Use AI research agent for settlement
}

export class PredictionMarketSDK {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private marketContract: ethers.Contract;
  private oracleClient: OracleClient;
  private s402Client: S402Client;
  private tokenFactory?: TokenFactory;

  private static readonly MARKET_ABI = [
    'function createMarket(string question, address oracleFeed, uint256 resolutionTime, bool useToken, uint256 tokenSupply, tuple(bytes32 nonce, uint256 amount, address token, address from, address facilitator, bytes signature) payment) external returns (uint256)',
    'function takePosition(uint256 marketId, bool position, tuple(bytes32 nonce, uint256 amount, address token, address from, address facilitator, bytes signature) payment) external payable',
    'function resolveMarket(uint256 marketId, bool outcome, tuple(bytes32 nonce, uint256 amount, address token, address from, address facilitator, bytes signature) payment) external',
    'function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string question, address oracleFeed, address marketToken, uint256 resolutionTime, bool resolved, bool outcome, uint256 totalYesPool, uint256 totalNoPool, uint256 createdAt, address creator))'
  ];

  constructor(config: SDKConfig) {
    this.provider = config.provider;
    this.signer = config.signer;
    this.oracleClient = config.oracleClient;

    // Validate facilitatorAddress is a valid Ethereum address
    if (!ethers.isAddress(config.s402Config.facilitatorAddress)) {
      throw new Error('Invalid facilitatorAddress: must be a valid Ethereum address');
    }

    // Initialize s402 payment client
    this.s402Client = new S402Client({
      facilitatorUrl: config.s402Config.facilitatorUrl,
      facilitatorAddress: config.s402Config.facilitatorAddress,
      usdcAddress: config.s402Config.usdcAddress,
      recipientAddress: config.s402Config.recipientAddress,
      network: config.s402Config.network,
      signer: config.signer
    });

    // Initialize market contract
    this.marketContract = new ethers.Contract(
      config.marketContractAddress,
      PredictionMarketSDK.MARKET_ABI,
      this.signer
    );

    // Initialize token factory if provided (OPTIONAL)
    if (config.tokenFactoryAddress) {
      this.tokenFactory = new TokenFactory({
        provider: this.provider,
        factoryAddress: config.tokenFactoryAddress,
        oracleClient: this.oracleClient,
        signer: this.signer
      });
    }
  }

  /**
   * Create a prediction market with optional token minting
   * Requires s402 payment: $0.05 USDC
   */
  async createMarket(options: CreateMarketOptions): Promise<{
    marketId: number;
    tokenAddress?: string;
    transactionHash: string;
    paymentProof: S402PaymentProof;
  }> {
    console.log(`Creating market: ${options.question}`);
    console.log(`Use token factory: ${options.useTokenFactory || false}`);

    // Generate s402 payment proof for market creation (EIP-2612 permit)
    const paymentProof = await this.s402Client.createPayment('createMarket');

    console.log(`Payment proof generated: $${this.s402Client.getOperationPrice('createMarket') / 1_000_000} USDC`);

    // Execute permit on-chain first (EIP-2612: permit then transferFrom)
    await this.s402Client.executePermit(paymentProof);

    // Determine if we're using token factory
    const useToken = options.useTokenFactory && this.tokenFactory !== undefined;
    const tokenSupply = useToken && options.tokenSupply 
      ? BigInt(options.tokenSupply) 
      : 0n;

    if (useToken && !options.tokenSupply) {
      throw new Error('tokenSupply required when useTokenFactory is true');
    }

    if (useToken && !this.tokenFactory) {
      throw new Error('Token factory not configured in SDK. Provide tokenFactoryAddress in config.');
    }

    // Create market (permit already executed, now just create market)
    const tx = await this.marketContract.createMarket(
      options.question,
      options.oracleFeed,
      options.resolutionTime,
      useToken,
      tokenSupply
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();

    // Parse MarketCreated event
    const event = receipt?.logs
      .map((log: any) => {
        try {
          return this.marketContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === 'MarketCreated');

    if (!event) {
      throw new Error('MarketCreated event not found');
    }

    return {
      marketId: Number(event.args.marketId),
      tokenAddress: useToken ? event.args.marketToken : undefined,
      transactionHash: tx.hash,
      paymentProof
    };
  }

  /**
   * Place a bet on a market
   * Requires x402 payment: $0.01 USDC
   */
  async placeBet(options: PlaceBetOptions): Promise<{
    transactionHash: string;
    paymentProof: X402PaymentProof;
  }> {
    console.log(`Placing bet on market ${options.marketId}: ${options.position ? 'YES' : 'NO'}`);

    // Generate x402 payment proof
    const paymentProof = await this.x402Client.createPayment('placeBet');

    console.log(`Payment proof generated: $${this.x402Client.getOperationPrice('placeBet') / 1_000_000} USDC`);

    // Convert payment proof to contract format
    const contractProof = this.formatPaymentProof(paymentProof);

    // Place bet with payment
    const tx = await this.marketContract.takePosition(
      options.marketId,
      options.position,
      contractProof,
      { value: ethers.parseEther(options.amount) }
    );

    console.log(`Bet placed: ${tx.hash}`);
    await tx.wait();

    return {
      transactionHash: tx.hash,
      paymentProof
    };
  }

  /**
   * Resolve market (optionally with AI research)
   * Requires x402 payment: $0.10 USDC (includes AI research costs)
   */
  async resolveMarket(options: ResolveMarketOptions): Promise<{
    outcome: boolean;
    transactionHash: string;
    aiResearchUsed: boolean;
    paymentProof: X402PaymentProof;
  }> {
    console.log(`Resolving market ${options.marketId}`);

    // Generate x402 payment proof
    const paymentProof = await this.x402Client.createPayment('resolveMarket');

    let outcome: boolean;

    if (options.useAI) {
      console.log('Using AI research agent for settlement...');
      // AI research will be implemented in AIResearchAgent class
      // For now, use oracle directly
      const market = await this.marketContract.getMarket(options.marketId);
      const feedData = await this.oracleClient.getLatestAnswer(market.oracleFeed);
      outcome = feedData.answer === 'yes' || feedData.answer === 'true';
    } else {
      // Use oracle directly
      const market = await this.marketContract.getMarket(options.marketId);
      const feedData = await this.oracleClient.getLatestAnswer(market.oracleFeed);
      outcome = feedData.answer === 'yes' || feedData.answer === 'true';
    }

    console.log(`Outcome determined: ${outcome ? 'YES' : 'NO'}`);

    // Convert payment proof to contract format
    const contractProof = this.formatPaymentProof(paymentProof);

    // Resolve market on-chain
    const tx = await this.marketContract.resolveMarket(options.marketId, outcome, contractProof);
    await tx.wait();

    return {
      outcome,
      transactionHash: tx.hash,
      aiResearchUsed: options.useAI || false,
      paymentProof
    };
  }

  /**
   * Get market details
   */
  async getMarket(marketId: number) {
    return await this.marketContract.getMarket(marketId);
  }

  /**
   * Get x402 pricing information
   */
  getPricing() {
    return {
      createMarket: this.x402Client.getOperationPrice('createMarket') / 1_000_000,
      placeBet: this.x402Client.getOperationPrice('placeBet') / 1_000_000,
      resolveMarket: this.x402Client.getOperationPrice('resolveMarket') / 1_000_000,
      dataSourceAccess: this.x402Client.getOperationPrice('dataSourceAccess') / 1_000_000
    };
  }

  /**
   * Format payment proof for contract (CRITICAL: must match X402PaymentProof struct exactly)
   * Contract expects: (bytes32 nonce, uint256 amount, address token, address from, address facilitator, bytes signature)
   */
  private formatPaymentProof(proof: X402PaymentProof) {
    return {
      nonce: proof.nonce,               // bytes32
      amount: proof.amount,             // uint256 (already in USDC 6 decimals)
      token: proof.assetContract,       // address (USDC)
      from: proof.payer,                // address (user)
      facilitator: proof.recipient,     // address (s402 facilitator/recipient)
      signature: proof.signature        // bytes
      // NO timestamp - not in contract struct
    };
  }
}
