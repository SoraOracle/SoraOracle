import { Question, Answer } from '../types';

export function parseQuestionEvent(event: any): Question {
  return {
    id: event.args.questionId,
    hash: event.args.questionHash,
    asker: event.args.asker,
    bounty: event.args.bounty,
    answerType: Number(event.args.answerType),
    timestamp: Date.now() / 1000,
    answered: false,
    questionText: event.args.question
  };
}

export function parseAnswerEvent(event: any): Answer {
  return {
    textAnswer: event.args.textAnswer,
    numericAnswer: event.args.numericAnswer,
    boolAnswer: event.args.boolAnswer,
    confidenceScore: Number(event.args.confidenceScore),
    dataSource: event.args.dataSource,
    timestamp: Date.now() / 1000,
    provider: event.args.provider
  };
}

export function calculateOdds(totalYes: bigint, totalNo: bigint): { yesOdds: number; noOdds: number } {
  const total = totalYes + totalNo;
  
  if (total === 0n) {
    return { yesOdds: 50, noOdds: 50 };
  }

  const yesPercent = Number((totalYes * 10000n) / total) / 100;
  const noPercent = Number((totalNo * 10000n) / total) / 100;

  return {
    yesOdds: yesPercent,
    noOdds: noPercent
  };
}

export function calculatePotentialPayout(
  position: bigint,
  isYes: boolean,
  totalYes: bigint,
  totalNo: bigint
): bigint {
  const totalPool = totalYes + totalNo;
  
  if (totalPool === 0n) return 0n;
  
  const winningPool = isYes ? totalYes : totalNo;
  
  if (winningPool === 0n) return 0n;
  
  return (position * totalPool) / winningPool;
}

export function formatBNB(wei: bigint, decimals: number = 4): string {
  const bnb = Number(wei) / 1e18;
  return bnb.toFixed(decimals);
}

export function parseBNB(bnb: string): bigint {
  return BigInt(Math.floor(parseFloat(bnb) * 1e18));
}
