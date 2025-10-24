import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import './CreateMarketPage.css';

function CreateMarketPage({ wallet, _oracleClient, _marketClient }: any) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [initialLiquidity, setInitialLiquidity] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!profile) {
      alert('Please create a profile first');
      return;
    }

    setIsCreating(true);

    try {
      const deadline = Math.floor(new Date(endDate).getTime() / 1000);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (deadline <= currentTime) {
        alert('Resolution date must be in the future');
        setIsCreating(false);
        return;
      }

      console.log('Creating market:', {
        question,
        category,
        deadline,
        description,
        initialLiquidity
      });

      // For now, store market info in localStorage
      const markets = JSON.parse(localStorage.getItem('sora_markets') || '[]');
      const newMarket = {
        id: `market_${Date.now()}`,
        address: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
        question,
        category,
        deadline,
        description,
        creator: wallet.address,
        creatorName: profile.username,
        createdAt: Date.now(),
        totalYes: '0',
        totalNo: '0',
        resolved: false,
        initialLiquidity
      };
      
      markets.push(newMarket);
      localStorage.setItem('sora_markets', JSON.stringify(markets));

      alert('Market created successfully! (Using local storage for demo)');
      navigate('/');
    } catch (error: any) {
      console.error('Market creation error:', error);
      alert(`Error creating market: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-market-page">
      <div className="container">
        <div className="create-market-header">
          <h1>Create Prediction Market</h1>
          <p>Launch your own market and let the community trade on outcomes</p>
        </div>

        <form onSubmit={handleSubmit} className="create-market-form">
          <div className="form-group">
            <label htmlFor="question">Market Question</label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Will BTC reach $100,000 by end of 2025?"
              required
            />
            <span className="form-hint">Make it clear and unambiguous</span>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Crypto">Crypto</option>
              <option value="Politics">Politics</option>
              <option value="Finance">Finance</option>
              <option value="Sports">Sports</option>
              <option value="Technology">Technology</option>
              <option value="Entertainment">Entertainment</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="endDate">Resolution Date</label>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            <span className="form-hint">When should this market resolve?</span>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description & Rules</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what conditions lead to a YES or NO outcome. Be specific about how the market will be resolved."
              rows={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="liquidity">Initial Liquidity (BNB)</label>
            <input
              id="liquidity"
              type="number"
              step="0.01"
              min="0.1"
              value={initialLiquidity}
              onChange={(e) => setInitialLiquidity(e.target.value)}
              placeholder="0.5"
              required
            />
            <span className="form-hint">Minimum 0.1 BNB recommended for good liquidity</span>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate('/')} className="btn-secondary" disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isCreating}>
              {isCreating ? 'Creating Market...' : 'Create Market'}
            </button>
          </div>
          
          {!wallet.address && (
            <div className="create-market-warning">
              <p>⚠️ Connect your wallet to create a market</p>
            </div>
          )}
          
          {wallet.address && !profile && (
            <div className="create-market-warning">
              <p>⚠️ Create a profile to enable market creation</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default CreateMarketPage;
