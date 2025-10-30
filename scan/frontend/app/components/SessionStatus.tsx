'use client';

import { useState } from 'react';
import { useSession } from '../providers/SessionProvider';

export default function SessionStatus() {
  const { session, hasActiveSession, isClosing, closeSession } = useSession();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  if (!hasActiveSession || !session) {
    return null;
  }

  const handleClose = async () => {
    setError('');
    try {
      await closeSession();
      setShowConfirm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to close session');
    }
  };

  const remaining = session.maxUsd1Amount - session.spentAmount;
  const percentUsed = (session.spentAmount / session.maxUsd1Amount) * 100;
  const isLowBalance = percentUsed > 80;

  return (
    <>
      <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium">Active Session</span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isClosing}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {isClosing ? 'Closing...' : 'Close Session'}
          </button>
        </div>

        {/* Balance */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-gray-500">Balance</span>
            <span className={`text-sm font-bold ${isLowBalance ? 'text-orange-500' : 'text-gray-800 dark:text-gray-200'}`}>
              ${session.remainingAmount.toFixed(3)} / ${session.maxUsd1Amount.toFixed(3)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isLowBalance ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${100 - percentUsed}%` }}
            ></div>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500">
          💡 Close session anytime to withdraw unused USD1 and BNB
        </p>

        {/* Warning for low balance */}
        {isLowBalance && (
          <div className="mt-3 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1">
            ⚠️ Session balance running low
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Close Session?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will refund all unused USD1 and BNB to your wallet, then delete the session's private key from our database.
            </p>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">USD1 to Refund:</span>
                <span className="font-medium">${remaining.toFixed(3)}</span>
              </div>
              <p className="text-xs text-gray-500">
                ⚠️ This cannot be undone. You'll need to create a new session to use agents again.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isClosing}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={isClosing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClosing ? 'Closing...' : 'Close & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
