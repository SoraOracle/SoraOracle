'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  txHash: string;
  from: string;
  to: string;
  valueUSD: number;
  platformFeeUSD: number;
  blockNumber: number;
  timestamp: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch transactions:', err);
        setLoading(false);
      });
  }, []);

  const filteredTransactions = transactions.filter(
    tx =>
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVolume = filteredTransactions.reduce((sum, tx) => sum + tx.valueUSD, 0);
  const totalFees = filteredTransactions.reduce((sum, tx) => sum + tx.platformFeeUSD, 0);
  const avgPayment = filteredTransactions.length > 0 ? totalVolume / filteredTransactions.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-s402-orange mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500 font-pixel">LOADING...</p>
        </div>
      </div>
    );
  }

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
        <StatBox label="Transactions" value={filteredTransactions.length.toString()} />
        <StatBox label="Total Volume" value={`$${totalVolume.toFixed(2)}`} />
        <StatBox label="Avg Payment" value={`$${avgPayment.toFixed(3)}`} />
        <StatBox label="Total Fees" value={`$${totalFees.toFixed(4)}`} />
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length > 0 ? (
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
                    ${tx.valueUSD.toFixed(2)}
                  </td>
                  <td className="text-right tabular-nums text-gray-500 text-xs">
                    ${tx.platformFeeUSD.toFixed(4)}
                  </td>
                  <td className="text-right tabular-nums text-gray-500 text-xs">
                    {tx.blockNumber.toLocaleString()}
                  </td>
                  <td className="text-right text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 text-sm border border-gray-800 rounded">
          {searchTerm ? 'No transactions found matching your search' : 'No transactions yet. Data will appear as the indexer syncs.'}
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
