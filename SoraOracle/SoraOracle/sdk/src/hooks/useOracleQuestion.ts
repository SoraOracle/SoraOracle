import { useState, useEffect, useCallback } from 'react';
import { SoraOracleClient } from '../core/SoraOracleClient';
import { QuestionWithAnswer, AnswerType, TransactionOptions } from '../types';

export function useOracleQuestion(
  oracleClient: SoraOracleClient | null,
  questionId?: string
) {
  const [question, setQuestion] = useState<QuestionWithAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = useCallback(async () => {
    if (!oracleClient || !questionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await oracleClient.getQuestion(questionId);
      setQuestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch question');
    } finally {
      setIsLoading(false);
    }
  }, [oracleClient, questionId]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const askQuestion = useCallback(
    async (questionText: string, answerType: AnswerType, options?: TransactionOptions) => {
      if (!oracleClient) throw new Error('Oracle client not initialized');

      setIsLoading(true);
      setError(null);

      try {
        let newQuestionId: string;
        
        if (answerType === AnswerType.YES_NO) {
          newQuestionId = await oracleClient.askYesNoQuestion(questionText, options);
        } else {
          newQuestionId = await oracleClient.askGeneralQuestion(questionText, options);
        }

        return newQuestionId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to ask question';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [oracleClient]
  );

  const refundQuestion = useCallback(
    async (options?: TransactionOptions) => {
      if (!oracleClient || !questionId) throw new Error('Oracle client or question ID not available');

      setIsLoading(true);
      setError(null);

      try {
        await oracleClient.refund(questionId, options);
        await fetchQuestion();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to refund question';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [oracleClient, questionId, fetchQuestion]
  );

  return {
    question,
    isLoading,
    error,
    askQuestion,
    refundQuestion,
    refetch: fetchQuestion
  };
}
