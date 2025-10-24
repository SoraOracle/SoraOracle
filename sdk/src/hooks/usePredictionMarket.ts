import { useState, useEffect, useCallback } from 'react';
import { PredictionMarketClient } from '../core/PredictionMarketClient';
import { PredictionMarket, TransactionOptions } from '../types';

export function usePredictionMarket(
  marketClient: PredictionMarketClient | null,
  marketId?: string,
  userAddress?: string
) {
  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    if (!marketClient || !marketId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await marketClient.getMarket(marketId, userAddress);
      setMarket(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market');
    } finally {
      setIsLoading(false);
    }
  }, [marketClient, marketId, userAddress]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  const bet = useCallback(
    async (isYes: boolean, amount: bigint, options?: TransactionOptions) => {
      if (!marketClient || !marketId) throw new Error('Market client or ID not available');

      setIsLoading(true);
      setError(null);

      try {
        await marketClient.takePosition(marketId, isYes, amount, options);
        await fetchMarket();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to place bet';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [marketClient, marketId, fetchMarket]
  );

  const claimWinnings = useCallback(
    async (options?: TransactionOptions) => {
      if (!marketClient || !marketId) throw new Error('Market client or ID not available');

      setIsLoading(true);
      setError(null);

      try {
        await marketClient.claimWinnings(marketId, options);
        await fetchMarket();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to claim winnings';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [marketClient, marketId, fetchMarket]
  );

  return {
    market,
    isLoading,
    error,
    bet,
    claimWinnings,
    refetch: fetchMarket,
    odds: market ? { yes: market.yesOdds, no: market.noOdds } : null,
    status: market?.resolved ? 'resolved' : market?.deadline && market.deadline < Date.now() / 1000 ? 'closed' : 'active'
  };
}
