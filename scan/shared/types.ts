/**
 * Shared TypeScript types for S402 Scan
 */

export interface S402Payment {
  id: string;
  txHash: string;
  blockNumber: number;
  blockTimestamp: Date;
  from: string;
  to: string;
  value: string; // BigInt as string
  platformFee: string; // BigInt as string
  nonce: number;
  valueUSD: number; // Calculated USD value
  platformFeeUSD: number; // Calculated platform fee in USD
}

export interface S402Provider {
  address: string;
  name: string | null;
  category: string | null;
  totalReceived: string; // BigInt as string
  totalReceivedUSD: number;
  paymentCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  avgPaymentUSD: number;
  isVerified: boolean;
}

export interface S402DataSource {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  website: string;
  queryCount: number;
  totalVolumeUSD: number;
  avgCostUSD: number;
  reliabilityScore: number; // 0-100
  avgResponseTimeMs: number;
}

export interface S402DailyStats {
  date: string; // YYYY-MM-DD
  paymentCount: number;
  volumeUSD: number;
  platformFeesUSD: number;
  uniquePayers: number;
  uniqueProviders: number;
  avgPaymentUSD: number;
}

export interface S402Agent {
  id: string;
  name: string;
  description: string;
  ownerAddress: string;
  dataSources: string[]; // Array of data source IDs
  queryCount: number;
  totalSpentUSD: number;
  createdAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
}

export interface S402OverviewStats {
  totalPayments: number;
  totalVolumeUSD: number;
  totalFeesUSD: number;
  uniquePayers: number;
  uniqueProviders: number;
  activeAgents: number;
  avgPaymentUSD: number;
  paymentsLast24h: number;
  volumeLast24h: number;
}

export interface PaymentSettledEvent {
  from: string;
  to: string;
  value: bigint;
  platformFee: bigint;
  nonce: bigint;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
}
