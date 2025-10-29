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

const PLACEHOLDER_TRANSACTIONS: Transaction[] = [
  {
    txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    valueUSD: 0.03,
    platformFeeUSD: 0.0003,
    blockNumber: 44125678,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    txHash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    from: '0x9876543210fedcba9876543210fedcba98765432',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    valueUSD: 0.05,
    platformFeeUSD: 0.0005,
    blockNumber: 44125234,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    txHash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0x5555666677778888999900001111222233334444',
    valueUSD: 0.02,
    platformFeeUSD: 0.0002,
    blockNumber: 44124987,
    timestamp: new Date(Date.now() - 1000 * 60 * 32),
  },
  {
    txHash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    valueUSD: 0.04,
    platformFeeUSD: 0.0004,
    blockNumber: 44124756,
    timestamp: new Date(Date.now() - 1000 * 60 * 47),
  },
  {
    txHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    from: '0x7777888899990000111122223333444455556666',
    to: '0x5555666677778888999900001111222233334444',
    valueUSD: 0.025,
    platformFeeUSD: 0.00025,
    blockNumber: 44124521,
    timestamp: new Date(Date.now() - 1000 * 60 * 68),
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

  const totalVolume = transactions.reduce((sum, tx) => sum + tx.valueUSD, 0);
  const totalFees = transactions.reduce((sum, tx) => sum + tx.platformFeeUSD, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by hash, from, or to address..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-700 transition-colors"
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <StatBox label="Transactions" value={transactions.length.toString()} />
        <StatBox label="Total Volume" value={`$${totalVolume.toFixed(2)}`} />
        <StatBox label="Avg Payment" value={`$${(totalVolume / transactions.length).toFixed(3)}`} />
        <StatBox label="Total Fees" value={`$${totalFees.toFixed(4)}`} />
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="text-left py-3 font-medium">Tx Hash</th>
              <th className="text-left py-3 font-medium">From</th>
              <th className="text-left py-3 font-medium">To</th>
              <th className="text-right py-3 font-medium">Value</th>
              <th className="text-right py-3 font-medium">Fee</th>
              <th className="text-right py-3 font-medium">Block</th>
              <th className="text-right py-3 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(tx => (
              <tr
                key={tx.txHash}
                className="border-b border-gray-900 hover:bg-gray-950 transition-colors"
              >
                <td className="py-3">
                  <a
                    href={`https://bscscan.com/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-s402-orange hover:underline font-mono text-xs"
                  >
                    {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                  </a>
                </td>
                <td className="font-mono text-xs text-gray-400">
                  <a
                    href={`https://bscscan.com/address/${tx.from}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                  </a>
                </td>
                <td className="font-mono text-xs text-gray-400">
                  <a
                    href={`https://bscscan.com/address/${tx.to}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                  </a>
                </td>
                <td className="text-right tabular-nums font-medium">
                  ${tx.valueUSD.toFixed(3)}
                </td>
                <td className="text-right tabular-nums text-gray-500 text-xs">
                  ${tx.platformFeeUSD.toFixed(4)}
                </td>
                <td className="text-right tabular-nums text-gray-500 text-xs">
                  {tx.blockNumber.toLocaleString()}
                </td>
                <td className="text-right text-gray-500 text-xs">
                  {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          No transactions found
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-800 rounded p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
