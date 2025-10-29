'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  txHash: string;
  from: string;
  to: string;
  valueUSD: number;
  platformFeeUSD: number;
  blockNumber: number;
  timestamp: Date;
}

// Placeholder data
const PLACEHOLDER_TRANSACTIONS: Transaction[] = [
  {
    txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    valueUSD: 0.03,
    platformFeeUSD: 0.0003,
    blockNumber: 44125678,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
  },
  {
    txHash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    from: '0x9876543210fedcba9876543210fedcba98765432',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    valueUSD: 0.05,
    platformFeeUSD: 0.0005,
    blockNumber: 44125234,
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
  },
  {
    txHash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0x5555666677778888999900001111222233334444',
    valueUSD: 0.02,
    platformFeeUSD: 0.0002,
    blockNumber: 44124987,
    timestamp: new Date(Date.now() - 1000 * 60 * 32), // 32 min ago
  },
  {
    txHash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    valueUSD: 0.04,
    platformFeeUSD: 0.0004,
    blockNumber: 44124756,
    timestamp: new Date(Date.now() - 1000 * 60 * 47), // 47 min ago
  },
  {
    txHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    from: '0x7777888899990000111122223333444455556666',
    to: '0x5555666677778888999900001111222233334444',
    valueUSD: 0.025,
    platformFeeUSD: 0.00025,
    blockNumber: 44124521,
    timestamp: new Date(Date.now() - 1000 * 60 * 68), // 68 min ago
  },
];

export default function TransactionsPage() {
  const [transactions] = useState<Transaction[]>(PLACEHOLDER_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(
    tx =>
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Transactions</h1>
        <p className="text-gray-400">
          Real-time feed of s402 micropayments on BNB Chain
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
        <input
          type="text"
          placeholder="Search by tx hash, from address, or to address..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-s402-orange transition-colors"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Transactions</div>
          <div className="text-2xl font-bold">{transactions.length}</div>
        </div>
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Volume</div>
          <div className="text-2xl font-bold">
            ${transactions.reduce((sum, tx) => sum + tx.valueUSD, 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Avg Payment</div>
          <div className="text-2xl font-bold">
            ${(transactions.reduce((sum, tx) => sum + tx.valueUSD, 0) / transactions.length).toFixed(3)}
          </div>
        </div>
        <div className="bg-s402-gray border border-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Fees</div>
          <div className="text-2xl font-bold">
            ${transactions.reduce((sum, tx) => sum + tx.platformFeeUSD, 0).toFixed(4)}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-s402-gray border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                  Tx Hash
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                  From
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                  To
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                  Fee
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                  Age
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTransactions.map(tx => (
                <tr
                  key={tx.txHash}
                  className="hover:bg-gray-900 transition-colors"
                >
                  <td className="px-6 py-4">
                    <a
                      href={`https://bscscan.com/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-s402-orange hover:underline font-mono text-sm"
                    >
                      {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://bscscan.com/address/${tx.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline font-mono text-sm"
                    >
                      {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://bscscan.com/address/${tx.to}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:underline font-mono text-sm"
                    >
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </a>
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    ${tx.valueUSD.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    ${tx.platformFeeUSD.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No transactions found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}
