import { SoraConfig } from '@sora-oracle/sdk';

export const SORA_CONFIG: SoraConfig = {
  soraOracleAddress: '0x4124227dEf2A0c9BBa315dF13CD7B546f5839516',
  pancakeTWAPOracleAddress: '0x0000000000000000000000000000000000000000',
  batchOperationsAddress: '0x3a15beA1BEdc7F4497Df59cDC22D0aDC6FF3e54b',
  reputationTrackerAddress: '0xb51D9aa15Ac607a7C11Bb7F938759F5d8B0304c8',
  disputeResolutionAddress: '0x688804Da579e0B8f872F2147e0Fd78524caDf3A4',
  marketResolverAddress: '0x62AF37D0A34dc56e201C5E68E00B348C39A0F5CB',
  predictionMarketAddress: '0x6Bd664D0641D8C18C869AD18f61143BB4EDe790c',
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  chainId: 56
};

export const BSC_CHAIN = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/']
};

export const TESTNET_CONFIG: SoraConfig = {
  ...SORA_CONFIG,
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  chainId: 97
};
