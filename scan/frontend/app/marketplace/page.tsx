'use client';

import { useState, useEffect } from 'react';

interface Tool {
  id: string;
  name: string;
  description: string;
  costUSD: number;
  provider_address?: string;
  endpoint?: string;
  created_at?: string;
  category?: string;
  icon?: string;
}

export default function MarketplacePage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'newest'>('name');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const data = await response.json();
        setTools(data);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTools = tools
    .filter(tool => 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return (a.costUSD || 0) - (b.costUSD || 0);
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-pixel mb-2">MARKETPLACE</h1>
        <p className="text-sm text-gray-400">
          Browse and discover S402 payment-protected API services
        </p>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:border-s402-orange"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                sortBy === 'name'
                  ? 'bg-s402-orange text-white'
                  : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy('price')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                sortBy === 'price'
                  ? 'bg-s402-orange text-white'
                  : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Price
            </button>
            <button
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                sortBy === 'newest'
                  ? 'bg-s402-orange text-white'
                  : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Newest
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Tools</div>
          <div className="text-2xl font-bold">{tools.length}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Avg Price</div>
          <div className="text-2xl font-bold">
            ${tools.length > 0 ? (tools.reduce((sum, t) => sum + (t.costUSD || 0), 0) / tools.length).toFixed(3) : '0.000'}
          </div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Search Results</div>
          <div className="text-2xl font-bold">{filteredAndSortedTools.length}</div>
        </div>
      </div>

      {/* Tools Grid */}
      {filteredAndSortedTools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No tools found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-6 shadow-soft dark:shadow-none hover:border-s402-orange transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-s402-orange/10 rounded-full flex items-center justify-center text-xl">
                  🛠️
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-lg font-bold text-s402-orange">
                    ${(tool.costUSD || 0).toFixed(3)}
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 group-hover:text-s402-orange transition-colors">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {tool.description}
              </p>

              {tool.provider_address && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 mb-1">Provider</div>
                  <div className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                    {tool.provider_address.slice(0, 6)}...{tool.provider_address.slice(-4)}
                  </div>
                </div>
              )}

              <a
                href={`/composer`}
                className="mt-4 block w-full text-center px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white text-sm font-medium rounded transition-colors"
              >
                Use in Agent
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
