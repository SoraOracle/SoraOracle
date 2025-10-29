/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_S402_FACILITATOR: process.env.NEXT_PUBLIC_S402_FACILITATOR || '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3',
    NEXT_PUBLIC_USD1_ADDRESS: process.env.NEXT_PUBLIC_USD1_ADDRESS || '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-dataseed.binance.org',
    NEXT_PUBLIC_CHAIN_ID: '56',
  },
};

module.exports = nextConfig;
