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
    description: 'Cryptocurrency price feeds, market data, and charts for 10,000+ coins',
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
    description: 'Weather data, forecasts, and historical climate information worldwide',
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
    description: 'News articles and event data from 80,000+ sources globally',
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
    description: 'Stock market data, forex rates, and financial indicators',
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
    description: 'Cryptocurrency market data with comprehensive historical prices',
    icon: '💰',
    website: 'https://www.cryptocompare.com',
    queryCount: 934,
    totalVolumeUSD: 28.02,
    avgCostUSD: 0.03,
    reliabilityScore: 98.9,
    avgResponseTimeMs: 156,
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All Sources', icon: '🔍' },
  { id: 'crypto', name: 'Crypto', icon: '₿' },
  { id: 'weather', name: 'Weather', icon: '🌤️' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'finance', name: 'Finance', icon: '💹' },
];

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Data Sources</h1>
        <p className="text-gray-400">
          Discover oracle APIs that accept s402 micropayments on BNB Chain
        </p>
      </div>

      {/* Search & Filter */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search data sources..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-s402-gray border border-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-s402-orange text-white'
                  : 'bg-s402-gray border border-gray-800 text-gray-300 hover:border-s402-orange'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Sources</div>
          <div className="text-2xl font-bold">{DATA_SOURCES.length}</div>
        </div>
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Queries</div>
          <div className="text-2xl font-bold">
            {DATA_SOURCES.reduce((sum, s) => sum + s.queryCount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Volume</div>
          <div className="text-2xl font-bold">
            ${DATA_SOURCES.reduce((sum, s) => sum + s.totalVolumeUSD, 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Avg Reliability</div>
          <div className="text-2xl font-bold">
            {(DATA_SOURCES.reduce((sum, s) => sum + s.reliabilityScore, 0) / DATA_SOURCES.length).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSources.map(source => (
          <div
            key={source.id}
            className="bg-s402-gray border border-gray-800 rounded-lg p-6 hover:border-s402-orange transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{source.icon}</span>
                <div>
                  <h3 className="text-xl font-bold group-hover:text-s402-orange transition-colors">
                    {source.name}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 mt-1">
                    {source.category}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-6 min-h-[3rem]">
              {source.description}
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Queries</span>
                <span className="font-semibold">{source.queryCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Volume</span>
                <span className="font-semibold">${source.totalVolumeUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Avg Cost</span>
                <span className="font-semibold text-s402-orange">${source.avgCostUSD.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Reliability</span>
                <span className="font-semibold text-green-400">{source.reliabilityScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Response Time</span>
                <span className="font-semibold">{source.avgResponseTimeMs}ms</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800">
              <a
                href={source.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-s402-orange hover:underline text-sm font-medium"
              >
                Visit Website →
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredSources.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No data sources found matching your criteria
        </div>
      )}
    </div>
  );
}
