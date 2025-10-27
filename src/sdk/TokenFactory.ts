import { ethers } from 'ethers';
import { OracleClient } from '@sora-oracle/sdk';

export interface TokenDeployment {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  marketName: string;
  oracleFeed: string;
  deploymentTx: string;
  timestamp: number;
}

export interface TokenFactoryConfig {
  provider: ethers.Provider;
  factoryAddress: string;
  oracleClient: OracleClient;
  signer?: ethers.Signer;
}

/**
 * TokenFactory SDK - Deploy ERC-20 tokens for prediction markets
 * Validates oracle feeds before minting to ensure market viability
 */
export class TokenFactory {
  private provider: ethers.Provider;
  private factoryAddress: string;
  private oracleClient: OracleClient;
  private signer?: ethers.Signer;
  private factoryContract?: ethers.Contract;

  private static readonly FACTORY_ABI = [
    'function createToken(string marketName, uint256 initialSupply, address oracleFeed) external returns (address)',
    'function getDeployedTokens() external view returns (address[])',
    'function getTokenMetadata(address token) external view returns (tuple(string name, string symbol, uint256 totalSupply, address oracleFeed, uint256 createdAt))',
    'event TokenCreated(address indexed tokenAddress, string marketName, string symbol, uint256 initialSupply, address oracleFeed)'
  ];

  constructor(config: TokenFactoryConfig) {
    this.provider = config.provider;
    this.factoryAddress = config.factoryAddress;
    this.oracleClient = config.oracleClient;
    this.signer = config.signer;

    if (this.signer) {
      this.factoryContract = new ethers.Contract(
        this.factoryAddress,
        TokenFactory.FACTORY_ABI,
        this.signer
      );
    }
  }

  /**
   * Generate standardized token symbol from market name
   * Example: "BTC-100K" -> "BTC100K"
   */
  private generateSymbol(marketName: string): string {
    return marketName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * Validate oracle feed exists and is active
   * @param oracleFeed Address of oracle feed contract
   * @returns true if valid, throws error otherwise
   */
  private async validateOracleFeed(oracleFeed: string): Promise<boolean> {
    try {
      // Check if oracle feed address is valid
      if (!ethers.isAddress(oracleFeed)) {
        throw new Error(`Invalid oracle feed address: ${oracleFeed}`);
      }

      // Query oracle to verify feed exists and has data
      const feedData = await this.oracleClient.getLatestAnswer(oracleFeed);
      
      if (!feedData || feedData.answer === '') {
        throw new Error(`Oracle feed ${oracleFeed} has no data`);
      }

      // Verify feed is recent (within 24 hours)
      const feedAge = Date.now() / 1000 - feedData.timestamp;
      if (feedAge > 86400) {
        throw new Error(`Oracle feed ${oracleFeed} is stale (${Math.floor(feedAge / 3600)} hours old)`);
      }

      return true;
    } catch (error) {
      throw new Error(`Oracle feed validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deploy a new ERC-20 token for a prediction market
   * @param marketName Human-readable market name (e.g., "BTC-100K")
   * @param initialSupply Token supply in human-readable format (e.g., 1000000000 for 1B tokens)
   *                     Accepts string, number, or BigInt - will be converted to 18 decimals
   * @param oracleFeed Address of validated oracle feed
   * @returns Token deployment details
   */
  async deployToken(
    marketName: string,
    initialSupply: string | number | bigint,
    oracleFeed: string
  ): Promise<TokenDeployment> {
    if (!this.factoryContract || !this.signer) {
      throw new Error('Signer required for token deployment');
    }

    // Validate inputs
    if (!marketName || marketName.length === 0) {
      throw new Error('Market name cannot be empty');
    }
    
    // Convert to BigInt for validation (handles string, number, bigint)
    let supplyBigInt: bigint;
    try {
      supplyBigInt = BigInt(initialSupply);
    } catch (error) {
      throw new Error('Invalid initial supply format');
    }
    
    if (supplyBigInt <= 0n) {
      throw new Error('Initial supply must be greater than zero');
    }
    
    // Allow any positive BigInt - contract's uint256 will enforce its own limits
    // In practice, supply * 1e18 must fit in uint256 (2^256 - 1)
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const supplyInWei = BigInt(ethers.parseUnits(supplyBigInt.toString(), 18).toString());
    
    if (supplyInWei > MAX_UINT256) {
      throw new Error('Initial supply too large for uint256 after 18-decimal conversion');
    }

    // Validate oracle feed
    await this.validateOracleFeed(oracleFeed);

    // Generate token symbol
    const symbol = this.generateSymbol(marketName);
    
    console.log(`Deploying token for market: ${marketName}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Initial supply: ${supplyBigInt.toString()} tokens (${supplyInWei.toString()} wei)`);
    console.log(`Oracle feed: ${oracleFeed}`);

    const tx = await this.factoryContract.createToken(
      marketName,
      supplyInWei,
      oracleFeed
    );

    console.log(`Transaction submitted: ${tx.hash}`);
    const receipt = await tx.wait();

    // Parse TokenCreated event
    const event = receipt?.logs
      .map((log: any) => {
        try {
          return this.factoryContract!.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === 'TokenCreated');

    if (!event) {
      throw new Error('TokenCreated event not found in transaction receipt');
    }

    const tokenAddress = event.args.tokenAddress;

    const deployment: TokenDeployment = {
      address: tokenAddress,
      name: marketName,
      symbol: symbol,
      totalSupply: initialSupply.toString(),
      marketName: marketName,
      oracleFeed: oracleFeed,
      deploymentTx: tx.hash,
      timestamp: Date.now()
    };

    // Save metadata to file
    await this.saveMetadata(deployment);

    console.log(`✅ Token deployed successfully!`);
    console.log(`   Address: ${tokenAddress}`);
    console.log(`   Symbol: ${symbol}`);

    return deployment;
  }

  /**
   * Save token metadata to output directory
   */
  private async saveMetadata(deployment: TokenDeployment): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const outputDir = path.join(process.cwd(), 'output', 'tokens');
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `${deployment.symbol}_${deployment.address.slice(0, 8)}.json`;
    const filepath = path.join(outputDir, filename);

    const metadata = {
      ...deployment,
      abi: [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]
    };

    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
    console.log(`Metadata saved to: ${filepath}`);
  }

  /**
   * Get all deployed tokens from factory
   */
  async getDeployedTokens(): Promise<string[]> {
    const contract = new ethers.Contract(
      this.factoryAddress,
      TokenFactory.FACTORY_ABI,
      this.provider
    );

    return await contract.getDeployedTokens();
  }

  /**
   * Get token metadata from factory
   */
  async getTokenMetadata(tokenAddress: string): Promise<any> {
    const contract = new ethers.Contract(
      this.factoryAddress,
      TokenFactory.FACTORY_ABI,
      this.provider
    );

    return await contract.getTokenMetadata(tokenAddress);
  }
}
