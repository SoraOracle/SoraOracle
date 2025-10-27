import { useState, useEffect, useMemo } from 'react';
import { BrowserProvider, Signer } from 'ethers';
import { SoraOracleClient } from '../core/SoraOracleClient';
import { BatchOperationsClient } from '../core/BatchOperationsClient';
import { PredictionMarketClient } from '../core/PredictionMarketClient';
import { SoraConfig } from '../types';

export function useSoraOracle(config: SoraConfig, provider?: any) {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function setupSigner() {
      if (provider) {
        try {
          const browserProvider = new BrowserProvider(provider);
          const ethSigner = await browserProvider.getSigner();
          setSigner(ethSigner);
        } catch (error) {
          console.error('Error setting up signer:', error);
        }
      }
      setIsLoading(false);
    }

    setupSigner();
  }, [provider]);

  const oracleClient = useMemo(() => {
    if (!signer && !provider) return null;
    try {
      return new SoraOracleClient(config, signer || provider);
    } catch (error) {
      console.error('Error creating oracle client:', error);
      return null;
    }
  }, [config, signer, provider]);

  const batchClient = useMemo(() => {
    if (!config.batchOperationsAddress || (!signer && !provider)) return null;
    try {
      return new BatchOperationsClient(config, signer || provider);
    } catch (error) {
      console.error('Error creating batch client:', error);
      return null;
    }
  }, [config, signer, provider]);

  const marketClient = useMemo(() => {
    if (!config.predictionMarketAddress || (!signer && !provider)) return null;
    try {
      return new PredictionMarketClient(config, signer || provider);
    } catch (error) {
      console.error('Error creating market client:', error);
      return null;
    }
  }, [config, signer, provider]);

  return {
    oracleClient,
    batchClient,
    marketClient,
    signer,
    isLoading
  };
}
