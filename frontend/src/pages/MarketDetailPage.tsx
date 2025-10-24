import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatBNB } from '@sora-oracle/sdk';
import { parseEther } from 'ethers';
import { MarketService } from '../services/marketService';
import ProbabilityChart from '../components/ProbabilityChart';
import { CommentSection } from '../components/CommentSection';
import { ClaimWinnings } from '../components/ClaimWinnings';
import './MarketDetailPage.css';

function MarketDetailPage({ marketClient, wallet }: any) {
  const { id } = useParams();
  const [amount, setAmount] = useState('');
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [betting, setBetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedOutcome, setSelectedOutcome] = useState<'yes' | 'no'>('yes');

  useEffect(() => {
    loadMarket();
  }, [id]);

  const loadMarket = () => {
    setLoading(true);
    const foundMarket = MarketService.getMarket(id || '');
    
    if (foundMarket) {
      const odds = MarketService.calculateOdds(foundMarket);
      const totalYesBig = typeof foundMarket.totalYes === 'bigint' ? foundMarket.totalYes : BigInt(Math.floor(parseFloat(foundMarket.totalYes as string || '0') * 1e18));
      const totalNoBig = typeof foundMarket.totalNo === 'bigint' ? foundMarket.totalNo : BigInt(Math.floor(parseFloat(foundMarket.totalNo as string || '0') * 1e18));
      
      setMarket({
        ...foundMarket,
        totalYes: totalYesBig,
        totalNo: totalNoBig,
        totalPool: totalYesBig + totalNoBig,
        yesOdds: odds.yes,
        noOdds: odds.no,
        yesPrice: odds.yes / 100,
        noPrice: odds.no / 100,
        traders: foundMarket.traders || 0,
        endDate: new Date(foundMarket.deadline * 1000).toLocaleDateString()
      });
    } else {
      const mockMarket = {
        id: id,
        question: 'Will BNB price exceed $1,000 by end of 2025?',
        category: 'Crypto',
        volume: BigInt('450000000000000000000'),
        endDate: 'Dec 31, 2025',
        totalYes: BigInt('325800000000000000000'),
        totalNo: BigInt('124200000000000000000'),
        totalPool: BigInt('450000000000000000000'),
        yesOdds: 72.4,
        noOdds: 27.6,
        yesPrice: 0.724,
        noPrice: 0.276,
        traders: 127,
        resolved: false
      };
      setMarket(mockMarket);
    }
    setLoading(false);
  };

  if (loading || !market) {
    return (
      <div className="market-detail-page">
        <div className="container">
          <p>Loading market...</p>
        </div>
      </div>
    );
  }

  const quickAmounts = [1, 20, 100];

  const addAmount = (value: number) => {
    const current = parseFloat(amount || '0');
    setAmount((current + value).toString());
  };

  const setMaxAmount = () => {
    setAmount('10');
  };

  const handleTrade = async () => {
    if (!wallet.address) {
      await wallet.connect();
      return;
    }

    if (!marketClient || !amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setBetting(true);
      const amountWei = parseEther(amount);
      const isYes = selectedOutcome === 'yes';
      
      await marketClient.takePosition(id!, isYes, amountWei);
      
      alert('Position taken successfully!');
      setAmount('');
      loadMarket();
    } catch (error: any) {
      console.error('Error taking position:', error);
      alert(error.message || 'Failed to take position. Please try again.');
    } finally {
      setBetting(false);
    }
  };

  return (
    <div className="market-detail-page">
      <div className="container">
        <Link to="/" className="back-link">← Back to Markets</Link>
        
        <div className="market-detail-layout">
          <div className="market-main">
            <div className="market-header-detail">
              <div className="market-title-section">
                <h1 className="market-title-detail">{market.question}</h1>
                <div className="market-meta-detail">
                  <span className="meta-volume">{formatBNB(market.volume, 1)} BNB Vol.</span>
                  <span className="meta-dot">•</span>
                  <span className="meta-date">📅 {market.endDate}</span>
                </div>
              </div>
            </div>

            <ProbabilityChart />

            <div className="outcomes-section">
              <h3 className="section-title">OUTCOME</h3>
              
              <div className="outcome-option">
                <div className="outcome-info">
                  <div className="outcome-name">
                    <span className="outcome-icon yes">◉</span>
                    Yes
                  </div>
                  <div className="outcome-chance">
                    <span className="chance-value">{market.yesOdds}%</span>
                    <span className="chance-label">CHANCE</span>
                  </div>
                </div>
                <div className="outcome-actions">
                  <button className="outcome-btn buy-yes">
                    Buy Yes {market.yesPrice.toFixed(2)}¢
                  </button>
                  <button className="outcome-btn sell-no">
                    Sell No {(1 - market.noPrice).toFixed(2)}¢
                  </button>
                </div>
              </div>

              <div className="outcome-option">
                <div className="outcome-info">
                  <div className="outcome-name">
                    <span className="outcome-icon no">◉</span>
                    No
                  </div>
                  <div className="outcome-chance">
                    <span className="chance-value">{market.noOdds}%</span>
                    <span className="chance-label">CHANCE</span>
                  </div>
                </div>
                <div className="outcome-actions">
                  <button className="outcome-btn buy-no">
                    Buy No {market.noPrice.toFixed(2)}¢
                  </button>
                  <button className="outcome-btn sell-yes">
                    Sell Yes {(1 - market.yesPrice).toFixed(2)}¢
                  </button>
                </div>
              </div>
            </div>

            <div className="market-context-section">
              <h3 className="section-title">Market Context</h3>
              <p className="context-text">
                This market will resolve to "Yes" if BNB price reaches or exceeds $1,000 USD 
                on any major exchange (Binance, Coinbase, Kraken) by 11:59 PM UTC on December 31, 2025. 
                Price will be verified using PancakeSwap TWAP oracle data.
              </p>
            </div>

            <div className="rules-section">
              <h3 className="section-title">Rules</h3>
              <p className="rules-text">
                On December 31, 2025, the oracle will verify the BNB/USD price using PancakeSwap V2 
                TWAP data. If the price equals or exceeds $1,000 at any point during 2025, this market 
                resolves to "Yes". Otherwise, it resolves to "No". Resolution is automated via Sora Oracle SDK.
              </p>
            </div>

            <div className="comments-section">
              <div className="comments-header">
                <h3 className="section-title">Comments (0)</h3>
                <div className="comments-tabs">
                  <button className="tab-btn active">Comments</button>
                  <button className="tab-btn">Top Holders</button>
                  <button className="tab-btn">Activity</button>
                </div>
              </div>
              <div className="comment-input-wrapper">
                <input 
                  type="text" 
                  className="comment-input" 
                  placeholder="Add a comment..." 
                />
                <button className="comment-post-btn">Post</button>
              </div>
            </div>
          </div>

          <div className="market-sidebar">
            <ClaimWinnings 
              marketId={id || ''}
              marketClient={marketClient}
              userAddress={wallet.address}
              marketResolved={market.resolved || false}
            />
            
            <div className="trading-panel">
              <div className="trade-tabs">
                <button 
                  className={`trade-tab ${activeTab === 'buy' ? 'active' : ''}`}
                  onClick={() => setActiveTab('buy')}
                >
                  Buy
                </button>
                <button 
                  className={`trade-tab ${activeTab === 'sell' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sell')}
                >
                  Sell
                </button>
                <select className="market-type-select">
                  <option>Market</option>
                  <option>Limit</option>
                </select>
              </div>

              <div className="outcome-selector">
                <button 
                  className={`outcome-select-btn yes ${selectedOutcome === 'yes' ? 'active' : ''}`}
                  onClick={() => setSelectedOutcome('yes')}
                >
                  Yes {market.yesPrice.toFixed(2)}¢
                </button>
                <button 
                  className={`outcome-select-btn no ${selectedOutcome === 'no' ? 'active' : ''}`}
                  onClick={() => setSelectedOutcome('no')}
                >
                  No {market.noPrice.toFixed(2)}¢
                </button>
              </div>

              <div className="amount-section">
                <label className="amount-label">Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input 
                    type="number" 
                    className="amount-input" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="quick-amounts">
                  {quickAmounts.map(val => (
                    <button 
                      key={val} 
                      className="quick-amount-btn"
                      onClick={() => addAmount(val)}
                    >
                      +${val}
                    </button>
                  ))}
                  <button className="quick-amount-btn" onClick={setMaxAmount}>
                    Max
                  </button>
                </div>
              </div>

              <button 
                className="trade-btn" 
                onClick={handleTrade}
                disabled={betting}
              >
                {!wallet.address ? 'Connect Wallet to Trade' : betting ? 'Processing...' : 'Place Bet'}
              </button>

              <div className="trade-footer">
                By trading, you agree to the Terms of Use
              </div>
            </div>

            <div className="related-markets">
              <h4 className="related-title">Related Markets</h4>
              <div className="related-market-item">
                <span className="related-question">Will ETH reach $5000 this year?</span>
                <span className="related-chance">50%</span>
              </div>
              <div className="related-market-item">
                <span className="related-question">Will BTC hit $100k in 2025?</span>
                <span className="related-chance">65%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="market-comments-section">
          <CommentSection marketAddress={id || ''} />
        </div>
      </div>
    </div>
  );
}

export default MarketDetailPage;
