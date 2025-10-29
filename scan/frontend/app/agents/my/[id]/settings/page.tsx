'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useWallet } from '@/app/providers/WalletProvider';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_public: boolean;
  owner_address: string;
  created_at: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  cost_usd: string;
}

interface AgentTool {
  tool_id: string;
  tool_name: string;
  tool_description: string;
  cost_usd: string;
}

export default function AgentSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params);
  const router = useRouter();
  const { walletAddress } = useWallet();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  // Tools
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [agentTools, setAgentTools] = useState<AgentTool[]>([]);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tools' | 'danger'>('general');

  useEffect(() => {
    loadAgent();
    loadTools();
  }, [agentId]);

  useEffect(() => {
    if (!walletAddress) {
      router.push('/agents/my');
    }
  }, [walletAddress]);

  const loadAgent = async () => {
    try {
      const response = await fetch(`/api/agents?owner=all`);
      const agents = await response.json();
      const foundAgent = agents.find((a: Agent) => a.id === agentId);
      
      if (!foundAgent) {
        router.push('/agents/my');
        return;
      }

      // Check if user has access
      if (walletAddress && foundAgent.owner_address.toLowerCase() !== walletAddress.toLowerCase()) {
        router.push('/agents/my');
        return;
      }

      setAgent(foundAgent);
      setName(foundAgent.name);
      setDescription(foundAgent.description);
      setIcon(foundAgent.icon);
      setIsPublic(foundAgent.is_public);

      // Load agent's tools
      const toolsResponse = await fetch(`/api/agents/${agentId}/tools`);
      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        setAgentTools(Array.isArray(toolsData) ? toolsData : []);
        setToolsError(null);
      } else {
        console.error('Failed to load tools');
        setAgentTools([]);
        setToolsError('Failed to load tools');
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools');
      const data = await response.json();
      setAvailableTools(data);
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          icon,
          is_public: isPublic,
        }),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
        loadAgent();
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTool = async (toolId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId }),
      });

      if (response.ok) {
        loadAgent();
      } else {
        alert('Failed to add tool');
      }
    } catch (error) {
      console.error('Failed to add tool:', error);
    }
  };

  const handleRemoveTool = async (toolId: string) => {
    if (!confirm('Remove this tool from your agent?')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}/tools`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId }),
      });

      if (response.ok) {
        loadAgent();
      } else {
        alert('Failed to remove tool');
      }
    } catch (error) {
      console.error('Failed to remove tool:', error);
    }
  };

  const handleDeleteAgent = async () => {
    const confirmation = prompt('Type DELETE to confirm agent deletion:');
    if (confirmation !== 'DELETE') return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Agent deleted successfully');
        router.push('/agents/my');
      } else {
        alert('Failed to delete agent');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-s402-light-bg dark:bg-s402-dark flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!agent || (walletAddress && agent.owner_address.toLowerCase() !== walletAddress.toLowerCase())) {
    return (
      <div className="min-h-screen bg-s402-light-bg dark:bg-s402-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-4">You don't own this agent</p>
          <Link href="/agents/my" className="text-s402-orange hover:underline">
            Back to My Agents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-s402-light-bg dark:bg-s402-dark">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/composer/agent/${agentId}`} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ← Back to Chat
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span>{agent.icon}</span>
                <span>{agent.name}</span>
              </h1>
              <p className="text-sm text-gray-500">Agent Settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 mt-6">
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-s402-orange text-s402-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'tools'
                ? 'border-s402-orange text-s402-orange'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Tools ({agentTools.length})
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'danger'
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Danger Zone
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6 pb-12">
          {activeTab === 'general' && (
            <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-s402-orange"
                  placeholder="My AI Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-s402-orange resize-none"
                  placeholder="Describe what your agent does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Icon (emoji)</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-32 px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-s402-orange text-center text-2xl"
                  placeholder="🤖"
                  maxLength={2}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-s402-orange"
                />
                <label htmlFor="is_public" className="text-sm font-medium cursor-pointer">
                  Make this agent publicly visible
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="px-6 py-2 bg-s402-orange text-white rounded hover:bg-s402-orange/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              {/* Current Tools */}
              <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4">Current Tools</h3>
                {toolsError ? (
                  <p className="text-red-500 text-sm">{toolsError}</p>
                ) : agentTools.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tools added yet</p>
                ) : (
                  <div className="space-y-2">
                    {agentTools.map((tool) => (
                      <div key={tool.tool_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                        <div>
                          <div className="font-medium">{tool.tool_name}</div>
                          <div className="text-xs text-gray-500">${parseFloat(tool.cost_usd).toFixed(3)} per use</div>
                        </div>
                        <button
                          onClick={() => handleRemoveTool(tool.tool_id)}
                          className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Tools */}
              <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4">Add Tools</h3>
                <div className="space-y-2">
                  {availableTools
                    .filter(tool => !agentTools.find(at => at.tool_id === tool.id))
                    .map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                        <div>
                          <div className="font-medium">{tool.name}</div>
                          <div className="text-xs text-gray-500">{tool.description}</div>
                          <div className="text-xs text-gray-500 mt-1">${parseFloat(tool.cost_usd).toFixed(3)} per use</div>
                        </div>
                        <button
                          onClick={() => handleAddTool(tool.id)}
                          className="px-3 py-1 text-sm bg-s402-orange text-white rounded hover:bg-s402-orange/90 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="bg-white dark:bg-black border border-red-500 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-500 mb-2">Delete Agent</h3>
              <p className="text-sm text-gray-500 mb-4">
                This action cannot be undone. All chat history and settings will be permanently deleted.
              </p>
              <button
                onClick={handleDeleteAgent}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete Agent Permanently
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
