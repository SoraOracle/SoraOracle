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
  durationSeconds: number;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

interface SessionContextType {
  session: Session | null;
  hasActiveSession: boolean;
  isLoading: boolean;
  createSession: (maxUsd1Amount: number, durationSeconds: number) => Promise<void>;
  deactivateSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { address, jwt } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for active session when wallet connects
  useEffect(() => {
    if (address && jwt) {
      refreshSession();
    } else {
      setSession(null);
      setIsLoading(false);
    }
  }, [address, jwt]);

  // Auto-refresh session every 30 seconds
  useEffect(() => {
    if (!address || !jwt) return;

    const interval = setInterval(() => {
      refreshSession();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [address, jwt]);

  const refreshSession = async () => {
    if (!address || !jwt) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/sessions/active?userAddress=${address}`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
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
    if (!address || !jwt) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          userAddress: address,
          maxUsd1Amount,
          durationSeconds,
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

  const deactivateSession = async () => {
    if (!session || !address || !jwt) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          userAddress: address,
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
        createSession,
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
