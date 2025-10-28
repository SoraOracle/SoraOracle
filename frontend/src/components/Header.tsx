import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { ProfileModal } from './ProfileModal';
import { HamburgerMenu } from './HamburgerMenu';
import { IconButton } from './IconButton';
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
        <div className="header-left">
          <HamburgerMenu />
          
          <div className="logo">
            <Link to="/">
              <img src="/sora-logo.png" alt="Sora" className="logo-image" />
            </Link>
          </div>
        </div>
        
        <div className="search-wrapper">
          <SearchBar disabled={true} />
        </div>

        <div className="wallet-section">
          {!isCorrectChain && address && (
            <IconButton
              onClick={() => wallet.switchChain(56)}
              tooltip="Switch to BNB Chain"
              variant="warning"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </IconButton>
          )}
          
          {address ? (
            <>
              {isNewUser && (
                <IconButton
                  onClick={() => setShowProfileModal(true)}
                  tooltip="Create Profile"
                  variant="primary"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <line x1="12" y1="11" x2="12" y2="15" />
                    <line x1="10" y1="13" x2="14" y2="13" />
                  </svg>
                </IconButton>
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
