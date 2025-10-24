import { useState, useEffect } from 'react';
import { useWallet } from '@sora-oracle/sdk/hooks';
import { useProfile } from '../contexts/ProfileContext';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

interface Position {
  marketId: string;
  marketQuestion: string;
  outcome: boolean;
  amount: bigint;
  timestamp: number;
  winnings: bigint;
  status: 'active' | 'won' | 'lost' | 'claimable';
  claimed: boolean;
}

function DashboardPage({ marketClient }: any) {
  const { address, isConnected } = useWallet();
  const { profile } = useProfile();
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState({
    totalBets: 0,
    totalVolume: '0',
    activePositions: 0,
    wonPositions: 0,
    lostPositions: 0,
    totalWinnings: '0',
    totalLosses: '0',
    claimable: '0',
    portfolioValue: '0'
  });
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'won' | 'lost' | 'claimable'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address && marketClient) {
      loadPositions();
    }
  }, [isConnected, address, marketClient]);

  const loadPositions = async () => {
    setLoading(true);
    try {
      // Fetch ALL markets from blockchain
      const markets = await marketClient.getAllMarkets();
      const userPositions: Position[] = [];

      // Check each market for user positions
      for (const market of markets) {
        try {
          const position = await marketClient.getPosition(market.id, address);
          
          // Only include if user has a position
          if (position.amount > 0n) {
            let status: 'active' | 'won' | 'lost' | 'claimable' = 'active';
            let winnings = 0n;

            if (market.resolved) {
              // Market is resolved - check if user won
              const isWinner = market.outcome === 1 ? position.isYes : !position.isYes;
              
              if (isWinner) {
                // Calculate winnings from blockchain
                winnings = await marketClient.calculateWinnings(market.id, address);
                status = position.claimed ? 'won' : 'claimable';
              } else {
                status = 'lost';
              }
            }

            userPositions.push({
              marketId: market.id,
              marketQuestion: market.question,
              outcome: position.isYes,
              amount: position.amount,
              timestamp: Date.now(), // Could be fetched from events
              winnings,
              status,
              claimed: position.claimed
            });
          }
        } catch (error) {
          console.warn(`Failed to load position for market ${market.id}:`, error);
        }
      }

      setPositions(userPositions);
      calculateStats(userPositions);
    } catch (error) {
      console.error('Error loading positions from blockchain:', error);
    }
    setLoading(false);
  };

  const calculateStats = (positions: Position[]) => {
    const totalBets = positions.length;
    
    // Keep all calculations in BigInt, convert only for display
    const totalVolume = positions.reduce((sum, pos) => sum + pos.amount, 0n);
    
    const activePositions = positions.filter(p => p.status === 'active').length;
    const wonPositions = positions.filter(p => p.status === 'won' || p.status === 'claimable').length;
    const lostPositions = positions.filter(p => p.status === 'lost').length;
    
    const totalWinnings = positions
      .filter(p => p.status === 'claimable' || p.status === 'won')
      .reduce((sum, pos) => sum + pos.winnings, 0n);
    
    const totalLosses = positions
      .filter(p => p.status === 'lost')
      .reduce((sum, pos) => sum + pos.amount, 0n);
    
    const claimable = positions
      .filter(p => p.status === 'claimable')
      .reduce((sum, pos) => sum + pos.winnings, 0n);
    
    const portfolioValue = totalWinnings - totalLosses;

    // Convert BigInt to Number only at display time
    setStats({
      totalBets,
      totalVolume: (Number(totalVolume) / 1e18).toFixed(4),
      activePositions,
      wonPositions,
      lostPositions,
      totalWinnings: (Number(totalWinnings) / 1e18).toFixed(4),
      totalLosses: (Number(totalLosses) / 1e18).toFixed(4),
      claimable: (Number(claimable) / 1e18).toFixed(4),
      portfolioValue: (Number(portfolioValue) / 1e18).toFixed(4)
    });
  };

  const handleClaimAll = async () => {
    if (!isConnected || !marketClient) {
      alert('Please connect your wallet');
      return;
    }

    const claimablePositions = positions.filter(p => p.status === 'claimable');
    if (claimablePositions.length === 0) {
      alert('No winnings to claim');
      return;
    }

    try {
      // Claim winnings from each market
      for (const position of claimablePositions) {
        await marketClient.claimWinnings(position.marketId);
      }
      
      alert(`Successfully claimed winnings from ${claimablePositions.length} market(s)!`);
      
      // Reload positions
      await loadPositions();
    } catch (error: any) {
      console.error('Error claiming winnings:', error);
      alert(`Failed to claim winnings: ${error.message || 'Unknown error'}`);
    }
  };

  const handleClaimSingle = async (marketId: string) => {
    if (!marketClient) {
      alert('Please connect your wallet');
      return;
    }

    try {
      // Call REAL blockchain transaction
      await marketClient.claimWinnings(marketId);
      alert('Successfully claimed winnings!');
      
      // Reload positions
      await loadPositions();
    } catch (error: any) {
      console.error('Error claiming winnings:', error);
      alert(`Failed to claim: ${error.message || 'Unknown error'}`);
    }
  };

  const filteredPositions = positions.filter(pos => {
    if (activeTab === 'all') return true;
    return pos.status === activeTab;
  });

  if (!isConnected) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="connect-wallet-prompt">
            <h2>Connect Your Wallet</h2>
            <p>Please connect your wallet to view your dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>My Dashboard</h1>
            {profile && (
              <div className="user-info">
                <div className="avatar">{profile.username?.charAt(0).toUpperCase() || address?.slice(0, 2)}</div>
                <div className="user-details">
                  <div className="username">{profile.username || `${address?.slice(0, 6)}...${address?.slice(-4)}`}</div>
                  <div className="address">{address}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Bets</div>
            <div className="stat-value">{stats.totalBets}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Volume</div>
            <div className="stat-value">{stats.totalVolume} BNB</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Positions</div>
            <div className="stat-value">{stats.activePositions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Won</div>
            <div className="stat-value success">{stats.wonPositions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Lost</div>
            <div className="stat-value danger">{stats.lostPositions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Portfolio Value</div>
            <div className={`stat-value ${parseFloat(stats.portfolioValue) >= 0 ? 'success' : 'danger'}`}>
              {parseFloat(stats.portfolioValue) >= 0 ? '+' : ''}{stats.portfolioValue} BNB
            </div>
          </div>
        </div>

        {parseFloat(stats.claimable) > 0 && (
          <div className="claimable-banner">
            <div className="banner-content">
              <div className="banner-text">
                <h3>🎉 You have {stats.claimable} BNB ready to claim!</h3>
                <p>Claim your winnings from resolved markets</p>
              </div>
              <button className="btn btn-primary-orange" onClick={handleClaimAll}>
                Claim All Winnings
              </button>
            </div>
          </div>
        )}

        <div className="positions-section">
          <div className="section-header">
            <h2>My Positions</h2>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({positions.length})
              </button>
              <button 
                className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Active ({stats.activePositions})
              </button>
              <button 
                className={`tab ${activeTab === 'claimable' ? 'active' : ''}`}
                onClick={() => setActiveTab('claimable')}
              >
                Claimable ({positions.filter(p => p.status === 'claimable').length})
              </button>
              <button 
                className={`tab ${activeTab === 'won' ? 'active' : ''}`}
                onClick={() => setActiveTab('won')}
              >
                Won ({stats.wonPositions})
              </button>
              <button 
                className={`tab ${activeTab === 'lost' ? 'active' : ''}`}
                onClick={() => setActiveTab('lost')}
              >
                Lost ({stats.lostPositions})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading positions from blockchain...</p>
            </div>
          ) : filteredPositions.length === 0 ? (
            <div className="empty-state">
              <h3>No positions found</h3>
              <p>Start trading on prediction markets to build your portfolio!</p>
              <Link to="/" className="btn btn-primary-orange">Browse Markets</Link>
            </div>
          ) : (
            <div className="positions-list">
              {filteredPositions.map((position) => (
                <div key={`${position.marketId}-${position.timestamp}`} className={`position-card ${position.status}`}>
                  <div className="position-header">
                    <Link to={`/market/${position.marketId}`} className="market-link">
                      <h3>{position.marketQuestion}</h3>
                    </Link>
                    <span className={`status-badge ${position.status}`}>
                      {position.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="position-details">
                    <div className="detail">
                      <span className="label">Position:</span>
                      <span className={`value ${position.outcome ? 'yes' : 'no'}`}>
                        {position.outcome ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Amount:</span>
                      <span className="value">{(Number(position.amount) / 1e18).toFixed(4)} BNB</span>
                    </div>
                    {position.winnings > 0n && (
                      <div className="detail">
                        <span className="label">Winnings:</span>
                        <span className="value success">{(Number(position.winnings) / 1e18).toFixed(4)} BNB</span>
                      </div>
                    )}
                  </div>

                  {position.status === 'claimable' && (
                    <button 
                      className="btn btn-primary-orange claim-btn"
                      onClick={() => handleClaimSingle(position.marketId)}
                    >
                      Claim {(Number(position.winnings) / 1e18).toFixed(4)} BNB
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
