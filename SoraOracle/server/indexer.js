const { ethers } = require('ethers');
const db = require('./db');

const MAINNET_CONTRACTS = {
  SoraOracle: '0x4124227dEf2A0c9BBa315dF13CD7B546f5839516',
  SimplePredictionMarket: '0x6Bd664D0641D8C18C869AD18f61143BB4EDe790c',
  MultiOutcomeMarket: '0x44A091e2e47A1ab038255107e02017ae18CcF9BF',
  OrderBookMarket: null
};

const BSC_RPC = 'https://bsc-dataseed.binance.org/';

const SoraOracleABI = [
  'event QuestionAsked(uint256 indexed questionId, address indexed asker, string question, uint256 bounty)',
  'event AnswerProvided(uint256 indexed questionId, address indexed provider, string answer, uint256 confidence)'
];

const SimplePredictionMarketABI = [
  'event MarketCreated(uint256 indexed marketId, string question, uint256 deadline)',
  'event PositionTaken(uint256 indexed marketId, address indexed user, uint256 amount, bool prediction)',
  'event MarketResolved(uint256 indexed marketId, bool outcome)',
  'event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'
];

const OrderBookMarketABI = [
  'event MarketCreated(uint256 indexed marketId, string question, uint256 deadline)',
  'event OrderPlaced(uint256 indexed marketId, uint256 indexed orderId, address indexed user, bool isBuy, bool isYes, uint256 price, uint256 amount)',
  'event OrderCancelled(uint256 indexed marketId, uint256 indexed orderId)',
  'event OrderMatched(uint256 indexed marketId, uint256 buyOrderId, uint256 sellOrderId, uint256 price, uint256 amount)',
  'event MarketResolved(uint256 indexed marketId, bool outcome)',
  'event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'
];

