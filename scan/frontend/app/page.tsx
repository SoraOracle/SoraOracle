'use client';

import { useEffect, useState } from 'react';

interface OverviewStats {
  totalPayments: number;
  totalVolumeUSD: number;
  totalFeesUSD: number;
  uniquePayers: number;
  uniqueProviders: number;
  activeAgents: number;
  avgPaymentUSD: number;
  paymentsLast24h: number;
  volumeLast24h: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-s402-orange mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading S402 analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold mb-4">
          Oracle Ecosystem Explorer for <span className="text-s402-orange">BNB Chain</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
          Track s402 micropayments, discover data sources, and build AI agents that pay for oracle data automatically
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Volume"
          value={`$${stats?.totalVolumeUSD.toLocaleString() || '0'}`}
          change={`$${stats?.volumeLast24h.toLocaleString() || '0'} (24h)`}
          icon="💰"
        />
        <StatCard
          title="Total Payments"
          value={stats?.totalPayments.toLocaleString() || '0'}
          change={`${stats?.paymentsLast24h.toLocaleString() || '0'} (24h)`}
          icon="📊"
        />
        <StatCard
          title="Active Providers"
          value={stats?.uniqueProviders.toLocaleString() || '0'}
          change={`${stats?.uniquePayers.toLocaleString() || '0'} payers`}
          icon="🤖"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard
          label="Platform Fees"
          value={`$${stats?.totalFeesUSD.toFixed(2) || '0.00'}`}
        />
        <MiniStatCard
          label="Avg Payment"
          value={`$${stats?.avgPaymentUSD.toFixed(2) || '0.00'}`}
        />
        <MiniStatCard
          label="Active Agents"
          value={stats?.activeAgents.toLocaleString() || '0'}
        />
        <MiniStatCard
          label="Savings vs Chainlink"
          value="98.9%"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <QuickLink
          title="Agent Composer"
          description="Build AI bots that pay oracles with s402 micropayments"
          href="/composer"
          icon="🤖"
          badge="BETA"
        />
        <QuickLink
          title="Data Sources"
          description="Discover oracle APIs: CoinGecko, OpenWeather, NewsAPI"
          href="/data-sources"
          icon="🛠️"
        />
        <QuickLink
          title="Transactions"
          description="Explore s402 payment history and settlements"
          href="/transactions"
          icon="🔍"
        />
      </div>

      {/* Info Callout */}
      <div className="bg-s402-gray border border-gray-800 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-bold mb-2">
          <span className="text-s402-orange">What is S402 Scan?</span>
        </h3>
        <p className="text-gray-400 mb-4">
          S402 Scan is the complete oracle ecosystem explorer for BNB Chain. We index all s402 micropayments from the S402Facilitator contract, 
          provide analytics on oracle providers, and offer tools to build AI agents that pay for data automatically.
        </p>
        <div className="flex items-center space-x-4 text-sm">
          <a href="https://github.com/sora-oracle" className="text-s402-orange hover:underline">GitHub</a>
          <span className="text-gray-600">•</span>
          <a href="/docs" className="text-s402-orange hover:underline">Documentation</a>
          <span className="text-gray-600">•</span>
          <span className="text-gray-500">Contract: 0x605c...48a3</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon }: { title: string; value: string; change: string; icon: string }) {
  return (
    <div className="bg-s402-gray border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-500">{change}</div>
    </div>
  );
}

function MiniStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
      <div className="text-gray-400 text-xs font-medium mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function QuickLink({ title, description, href, icon, badge }: { title: string; description: string; href: string; icon: string; badge?: string }) {
  return (
    <a href={href} className="block bg-s402-gray border border-gray-800 rounded-lg p-6 hover:border-s402-orange transition group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        {badge && (
          <span className="bg-s402-orange text-xs px-2 py-1 rounded font-medium">{badge}</span>
        )}
      </div>
      <h3 className="text-lg font-bold mb-2 group-hover:text-s402-orange transition">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </a>
  );
}
