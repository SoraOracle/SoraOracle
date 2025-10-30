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
  isActive: boolean;
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
  const [toppingUp, setToppingUp] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('0.001');
  const [activating, setActivating] = useState(false);

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

  const handleCloseSession = async () => {
    if (!token) return;

    if (!confirm('Close your active session? Any remaining balance will be refunded to your wallet.')) {
      return;
    }

    setRefunding('closing');
    setError('');

    try {
      const response = await fetch('/api/sessions/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close session');
      }

      alert('Session closed successfully! Your remaining balance has been refunded.');
      loadSessions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefunding(null);
    }
  };

  const handleTopUpGas = async (sessionAddress: string) => {
    if (!walletAddress || typeof window.ethereum === 'undefined') {
      setError('Wallet not connected');
      return;
    }

    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid BNB amount');
      return;
    }

    if (amount > 0.01) {
      setError('Maximum top-up is 0.01 BNB');
      return;
    }

    setToppingUp(sessionAddress);
    setError('');

    try {
      // Send BNB directly to session wallet
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: sessionAddress,
        value: ethers.parseEther(topUpAmount),
      });

      await tx.wait();
      alert(`Successfully added ${topUpAmount} BNB to session wallet!`);
      setTopUpAmount('0.001');
      loadSessions(); // Refresh to show new balance
    } catch (err: any) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setError('Transaction cancelled');
      } else {
        setError(err.message || 'Failed to top up gas');
      }
    } finally {
      setToppingUp(null);
    }
  };

  const handleActivateSession = async (sessionId: string) => {
    if (!token) return;

    setActivating(true);
    setError('');

    try {
      const response = await fetch('/api/sessions/activate', {
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
        throw new Error(data.error || 'Failed to activate session');
      }

      alert('Session activated! USD1 approved for payments.');
      loadSessions();
    } catch (err: any) {
      setError(err.message || 'Activation failed');
    } finally {
      setActivating(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, index) => {
              const sessionDate = new Date(session.createdAt);
              const sessionTitle = `Session ${sessions.length - index}`;
              const hasRefundableBalance = session.currentUsd1Balance >= 0.01 || session.currentBnbBalance >= 0.000015;
              
              return (
                <div
                  key={session.id}
                  className={`bg-s402-light-card dark:bg-zinc-900 border ${
                    session.isActive 
                      ? 'border-green-500 dark:border-green-600' 
                      : 'border-gray-300 dark:border-zinc-800'
                  } rounded-lg p-6 shadow-soft dark:shadow-none hover:border-s402-orange dark:hover:border-s402-orange transition-all duration-300 flex flex-col h-full`}
                >
                  {/* Header with Icon and Badge */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-s402-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{session.isActive ? '⚡' : '💳'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{sessionTitle}</h3>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        session.isActive 
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                          : session.refundedAt
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                      }`}>
                        {session.isActive ? 'Active' : session.refundedAt ? 'Refunded' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Session Info */}
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Created {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Limit</div>
                        <div className="text-sm font-semibold">${session.maxUsd1Amount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Spent</div>
                        <div className="text-sm font-semibold">${session.spentAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">USD1</div>
                        <div className="text-sm font-semibold text-s402-orange">{session.currentUsd1Balance.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">BNB</div>
                        <div className="text-sm font-semibold text-s402-orange">{session.currentBnbBalance.toFixed(6)}</div>
                      </div>
                    </div>

                    {session.refundedAt && (
                      <div className="pt-2 text-xs text-green-600 dark:text-green-400">
                        ✓ Refunded on {new Date(session.refundedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {session.isActive ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => setToppingUp(toppingUp === session.sessionAddress ? null : session.sessionAddress)}
                        className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm py-2 transition-colors flex items-center justify-center gap-1 group border border-blue-300 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        {toppingUp === session.sessionAddress ? '✕ Cancel' : '⛽ Top Up Gas'}
                      </button>
                      
                      {toppingUp === session.sessionAddress && (
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-300 dark:border-zinc-700">
                          <label className="block text-xs text-gray-600 dark:text-gray-400">
                            BNB Amount
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            max="0.01"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.001"
                          />
                          <button
                            onClick={() => handleTopUpGas(session.sessionAddress)}
                            disabled={!!toppingUp}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 rounded transition-colors"
                          >
                            Send BNB
                          </button>
                        </div>
                      )}
                      
                      {session.currentBnbBalance > 0 && (
                        <button
                          onClick={() => handleActivateSession(session.id)}
                          disabled={activating}
                          className="w-full text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm py-2 transition-colors flex items-center justify-center gap-1 group border border-green-300 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          {activating ? 'Activating...' : '🔓 Activate Session'}
                        </button>
                      )}
                      
                      <button
                        onClick={handleCloseSession}
                        disabled={refunding === 'closing'}
                        className="w-full text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 disabled:text-gray-400 font-medium text-sm py-2 transition-colors flex items-center justify-center gap-1 group"
                      >
                        {refunding === 'closing' ? (
                          'Closing...'
                        ) : (
                          <>
                            Close & Refund
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : session.canRefund ? (
                    <button
                      onClick={() => handleRefund(session.id)}
                      disabled={refunding === session.id}
                      className="w-full text-s402-orange hover:text-orange-600 disabled:text-gray-400 font-medium text-sm py-2 transition-colors flex items-center justify-center gap-1 group"
                    >
                      {refunding === session.id ? (
                        'Refunding...'
                      ) : (
                        <>
                          Refund Balance
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </>
                      )}
                    </button>
                  ) : hasRefundableBalance ? (
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">
                      Balance too small to refund
                    </div>
                  ) : (
                    <div className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">
                      No remaining balance
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
