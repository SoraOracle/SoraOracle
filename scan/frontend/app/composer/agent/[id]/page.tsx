'use client';

import { useState, useEffect, useRef } from 'react';
import { use } from 'react';

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

export default function AgentDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [agent, setAgent] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgent();
    loadChatHistory();
  }, [agentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgent = async () => {
    try {
      const response = await fetch(`/api/agents?owner=all`);
      const agents = await response.json();
      const currentAgent = agents.find((a: any) => a.id === agentId);
      setAgent(currentAgent);
    } catch (error) {
      console.error('Failed to load agent:', error);
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
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
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
        content: `⏳ Payment processing... Transaction: ${txHash.slice(0, 10)}...`,
      }]);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await fetch(`/api/agents/${agentId}/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_call_id: paymentRequest.tool_call_id,
          tool_id: paymentRequest.tool.id,
          tx_hash: txHash,
          input: paymentRequest.tool.input,
        }),
      });

      const data = await response.json();

      if (data.type === 'message') {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.content }
        ]);
      }

      setPaymentRequest(null);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPayment = () => {
    setPaymentRequest(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Payment cancelled. Let me know if you\'d like to try something else.',
    }]);
  };

  if (!agent) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center">
        <div className="animate-pulse text-gray-500">Loading agent...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-pixel">{agent.name}</h1>
          <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-500">Total Queries</div>
          <div className="text-lg font-medium">{agent.query_count || 0}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <div className="text-4xl mb-3">🤖</div>
            <p>Start a conversation with your agent</p>
            <p className="text-sm mt-2">Ask questions that require oracle data</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-s402-orange text-white'
                    : 'border border-gray-800 bg-gray-900/50'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="border border-gray-800 bg-gray-900/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-pulse">Thinking...</div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {paymentRequest && (
        <div className="border border-s402-orange rounded-lg p-4 mb-4 bg-s402-orange/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💳</span>
                <h3 className="font-medium">Payment Required</h3>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                To use <span className="text-white font-medium">{paymentRequest.tool.name}</span>, 
                please make a 402 micropayment of <span className="text-s402-orange font-medium">${paymentRequest.tool.cost_usd.toFixed(3)}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="bg-s402-orange hover:bg-orange-600 disabled:bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Pay & Continue'}
                </button>
                <button
                  onClick={cancelPayment}
                  disabled={isLoading}
                  className="border border-gray-800 hover:border-gray-700 px-4 py-2 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-800">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask your agent anything..."
          disabled={isLoading || paymentRequest !== null}
          className="flex-1 bg-transparent border border-gray-800 rounded px-4 py-3 text-sm focus:outline-none focus:border-gray-700 disabled:opacity-50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading || paymentRequest !== null}
          className="bg-s402-orange hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 text-white px-6 py-3 rounded font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
