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
    ((30 * 24 * 60 * 60) / config.queryInterval);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-pixel">AI AGENT COMPOSER</h1>
          <span className="text-xs px-2 py-0.5 bg-s402-orange/20 text-s402-orange rounded font-medium">
            BETA
          </span>
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
          <p className="text-sm text-gray-500">Select which oracle APIs your agent will query</p>

          <div className="space-y-2">
            {AVAILABLE_SOURCES.map(source => (
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.dataSources.includes(source.id)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="text-sm font-medium">{source.name}</div>
                      <div className="text-xs text-gray-500">{source.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-s402-orange">${source.costUSD.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">per query</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

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

          <div className="border border-yellow-900/30 bg-yellow-900/10 rounded p-3">
            <div className="flex items-start gap-2">
              <span className="text-yellow-500 text-sm">⚠️</span>
              <div className="text-xs text-gray-400">
                <span className="text-yellow-500 font-medium">Beta Feature:</span> Agent deployment is coming soon.
                Contact the team to enable early access.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 border border-gray-800 hover:border-gray-700 text-sm font-medium py-2.5 rounded transition-colors"
            >
              Back
            </button>
            <button
              disabled
              className="flex-1 bg-gray-800 text-gray-600 cursor-not-allowed text-sm font-medium py-2.5 rounded"
            >
              Deploy Agent (Coming Soon)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
