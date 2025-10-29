'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-s402-orange mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid - Blur.io style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Volume" value={`$${stats?.totalVolumeUSD.toLocaleString() || '0'}`} change24h={stats?.volumeLast24h || 0} />
        <StatCard label="Payments" value={stats?.totalPayments.toLocaleString() || '0'} change24h={stats?.paymentsLast24h || 0} />
        <StatCard label="Providers" value={stats?.uniqueProviders.toLocaleString() || '0'} />
        <StatCard label="Avg Payment" value={`$${stats?.avgPaymentUSD.toFixed(3) || '0.000'}`} />
      </div>

      {/* Top Data Sources Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Top Data Sources</h2>
          <Link href="/data-sources" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 font-medium">Source</th>
                <th className="text-right py-3 font-medium">Queries</th>
                <th className="text-right py-3 font-medium">Volume</th>
                <th className="text-right py-3 font-medium">Avg Cost</th>
                <th className="text-right py-3 font-medium">Reliability</th>
              </tr>
            </thead>
            <tbody>
              {TOP_SOURCES.map((source, i) => (
                <tr key={i} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{source.icon}</span>
                      <span className="font-medium">{source.name}</span>
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{source.queries.toLocaleString()}</td>
                  <td className="text-right tabular-nums">${source.volume.toFixed(2)}</td>
                  <td className="text-right tabular-nums text-s402-orange">${source.avgCost.toFixed(3)}</td>
                  <td className="text-right tabular-nums text-green-400">{source.reliability}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <Link href="/transactions" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 font-medium">Hash</th>
                <th className="text-left py-3 font-medium">From</th>
                <th className="text-left py-3 font-medium">To</th>
                <th className="text-right py-3 font-medium">Value</th>
                <th className="text-right py-3 font-medium">Age</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_TXS.map((tx, i) => (
                <tr key={i} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                  <td className="py-3">
                    <a href={`https://bscscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-s402-orange hover:underline font-mono text-xs">
                      {tx.hash.slice(0, 10)}...
                    </a>
                  </td>
                  <td className="font-mono text-xs text-gray-400">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</td>
                  <td className="font-mono text-xs text-gray-400">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</td>
                  <td className="text-right tabular-nums">${tx.value.toFixed(3)}</td>
                  <td className="text-right text-gray-500 text-xs">{tx.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <QuickAction
          href="/composer"
          title="Build AI Agent"
          description="Deploy autonomous oracle bots"
          badge="BETA"
        />
        <QuickAction
          href="/data-sources"
          title="Discover APIs"
          description="Browse oracle data sources"
        />
        <QuickAction
          href="/transactions"
          title="Explore Payments"
          description="Track s402 settlements"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, change24h }: { label: string; value: string; change24h?: number }) {
  return (
    <div className="border border-gray-800 rounded p-3 hover:border-gray-700 transition-colors">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {change24h !== undefined && (
        <div className="text-xs text-gray-500 mt-1">
          {change24h > 0 ? '+' : ''}{change24h.toLocaleString()} 24h
        </div>
      )}
    </div>
  );
}

function QuickAction({ href, title, description, badge }: { href: string; title: string; description: string; badge?: string }) {
  return (
    <Link
      href={href}
      className="border border-gray-800 rounded p-4 hover:border-s402-orange transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold group-hover:text-s402-orange transition-colors">{title}</h3>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 bg-s402-orange/20 text-s402-orange rounded font-medium">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </Link>
  );
}

const TOP_SOURCES = [
  { icon: '📈', name: 'CoinGecko', queries: 1247, volume: 37.41, avgCost: 0.03, reliability: 99.8 },
  { icon: '💹', name: 'Alpha Vantage', queries: 934, volume: 28.02, avgCost: 0.04, reliability: 99.1 },
  { icon: '🌤️', name: 'OpenWeather', queries: 823, volume: 16.46, avgCost: 0.02, reliability: 98.5 },
  { icon: '💰', name: 'CryptoCompare', queries: 612, volume: 24.48, avgCost: 0.03, reliability: 98.9 },
  { icon: '📰', name: 'NewsAPI', queries: 456, volume: 22.80, avgCost: 0.05, reliability: 97.2 },
];

const RECENT_TXS = [
  { hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', value: 0.03, age: '5m ago' },
  { hash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c', from: '0x9876543210fedcba9876543210fedcba98765432', to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', value: 0.05, age: '15m ago' },
  { hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d', from: '0x1234567890abcdef1234567890abcdef12345678', to: '0x5555666677778888999900001111222233334444', value: 0.02, age: '32m ago' },
];
