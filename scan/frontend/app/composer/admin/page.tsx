'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  endpoint_url: string;
  http_method: string;
  auth_headers: Record<string, string>;
  input_schema: any;
  cost_usd: number;
  provider_address: string;
  is_active: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [address, setAddress] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newTool, setNewTool] = useState({
    id: '',
    name: '',
    description: '',
    category: 'crypto',
    endpoint_url: '',
    http_method: 'GET',
    auth_headers: '',
    input_schema: '',
    cost_usd: 0.03,
    provider_address: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadTools();
    }
  }, [isAuthenticated]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to access the admin panel');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      const message = `Sign this message to prove you own this wallet address.\n\nAddress: ${account}\nTimestamp: ${Date.now()}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });

      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account, signature, message }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAddress(account);
      } else {
        alert('Access denied. Your wallet is not authorized.');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet');
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch('/api/admin/tools');
      if (response.ok) {
        const data = await response.json();
        setTools(data);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const handleAddTool = async () => {
    try {
      setIsLoading(true);
      
      let authHeaders = {};
      let inputSchema = {};
      
      try {
        authHeaders = newTool.auth_headers ? JSON.parse(newTool.auth_headers) : {};
      } catch (e) {
        alert('Invalid JSON in Auth Headers');
        return;
      }
      
      try {
        inputSchema = JSON.parse(newTool.input_schema);
      } catch (e) {
        alert('Invalid JSON in Input Schema');
        return;
      }

      const response = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTool,
          auth_headers: authHeaders,
          input_schema: inputSchema,
          admin_address: address,
        }),
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewTool({
          id: '',
          name: '',
          description: '',
          category: 'crypto',
          endpoint_url: '',
          http_method: 'GET',
          auth_headers: '',
          input_schema: '',
          cost_usd: 0.03,
          provider_address: '',
        });
        await loadTools();
      } else {
        const error = await response.json();
        alert(`Failed to add tool: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding tool:', error);
      alert('Failed to add tool');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToolStatus = async (toolId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/admin/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: toolId,
          is_active: !currentStatus,
          admin_address: address,
        }),
      });
      await loadTools();
    } catch (error) {
      console.error('Failed to toggle tool status:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-pixel">ADMIN PANEL</h1>
          <p className="text-sm text-gray-400">Manage s402 tool APIs and permissions</p>
        </div>

        <div className="border border-gray-800 rounded-lg p-8 space-y-4">
          <div className="w-16 h-16 mx-auto bg-s402-orange/10 rounded-full flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          
          <div>
            <h2 className="text-lg font-medium mb-2">Authentication Required</h2>
            <p className="text-sm text-gray-400">
              Connect your wallet to verify admin access
            </p>
          </div>

          <button
            onClick={connectWallet}
            className="w-full bg-s402-orange hover:bg-orange-600 text-white font-medium py-3 rounded transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-pixel">TOOL MANAGEMENT</h1>
          <p className="text-sm text-gray-400 mt-1">
            Authenticated as: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-s402-orange hover:bg-orange-600 text-white font-medium px-4 py-2 rounded transition-colors text-sm"
        >
          {showAddForm ? 'Cancel' : '+ Add New Tool'}
        </button>
      </div>

      {showAddForm && (
        <div className="border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-medium">Add New API Tool</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tool ID</label>
              <input
                type="text"
                placeholder="coingecko_btc"
                value={newTool.id}
                onChange={e => setNewTool({ ...newTool, id: e.target.value })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Name</label>
              <input
                type="text"
                placeholder="CoinGecko BTC Price"
                value={newTool.name}
                onChange={e => setNewTool({ ...newTool, name: e.target.value })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description</label>
            <textarea
              placeholder="Get Bitcoin price from CoinGecko API"
              value={newTool.description}
              onChange={e => setNewTool({ ...newTool, description: e.target.value })}
              rows={2}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={newTool.category}
                onChange={e => setNewTool({ ...newTool, category: e.target.value })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
              >
                <option value="crypto">Crypto</option>
                <option value="weather">Weather</option>
                <option value="news">News</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">HTTP Method</label>
              <select
                value={newTool.http_method}
                onChange={e => setNewTool({ ...newTool, http_method: e.target.value })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Cost (USD)</label>
              <input
                type="number"
                step="0.001"
                value={newTool.cost_usd}
                onChange={e => setNewTool({ ...newTool, cost_usd: parseFloat(e.target.value) })}
                className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Endpoint URL</label>
            <input
              type="url"
              placeholder="https://api.coingecko.com/api/v3/simple/price"
              value={newTool.endpoint_url}
              onChange={e => setNewTool({ ...newTool, endpoint_url: e.target.value })}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Provider Address (who receives payment)</label>
            <input
              type="text"
              placeholder="0x..."
              value={newTool.provider_address}
              onChange={e => setNewTool({ ...newTool, provider_address: e.target.value })}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Auth Headers (JSON)</label>
            <textarea
              placeholder='{"Authorization": "Bearer YOUR_API_KEY"}'
              value={newTool.auth_headers}
              onChange={e => setNewTool({ ...newTool, auth_headers: e.target.value })}
              rows={2}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm font-mono resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Input Schema (JSON Schema)</label>
            <textarea
              placeholder='{"type": "object", "properties": {"symbol": {"type": "string"}}, "required": ["symbol"]}'
              value={newTool.input_schema}
              onChange={e => setNewTool({ ...newTool, input_schema: e.target.value })}
              rows={3}
              className="w-full bg-transparent border border-gray-800 rounded px-3 py-2 text-sm font-mono resize-none"
            />
          </div>

          <button
            onClick={handleAddTool}
            disabled={isLoading || !newTool.id || !newTool.name || !newTool.endpoint_url}
            className="w-full bg-s402-orange hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium py-2.5 rounded transition-colors"
          >
            {isLoading ? 'Adding...' : 'Add Tool'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">{tools.length} Active Tools</h2>
        
        {tools.length === 0 ? (
          <div className="border border-gray-800 rounded-lg p-8 text-center text-gray-500">
            No tools added yet. Click &quot;Add New Tool&quot; to get started.
          </div>
        ) : (
          tools.map(tool => (
            <div
              key={tool.id}
              className="border border-gray-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{tool.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded">{tool.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${tool.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {tool.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{tool.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Endpoint:</span>
                      <span className="text-gray-300 ml-2 font-mono text-xs">{tool.endpoint_url}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cost:</span>
                      <span className="text-s402-orange ml-2 font-medium">${tool.cost_usd.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleToolStatus(tool.id, tool.is_active)}
                  className="text-sm px-3 py-1 border border-gray-800 hover:border-gray-700 rounded transition-colors"
                >
                  {tool.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