class BlockchainIndexer {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(BSC_RPC);
    this.contracts = {};
    this.isRunning = false;
    this.lastProcessedBlock = 0;
  }

  async initialize() {
    console.log('🔧 Initializing blockchain indexer...');
    
    this.contracts.soraOracle = new ethers.Contract(
      MAINNET_CONTRACTS.SoraOracle,
      SoraOracleABI,
      this.provider
    );

    this.contracts.simplePredictionMarket = new ethers.Contract(
      MAINNET_CONTRACTS.SimplePredictionMarket,
      SimplePredictionMarketABI,
      this.provider
    );

    this.contracts.multiOutcomeMarket = new ethers.Contract(
      MAINNET_CONTRACTS.MultiOutcomeMarket,
      SimplePredictionMarketABI,
      this.provider
    );

    const currentBlock = await this.provider.getBlockNumber();
    this.lastProcessedBlock = currentBlock;
    console.log(`✅ Indexer initialized at block ${currentBlock}`);
  }

  async indexHistoricalEvents(fromBlock, toBlock) {
    console.log(`📚 Indexing historical events from block ${fromBlock} to ${toBlock}...`);

    try {
      await this.indexSimplePredictionMarketEvents(fromBlock, toBlock);
      await this.indexMultiOutcomeMarketEvents(fromBlock, toBlock);
      
      console.log(`✅ Historical indexing complete up to block ${toBlock}`);
    } catch (error) {
      console.error('Error indexing historical events:', error);
    }
  }

  async indexSimplePredictionMarketEvents(fromBlock, toBlock) {
    const contract = this.contracts.simplePredictionMarket;

    const marketCreatedEvents = await contract.queryFilter(
      contract.filters.MarketCreated(),
      fromBlock,
      toBlock
    );

    console.log(`  Found ${marketCreatedEvents.length} market creation events`);

    for (const event of marketCreatedEvents) {
      await this.handleMarketCreated(event, 'simple');
    }

    const positionEvents = await contract.queryFilter(
      contract.filters.PositionTaken(),
      fromBlock,
      toBlock
    );

    console.log(`  Found ${positionEvents.length} position events`);

    for (const event of positionEvents) {
      await this.handlePositionTaken(event);
    }

    const resolvedEvents = await contract.queryFilter(
      contract.filters.MarketResolved(),
      fromBlock,
      toBlock
    );

    console.log(`  Found ${resolvedEvents.length} resolution events`);

    for (const event of resolvedEvents) {
      await this.handleMarketResolved(event);
    }

    const claimEvents = await contract.queryFilter(
      contract.filters.WinningsClaimed(),
      fromBlock,
      toBlock
    );

    console.log(`  Found ${claimEvents.length} claim events`);

    for (const event of claimEvents) {
      await this.handleWinningsClaimed(event);
    }
  }

  async indexMultiOutcomeMarketEvents(fromBlock, toBlock) {
    const contract = this.contracts.multiOutcomeMarket;

    const marketCreatedEvents = await contract.queryFilter(
      contract.filters.MarketCreated(),
      fromBlock,
      toBlock
    );

    console.log(`  Found ${marketCreatedEvents.length} multi-outcome market creation events`);

    for (const event of marketCreatedEvents) {
      await this.handleMarketCreated(event, 'multi');
    }
  }

  async handleMarketCreated(event, marketType) {
    const { marketId, question, deadline } = event.args;
    const block = await event.getBlock();

    try {
      await db.query(
        `INSERT INTO markets (market_id, contract_address, market_type, question, creator, deadline, created_at, block_number, transaction_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (market_id) DO NOTHING`,
        [
          marketId.toString(),
          event.address.toLowerCase(),
          marketType,
          question,
          event.transaction?.from?.toLowerCase() || '0x0',
          deadline.toString(),
          new Date(Number(block.timestamp) * 1000),
          event.blockNumber,
          event.transactionHash
        ]
      );
      console.log(`  ✓ Indexed market ${marketId}: ${question.substring(0, 50)}...`);
    } catch (error) {
      console.error(`  ✗ Error indexing market ${marketId}:`, error.message);
    }
  }

  async handlePositionTaken(event) {
    const { marketId, user, amount, prediction } = event.args;
    const block = await event.getBlock();

    try {
      await db.query(
        `INSERT INTO bets (market_id, user_address, amount, outcome, timestamp, block_number, transaction_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (transaction_hash, user_address, market_id) DO NOTHING`,
        [
          marketId.toString(),
          user.toLowerCase(),
          amount.toString(),
          prediction ? 'yes' : 'no',
          new Date(Number(block.timestamp) * 1000),
          event.blockNumber,
          event.transactionHash
        ]
      );

      await this.updateMarketSnapshot(marketId);
    } catch (error) {
      console.error(`  ✗ Error indexing position for market ${marketId}:`, error.message);
    }
  }

  async handleMarketResolved(event) {
    const { marketId, outcome } = event.args;
    const block = await event.getBlock();

    try {
      await db.query(
        `UPDATE markets
         SET is_resolved = true, resolution_answer = $1, resolved_at = $2
         WHERE market_id = $3`,
        [
          outcome.toString(),
          new Date(Number(block.timestamp) * 1000),
          marketId.toString()
        ]
      );
      console.log(`  ✓ Market ${marketId} resolved: ${outcome}`);
    } catch (error) {
      console.error(`  ✗ Error resolving market ${marketId}:`, error.message);
    }
  }

  async handleWinningsClaimed(event) {
    const { marketId, user, amount } = event.args;
    const block = await event.getBlock();

    try {
      await db.query(
        `INSERT INTO claims (market_id, user_address, amount, timestamp, block_number, transaction_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (transaction_hash, user_address, market_id) DO NOTHING`,
        [
          marketId.toString(),
          user.toLowerCase(),
          amount.toString(),
          new Date(Number(block.timestamp) * 1000),
          event.blockNumber,
          event.transactionHash
        ]
      );
    } catch (error) {
      console.error(`  ✗ Error indexing claim for market ${marketId}:`, error.message);
    }
  }

  async updateMarketSnapshot(marketId) {
    try {
      const betsResult = await db.query(
        `SELECT outcome, SUM(amount::numeric) as total
         FROM bets
         WHERE market_id = $1
         GROUP BY outcome`,
        [marketId.toString()]
      );

      if (betsResult.rows.length === 0) return;

      const yesTotal = betsResult.rows.find(r => r.outcome === 'yes')?.total || '0';
      const noTotal = betsResult.rows.find(r => r.outcome === 'no')?.total || '0';

      const totalVolume = BigInt(yesTotal) + BigInt(noTotal);
      if (totalVolume === 0n) return;

      const yesProbability = Math.floor((Number(BigInt(yesTotal) * 10000n / totalVolume)));
      const noProbability = 10000 - yesProbability;

      await db.query(
        `INSERT INTO market_snapshots (market_id, yes_probability, no_probability, yes_volume, no_volume, timestamp, block_number)
         VALUES ($1, $2, $3, $4, $5, NOW(), (SELECT MAX(block_number) FROM bets WHERE market_id = $1))`,
        [
          marketId.toString(),
          yesProbability,
          noProbability,
          yesTotal,
          noTotal
        ]
      );
    } catch (error) {
      console.error(`Error updating snapshot for market ${marketId}:`, error.message);
    }
  }

  async startIndexing() {
    console.log('🚀 Starting real-time blockchain indexing...');
    this.isRunning = true;

    const currentBlock = await this.provider.getBlockNumber();
    const deploymentBlock = 44147847;

    if (this.lastProcessedBlock < deploymentBlock) {
      await this.indexHistoricalEvents(deploymentBlock, currentBlock);
      this.lastProcessedBlock = currentBlock;
    }

    setInterval(async () => {
      try {
        const latestBlock = await this.provider.getBlockNumber();
        if (latestBlock > this.lastProcessedBlock) {
          await this.indexHistoricalEvents(this.lastProcessedBlock + 1, latestBlock);
          this.lastProcessedBlock = latestBlock;
        }
      } catch (error) {
        console.error('Error in indexing loop:', error);
      }
    }, 15000);

    console.log('✅ Indexer running. Checking for new blocks every 15 seconds.');
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Indexer stopped');
  }
}

module.exports = BlockchainIndexer;
