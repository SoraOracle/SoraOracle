import { BigNumberish } from 'ethers';

export enum AnswerType {
  PRICE = 0,
  YES_NO = 1,
  GENERAL = 2
}

export interface Question {
  id: string;
  hash: string;
  asker: string;
  bounty: bigint;
  answerType: AnswerType;
  timestamp: number;
  answered: boolean;
  questionText?: string;
}

export interface Answer {
  textAnswer: string;
  numericAnswer: bigint;
  boolAnswer: boolean;
  confidenceScore: number;
  dataSource: string;
  timestamp: number;
  provider: string;
}

export interface QuestionWithAnswer extends Question {
  answer?: Answer;
}

export interface PredictionMarket {
  id: string;
  questionId: string;
  question: string;
  totalYes: bigint;
  totalNo: bigint;
  totalPool: bigint;
  resolved: boolean;
  outcome?: boolean;
  deadline: number;
  yesOdds: number;
  noOdds: number;
  userPosition?: {
    isYes: boolean;
    amount: bigint;
    potentialPayout: bigint;
  };
}

export interface OracleProvider {
  address: string;
  totalAnswers: number;
  totalEarnings: bigint;
  reputationScore: number;
  averageResponseTime: number;
  lastAnswerTimestamp: number;
}

export interface Dispute {
  id: string;
  questionId: string;
  challenger: string;
  stake: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  resolved: boolean;
  outcome?: boolean;
  deadline: number;
}

export interface TWAPOracle {
  pairAddress: string;
  token0: string;
  token1: string;
  price: bigint;
  lastUpdate: number;
  canConsult: boolean;
}

export interface SoraConfig {
  soraOracleAddress: string;
  pancakeTWAPOracleAddress: string;
  batchOperationsAddress?: string;
  reputationTrackerAddress?: string;
  disputeResolutionAddress?: string;
  marketResolverAddress?: string;
  predictionMarketAddress?: string;
  rpcUrl: string;
  chainId: number;
}

export interface TransactionOptions {
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  value?: BigNumberish;
}

export interface EventFilter {
  fromBlock?: number | string;
  toBlock?: number | string;
}

export interface BatchQuestionRequest {
  question: string;
  answerType: AnswerType;
}

export interface BatchAnswerRequest {
  questionId: string;
  textAnswer: string;
  numericAnswer: BigNumberish;
  boolAnswer: boolean;
  confidenceScore: number;
  dataSource: string;
}
