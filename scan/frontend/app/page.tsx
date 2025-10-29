'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

interface ChartDataPoint {
  time: string;
  txns: number;
  volume: number;
}

interface Transaction {
  txHash: string;
  from: string;
  to: string;
  valueUSD: number;
  platformFeeUSD: number;
  blockNumber: number;
  timestamp: string;
  serviceName?: string | null;
  serviceCategory?: string | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then(res => res.json()),
      fetch('/api/charts').then(res => res.json()),
      fetch('/api/transactions').then(res => res.json()),
      fetch('/api/services').then(res => res.json()),
    ])
      .then(([statsData, chartsData, txsData, servicesData]) => {
        setStats(statsData);
        setChartData(chartsData);
        setRecentTxs(txsData.slice(0, 5));
        setTopServices(servicesData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data:', err);
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

  const formatAge = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-s402-orange/10 to-transparent border border-s402-orange/30 rounded-lg p-4 shadow-soft dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="font-pixel text-sm text-s402-orange">INTRODUCING THE COMPOSER</h2>
            <p className="text-xs text-gray-400 mt-1">Build and use agents that pay for credits with s402</p>
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
        <div className="bg-s402-light-card dark:bg-s402-dark-card border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <h3 className="font-pixel text-xs mb-4">TRANSACTION VOLUME</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={8} barCategoryGap="45%">
              <defs>
                <linearGradient id="barGradientVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="barGradientVolumeHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#444" style={{ fontSize: '10px' }} />
              <YAxis stroke="#444" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '4px', fontSize: '12px' }}
                labelStyle={{ color: '#999' }}
                cursor={false}
              />
              <Bar 
                dataKey="volume" 
                fill="url(#barGradientVolume)" 
                radius={[4, 4, 0, 0]}
                activeBar={{ fill: 'url(#barGradientVolumeHover)' }}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-s402-light-card dark:bg-s402-dark-card border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
          <h3 className="font-pixel text-xs mb-4">TRANSACTIONS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={8} barCategoryGap="45%">
              <defs>
                <linearGradient id="barGradientTxns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="barGradientTxnsHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#444" style={{ fontSize: '10px' }} />
              <YAxis stroke="#444" style={{ fontSize: '10px' }} />
              <Tooltip 
                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '4px', fontSize: '12px' }}
                labelStyle={{ color: '#999' }}
                cursor={false}
              />
              <Bar 
                dataKey="txns" 
                fill="url(#barGradientTxns)" 
                radius={[4, 4, 0, 0]}
                activeBar={{ fill: 'url(#barGradientTxnsHover)' }}
                maxBarSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Data Sources - KEEP AS PLACEHOLDER */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm">TOP S402 SERVICES <span className="text-gray-600">Past 24 Hours</span></h2>
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
              {topServices.length > 0 ? (
                topServices.map((service, i) => (
                  <tr key={i} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-s402-orange/10 text-s402-orange text-xs rounded">{service.category}</span>
                        <span className="font-medium">{service.name}</span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{service.queries.toLocaleString()}</td>
                    <td className="text-right tabular-nums">${service.volume.toFixed(2)}</td>
                    <td className="text-right tabular-nums text-s402-orange">${service.avgCost.toFixed(3)}</td>
                    <td className="text-right tabular-nums text-green-400">{service.reliability}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                    No services available yet. Add tools via the Admin Panel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions - REAL DATA */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-sm">TRANSACTIONS <span className="text-gray-600">Past 24 Hours</span></h2>
          <Link href="/transactions" className="text-sm text-gray-400 hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        
        {recentTxs.length > 0 ? (
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
                {recentTxs.map((tx, i) => (
                  <tr key={i} className="border-b border-gray-900 hover:bg-gray-950 transition-colors">
                    <td className="py-3">
                      {tx.serviceName ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-s402-orange/10 text-s402-orange text-xs rounded">{tx.serviceCategory}</span>
                          <span className="font-medium text-sm">{tx.serviceName}</span>
                        </div>
                      ) : (
                        <a href={`https://bscscan.com/address/${tx.to}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-400 hover:text-white">
                          {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                        </a>
                      )}
                    </td>
                    <td className="text-right tabular-nums">${tx.valueUSD.toFixed(2)}</td>
                    <td>
                      <a href={`https://bscscan.com/address/${tx.from}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-gray-400 hover:text-white">
                        {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                      </a>
                    </td>
                    <td>
                      <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-s402-orange hover:underline font-mono text-xs">
                        {tx.txHash.slice(0, 10)}...
                      </a>
                    </td>
                    <td className="text-right text-gray-500 text-xs">{formatAge(tx.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm bg-s402-light-card dark:bg-s402-dark-card border border-gray-300 dark:border-gray-800 rounded-lg shadow-soft dark:shadow-none">
            No transactions yet. Data will appear as the indexer syncs.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, change, total }: { label: string; value: string; change?: number; total?: string }) {
  return (
    <div className="bg-s402-light-card dark:bg-s402-dark-card border border-gray-300 dark:border-gray-800 rounded-lg p-4 hover:border-s402-orange dark:hover:border-s402-orange transition-all shadow-soft dark:shadow-none">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase">{label}</div>
      <div className="text-2xl font-bold tabular-nums mb-1">{value}</div>
      {change !== undefined && (
        <div className={`text-xs font-medium ${change >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
      {total && (
        <div className="text-xs text-gray-500 dark:text-gray-600 mt-1">Total: {total}</div>
      )}
    </div>
  );
}

