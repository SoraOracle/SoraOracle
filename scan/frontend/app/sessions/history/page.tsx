'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/app/providers/WalletProvider';
import { useRouter } from 'next/navigation';

interface HistoricalSession {
  id: string;
  sessionAddress: string;
  maxUsd1Amount: number;
  spentAmount: number;
  createdAt: string;
  refundedAt: string | null;
  refundedUsd1Amount: number | null;
  refundedBnbAmount: number | null;
  currentUsd1Balance: number;
  currentBnbBalance: number;
  canRefund: boolean;
}

export default function SessionHistoryPage() {
  const { walletAddress, token, setToken, setWalletAddress, isLoading: walletLoading } = useWallet();
  const router = useRouter();
  const [sessions, setSessions] = useState<HistoricalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    // Wait for wallet provider to initialize
    if (walletLoading) return;

    // If no wallet at all, redirect to home
    if (!walletAddress) {
      checkWalletConnection();
      return;
    }

    // If wallet connected but no token, need authentication
    if (!token) {
      setNeedsAuth(true);
      setLoading(false);
      return;
    }

    // If both wallet and token, load sessions
    loadSessions();
  }, [walletAddress, token, walletLoading]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum === 'undefined') {
      router.push('/');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setNeedsAuth(true);
        setLoading(false);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
      router.push('/');
    }
  };

  const authenticateWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to access Session History');
      return;
    }

    try {
      setIsAuthenticating(true);
      setError('');

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      const message = `Sign this message to access S402 Session History.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      const response = await fetch('/api/auth/composer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      });

      if (response.ok) {
        const { token: authToken } = await response.json();
        setToken(authToken);
        setWalletAddress(address);
        setNeedsAuth(false);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.code === 4001) {
        setError('Authentication cancelled. Please sign the message to access your session history.');
      } else {
        setError('Failed to authenticate wallet. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loadSessions = async () => {
    if (!walletAddress || !token) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/history?userAddress=${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Handle expired/invalid token - trigger re-authentication
      if (response.status === 401) {
        setToken(null);
        setSessions([]);
        setNeedsAuth(true);
        setError('');
        return;
      }

      if (!response.ok) throw new Error('Failed to load session history');

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (sessionId: string) => {
    if (!walletAddress || !token) return;

    setRefunding(sessionId);
    setError('');

    try {
      const response = await fetch('/api/sessions/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userAddress: walletAddress,
          sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Refund failed');
      }

      const result = await response.json();
      
      if (result.success) {
        loadSessions();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefunding(null);
    }
  };

  // Show authentication wall if needed
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-s402-light dark:bg-black text-gray-900 dark:text-white p-8">
        <div className="max-w-md mx-auto mt-20 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-pixel">SESSION HISTORY</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Authentication required</p>
          </div>

          <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-8 space-y-6 shadow-soft-lg dark:shadow-none">
            <div className="w-20 h-20 mx-auto bg-s402-orange/10 rounded-full flex items-center justify-center">
              <span className="text-4xl">🔐</span>
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-2">Verify Wallet Ownership</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sign a message to prove wallet ownership and access your session history. No gas fees required.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={authenticateWallet}
              disabled={isAuthenticating}
              className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded transition-colors"
            >
              {isAuthenticating ? 'Authenticating...' : 'Sign Message to Continue'}
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-s402-light dark:bg-black text-gray-900 dark:text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Loading session history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-s402-light dark:bg-black text-gray-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Session History</h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and refund your previous sessions
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded text-red-400">
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            No previous sessions found
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-s402-light-card dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg p-6 shadow-soft dark:shadow-none"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Session ID</div>
                    <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
                      {session.id.slice(0, 20)}...
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</div>
                    <div className="text-sm">
                      {new Date(session.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Initial Limit</div>
                    <div className="font-semibold">{session.maxUsd1Amount.toFixed(2)} USD1</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Spent</div>
                    <div className="font-semibold">{session.spentAmount.toFixed(2)} USD1</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Remaining USD1</div>
                    <div className="font-semibold text-orange-600 dark:text-orange-500">
                      {session.currentUsd1Balance.toFixed(4)} USD1
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Remaining BNB</div>
                    <div className="font-semibold text-orange-600 dark:text-orange-500">
                      {session.currentBnbBalance.toFixed(6)} BNB
                    </div>
                  </div>
                </div>

                {session.refundedAt && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Refunded {session.refundedUsd1Amount?.toFixed(4) || 0} USD1 + {session.refundedBnbAmount?.toFixed(6) || 0} BNB
                      on {new Date(session.refundedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {session.canRefund ? (
                  <button
                    onClick={() => handleRefund(session.id)}
                    disabled={refunding === session.id}
                    className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition-colors shadow-soft dark:shadow-none"
                  >
                    {refunding === session.id ? 'Refunding...' : 'Refund Remaining Balance'}
                  </button>
                ) : (session.currentUsd1Balance > 0 || session.currentBnbBalance > 0) ? (
                  <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      💡 Remaining balance too small to refund (gas fees would exceed refund value)
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
