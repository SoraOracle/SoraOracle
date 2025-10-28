import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_CONFIG } from '../config/api';
import './ProbabilityChart.css';

interface ChartDataPoint {
  date: string;
  yes: number;
  no: number;
}

interface ProbabilityChartProps {
  marketId?: string;
  data?: ChartDataPoint[];
}

function ProbabilityChart({ marketId, data }: ProbabilityChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setChartData(data);
    } else if (marketId) {
      loadRealData();
    } else {
      setChartData(mockData);
    }
  }, [marketId, data]);

  const loadRealData = async () => {
    if (!marketId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/markets/${marketId}/history`);
      const history = await response.json();

      if (history.length > 0) {
        const formattedData = history.map((snapshot: any) => ({
          date: new Date(snapshot.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          yes: snapshot.yes_probability,
          no: snapshot.no_probability
        }));
        setChartData(formattedData);
      } else {
        setChartData(mockData);
      }
    } catch (error) {
      console.error('Error loading market history:', error);
      setChartData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const mockData: ChartDataPoint[] = [
    { date: 'May', yes: 28, no: 72 },
    { date: 'Jun', yes: 32, no: 68 },
    { date: 'Jul', yes: 45, no: 55 },
    { date: 'Aug', yes: 58, no: 42 },
    { date: 'Sep', yes: 68, no: 32 },
    { date: 'Oct', yes: 72, no: 28 },
  ];

  const displayData = chartData.length > 0 ? chartData : mockData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{payload[0].payload.date}</p>
          <p className="tooltip-value yes">Yes: {payload[0].value}%</p>
          <p className="tooltip-value no">No: {payload[1].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="probability-chart">
      {loading && <div className="chart-loading">Loading historical data...</div>}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.3)" 
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)" 
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="yes" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="no" 
            stroke="#ef4444" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot yes"></span>
          <span className="legend-label">Yes</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot no"></span>
          <span className="legend-label">No</span>
        </div>
      </div>
    </div>
  );
}

export default ProbabilityChart;
