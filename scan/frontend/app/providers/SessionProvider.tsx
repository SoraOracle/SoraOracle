'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletProvider';

interface Session {
  id: string;
  userAddress: string;
  sessionAddress: string;
  maxUsd1Amount: number;
  spentAmount: number;
  remainingAmount: number;
  createdAt: string;
  lastUsedAt: string;
}

interface SessionContextType {
  session: Session | null;
  hasActiveSession: boolean;
  isLoading: boolean;
  isClosing: boolean;
  createSession: (maxUsd1Amount: number, durationSeconds: number) => Promise<void>;
  closeSession: () => Promise<void>;
  deactivateSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { walletAddress, token } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Check for active session when wallet connects
  useEffect(() => {
    if (walletAddress && token) {
      refreshSession();
    } else {
      setSession(null);
      setIsLoading(false);
    }
  }, [walletAddress, token]);

  // Auto-refresh session every 30 seconds
  useEffect(() => {
    if (!walletAddress || !token) return;

    const interval = setInterval(() => {
      refreshSession();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [walletAddress, token]);

  const refreshSession = async () => {
    if (!walletAddress || !token) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/sessions/active?userAddress=${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasActiveSession) {
          setSession(data.session);
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Failed to fetch active session:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const createSession = async (maxUsd1Amount: number, durationSeconds: number) => {
    if (!walletAddress || !token) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userAddress: walletAddress,
          maxUsd1Amount,
          // durationSeconds ignored - sessions don't expire
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh to get the full session data
        await refreshSession();
      }
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const closeSession = async () => {
    if (!walletAddress || !token) {
      throw new Error('Wallet not connected');
    }

    setIsClosing(true);
    try {
      const response = await fetch('/api/sessions/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userAddress: walletAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close session');
      }

      const data = await response.json();
      
      // Clear session state after successful close
      setSession(null);
      
      return data;
    } catch (error) {
      console.error('Error closing session:', error);
      throw error;
    } finally {
      setIsClosing(false);
    }
  };

  const deactivateSession = async () => {
    if (!session || !walletAddress || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          userAddress: walletAddress,
        }),
      });

      if (response.ok) {
        setSession(null);
      }
    } catch (error) {
      console.error('Error deactivating session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveSession = session !== null;

  return (
    <SessionContext.Provider
      value={{
        session,
        hasActiveSession,
        isLoading,
        isClosing,
        createSession,
        closeSession,
        deactivateSession,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
