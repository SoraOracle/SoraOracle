import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { ProfileModal } from './ProfileModal';
import SearchBar from './SearchBar';
import './Header.css';

interface HeaderProps {
  wallet: {
    address: string | null;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    chainId: number | null;
    switchChain: (chainId: number) => Promise<void>;
  };
}

function Header({ wallet }: HeaderProps) {
  const { address, isConnecting, connect, chainId } = wallet;
  const { profile, isNewUser } = useProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const isCorrectChain = chainId === 56;

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo">
          <Link to="/">
            <img src="/sora-logo.png" alt="Sora" className="logo-image" />
          </Link>
        </div>
        
        <nav className="nav">
          <Link to="/" className="nav-link">Markets</Link>
          <Link to="/create" className="nav-link">Create Market</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/analytics" className="nav-link">Analytics</Link>
          <Link to="/oracle" className="nav-link">Oracle Provider</Link>
        </nav>

        <SearchBar />

        <div className="wallet-section">
          {!isCorrectChain && address && (
            <div className="chain-warning">Wrong Network</div>
          )}
          
          {address ? (
            <>
              {isNewUser && (
                <button 
                  className="btn btn-secondary create-profile-btn"
                  onClick={() => setShowProfileModal(true)}
                >
                  Create Profile
                </button>
              )}
              <div className="wallet-info" onClick={() => setShowProfileModal(true)}>
                {profile ? (
                  <div className="profile-display">
                    <span className="profile-username">{profile.username}</span>
                    <span className="profile-address">{formatAddress(address)}</span>
                  </div>
                ) : (
                  <div className="address">{formatAddress(address)}</div>
                )}
              </div>
            </>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </header>
  );
}

export default Header;
