'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  walletAddress: string | null;
  token: string | null;
  isLoading: boolean;
  setWalletAddress: (address: string | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const storedToken = localStorage.getItem('composer_auth_token');
    if (storedToken) {
      try {
        const jwtDecode = require('jwt-decode').jwtDecode || require('jwt-decode');
        const payload: any = jwtDecode(storedToken);
        if (payload.exp && payload.exp > Date.now() / 1000) {
          setWalletAddressState(payload.address);
          setTokenState(storedToken);
        } else {
          localStorage.removeItem('composer_auth_token');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('composer_auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const setWalletAddress = (address: string | null) => {
    setWalletAddressState(address);
  };

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('composer_auth_token', newToken);
    } else {
      localStorage.removeItem('composer_auth_token');
    }
  };

  const logout = () => {
    setWalletAddressState(null);
    setTokenState(null);
    localStorage.removeItem('composer_auth_token');
  };

  return (
    <WalletContext.Provider value={{ walletAddress, token, isLoading, setWalletAddress, setToken, logout }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
