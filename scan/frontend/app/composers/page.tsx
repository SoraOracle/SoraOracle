'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Composer {
  address: string;
  agent_count: number;
  total_queries: number;
}

export default function ComposersPage() {
  const [composers, setComposers] = useState<Composer[]>([]);
  const [filteredComposers, setFilteredComposers] = useState<Composer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'agents' | 'queries'>('agents');

  useEffect(() => {
    loadComposers();
  }, []);

  useEffect(() => {
    filterAndSortComposers();
  }, [composers, searchQuery, sortBy]);

  const loadComposers = async () => {
    try {
      const response = await fetch('/api/composers/top');
      if (response.ok) {
        const data = await response.json();
        setComposers(data);
      }
    } catch (error) {
      console.error('Failed to load composers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortComposers = () => {
    let filtered = [...composers];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'agents') {
        return b.agent_count - a.agent_count;
      } else {
        return (b.total_queries || 0) - (a.total_queries || 0);
      }
    });

    setFilteredComposers(filtered);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-pixel">COMPOSERS</h1>
          <span className="text-xs px-2 py-0.5 bg-s402-orange/20 text-s402-orange rounded font-medium">
            {composers.length}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Explore creators building AI agents on the S402 network
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by wallet address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-s402-orange transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'agents' | 'queries')}
              className="bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-s402-orange"
            >
              <option value="agents">Most Agents</option>
              <option value="queries">Most Queries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Composers Grid */}
      {filteredComposers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredComposers.map((composer, i) => (
            <Link 
              key={i}
              href={`/composers/${composer.address}`}
              className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-5 hover:border-s402-orange transition-all shadow-soft dark:shadow-none group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="font-mono text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors mb-1">
                    {composer.address.slice(0, 8)}...{composer.address.slice(-6)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Composer #{i + 1}
                  </div>
                </div>
                <div className="text-3xl opacity-70 group-hover:opacity-100 transition-opacity">
                  👨‍💻
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-xs text-gray-500">Public Agents</span>
                  <span className="text-sm font-medium text-s402-orange">{composer.agent_count}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-xs text-gray-500">Total Queries</span>
                  <span className="text-sm font-medium">{composer.total_queries?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-s402-orange group-hover:underline">
                View Profile →
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg shadow-soft dark:shadow-none">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 text-sm mb-2">
            {searchQuery ? 'No composers found matching your search' : 'No public agents yet'}
          </p>
          {!searchQuery && (
            <p className="text-xs text-gray-600">
              Create your first agent in the <Link href="/composer" className="text-s402-orange hover:underline">Composer</Link>
            </p>
          )}
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-s402-orange/10 to-transparent border border-s402-orange/30 rounded-lg p-6 shadow-soft dark:shadow-none">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🚀</span>
          <div className="flex-1">
            <h3 className="font-pixel text-sm text-s402-orange mb-1">BECOME A COMPOSER</h3>
            <p className="text-xs text-gray-400">Build your own AI agents and join the network</p>
          </div>
          <Link 
            href="/composer" 
            className="bg-s402-orange hover:bg-orange-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
