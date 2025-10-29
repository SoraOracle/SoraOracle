'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string;
  creator_address: string;
  is_public: boolean;
  icon: string;
  query_count: number;
  total_spent_usd: string;
  created_at: string;
}

export default function MyAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('composer_auth_token');
    if (token) {
      try {
        const jwtDecode = require('jwt-decode').jwtDecode || require('jwt-decode');
        const payload: any = jwtDecode(token);
        if (payload.exp && payload.exp > Date.now() / 1000) {
          setWalletAddress(payload.address);
          loadAgents(payload.address);
        } else {
          localStorage.removeItem('composer_auth_token');
          setLoading(false);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('composer_auth_token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const loadAgents = async (address: string) => {
    try {
      const token = localStorage.getItem('composer_auth_token');
      const response = await fetch(`/api/agents?owner=${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const authenticateWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to view your agents');
      return;
    }

    try {
      setIsAuthenticating(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      const message = `Sign this message to access your agents on S402 Scan.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;
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
        const { token } = await response.json();
        localStorage.setItem('composer_auth_token', token);
        setWalletAddress(address);
        loadAgents(address);
      } else {
        alert('Authentication failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.code === 4001) {
        alert('Signature rejected. You must sign the message to view your agents.');
      } else {
        alert('Failed to authenticate wallet');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-s402-orange mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500 font-pixel">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-pixel">MY AGENTS</h1>
          <p className="text-sm text-gray-400">Authentication required</p>
        </div>

        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-8 space-y-6 shadow-soft-lg dark:shadow-none">
          <div className="w-20 h-20 mx-auto bg-s402-orange/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
          
          <div>
            <h2 className="text-lg font-medium mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-gray-400">
              Sign in to view and manage your AI agents.
            </p>
          </div>

          <button
            onClick={authenticateWallet}
            disabled={isAuthenticating}
            className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded transition-colors"
          >
            {isAuthenticating ? 'Authenticating...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  const publicAgents = agents.filter(a => a.is_public);
  const privateAgents = agents.filter(a => !a.is_public);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-pixel mb-2">MY AGENTS</h1>
            <p className="text-sm text-gray-400">
              Manage your AI agents - {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
          <Link
            href="/composer"
            className="px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white font-medium rounded transition-colors"
          >
            + Create Agent
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Agents</div>
          <div className="text-2xl font-bold">{agents.length}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Public</div>
          <div className="text-2xl font-bold">{publicAgents.length}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Private</div>
          <div className="text-2xl font-bold">{privateAgents.length}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Queries</div>
          <div className="text-2xl font-bold">
            {agents.reduce((sum, a) => sum + (a.query_count || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-400 mb-4">You haven't created any agents yet</p>
          <Link
            href="/composer"
            className="inline-block px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white font-medium rounded transition-colors"
          >
            Create Your First Agent
          </Link>
        </div>
      ) : (
        <>
          {/* Public Agents */}
          {publicAgents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                🌍 Public Agents
                <span className="text-xs text-gray-500">({publicAgents.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicAgents.map(agent => (
                  <Link
                    key={agent.id}
                    href={`/composer/agent/${agent.id}`}
                    className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 hover:border-s402-orange transition-colors shadow-soft dark:shadow-none group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl">{agent.icon || '🤖'}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1 truncate group-hover:text-s402-orange transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2">{agent.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 dark:border-gray-800">
                      <div>
                        <span className="font-medium">{agent.query_count || 0}</span> queries
                      </div>
                      <div>
                        ${(parseFloat(agent.total_spent_usd) || 0).toFixed(2)} spent
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Private Agents */}
          {privateAgents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium flex items-center gap-2">
                🔒 Private Agents
                <span className="text-xs text-gray-500">({privateAgents.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {privateAgents.map(agent => (
                  <Link
                    key={agent.id}
                    href={`/composer/agent/${agent.id}`}
                    className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 hover:border-s402-orange transition-colors shadow-soft dark:shadow-none group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl">{agent.icon || '🤖'}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-1 truncate group-hover:text-s402-orange transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-2">{agent.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 dark:border-gray-800">
                      <div>
                        <span className="font-medium">{agent.query_count || 0}</span> queries
                      </div>
                      <div>
                        ${(parseFloat(agent.total_spent_usd) || 0).toFixed(2)} spent
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
