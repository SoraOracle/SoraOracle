require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Ensure private key has 0x prefix
const PRIVATE_KEY = process.env.PRIVATE_KEY?.startsWith('0x') 
  ? process.env.PRIVATE_KEY 
  : `0x${process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000"}`;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    },
    bscMainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: BSCSCAN_API_KEY
  },
  sourcify: {
    enabled: false
  }
};
