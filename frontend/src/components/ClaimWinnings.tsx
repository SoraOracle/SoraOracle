import { useState, useEffect } from 'react';
import { formatBNB } from '@sora-oracle/sdk';
import './ClaimWinnings.css';

interface ClaimWinningsProps {
  marketId: string;
  marketClient: any;
  userAddress: string | null;
  marketResolved: boolean;
}

export function ClaimWinnings({ marketId, marketClient, userAddress, marketResolved }: ClaimWinningsProps) {
  const [winnings, setWinnings] = useState<bigint>(BigInt(0));
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWinnings();
  }, [marketId, userAddress, marketResolved]);

  const loadWinnings = async () => {
    if (!marketClient || !userAddress || !marketResolved) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const position = await marketClient.getPosition(marketId, userAddress);
      const winningsAmount = await marketClient.calculateWinnings(marketId, userAddress);
      
      setClaimed(position.claimed);
      setWinnings(winningsAmount);
    } catch (error) {
      console.error('Error loading winnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!marketClient || !userAddress || claiming) return;

    try {
      setClaiming(true);
      await marketClient.claimWinnings(marketId);
      setClaimed(true);
      setWinnings(BigInt(0));
    } catch (error) {
      console.error('Error claiming winnings:', error);
      alert('Failed to claim winnings. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!marketResolved || loading) {
    return null;
  }

  if (claimed) {
    return (
      <div className="claim-winnings-card claimed">
        <div className="claim-icon">✓</div>
        <div className="claim-text">
          <h4>Winnings Claimed</h4>
          <p>Your winnings have been sent to your wallet</p>
        </div>
      </div>
    );
  }

  if (winnings === BigInt(0)) {
    return null;
  }

  return (
    <div className="claim-winnings-card">
      <div className="claim-header">
        <div className="claim-icon">🎉</div>
        <div className="claim-info">
          <h4>You Won!</h4>
          <div className="claim-amount">{formatBNB(winnings, 4)} BNB</div>
        </div>
      </div>
      <button 
        className="claim-btn"
        onClick={handleClaim}
        disabled={claiming}
      >
        {claiming ? 'Claiming...' : 'Claim Winnings'}
      </button>
    </div>
  );
}
