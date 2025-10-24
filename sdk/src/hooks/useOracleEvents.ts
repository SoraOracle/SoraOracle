import { useState, useEffect, useCallback } from 'react';
import { SoraOracleClient } from '../core/SoraOracleClient';
import { PredictionMarketClient } from '../core/PredictionMarketClient';
import { Question, Answer } from '../types';

export function useOracleEvents(
  oracleClient: SoraOracleClient | null,
  marketClient?: PredictionMarketClient | null
) {
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([]);
  const [recentAnswers, setRecentAnswers] = useState<Array<{ questionId: string; answer: Answer }>>([]);

  useEffect(() => {
    if (!oracleClient) return;

    const handleQuestionAsked = (question: Question) => {
      setRecentQuestions((prev: Question[]) => [question, ...prev].slice(0, 20));
    };

    const handleAnswerProvided = (questionId: string, answer: Answer) => {
      setRecentAnswers((prev: Array<{ questionId: string; answer: Answer }>) => [{ questionId, answer }, ...prev].slice(0, 20));
    };

    oracleClient.onQuestionAsked(handleQuestionAsked);
    oracleClient.onAnswerProvided(handleAnswerProvided);

    return () => {
      oracleClient.removeAllListeners();
    };
  }, [oracleClient]);

  useEffect(() => {
    if (!marketClient) return;

    const handleMarketCreated = (market: any) => {
      console.log('Market created:', market);
    };

    const handlePositionTaken = (marketId: string, user: string, isYes: boolean, amount: bigint) => {
      console.log('Position taken:', { marketId, user, isYes, amount });
    };

    const handleMarketResolved = (marketId: string, outcome: boolean) => {
      console.log('Market resolved:', { marketId, outcome });
    };

    marketClient.onMarketCreated(handleMarketCreated);
    marketClient.onPositionTaken(handlePositionTaken);
    marketClient.onMarketResolved(handleMarketResolved);

    return () => {
      marketClient.removeAllListeners();
    };
  }, [marketClient]);

  const clearEvents = useCallback(() => {
    setRecentQuestions([]);
    setRecentAnswers([]);
  }, []);

  return {
    recentQuestions,
    recentAnswers,
    clearEvents
  };
}
