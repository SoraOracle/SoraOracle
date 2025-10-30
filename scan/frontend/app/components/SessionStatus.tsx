'use client';

import { useState, useEffect } from 'react';
import { useSession } from '../providers/SessionProvider';

export default function SessionStatus() {
  const { session, hasActiveSession, deactivateSession } = useSession();
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!session) {
      setTimeRemaining('');
      return;
    }

    const updateTime = () => {
      const now = new Date().getTime();
      const expires = new Date(session.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (!hasActiveSession || !session) {
    return null;
  }

  const percentUsed = (session.spentAmount / session.maxUsd1Amount) * 100;
  const isLowBalance = percentUsed > 80;

  return (
    <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg p-4 shadow-soft dark:shadow-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-medium">Active Session</span>
        </div>
        <button
          onClick={deactivateSession}
          className="text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          End Session
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

      {/* Time Remaining */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">Time remaining</span>
        <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
          {timeRemaining}
        </span>
      </div>

      {/* Warning for low balance */}
      {isLowBalance && (
        <div className="mt-3 text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1">
          ⚠️ Session balance running low
        </div>
      )}
    </div>
  );
}
