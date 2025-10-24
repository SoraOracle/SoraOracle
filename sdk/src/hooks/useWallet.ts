import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>(null);

  const checkConnection = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const accounts = await browserProvider.listAccounts();
      
      if (accounts.length > 0) {
        setAddress(accounts[0].address);
        const network = await browserProvider.getNetwork();
        setChainId(Number(network.chainId));
        setProvider(window.ethereum);
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      } else {
        setAddress(null);
        setProvider(null);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setChainId(parseInt(chainIdHex, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      await browserProvider.send('eth_requestAccounts', []);
      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();
      const network = await browserProvider.getNetwork();

      setAddress(userAddress);
      setChainId(Number(network.chainId));
      setProvider(window.ethereum);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setProvider(null);
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      });
    } catch (err: any) {
      if (err.code === 4902) {
        setError('Chain not added to MetaMask');
      } else {
        setError(err.message || 'Failed to switch chain');
      }
    }
  }, []);

  return {
    address,
    chainId,
    isConnecting,
    isConnected: !!address,
    error,
    provider,
    connect,
    disconnect,
    switchChain
  };
}
