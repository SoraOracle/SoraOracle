'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { useSession } from '../providers/SessionProvider';
import SessionModal from './SessionModal';

export default function Header() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { hasActiveSession, session } = useSession();
  
  let theme = 'dark';
  let toggleTheme = () => {};
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
  } catch (e) {
    // ThemeProvider not available yet (SSR)
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSessionDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  useEffect(() => {
    if (address) {
      checkAdminStatus(address);
    } else {
      setIsAdmin(false);
    }
  }, [address]);

  const checkIfWalletIsConnected = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const checkAdminStatus = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/admin/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to connect your wallet');
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const bscMainnet = '0x38';
      
      if (chainId !== bscMainnet) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: bscMainnet }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: bscMainnet,
                chainName: 'BNB Smart Chain',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/']
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
      
      setAddress(accounts[0]);
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-300 dark:border-gray-800/50 bg-s402-light-card/95 dark:bg-black/80 backdrop-blur-xl shadow-soft dark:shadow-none">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-pixel">
              <span className="text-s402-orange drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">S402</span>SCAN
            </h1>
            <div className="hidden md:flex space-x-6 text-sm">
              <a href="/" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Dashboard</a>
              <a href="/transactions" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Transactions</a>
              <a href="/marketplace" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Marketplace</a>
              <a href="/agents/my" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Agents</a>
              <a href="/ecosystem" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Ecosystem</a>
              <a href="/composer" className="relative hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                Composer
                <span className="absolute top-0 -right-10 bg-s402-orange text-white text-[9px] px-1.5 py-0.5 leading-none rounded font-bold">NEW</span>
              </a>
              {isAdmin && (
                <a href="/composer/admin" className="text-s402-orange font-bold border border-s402-orange px-3 py-1 rounded hover:bg-s402-orange hover:text-white transition-all duration-300 hover:shadow-[0_0_12px_rgba(249,115,22,0.6)]">
                  ⚙️ Admin Panel
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="text-xl px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 hover:border-s402-orange transition-colors shadow-soft dark:shadow-none"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 shadow-soft dark:shadow-none">BNB Chain</span>
            {address ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 hover:border-s402-orange shadow-soft dark:shadow-none transition-colors"
                >
                  <span>{formatAddress(address)}</span>
                  <span className={`transform transition-transform ${showSessionDropdown ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {showSessionDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl z-50">
                    {/* Session Status Section */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="text-xs text-gray-500 mb-2">Session Status</div>
                      {hasActiveSession && session ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Active Session</span>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Balance: ${session.remainingAmount?.toFixed(3)} / ${session.maxUsd1Amount?.toFixed(3)}
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${((session.remainingAmount || 0) / (session.maxUsd1Amount || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">No Active Session</span>
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        </div>
                      )}
                    </div>

                    {/* Menu Options */}
                    <div className="p-2">
                      {!hasActiveSession && (
                        <button
                          onClick={() => {
                            setShowSessionModal(true);
                            setShowSessionDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                        >
                          <span>➕</span>
                          <span>Create Session</span>
                        </button>
                      )}
                      <a
                        href="/sessions/history"
                        className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                        onClick={() => setShowSessionDropdown(false)}
                      >
                        <span>📋</span>
                        <span>Session History</span>
                      </a>
                    </div>

                    {/* Wallet Section */}
                    <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setShowSessionDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors flex items-center gap-2"
                      >
                        <span>🚪</span>
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Session Modal */}
                <SessionModal
                  isOpen={showSessionModal}
                  onClose={() => setShowSessionModal(false)}
                  onSuccess={() => setShowSessionModal(false)}
                />
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-s402-orange px-4 py-2 rounded-lg hover:bg-orange-600 transition-all duration-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
