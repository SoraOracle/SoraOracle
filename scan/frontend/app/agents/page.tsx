'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string;
  owner_address: string;
  is_public: boolean;
  icon: string;
  query_count: number;
  total_spent_usd: string;
  created_at: string;
}

export default function AllAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents?owner=all');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.filter((a: Agent) => a.is_public));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-s402-orange mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500 font-pixel">LOADING AGENTS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-pixel mb-2">ALL AGENTS</h1>
            <p className="text-sm text-gray-400">
              Browse all public AI agents powered by S402 oracles
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/agents/my"
              className="px-4 py-2 border border-gray-300 dark:border-gray-800 hover:border-s402-orange text-sm font-medium rounded transition-colors"
            >
              👤 My Agents
            </Link>
            <Link
              href="/composer"
              className="px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white font-medium rounded transition-colors"
            >
              + Create Agent
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search agents by name or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-s402-orange transition-colors"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Public Agents</div>
          <div className="text-2xl font-bold">{agents.length}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Queries</div>
          <div className="text-2xl font-bold">
            {agents.reduce((sum, a) => sum + (a.query_count || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Spent</div>
          <div className="text-2xl font-bold">
            ${agents.reduce((sum, a) => sum + (parseFloat(a.total_spent_usd) || 0), 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-12 bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-400">
            {searchQuery ? 'No agents found matching your search' : 'No public agents yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map(agent => (
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

              {agent.owner_address && (
                <div className="mt-2 text-xs text-gray-400">
                  By {agent.owner_address.slice(0, 6)}...{agent.owner_address.slice(-4)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
