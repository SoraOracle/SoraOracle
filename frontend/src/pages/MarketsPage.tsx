import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatBNB } from '@sora-oracle/sdk';
import './MarketsPage.css';

function MarketsPage({ marketClient }: any) {
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (marketClient) {
      loadMarkets();
    }
  }, [marketClient]);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      // Fetch REAL markets from blockchain using SDK
      // ALL data is verifiable on-chain - NO localStorage or fake data
      const blockchainMarkets = await marketClient.getAllMarkets();
      
      const formatted = blockchainMarkets.map((m: any) => {
        const totalYes = BigInt(m.totalYes || 0);
        const totalNo = BigInt(m.totalNo || 0);
        const totalPool = totalYes + totalNo;
        
        // Calculate odds
        let yesOdds = 50;
        let noOdds = 50;
        if (totalPool > 0n) {
          yesOdds = Math.round((Number(totalYes) / Number(totalPool)) * 100);
          noOdds = 100 - yesOdds;
        }
        
        return {
          id: m.id,
          question: m.question,
          deadline: m.deadline,
          totalYes,
          totalNo,
          totalPool,
          yesOdds,
          noOdds,
          resolved: m.resolved,
          traders: 0, // Will be calculated from events in future
          category: 'Crypto' // Can be added to contract later
        };
      });
      
      setMarkets(formatted);
    } catch (error) {
      console.error('Error loading markets from blockchain:', error);
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  const [filter, setFilter] = useState<'All' | 'Crypto' | 'Politics' | 'Finance' | 'Sports' | 'Technology'>('All');
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});

  // Calculate REAL stats from actual market data - NO FAKE NUMBERS
  const stats = {
    totalVolume: markets.reduce((sum, m) => {
      const pool = typeof m.totalPool === 'bigint' ? Number(m.totalPool) / 1e18 : 0;
      return sum + pool;
    }, 0).toFixed(2),
    activeMarkets: markets.filter(m => !m.resolved).length,
    totalTraders: 0, // Will be calculated from on-chain events when integrated
    marketsSettled: markets.filter(m => m.resolved).length
  };

  const filteredMarkets = markets.filter((market: any) => {
    if (filter === 'All') return true;
    return market.category === filter;
  });

  const getTimeLeft = (deadline: number) => {
    const timeLeft = deadline - Date.now() / 1000;
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const handleBetAmountChange = (marketId: string, value: string) => {
    setBetAmounts({ ...betAmounts, [marketId]: value });
  };

  const handleBet = async (marketId: string, position: 'yes' | 'no') => {
    if (!marketClient) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = betAmounts[marketId] || '0';
    if (parseFloat(amount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    try {
      // Convert BNB to Wei
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      
      // Place REAL bet on blockchain using SDK
      await marketClient.takePosition(marketId, position === 'yes', amountWei);
      
      alert(`Successfully bet ${amount} BNB on ${position.toUpperCase()}!`);
      
      // Reload markets to show updated pools
      await loadMarkets();
      
      // Clear bet amount
      setBetAmounts({ ...betAmounts, [marketId]: '' });
    } catch (error: any) {
      console.error('Error placing bet:', error);
      alert(`Failed to place bet: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="markets-page">
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <div className="hero-label">PREDICTION MARKETS</div>
              <h1 className="hero-title">SoraMarket</h1>
              <div className="powered-badge">Powered by Sora Oracle SDK</div>
              <p className="hero-subtitle">
                Trade on real-world outcomes with oracle-powered settlement. Trustless, transparent,
                and instant payouts.
              </p>
              <div className="hero-buttons">
                <Link to="/create" className="btn btn-primary-orange">
                  Create Market →
                </Link>
                <button className="btn btn-secondary-dark">
                  How It Works
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Volume</div>
              <div className="stat-value">{stats.totalVolume} BNB</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Active Markets</div>
              <div className="stat-value">{stats.activeMarkets}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Traders</div>
              <div className="stat-value">{stats.totalTraders.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Markets Settled</div>
              <div className="stat-value">{stats.marketsSettled}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="markets-header">
          <h2>Active Markets</h2>
          <div className="category-filters">
            <button 
              className={`category-btn ${filter === 'All' ? 'active' : ''}`}
              onClick={() => setFilter('All')}
            >
              All
            </button>
            <button 
              className={`category-btn ${filter === 'Crypto' ? 'active' : ''}`}
              onClick={() => setFilter('Crypto')}
            >
              Crypto
            </button>
            <button 
              className={`category-btn ${filter === 'Politics' ? 'active' : ''}`}
              onClick={() => setFilter('Politics')}
            >
              Politics
            </button>
            <button 
              className={`category-btn ${filter === 'Finance' ? 'active' : ''}`}
              onClick={() => setFilter('Finance')}
            >
              Finance
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading markets...</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="empty-state">
            <h3>No Markets Found</h3>
            <p>Be the first to create a prediction market!</p>
            <Link to="/create" className="btn btn-primary-orange">Create Market</Link>
          </div>
        ) : (
          <div className="markets-list">
            {filteredMarkets.map(market => (
            <div key={market.id} className="market-card">
              <Link to={`/market/${market.id}`} className="market-card-link">
                <div className="market-category-badge">{market.category}</div>
                <h3 className="market-question">{market.question}</h3>
              <div className="market-meta">
                <span className="meta-item">
                  <span className="meta-icon">$</span>
                  {formatBNB(market.totalPool || BigInt(0), 1)} BNB
                </span>
                <span className="meta-item">
                  <span className="meta-icon">👥</span>
                  {market.traders} traders
                </span>
              </div>
              <div className="market-meta">
                <span className="meta-item">
                  <span className="meta-icon">⏰</span>
                  {getTimeLeft(market.deadline)}
                </span>
              </div>

              <div className="outcome-bars">
                <div className="outcome-row yes">
                  <div className="outcome-header">
                    <span className="outcome-label">
                      <span className="outcome-icon">◉</span> YES
                    </span>
                    <span className="outcome-percentage">{market.yesOdds}%</span>
                  </div>
                  <div className="outcome-bar-container">
                    <div className="outcome-bar" style={{ width: `${market.yesOdds}%` }}></div>
                  </div>
                  <div className="outcome-amount">{formatBNB(market.totalYes, 1)} BNB pooled</div>
                </div>

                <div className="outcome-row no">
                  <div className="outcome-header">
                    <span className="outcome-label">
                      <span className="outcome-icon">◉</span> NO
                    </span>
                    <span className="outcome-percentage">{market.noOdds}%</span>
                  </div>
                  <div className="outcome-bar-container">
                    <div className="outcome-bar" style={{ width: `${market.noOdds}%` }}></div>
                  </div>
                  <div className="outcome-amount">{formatBNB(market.totalNo, 1)} BNB pooled</div>
                </div>
              </div>
              </Link>

              <div className="bet-section" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  className="bet-input"
                  placeholder="Amount (BNB)"
                  value={betAmounts[market.id] || ''}
                  onChange={(e) => handleBetAmountChange(market.id, e.target.value)}
                  step="0.01"
                  min="0"
                />
                <div className="bet-buttons">
                  <button 
                    className="bet-btn yes"
                    onClick={() => handleBet(market.id, 'yes')}
                  >
                    Yes
                  </button>
                  <button 
                    className="bet-btn no"
                    onClick={() => handleBet(market.id, 'no')}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketsPage;
