'use client';

import { useState, useEffect, useRef } from 'react';
import { use } from 'react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any;
}

interface PaymentRequest {
  tool: {
    id: string;
    name: string;
    cost_usd: number;
    provider_address: string;
    input: any;
  };
  tool_call_id: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  cost_usd: number;
}

export default function AgentDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [agent, setAgent] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [agentNotFound, setAgentNotFound] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MODEL_NAME = "Claude Sonnet 4";

  useEffect(() => {
    loadAgent();
    loadChatHistory();
    loadTools();
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const tools = await response.json();
        setAvailableTools(tools);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const loadAgent = async () => {
    try {
      setLoadingAgent(true);
      const response = await fetch(`/api/agents?owner=all`);
      const agents = await response.json();
      const currentAgent = agents.find((a: any) => a.id === agentId);
      
      if (currentAgent) {
        setAgent(currentAgent);
        setAgentNotFound(false);
      } else {
        setAgentNotFound(true);
      }
    } catch (error) {
      console.error('Failed to load agent:', error);
      setAgentNotFound(true);
    } finally {
      setLoadingAgent(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/chat`);
      const history = await response.json();
      setMessages(history.filter((msg: any) => msg.content).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })));
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (data.type === 'payment_required') {
        setPaymentRequest(data);
        setIsLoading(false);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentRequest) return;

    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to make payments');
      return;
    }

    try {
      setIsLoading(true);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];

      const amountWei = Math.floor(paymentRequest.tool.cost_usd * 1e18);

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: paymentRequest.tool.provider_address,
          value: `0x${amountWei.toString(16)}`,
        }],
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⏳ Payment confirmed! Executing tool...\nTransaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
      }]);

      setPaymentRequest(null);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch(`/api/agents/${agentId}/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_call_id: paymentRequest.tool_call_id,
          tool_id: paymentRequest.tool.id,
          tx_hash: txHash,
          input: paymentRequest.tool.input,
          payer_address: from,
        }),
      });

      const data = await response.json();

      if (data.type === 'message') {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.content }
        ]);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      if (error.code === 4001) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Payment cancelled. Let me know if you\'d like to try again.',
        }]);
      } else {
        alert('Payment failed. Please try again.');
      }
      setPaymentRequest(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPayment = () => {
    setPaymentRequest(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '❌ Payment cancelled. How else can I help you?',
    }]);
  };

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-s402-orange mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500 font-pixel">LOADING AGENT...</p>
        </div>
      </div>
    );
  }

  if (agentNotFound || !agent) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-8 space-y-4 shadow-soft-lg dark:shadow-none">
          <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">❌</span>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">Agent Not Found</h2>
            <p className="text-sm text-gray-400">
              This agent doesn't exist or is set to private.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <a
              href="/agents"
              className="px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white font-medium rounded transition-colors"
            >
              Browse Agents
            </a>
            <a
              href="/composer"
              className="px-4 py-2 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-800 hover:border-s402-orange text-gray-900 dark:text-white font-medium rounded transition-colors"
            >
              Create Agent
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agents/my" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ← Back
            </Link>
            <div className="w-10 h-10 bg-s402-orange/10 rounded-full flex items-center justify-center text-2xl">
              {agent.icon || '🤖'}
            </div>
            <div>
              <h1 className="text-lg font-medium">{agent.name}</h1>
              <p className="text-xs text-gray-500">{agent.query_count || 0} queries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs text-gray-500">
              <div>Model: {MODEL_NAME}</div>
              <div>{availableTools.length} tools enabled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">{agent.icon || '🤖'}</div>
              <h2 className="text-xl font-medium mb-2">Start a conversation</h2>
              <p className="text-sm">Ask questions that require data from oracle APIs</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-s402-orange text-white'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && !paymentRequest && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-pulse">●</div>
                  <div>Thinking...</div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Payment Request Banner */}
      {paymentRequest && (
        <div className="border-t border-s402-orange bg-s402-orange/5 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-s402-orange/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">💳</span>
                </div>
                <div>
                  <div className="font-medium text-sm">Payment Required</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">{paymentRequest.tool.name}</span> - ${paymentRequest.tool.cost_usd.toFixed(3)} USD
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={cancelPayment}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Pay & Execute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model & Tools Info Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 px-6 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <span className="font-medium">Model:</span>
              <span>{MODEL_NAME}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <span className="font-medium">Tools:</span>
              <button
                onClick={() => setShowToolsPanel(!showToolsPanel)}
                className="text-s402-orange hover:underline"
              >
                {availableTools.length} enabled
              </button>
            </div>
          </div>
          {agent.description && (
            <div className="text-gray-500 truncate max-w-md">{agent.description}</div>
          )}
        </div>
      </div>

      {/* Tools Panel */}
      {showToolsPanel && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Available Tools</h3>
              <button
                onClick={() => setShowToolsPanel(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {availableTools.map(tool => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="text-xs text-gray-500">{tool.description}</div>
                  </div>
                  <div className="text-xs font-medium text-s402-orange">
                    ${Number(tool.cost_usd).toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask your agent anything..."
              disabled={isLoading || !!paymentRequest}
              className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-s402-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || !!paymentRequest}
              className="px-6 py-3 bg-s402-orange hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
