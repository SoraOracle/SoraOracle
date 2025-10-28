import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import './HamburgerMenu.css';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="hamburger-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div className="hamburger-overlay" onClick={() => setIsOpen(false)} />
          <nav className="hamburger-nav">
            <div className="hamburger-header">
              <h3>Menu</h3>
              <button className="close-button" onClick={() => setIsOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="hamburger-links">
              <Link to="/" className="hamburger-link" onClick={() => setIsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Markets</span>
              </Link>

              <Link to="/create" className="hamburger-link" onClick={() => setIsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span>Create Market</span>
              </Link>

              <Link to="/analytics" className="hamburger-link" onClick={() => setIsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <span>Analytics</span>
              </Link>

              <Link to="/oracle" className="hamburger-link" onClick={() => setIsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m5.2-17.2l-4.2 4.2m0 6l-4.2 4.2m11.4-4.2l-4.2-4.2m0-6l-4.2-4.2" />
                </svg>
                <span>Oracle Provider</span>
              </Link>

              <Link to="/s402" className="hamburger-link" onClick={() => setIsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>S402 Demo</span>
              </Link>
            </div>
          </nav>
        </>,
        document.body
      )}
    </>
  );
}
