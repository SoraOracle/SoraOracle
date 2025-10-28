import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_CONFIG } from '../config/api';
import './AnalyticsPage.css';

interface OverviewStats {
  total_markets: string;
  resolved_markets: string;
  total_users: string;
  total_volume: string;
  total_bets: string;
  total_claims: string;
}

interface DailyVolumeData {
  date: string;
  volume: string;
  bet_count: string;
}

function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [dailyVolume, setDailyVolume] = useState<DailyVolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, volumeRes] = await Promise.all([
        fetch(`${API_CONFIG.baseURL}/api/analytics/overview`),
        fetch(`${API_CONFIG.baseURL}/api/analytics/daily-volume?days=${timeRange}`)
      ]);

      const overviewData = await overviewRes.json();
      const volumeData = await volumeRes.json();

      setOverview(overviewData);
      setDailyVolume(volumeData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBNB = (value: string) => {
    return (Number(value) / 1e18).toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const volumeChartData = dailyVolume.map(d => ({
    date: formatDate(d.date),
    volume: Number(formatBNB(d.volume)),
    bets: Number(d.bet_count)
  }));

  const COLORS = ['#ff6b35', '#8b5cf6', '#10b981', '#f59e0b'];

  const marketStatusData = overview ? [
    { name: 'Active', value: Number(overview.total_markets) - Number(overview.resolved_markets) },
    { name: 'Resolved', value: Number(overview.resolved_markets) }
  ] : [];

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="container">
          <div className="loading">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="container">
        <div className="page-header">
          <h1>📊 Platform Analytics</h1>
          <p className="subtitle">Real-time insights from the blockchain</p>
        </div>

        {overview && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <div className="stat-label">Total Markets</div>
                  <div className="stat-value">{overview.total_markets}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-label">Resolved Markets</div>
                  <div className="stat-value">{overview.resolved_markets}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-label">Total Users</div>
                  <div className="stat-value">{overview.total_users}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-label">Total Volume</div>
                  <div className="stat-value">{formatBNB(overview.total_volume)} BNB</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-label">Total Bets</div>
                  <div className="stat-value">{overview.total_bets}</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎉</div>
                <div className="stat-content">
                  <div className="stat-label">Total Claims</div>
                  <div className="stat-value">{overview.total_claims}</div>
                </div>
              </div>
            </div>

            <div className="charts-section">
              <div className="chart-card full-width">
                <div className="chart-header">
                  <h2>Daily Trading Volume</h2>
                  <div className="time-range-selector">
                    <button 
                      className={timeRange === '7' ? 'active' : ''}
                      onClick={() => setTimeRange('7')}
                    >
                      7D
                    </button>
                    <button 
                      className={timeRange === '30' ? 'active' : ''}
                      onClick={() => setTimeRange('30')}
                    >
                      30D
                    </button>
                    <button 
                      className={timeRange === '90' ? 'active' : ''}
                      onClick={() => setTimeRange('90')}
                    >
                      90D
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={volumeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value: number) => `${value.toFixed(0)} BNB`}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,107,53,0.3)',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'volume') return [`${value.toFixed(2)} BNB`, 'Volume'];
                        return [value, 'Bets'];
                      }}
                    />
                    <Bar dataKey="volume" fill="#ff6b35" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h2>Bet Activity</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={volumeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: 'rgba(0,0,0,0.9)',
                        border: '1px solid rgba(255,107,53,0.3)',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bets" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h2>Market Status</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={marketStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {marketStatusData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="insights-section">
              <h2>📌 Key Insights</h2>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-label">Average Bet Size</div>
                  <div className="insight-value">
                    {(Number(formatBNB(overview.total_volume)) / Number(overview.total_bets)).toFixed(4)} BNB
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-label">Resolution Rate</div>
                  <div className="insight-value">
                    {((Number(overview.resolved_markets) / Number(overview.total_markets)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-label">Claim Rate</div>
                  <div className="insight-value">
                    {((Number(overview.total_claims) / Number(overview.total_bets)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="insight-card">
                  <div className="insight-label">Avg Bets per User</div>
                  <div className="insight-value">
                    {(Number(overview.total_bets) / Number(overview.total_users)).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
