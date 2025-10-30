'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../providers/SessionProvider';
import { useWallet } from '../providers/WalletProvider';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FundingStep = 'configure' | 'approving' | 'funding' | 'activating' | 'complete';

export default function SessionModal({ isOpen, onClose, onSuccess }: SessionModalProps) {
  const { createSession, refreshSession } = useSession();
  const { walletAddress, token } = useWallet();
  const [maxUsd1Amount, setMaxUsd1Amount] = useState('0.50');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [fundingStep, setFundingStep] = useState<FundingStep>('configure');
  const [sessionAddress, setSessionAddress] = useState('');
  const [mounted, setMounted] = useState(false);
  
  // Dynamic BNB calculation based on real BSC gas costs
  // S402 payment contract call: ~100k gas at 0.05 Gwei = 0.000005 BNB per transaction
  // Add 25% buffer for gas price fluctuations
  const calculateGas = (usd1Amount: number) => {
    const transactions = usd1Amount / 0.02; // Number of potential 0.02 USD1 payments
    const bnbPerTx = 0.000005; // Real cost: 100k gas * 0.05 Gwei
    const bnbNeeded = transactions * bnbPerTx * 1.25; // 25% buffer
    return bnbNeeded.toFixed(6); // Round to 6 decimals
  };
  
  const estimatedGas = calculateGas(parseFloat(maxUsd1Amount) || 0.5);

  // Only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleCreate = async () => {
    setError('');
    const amount = parseFloat(maxUsd1Amount);

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid spending limit');
      return;
    }
    
    if (amount > 10) {
      setError('Maximum session limit is 10 USD1');
      return;
    }

    if (!walletAddress || !token) {
      setError('Wallet not connected');
      return;
    }

    setIsCreating(true);
    setFundingStep('approving');
    
    try {
      // Step 1: Create session and get wallet address
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userAddress: walletAddress,
          maxUsd1Amount: amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      const data = await response.json();
      setSessionAddress(data.session.sessionAddress);

      // Step 2: Transfer USD1 to session wallet (it will own the tokens)
      const { BrowserProvider, Contract, parseUnits } = await import('ethers');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
      const USD1_ABI = ['function transfer(address to, uint256 amount) external returns (bool)'];
      
      const usd1Contract = new Contract(USD1_ADDRESS, USD1_ABI, signer);
      const transferAmount = parseUnits(amount.toString(), 18);
      
      const transferTx = await usd1Contract.transfer(data.session.sessionAddress, transferAmount);
      const usd1Receipt = await transferTx.wait();

      // Step 3: Send BNB for gas
      setFundingStep('funding');
      const gasTx = await signer.sendTransaction({
        to: data.session.sessionAddress,
        value: parseUnits(estimatedGas, 18),
      });
      const bnbReceipt = await gasTx.wait();

      // Record funding transaction hashes
      await fetch('/api/sessions/fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: data.session.id,
          userAddress: walletAddress,
          usd1TxHash: usd1Receipt?.hash || '',
          bnbTxHash: bnbReceipt?.hash || '',
        }),
      });

      // Step 4: Activate session (pre-approve USD1 to S402Facilitator)
      setFundingStep('activating');
      const activateResponse = await fetch('/api/sessions/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userAddress: walletAddress,
          sessionId: data.session.id,
        }),
      });

      if (!activateResponse.ok) {
        const activateError = await activateResponse.json();
        throw new Error(activateError.error || 'Failed to activate session');
      }

      setFundingStep('complete');
      
      // Refresh session data (fetch latest, don't create new one)
      await refreshSession();
      
      setTimeout(() => {
        onSuccess();
        onClose();
        setFundingStep('configure');
        setSessionAddress('');
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      if (err.code === 4001) {
        setError('Transaction cancelled. Please try again.');
      } else {
        setError(err.message || 'Failed to create and fund session.');
      }
      setFundingStep('configure');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepIndicator = () => {
    if (fundingStep === 'configure') return null;
    
    return (
      <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          {fundingStep === 'approving' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="text-sm">
                <p className="font-medium text-blue-600 dark:text-blue-400">Step 1/3: Transferring USD1</p>
                <p className="text-gray-600 dark:text-gray-400">Sending ${maxUsd1Amount} USD1 to session wallet</p>
              </div>
            </>
          )}
          {fundingStep === 'funding' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="text-sm">
                <p className="font-medium text-blue-600 dark:text-blue-400">Step 2/3: Sending Gas BNB</p>
                <p className="text-gray-600 dark:text-gray-400">Funding session wallet with {estimatedGas} BNB for gas</p>
              </div>
            </>
          )}
          {fundingStep === 'activating' && (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div className="text-sm">
                <p className="font-medium text-blue-600 dark:text-blue-400">Step 3/3: Activating Session</p>
                <p className="text-gray-600 dark:text-gray-400">Pre-approving USD1 for zero-signature payments</p>
              </div>
            </>
          )}
          {fundingStep === 'complete' && (
            <>
              <span className="text-2xl">✅</span>
              <div className="text-sm">
                <p className="font-medium text-green-600 dark:text-green-400">Session Created!</p>
                <p className="text-gray-600 dark:text-gray-400">You can now use tools without signing</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold mb-2">Create Session</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            One-time setup: transfer USD1 + BNB to session wallet
          </p>
        </div>

        <div className="px-8 overflow-y-auto flex-1">
          {renderStepIndicator()}

          <div className="space-y-6 pb-6">
          {/* Spending Limit */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Spending Limit (USD1)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={maxUsd1Amount}
              onChange={(e) => setMaxUsd1Amount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-s402-orange"
              placeholder="0.50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum amount of USD1 this session can spend (max 10 USD1)
            </p>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">USD1 Spending Limit:</span>
              <span className="font-medium">${maxUsd1Amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Gas Funding (BNB):</span>
              <span className="font-medium">{estimatedGas} BNB</span>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-700 pt-2 flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Setup Cost:</span>
              <span className="font-bold">${maxUsd1Amount} + {estimatedGas} BNB</span>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              💡 Unused USD1 and BNB refunded when you close session
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-s402-orange/10 border border-s402-orange/30 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-s402-orange text-xl">⚡</span>
              <div className="text-sm">
                <p className="font-medium text-s402-orange mb-1">After Setup:</p>
                <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-xs">
                  <li>• Zero signatures for every tool call</li>
                  <li>• Instant payments from session wallet</li>
                  <li>• Auto spending tracking & limits</li>
                  <li>• Close session anytime to get refunds</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-8 pt-4 border-t border-gray-300 dark:border-gray-800">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 px-6 py-3 bg-s402-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                fundingStep === 'approving' ? 'Approving...' :
                fundingStep === 'funding' ? 'Funding...' :
                fundingStep === 'complete' ? 'Complete!' : 'Creating...'
              ) : 'Create & Fund Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level (fixes positioning issues)
  return createPortal(modalContent, document.body);
}
