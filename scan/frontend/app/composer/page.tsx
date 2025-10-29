'use client';

import { useState } from 'react';

interface AgentConfig {
  name: string;
  description: string;
  dataSources: string[];
  queryInterval: number;
  maxPaymentUSD: number;
  webhook: string;
}

const AVAILABLE_SOURCES = [
  { id: 'coingecko', name: 'CoinGecko', category: 'crypto', costUSD: 0.03 },
  { id: 'openweather', name: 'OpenWeather', category: 'weather', costUSD: 0.02 },
  { id: 'newsapi', name: 'NewsAPI', category: 'news', costUSD: 0.05 },
  { id: 'alphavantage', name: 'Alpha Vantage', category: 'finance', costUSD: 0.04 },
  { id: 'cryptocompare', name: 'CryptoCompare', category: 'crypto', costUSD: 0.03 },
];

export default function ComposerPage() {
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    dataSources: [],
    queryInterval: 60,
    maxPaymentUSD: 1.0,
    webhook: '',
  });

  const [step, setStep] = useState(1);

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
      const source = AVAILABLE_SOURCES.find(s => s.id === id);
      return sum + (source?.costUSD || 0);
    }, 0) *
    (30 * 24 * 60) / config.queryInterval;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-block px-3 py-1 bg-s402-orange/20 border border-s402-orange/50 rounded-full text-s402-orange text-sm font-medium mb-4">
          BETA
        </div>
        <h1 className="text-4xl font-bold mb-2">AI Agent Composer</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Build autonomous AI agents that query oracle data sources using s402 micropayments. Deploy once, pay only for what you use.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 py-6">
        {[
          { num: 1, label: 'Configure' },
          { num: 2, label: 'Select Sources' },
          { num: 3, label: 'Deploy' },
        ].map(({ num, label }) => (
          <div key={num} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step >= num
                  ? 'bg-s402-orange text-white'
                  : 'bg-s402-gray border border-gray-800 text-gray-400'
              }`}
            >
              {num}
            </div>
            <span className={step >= num ? 'text-white' : 'text-gray-400'}>
              {label}
            </span>
            {num < 3 && <span className="text-gray-600 mx-2">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Configure Agent */}
      {step === 1 && (
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold mb-4">Configure Your Agent</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Agent Name</label>
            <input
              type="text"
              placeholder="e.g., BTC Price Tracker"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Describe what your agent does..."
              value={config.description}
              onChange={e => setConfig({ ...config, description: e.target.value })}
              rows={3}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Query Interval (seconds)
            </label>
            <input
              type="number"
              min={10}
              value={config.queryInterval}
              onChange={e => setConfig({ ...config, queryInterval: parseInt(e.target.value) })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">
              How often your agent queries data sources (minimum 10 seconds)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max Payment Per Query (USD)
            </label>
            <input
              type="number"
              step={0.01}
              min={0.01}
              max={10}
              value={config.maxPaymentUSD}
              onChange={e => setConfig({ ...config, maxPaymentUSD: parseFloat(e.target.value) })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">
              Safety limit to prevent excessive spending
            </p>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!config.name || !config.description}
            className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
          >
            Next: Select Data Sources →
          </button>
        </div>
      )}

      {/* Step 2: Select Data Sources */}
      {step === 2 && (
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold mb-4">Select Data Sources</h2>
          <p className="text-gray-400 mb-6">
            Choose which oracle APIs your agent will query. You'll pay only for actual queries made.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {AVAILABLE_SOURCES.map(source => (
              <button
                key={source.id}
                onClick={() => toggleDataSource(source.id)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  config.dataSources.includes(source.id)
                    ? 'border-s402-orange bg-s402-orange/10'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{source.name}</h3>
                    <span className="text-sm text-gray-400">{source.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-s402-orange font-bold">${source.costUSD.toFixed(3)}</div>
                    <div className="text-xs text-gray-400">per query</div>
                  </div>
                </div>
                {config.dataSources.includes(source.id) && (
                  <div className="mt-2 text-sm text-green-400">✓ Selected</div>
                )}
              </button>
            ))}
          </div>

          {/* Cost Estimate */}
          {config.dataSources.length > 0 && (
            <div className="bg-black border border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">📊 Cost Estimate</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Sources selected:</span>
                  <span>{config.dataSources.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Query interval:</span>
                  <span>{config.queryInterval}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Queries per month:</span>
                  <span>{((30 * 24 * 60 * 60) / config.queryInterval).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-800">
                  <span>Estimated monthly cost:</span>
                  <span className="text-s402-orange">${estimatedMonthlyCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-s402-gray border border-gray-800 hover:border-gray-700 text-white font-semibold py-3 rounded-lg transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={config.dataSources.length === 0}
              className="flex-1 bg-s402-orange hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
            >
              Next: Deploy →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Deploy */}
      {step === 3 && (
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-8 space-y-6">
          <h2 className="text-2xl font-bold mb-4">Deploy Your Agent</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Webhook URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://your-api.com/webhook"
              value={config.webhook}
              onChange={e => setConfig({ ...config, webhook: e.target.value })}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">
              Receive data via webhook (POST) or leave blank to store on-chain
            </p>
          </div>

          {/* Configuration Summary */}
          <div className="bg-black border border-gray-800 rounded-lg p-6">
            <h3 className="font-semibold mb-4">🚀 Deployment Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="font-medium">{config.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Sources:</span>
                <span className="font-medium">{config.dataSources.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Query Interval:</span>
                <span className="font-medium">{config.queryInterval}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Payment:</span>
                <span className="font-medium">${config.maxPaymentUSD}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-800">
                <span className="text-gray-400">Monthly Cost:</span>
                <span className="font-bold text-s402-orange text-lg">
                  ${estimatedMonthlyCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Deploy Button */}
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="text-sm">
                <p className="font-semibold text-yellow-400 mb-1">Beta Feature</p>
                <p className="text-gray-300">
                  Agent deployment is currently in beta. Contact the Sora Oracle team to enable this feature for your account.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-s402-gray border border-gray-800 hover:border-gray-700 text-white font-semibold py-3 rounded-lg transition-all"
            >
              ← Back
            </button>
            <button
              disabled
              className="flex-1 bg-gray-700 text-gray-500 cursor-not-allowed font-semibold py-3 rounded-lg"
            >
              Deploy Agent (Coming Soon)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
