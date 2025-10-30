'use client';

import { useState } from 'react';
import { useSession } from '../providers/SessionProvider';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionModal({ isOpen, onClose, onSuccess }: SessionModalProps) {
  const { createSession } = useSession();
  const [maxUsd1Amount, setMaxUsd1Amount] = useState('0.50');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    setError('');
    const amount = parseFloat(maxUsd1Amount);
    const minutes = parseInt(durationMinutes);

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid spending limit');
      return;
    }

    if (isNaN(minutes) || minutes <= 0) {
      setError('Please enter a valid duration');
      return;
    }

    setIsCreating(true);
    try {
      await createSession(amount, minutes * 60); // Convert to seconds
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to create session. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2">Create Session</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Configure your spending session for seamless agent interactions
        </p>

        <div className="space-y-6">
          {/* Spending Limit */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Spending Limit (USD1)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxUsd1Amount}
              onChange={(e) => setMaxUsd1Amount(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-s402-orange"
              placeholder="0.50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum amount of USD1 this session can spend
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Session Duration (minutes)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[15, 30, 60, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDurationMinutes(mins.toString())}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    durationMinutes === mins.toString()
                      ? 'bg-s402-orange text-white border-s402-orange'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-s402-orange'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-s402-orange"
              placeholder="60"
            />
            <p className="text-xs text-gray-500 mt-1">
              How long the session will remain active
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-s402-orange/10 border border-s402-orange/30 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-s402-orange text-xl">⚡</span>
              <div className="text-sm">
                <p className="font-medium text-s402-orange mb-1">Session Benefits:</p>
                <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-xs">
                  <li>• No repeated wallet signatures</li>
                  <li>• Instant agent responses</li>
                  <li>• Automatic spending tracking</li>
                  <li>• Session auto-expires for security</li>
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

          {/* Action Buttons */}
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
              {isCreating ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
