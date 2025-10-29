'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

// Placeholder chart data
const CHART_DATA = [
  { time: '00:00', txns: 850, volume: 1200 },
  { time: '04:00', txns: 920, volume: 1350 },
  { time: '08:00', txns: 1100, volume: 1800 },
  { time: '12:00', txns: 1250, volume: 2100 },
  { time: '16:00', txns: 980, volume: 1650 },
  { time: '20:00', txns: 1050, volume: 1750 },
];

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
          <p className="mt-3 text-sm text-gray-500 font-pixel">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-s402-orange/10 to-transparent border border-s402-orange/30 rounded p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="font-pixel text-sm text-s402-orange">INTRODUCING THE COMPOSER</h2>
            <p className="text-xs text-gray-400 mt-1">Build and use agents that pay for oracle data with s402</p>
          </div>
          <Link href="/composer" className="ml-auto bg-s402-orange hover:bg-orange-600 px-4 py-2 rounded text-xs font-medium transition-colors">
            Try Now →
          </Link>
        </div>
      </div>

      {/* Overall Stats */}
      <div>
        <h2 className="font-pixel text-sm mb-4">OVERALL STATS <span className="text-gray-600">Past 24 Hours</span></h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            label="Transactions" 
            value={stats?.paymentsLast24h.toLocaleString() || '0'}
            change={-33.1}
            total={stats?.totalPayments.toLocaleString() || '0'}
          />
          <StatCard 
            label="Volume" 
            value={`$${(stats?.volumeLast24h || 0).toLocaleString()}`}
            change={25.8}
            total={`$${(stats?.totalVolumeUSD || 0).toLocaleString()}`}
          />
          <StatCard 
            label="Buyers" 
            value={(stats?.uniquePayers || 0).toLocaleString()}
            change={59.6}
          />
          <StatCard 
            label="Sellers" 
            value={(stats?.uniqueProviders || 0).toLocaleString()}
            change={150}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-800 rounded p-4">
          <h3 className="font-pixel text-xs mb-4">TRANSACTION VOLUME</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={CHART_DATA}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#444" style={{ fontSize: '10px' }} />
              <YAxis stroke="#444" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '4px', fontSize: '12px' }}
                labelStyle={{ color: '#999' }}
              />
              <Area type="monotone" dataKey="volume" stroke="#F97316" fillOpacity={1} fill="url(#colorVolume)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-gray-800 rounded p-4">
          <h3 className="font-pixel text-xs mb-4">TRANSACTIONS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CHART_DATA}>
              <XAxis dataKey="time" stroke="#444" style={{ fontSize: '10px' }} />
              <YAxis stroke="#444" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '4px', fontSize: '12px' }}
                labelStyle={{ color: '#999' }}
              />
              <Line type="monotone" dataKey="txns" stroke="#F97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Data Sources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm">TOP DATA SOURCES <span className="text-gray-600">Past 24 Hours</span></h2>
          <Link href="/data-sources" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm">TRANSACTIONS <span className="text-gray-600">Past 24 Hours</span></h2>
          <Link href="/transactions" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="text-left py-3 font-medium">Server</th>
                <th className="text-right py-3 font-medium">Amount</th>
                <th className="text-left py-3 font-medium">Sender</th>
                <th className="text-left py-3 font-medium">Hash</th>
                <th className="text-right py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_TXS.map((tx, i) => (
                <tr key={i} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                  <td className="py-3">
                    <a href={`https://bscscan.com/address/${tx.to}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-400 hover:text-white">
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </a>
                  </td>
                  <td className="text-right tabular-nums">${tx.value.toFixed(2)}</td>
                  <td>
                    <a href={`https://bscscan.com/address/${tx.from}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-400 hover:text-white">
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </a>
                  </td>
                  <td>
                    <a href={`https://bscscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-s402-orange hover:underline font-mono text-xs">
                      {tx.hash.slice(0, 10)}...
                    </a>
                  </td>
                  <td className="text-right text-gray-500 text-xs">{tx.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, change, total }: { label: string; value: string; change?: number; total?: string }) {
  return (
    <div className="border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors">
      <div className="text-xs text-gray-500 mb-2 uppercase">{label}</div>
      <div className="text-2xl font-bold tabular-nums mb-1">{value}</div>
      {change !== undefined && (
        <div className={`text-xs font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
      {total && (
        <div className="text-xs text-gray-600 mt-1">Total: {total}</div>
      )}
    </div>
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
  { hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', value: 0.03, age: '1m ago' },
  { hash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c', from: '0x9876543210fedcba9876543210fedcba98765432', to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', value: 0.05, age: '4m ago' },
  { hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d', from: '0x1234567890abcdef1234567890abcdef12345678', to: '0x5555666677778888999900001111222233334444', value: 0.02, age: '12m ago' },
  { hash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e', from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', value: 0.04, age: '23m ago' },
  { hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f', from: '0x7777888899990000111122223333444455556666', to: '0x5555666677778888999900001111222233334444', value: 0.025, age: '~2h ago' },
];
