'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useWallet } from '../providers/WalletProvider';

interface AgentConfig {
  name: string;
  description: string;
  dataSources: string[];
  queryInterval: number;
  maxPaymentUSD: number;
  webhook: string;
  isPublic: boolean;
  icon: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  costUSD: number;
}

export default function ComposerPage() {
  const router = useRouter();
  const { walletAddress, token, setWalletAddress, setToken } = useWallet();
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    dataSources: [],
    queryInterval: 60,
    maxPaymentUSD: 1.0,
    webhook: '',
    isPublic: true,
    icon: '🤖',
  });

  const [step, setStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const tools = await response.json();
        setAvailableTools(tools);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  const authenticateWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to access the Composer');
      return false;
    }

    try {
      setIsAuthenticating(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      const message = `Sign this message to access S402 Composer.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;
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
        return true;
      } else {
        alert('Authentication failed. Please try again.');
        return false;
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.code === 4001) {
        alert('Signature rejected. You must sign the message to access the Composer.');
      } else {
        alert('Failed to authenticate wallet');
      }
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const toggleDataSource = (sourceId: string) => {
    setConfig(prev => ({
      ...prev,
      dataSources: prev.dataSources.includes(sourceId)
        ? prev.dataSources.filter(id => id !== sourceId)
        : [...prev.dataSources, sourceId],
    }));
  };

  const estimatedMonthlyCost =
    config.dataSources.reduce((sum, id) => {
      const tool = availableTools.find(s => s.id === id);
      return sum + (tool?.costUSD || 0);
    }, 0) *
    ((30 * 24 * 60 * 60) / config.queryInterval);

  const deployAgent = async () => {
    try {
      setIsDeploying(true);

      if (!token) {
        const authenticated = await authenticateWallet();
        if (!authenticated) {
          setIsDeploying(false);
          return;
        }
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          data_sources: config.dataSources,
          is_public: config.isPublic,
          icon: config.icon,
        }),
      });

      if (response.ok) {
        const agent = await response.json();
        router.push(`/composer/agent/${agent.id}`);
      } else {
        alert('Failed to create agent');
      }
    } catch (error) {
      console.error('Failed to deploy agent:', error);
      alert('Failed to deploy agent');
    } finally {
      setIsDeploying(false);
    }
  };

  // Show authentication wall if not authenticated
  if (!token || !walletAddress) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-pixel">COMPOSER ACCESS</h1>
          <p className="text-sm text-gray-400">Wallet authentication required</p>
        </div>

        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-8 space-y-6 shadow-soft-lg dark:shadow-none">
          <div className="w-20 h-20 mx-auto bg-s402-orange/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔐</span>
          </div>
          
          <div>
            <h2 className="text-lg font-medium mb-2">Authentication Required</h2>
            <p className="text-sm text-gray-400">
              Connect your wallet and sign a message to prove ownership. This ensures only you can create and manage agents.
            </p>
          </div>

          <div className="space-y-3 text-left bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-s402-orange">✓</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Wallet connection via MetaMask</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-s402-orange">✓</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Cryptographic signature for proof of ownership</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-s402-orange">✓</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Secure JWT token issued for your session</span>
            </div>
          </div>

          <button
            onClick={authenticateWallet}
            disabled={isAuthenticating}
            className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded transition-colors"
          >
            {isAuthenticating ? 'Authenticating...' : 'Connect & Sign Message'}
          </button>

          <p className="text-xs text-gray-500">
            By connecting, you'll be asked to sign a message to prove you own this wallet. No gas fees required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-pixel">AI AGENT COMPOSER</h1>
            <span className="text-xs px-2 py-0.5 bg-s402-orange/20 text-s402-orange rounded font-medium">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/agents/my"
              className="text-xs px-3 py-1.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 hover:border-s402-orange rounded transition-colors"
            >
              📝 My Agents
            </a>
            <a
              href="/agents"
              className="text-xs px-3 py-1.5 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 hover:border-s402-orange rounded transition-colors"
            >
              🌐 All Agents
            </a>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Build autonomous agents that pay oracles with s402 micropayments
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 py-4 border-b border-gray-800">
        {[
          { num: 1, label: 'Configure' },
          { num: 2, label: 'Sources' },
          { num: 3, label: 'Deploy' },
        ].map(({ num, label }) => (
          <div key={num} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= num
                  ? 'bg-s402-orange text-white'
                  : 'border border-gray-800 text-gray-500'
              }`}
            >
              {num}
            </div>
            <span className={`text-sm ${step >= num ? 'text-white' : 'text-gray-500'}`}>
              {label}
            </span>
            {num < 3 && <span className="text-gray-800 mx-2">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
            <input
              type="text"
              placeholder="BTC Price Tracker"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              placeholder="Describe what your agent does..."
              value={config.description}
              onChange={e => setConfig({ ...config, description: e.target.value })}
              rows={3}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-2">Agent Icon</label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded px-4 py-2.5 text-2xl hover:border-s402-orange focus:outline-none focus:border-s402-orange transition-colors text-center"
              >
                {config.icon || '🤖'}
              </button>
              {showEmojiPicker && (
                <div className="absolute z-50 mt-2 left-0">
                  <EmojiPicker
                    onEmojiClick={(emojiData: EmojiClickData) => {
                      setConfig({ ...config, icon: emojiData.emoji });
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Visibility</label>
              <div className="flex items-center gap-3 h-[42px]">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="radio"
                      name="visibility"
                      checked={config.isPublic}
                      onChange={() => setConfig({ ...config, isPublic: true })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 rounded-full peer-checked:border-s402-orange peer-checked:bg-s402-orange/10 transition-all flex items-center justify-center">
                      {config.isPublic && (
                        <div className="w-2.5 h-2.5 bg-s402-orange rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    🌍 Public
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!config.isPublic}
                      onChange={() => setConfig({ ...config, isPublic: false })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 rounded-full peer-checked:border-s402-orange peer-checked:bg-s402-orange/10 transition-all flex items-center justify-center">
                      {!config.isPublic && (
                        <div className="w-2.5 h-2.5 bg-s402-orange rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    🔒 Private
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Query Interval (seconds)</label>
              <input
                type="number"
                min={10}
                value={config.queryInterval}
                onChange={e => setConfig({ ...config, queryInterval: parseInt(e.target.value) })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Payment (USD)</label>
              <input
                type="number"
                step={0.01}
                min={0.01}
                max={10}
                value={config.maxPaymentUSD}
                onChange={e => setConfig({ ...config, maxPaymentUSD: parseFloat(e.target.value) })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!config.name || !config.description}
            className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
          >
            Continue to Data Sources
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Select which s402 tools your agent can use</p>

          {loadingTools ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading available tools...</div>
          ) : availableTools.length === 0 ? (
            <div className="text-center py-8 border border-gray-800 rounded">
              <p className="text-gray-500 text-sm">No tools available yet.</p>
              <p className="text-xs text-gray-600 mt-1">Admins can add tools via the Admin Panel.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableTools.map(source => (
              <button
                key={source.id}
                onClick={() => toggleDataSource(source.id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  config.dataSources.includes(source.id)
                    ? 'border-s402-orange bg-s402-orange/5'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.dataSources.includes(source.id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <span className="text-2xl">{source.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{source.name}</div>
                      <div className="text-xs text-gray-500">{source.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-s402-orange">${source.costUSD.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">per use</div>
                  </div>
                </div>
              </button>
            ))}
            </div>
          )}

          {config.dataSources.length > 0 && (
            <div className="border border-gray-800 rounded p-4">
              <div className="text-sm font-medium mb-2">Cost Estimate</div>
              <div className="space-y-1 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>Sources:</span>
                  <span className="text-white">{config.dataSources.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Queries/month:</span>
                  <span className="text-white">
                    {((30 * 24 * 60 * 60) / config.queryInterval).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-gray-800">
                  <span className="font-medium text-white">Monthly cost:</span>
                  <span className="font-semibold text-s402-orange">
                    ${estimatedMonthlyCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-800 hover:border-gray-700 text-sm font-medium py-2.5 rounded transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={config.dataSources.length === 0}
              className="flex-1 bg-s402-orange hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              Continue to Deploy
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Webhook URL (Optional)</label>
            <input
              type="url"
              placeholder="https://your-api.com/webhook"
              value={config.webhook}
              onChange={e => setConfig({ ...config, webhook: e.target.value })}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Receive data via POST webhook or leave blank to store on-chain
            </p>
          </div>

          <div className="border border-gray-800 rounded p-4">
            <div className="text-sm font-medium mb-3">Deployment Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Name:</span>
                <span className="text-white">{config.name}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Sources:</span>
                <span className="text-white">{config.dataSources.length}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Interval:</span>
                <span className="text-white">{config.queryInterval}s</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Max Payment:</span>
                <span className="text-white">${config.maxPaymentUSD}</span>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-gray-800">
                <span className="text-white font-medium">Monthly Cost:</span>
                <span className="text-s402-orange font-semibold">
                  ${estimatedMonthlyCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-s402-orange/30 bg-s402-orange/10 rounded p-3">
            <div className="flex items-start gap-2">
              <span className="text-s402-orange text-sm">🤖</span>
              <div className="text-xs text-gray-400">
                Your agent will be created with Claude AI. It can use s402 tools with micropayments for oracle data.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={isDeploying}
              className="flex-1 border border-gray-800 hover:border-gray-700 text-sm font-medium py-2.5 rounded transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={deployAgent}
              disabled={isDeploying}
              className="flex-1 bg-s402-orange hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium py-2.5 rounded transition-colors"
            >
              {isDeploying ? 'Deploying...' : 'Deploy Agent'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
