'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  data_sources: string[];
  query_count: number;
  total_spent_usd: number;
  created_at: string;
  is_public: boolean;
}

export default function ComposerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalAgents: number;
    totalQueries: number;
    totalSpent: number;
  }>({
    totalAgents: 0,
    totalQueries: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (address) {
      loadComposerData();
    }
  }, [address]);

  const loadComposerData = async () => {
    try {
      const response = await fetch(`/api/agents?owner=${address}`);
      if (response.ok) {
        const data = await response.json();
        // Filter to only show public agents (unless viewing own profile)
        const publicAgents = data.filter((a: Agent) => a.is_public);
        setAgents(publicAgents);
        
        // Calculate stats
        const totalQueries = publicAgents.reduce((sum: number, a: Agent) => sum + (a.query_count || 0), 0);
        const totalSpent = publicAgents.reduce((sum: number, a: Agent) => sum + (parseFloat(a.total_spent_usd as any) || 0), 0);
        
        setStats({
          totalAgents: publicAgents.length,
          totalQueries,
          totalSpent,
        });
      }
    } catch (error) {
      console.error('Failed to load composer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
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
      {/* Back Button */}
      <Link href="/composers" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        ← Back to Composers
      </Link>

      {/* Profile Header */}
      <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-6 shadow-soft dark:shadow-none">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-s402-orange/10 rounded-full flex items-center justify-center text-4xl">
            👨‍💻
          </div>
          <div className="flex-1">
            <h1 className="font-pixel text-lg mb-2">COMPOSER PROFILE</h1>
            <div className="font-mono text-sm text-gray-600 dark:text-gray-400 mb-4">
              {address}
            </div>
            <div className="flex items-center gap-4">
              <a 
                href={`https://bscscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-s402-orange hover:underline"
              >
                View on BscScan →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-2">Public Agents</div>
          <div className="text-2xl font-bold text-s402-orange">{stats.totalAgents}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-2">Total Queries</div>
          <div className="text-2xl font-bold">{stats.totalQueries.toLocaleString()}</div>
        </div>
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <div className="text-xs text-gray-500 uppercase mb-2">Total Spent</div>
          <div className="text-2xl font-bold">${Number(stats.totalSpent || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Public Agents */}
      <div>
        <h2 className="font-pixel text-sm mb-4">
          PUBLIC AGENTS <span className="text-gray-600">({agents.length})</span>
        </h2>
        
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map(agent => (
              <Link
                key={agent.id}
                href={`/composer/agent/${agent.id}`}
                className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-5 hover:border-s402-orange transition-all shadow-soft dark:shadow-none group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{agent.icon || '🤖'}</span>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1 group-hover:text-s402-orange transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {agent.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Queries</span>
                    <span className="font-medium">{agent.query_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Data Sources</span>
                    <span className="font-medium">{agent.data_sources?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Created</span>
                    <span className="font-medium">{formatDate(agent.created_at)}</span>
                  </div>
                </div>

                <div className="mt-4 text-xs text-s402-orange group-hover:underline">
                  View Agent →
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg shadow-soft dark:shadow-none">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-gray-500 text-sm">
              This composer hasn't created any public agents yet
            </p>
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-s402-orange/10 to-transparent border border-s402-orange/30 rounded-lg p-6 shadow-soft dark:shadow-none">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🚀</span>
          <div className="flex-1">
            <h3 className="font-pixel text-sm text-s402-orange mb-1">BUILD YOUR OWN</h3>
            <p className="text-xs text-gray-400">Create AI agents that interact with s402 data sources</p>
          </div>
          <Link 
            href="/composer" 
            className="bg-s402-orange hover:bg-orange-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
          >
            Start Building
          </Link>
        </div>
      </div>
    </div>
  );
}
