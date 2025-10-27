import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <div className="container">
        <section className="hero">
          <h1 className="hero-title">
            Decentralized Prediction Markets<br />
            <span className="gradient-text">Powered by Oracles</span>
          </h1>
          <p className="hero-subtitle">
            Trade on real-world events with transparent odds, oracle-verified outcomes,
            and 85% lower fees than traditional betting platforms.
          </p>
          <div className="cta-buttons">
            <Link to="/markets" className="btn btn-primary btn-large">
              Browse Markets
            </Link>
            <Link to="/create" className="btn btn-outline btn-large">
              Create Market
            </Link>
          </div>
        </section>

        <section className="features">
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Instant position taking with automated market resolution through Sora Oracle v3.0</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Trustless & Secure</h3>
              <p>Oracle-verified outcomes with on-chain transparency and non-custodial design</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Lowest Fees</h3>
              <p>Only 2% platform fee vs 10-20% on traditional betting platforms</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-Time Odds</h3>
              <p>Live odds updates based on market positions with instant payout calculations</p>
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">84.9%</div>
              <div className="stat-label">Gas Savings</div>
            </div>
            <div className="stat">
              <div className="stat-value">100%</div>
              <div className="stat-label">Oracle Accuracy</div>
            </div>
            <div className="stat">
              <div className="stat-value">2%</div>
              <div className="stat-label">Platform Fee</div>
            </div>
            <div className="stat">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Market Availability</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;
