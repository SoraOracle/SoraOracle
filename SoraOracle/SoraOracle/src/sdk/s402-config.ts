/**
 * S402 Configuration for BNB Chain
 * Mainnet and Testnet settings
 */

export interface S402NetworkConfig {
  networkName: string;
  chainId: number;
  rpcUrl: string;
  usdcAddress: string;
  usdtAddress: string;
  facilitatorAddress: string;
  blockExplorerUrl: string;
}

/**
 * BNB Chain Mainnet Configuration
 */
export const S402_MAINNET_CONFIG: S402NetworkConfig = {
  networkName: 'BNB Chain',
  chainId: 56,
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  // Binance-Bridged USDC (EIP-2612 compatible)
  usdcAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  // Binance-Bridged USDT (18 decimals!)
  usdtAddress: '0x55d398326f99059fF775485246999027B3197955',
  // S402Facilitator - UPDATE AFTER DEPLOYMENT
  facilitatorAddress: '0x0000000000000000000000000000000000000000',
  blockExplorerUrl: 'https://bscscan.com'
};

/**
 * BNB Testnet Configuration
 */
export const S402_TESTNET_CONFIG: S402NetworkConfig = {
  networkName: 'BNB Testnet',
  chainId: 97,
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  // Testnet USDC
  usdcAddress: '0x64544969ed7EBf5f083679233325356EbE738930',
  // Testnet USDT
  usdtAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  // S402Facilitator - UPDATE AFTER DEPLOYMENT
  facilitatorAddress: '0x0000000000000000000000000000000000000000',
  blockExplorerUrl: 'https://testnet.bscscan.com'
};

/**
 * Operation pricing in USDC (6 decimals)
 */
export const S402_OPERATION_PRICES = {
  // Oracle operations
  dataSourceAccess: '0.03',      // $0.03 per API call
  oracleQuery: '0.01',            // $0.01 per oracle query
  batchQuery: '0.05',             // $0.05 for batch queries
  
  // Market operations
  marketCreation: '0.05',         // $0.05 to create market
  marketResolution: '0.10',       // $0.10 to resolve market
  placeBet: '0.01',               // $0.01 per bet
  
  // Advanced operations
  conditionalMarket: '0.15',      // $0.15 for conditional markets
  crossChainBridge: '0.20',       // $0.20 for cross-chain
  
  // AI features
  aiResolution: '0.15',           // $0.15 for AI-powered settlement
  permissionlessOracleDiscovery: '0.10'  // $0.10 for API discovery
} as const;

/**
 * Get configuration for current environment
 */
export function getS402Config(network: 'mainnet' | 'testnet' = 'mainnet'): S402NetworkConfig {
  return network === 'mainnet' ? S402_MAINNET_CONFIG : S402_TESTNET_CONFIG;
}

/**
 * Multi-wallet pool configuration
 */
export const MULTI_WALLET_CONFIG = {
  // Number of worker wallets for parallel transactions
  workerWalletCount: 10,
  
  // USDC funding per wallet (recommended: $100 USDC each)
  fundingAmountUSDC: '100',
  
  // Auto-refund workers when balance drops below threshold
  refundThreshold: '10', // $10 USDC
  
  // Maximum USDC per worker (security limit)
  maxBalancePerWallet: '500' // $500 USDC
};

/**
 * S402 Protocol Metadata
 */
export const S402_METADATA = {
  version: '5.0.0',
  protocol: 's402',
  description: 'HTTP 402 micropayments for BNB Chain using EIP-2612',
  compatibility: 'EIP-2612 (Permit)',
  x402Compliant: false, // Honest branding
  eip3009Support: false, // BNB Chain USDC lacks EIP-3009
  
  features: [
    'Multi-wallet parallelization (10x speedup)',
    'EIP-2612 permit-based payments',
    'Replay attack prevention',
    'Platform fee mechanism (1%)',
    'Batch settlement support'
  ],
  
  roadmap: [
    'EIP-4337 smart account integration (Q1 2026)',
    'Native Circle USDC migration (when available)',
    'Cross-chain expansion (Ethereum, Base)'
  ]
};

/**
 * RPC Provider Configuration
 * Multi-provider fallback for reliability
 */
export const RPC_PROVIDERS = {
  mainnet: [
    'https://bsc-dataseed.binance.org/',
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed2.binance.org/',
    'https://bsc.nodereal.io',
    'https://rpc.ankr.com/bsc'
  ],
  testnet: [
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://data-seed-prebsc-2-s1.binance.org:8545/'
  ]
};

/**
 * Gas Configuration
 */
export const GAS_SETTINGS = {
  mainnet: {
    gasPrice: 3_000_000_000, // 3 Gwei (typical BSC)
    maxFeePerGas: 10_000_000_000, // 10 Gwei (max willing to pay)
    maxPriorityFeePerGas: 1_000_000_000 // 1 Gwei tip
  },
  testnet: {
    gasPrice: 10_000_000_000, // 10 Gwei
    maxFeePerGas: 20_000_000_000,
    maxPriorityFeePerGas: 2_000_000_000
  }
};
