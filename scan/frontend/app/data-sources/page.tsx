'use client';

import { useState } from 'react';

interface DataSource {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  website: string;
  queryCount: number;
  totalVolumeUSD: number;
  avgCostUSD: number;
  reliabilityScore: number;
  avgResponseTimeMs: number;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'coingecko',
    name: 'CoinGecko',
    category: 'crypto',
    description: 'Cryptocurrency price feeds and market data',
    icon: '📈',
    website: 'https://www.coingecko.com',
    queryCount: 1247,
    totalVolumeUSD: 37.41,
    avgCostUSD: 0.03,
    reliabilityScore: 99.8,
    avgResponseTimeMs: 142,
  },
  {
    id: 'openweather',
    name: 'OpenWeather',
    category: 'weather',
    description: 'Weather forecasts and climate data',
    icon: '🌤️',
    website: 'https://openweathermap.org',
    queryCount: 823,
    totalVolumeUSD: 16.46,
    avgCostUSD: 0.02,
    reliabilityScore: 98.5,
    avgResponseTimeMs: 89,
  },
  {
    id: 'newsapi',
    name: 'NewsAPI',
    category: 'news',
    description: 'News articles from 80,000+ sources',
    icon: '📰',
    website: 'https://newsapi.org',
    queryCount: 456,
    totalVolumeUSD: 22.80,
    avgCostUSD: 0.05,
    reliabilityScore: 97.2,
    avgResponseTimeMs: 215,
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    category: 'finance',
    description: 'Stock market and forex data',
    icon: '💹',
    website: 'https://www.alphavantage.co',
    queryCount: 612,
    totalVolumeUSD: 24.48,
    avgCostUSD: 0.04,
    reliabilityScore: 99.1,
    avgResponseTimeMs: 178,
  },
  {
    id: 'cryptocompare',
    name: 'CryptoCompare',
    category: 'crypto',
    description: 'Comprehensive crypto market data',
    icon: '💰',
    website: 'https://www.cryptocompare.com',
    queryCount: 934,
    totalVolumeUSD: 28.02,
    avgCostUSD: 0.03,
    reliabilityScore: 98.9,
    avgResponseTimeMs: 156,
  },
];

const CATEGORIES = ['all', 'crypto', 'weather', 'news', 'finance'];

export default function DataSourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSources = DATA_SOURCES.filter(
    source =>
      (selectedCategory === 'all' || source.category === selectedCategory) &&
      (source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        source.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search data sources..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
        />
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-s402-orange text-white'
                  : 'border border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Sources" value={DATA_SOURCES.length.toString()} />
        <StatBox label="Queries" value={DATA_SOURCES.reduce((sum, s) => sum + s.queryCount, 0).toLocaleString()} />
        <StatBox label="Volume" value={`$${DATA_SOURCES.reduce((sum, s) => sum + s.totalVolumeUSD, 0).toFixed(2)}`} />
        <StatBox label="Avg Reliability" value={`${(DATA_SOURCES.reduce((sum, s) => sum + s.reliabilityScore, 0) / DATA_SOURCES.length).toFixed(1)}%`} />
      </div>

      {/* Data Sources Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="text-left py-3 font-medium">Source</th>
              <th className="text-left py-3 font-medium">Category</th>
              <th className="text-right py-3 font-medium">Queries</th>
              <th className="text-right py-3 font-medium">Volume</th>
              <th className="text-right py-3 font-medium">Avg Cost</th>
              <th className="text-right py-3 font-medium">Reliability</th>
              <th className="text-right py-3 font-medium">Response</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.map(source => (
              <tr
                key={source.id}
                className="border-b border-gray-900 hover:bg-gray-950 transition-colors"
              >
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{source.icon}</span>
                    <div>
                      <div className="font-medium">{source.name}</div>
                      <div className="text-xs text-gray-500">{source.description}</div>
                    </div>
                  </div>
                </td>
                <td className="text-gray-400 capitalize">{source.category}</td>
                <td className="text-right tabular-nums">{source.queryCount.toLocaleString()}</td>
                <td className="text-right tabular-nums">${source.totalVolumeUSD.toFixed(2)}</td>
                <td className="text-right tabular-nums text-s402-orange font-medium">
                  ${source.avgCostUSD.toFixed(3)}
                </td>
                <td className="text-right tabular-nums text-green-400">
                  {source.reliabilityScore}%
                </td>
                <td className="text-right tabular-nums text-gray-500 text-xs">
                  {source.avgResponseTimeMs}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No data sources found
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-800 rounded p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
