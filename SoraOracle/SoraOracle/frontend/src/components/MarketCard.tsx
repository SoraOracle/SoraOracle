import { Link } from 'react-router-dom';
import { formatBNB } from '@sora-oracle/sdk';
import './MarketCard.css';

interface MarketCardProps {
  market: {
    id: string;
    question: string;
    totalYes: bigint;
    totalNo: bigint;
    totalPool: bigint;
    resolved: boolean;
    outcome?: boolean;
    deadline: number;
    yesOdds: number;
    noOdds: number;
  };
}

function MarketCard({ market }: MarketCardProps) {
  const isActive = !market.resolved && market.deadline > Date.now() / 1000;
  const timeLeft = isActive ? market.deadline - Date.now() / 1000 : 0;
  const daysLeft = Math.floor(timeLeft / 86400);
  const hoursLeft = Math.floor((timeLeft % 86400) / 3600);

  return (
    <Link to={`/market/${market.id}`} className="market-card-link">
      <div className={`market-card ${market.resolved ? 'resolved' : isActive ? 'active' : 'closed'}`}>
        <div className="market-header">
          <h3 className="market-question">{market.question}</h3>
          <div className={`market-status ${market.resolved ? 'resolved' : isActive ? 'active' : 'closed'}`}>
            {market.resolved ? '✓ Resolved' : isActive ? '⚡ Active' : '⏱ Closed'}
          </div>
        </div>

        {market.resolved && market.outcome !== undefined && (
          <div className={`outcome ${market.outcome ? 'yes' : 'no'}`}>
            Outcome: {market.outcome ? 'YES' : 'NO'}
          </div>
        )}

        <div className="odds-section">
          <div className="odd-box yes">
            <div className="odd-label">YES</div>
            <div className="odd-value">{market.yesOdds.toFixed(1)}%</div>
            <div className="odd-amount">{formatBNB(market.totalYes, 3)} BNB</div>
          </div>
          <div className="odd-box no">
            <div className="odd-label">NO</div>
            <div className="odd-value">{market.noOdds.toFixed(1)}%</div>
            <div className="odd-amount">{formatBNB(market.totalNo, 3)} BNB</div>
          </div>
        </div>

        <div className="market-footer">
          <div className="total-pool">
            <span className="label">Total Pool:</span>
            <span className="value">{formatBNB(market.totalPool, 4)} BNB</span>
          </div>
          {isActive && (
            <div className="time-left">
              {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default MarketCard;
