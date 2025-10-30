'use client';

import { useState, useEffect, useRef } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useWallet } from '../../../providers/WalletProvider';
import { useSession } from '../../../providers/SessionProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  cost_usd: number;
}

export default function AgentDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params);
  const { walletAddress, token } = useWallet();
  const { hasActiveSession } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'complete'>('idle');
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [autoApprovePayments, setAutoApprovePayments] = useState(false);
  const [agent, setAgent] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [agentNotFound, setAgentNotFound] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MODEL_NAME = "Claude Sonnet 4";

  // Load auto-approve preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('autoApprovePayments');
    if (saved) setAutoApprovePayments(JSON.parse(saved));
  }, []);

  useEffect(() => {
    loadAgent();
    loadTools();
  }, [agentId]);

  useEffect(() => {
    if (walletAddress) {
      loadSessions();
    }
  }, [walletAddress, agentId]);

  useEffect(() => {
    if (currentSessionId) {
      loadChatHistory(currentSessionId);
    }
  }, [currentSessionId]);

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

  const loadSessions = async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch(`/api/agents/${agentId}/sessions?user=${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        
        // Auto-select first session if exists (don't auto-create)
        if (data.length > 0) {
          setCurrentSessionId(data[0].id);
        }
        // User must manually click "New Chat" to create sessions
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(`/api/agents/${agentId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_address: walletAddress }),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this chat? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/agents/${agentId}/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // Switch to another session or create new one
        if (currentSessionId === sessionId) {
          const remaining = sessions.filter(s => s.id !== sessionId);
          if (remaining.length > 0) {
            setCurrentSessionId(remaining[0].id);
          } else {
            createNewSession();
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const loadChatHistory = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/sessions/${sessionId}/messages`);
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
    if (!input.trim() || isLoading || !currentSessionId) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          session_id: currentSessionId,
        }),
      });

      const data = await response.json();

      if (data.type === 'payment_required') {
        // Show any assistant text that came before the tool request
        if (data.assistant_message) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.assistant_message }]);
        }
        setPaymentRequest(data);
        setIsLoading(false);
        
        // Auto-execute if user has enabled auto-approve
        if (autoApprovePayments) {
          setShowPaymentConfirm(false);
          await executePayment();
        } else {
          setShowPaymentConfirm(true);
        }
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        setIsLoading(false);
        
        // Update session title if it's the first message
        const session = sessions.find(s => s.id === currentSessionId);
        if (session && session.title === 'New Chat') {
          updateSessionTitle(currentSessionId, userMessage.slice(0, 50));
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
      setIsLoading(false);
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      await fetch(`/api/agents/${agentId}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title } : s
      ));
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  };

  const executePayment = async () => {
    if (!paymentRequest || !currentSessionId) return;

    try {
      setIsLoading(true);
      setShowPaymentConfirm(false);
      setPaymentStatus('processing');

      let txHash: string;
      let payer: string;

      // Use session-based payment if active session exists
      if (hasActiveSession && walletAddress && token) {

        const paymentResponse = await fetch('/api/sessions/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userAddress: walletAddress,
            costUSD: paymentRequest.tool.cost_usd,
            recipientAddress: paymentRequest.tool.provider_address,
          }),
        });

        if (!paymentResponse.ok) {
          const error = await paymentResponse.json();
          throw new Error(error.error || 'Session payment failed');
        }

        const paymentData = await paymentResponse.json();
        txHash = paymentData.txHash;
        payer = paymentData.sessionAddress;

        setPaymentStatus('complete');
        // Brief delay to show complete status
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        // Fallback to manual wallet payment if no session
        if (typeof window.ethereum === 'undefined') {
          alert('Please install MetaMask or create a session to make payments');
          return;
        }


        // Import ethers dynamically
        const { BrowserProvider, Contract, parseUnits, Signature } = await import('ethers');

        const S402_FACILITATOR_ADDRESS = '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3';
        const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';

        const S402_ABI = [
          'function settlePayment((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)',
        ];

        const USD1_ABI = [
          'function allowance(address owner, address spender) external view returns (uint256)',
          'function approve(address spender, uint256 amount) external returns (bool)',
        ];

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const from = await signer.getAddress();
        payer = from;

        // Check and approve USD1 if needed
        const usd1Contract = new Contract(USD1_ADDRESS, USD1_ABI, signer);
        const amountInUnits = parseUnits(paymentRequest.tool.cost_usd.toString(), 18);
        const allowance = await usd1Contract.allowance(from, S402_FACILITATOR_ADDRESS);

        if (allowance < amountInUnits) {
          const maxApproval = parseUnits('1000000', 18); // 1M USD1
          const approveTx = await usd1Contract.approve(S402_FACILITATOR_ADDRESS, maxApproval);
          await approveTx.wait();
        }

        // Generate nonce
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const nonce = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const deadline = currentTimestamp + 3600; // 1 hour

        // Create EIP-712 signature for payment authorization
        const authDomain = {
          name: 'S402Facilitator',
          version: '1',
          chainId: 56,
          verifyingContract: S402_FACILITATOR_ADDRESS
        };

        const authTypes = {
          PaymentAuthorization: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'nonce', type: 'bytes32' }
          ]
        };

        const authMessage = {
          owner: from,
          spender: S402_FACILITATOR_ADDRESS,
          value: amountInUnits,
          deadline: deadline,
          recipient: paymentRequest.tool.provider_address,
          nonce: nonce
        };

        const authSigRaw = await signer.signTypedData(authDomain, authTypes, authMessage);
        const authSig = Signature.from(authSigRaw);

        const payment = {
          owner: from,
          value: amountInUnits,
          deadline: deadline,
          recipient: paymentRequest.tool.provider_address,
          nonce: nonce
        };

        const authSigStruct = {
          v: authSig.v,
          r: authSig.r,
          s: authSig.s
        };

        // Submit to S402 Facilitator
        const facilitator = new Contract(S402_FACILITATOR_ADDRESS, S402_ABI, signer);
        const tx = await facilitator.settlePayment(payment, authSigStruct);
        const receipt = await tx.wait();
        txHash = receipt.hash;
        
        setPaymentStatus('complete');
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setPaymentRequest(null);
      
      // Reset payment status after brief delay
      setPaymentStatus('idle');

      // Show generating indicator for image generation tools
      const isImageTool = paymentRequest.tool.name?.toLowerCase().includes('image') || 
                          paymentRequest.tool.name?.toLowerCase().includes('seedream');
      
      if (isImageTool) {
        setIsGeneratingImage(true);
      }

      const response = await fetch(`/api/agents/${agentId}/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_call_id: paymentRequest.tool_call_id,
          tool_id: paymentRequest.tool.id,
          tx_hash: txHash,
          input: paymentRequest.tool.input,
          payer_address: payer,
          session_id: currentSessionId,
        }),
      });

      const data = await response.json();
      setIsGeneratingImage(false);

      if (data.type === 'message') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        
        // Show tool output if images were generated
        if (data.tool_output?.images) {
          const imageUrls = data.tool_output.images;
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Here are the generated images:\n${imageUrls.map((url: string, i: number) => `Image ${i+1}: ${url}`).join('\n')}`
          }]);
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setIsGeneratingImage(false);
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Payment cancelled. Let me know if you\'d like to try again.',
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Payment failed: ${error.message || 'Unknown error'}`,
        }]);
      }
      setPaymentRequest(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPayment = () => {
    setPaymentRequest(null);
    setShowPaymentConfirm(false);
    setPaymentStatus('idle');
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '❌ Payment cancelled. How else can I help you?',
    }]);
  };

  const handlePaymentConfirm = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('autoApprovePayments', 'true');
      setAutoApprovePayments(true);
    }
    executePayment();
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
          </div>
        </div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="bg-s402-light-card dark:bg-transparent border border-gray-300 dark:border-gray-800 rounded-lg p-8 space-y-4 shadow-soft-lg dark:shadow-none">
          <div className="w-20 h-20 mx-auto bg-s402-orange/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔐</span>
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">Wallet Required</h2>
            <p className="text-sm text-gray-400">
              Connect your wallet to chat with this agent.
            </p>
          </div>
          <a
            href="/composer"
            className="inline-block px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white font-medium rounded transition-colors"
          >
            Connect Wallet
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 flex overflow-hidden pt-6">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/agents/my" className="text-xs text-gray-500 hover:text-s402-orange flex items-center gap-1 mb-3">
            ← Back to Agents
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-s402-orange/10 rounded-full flex items-center justify-center text-lg">
              {agent.icon || '🤖'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{agent.name}</div>
              <div className="text-xs text-gray-500">{MODEL_NAME}</div>
            </div>
          </div>
          <button
            onClick={createNewSession}
            className="w-full px-3 py-2 bg-s402-orange hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors shadow-soft"
          >
            + New Chat
          </button>
          {walletAddress && agent.owner_address.toLowerCase() === walletAddress.toLowerCase() && (
            <Link
              href={`/agents/my/${agentId}/settings`}
              className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-700 hover:border-s402-orange dark:hover:border-s402-orange text-sm font-medium rounded-lg transition-colors text-center block"
            >
              ⚙️ Settings
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`group px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 border-b border-gray-100 dark:border-gray-900 transition-colors ${
                currentSessionId === session.id ? 'bg-gray-50 dark:bg-gray-900/50 border-l-2 border-l-s402-orange' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div 
                  className="flex-1 min-w-0"
                  onClick={() => setCurrentSessionId(session.id)}
                >
                  <div className="text-sm truncate font-medium">{session.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-all"
                  title="Delete chat"
                >
                  <span className="text-xs text-red-600 dark:text-red-400">🗑️</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
          <button
            onClick={() => setShowToolsPanel(!showToolsPanel)}
            className="w-full text-left hover:text-s402-orange transition-colors flex items-center justify-between"
          >
            <span>🔧 Tools</span>
            <span className="text-s402-orange font-medium">{availableTools.length}</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-s402-light-bg dark:bg-s402-dark">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">{agent.icon || '🤖'}</div>
              <h2 className="text-xl font-medium mb-2">Start a conversation</h2>
              <p className="text-sm">Ask questions that require data from oracle APIs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 shadow-soft dark:shadow-none ${
                      msg.role === 'user'
                        ? 'bg-s402-orange text-white'
                        : 'bg-s402-light-card dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {/* Check if message contains image URLs */}
                      {(msg.content.includes('/api/images/') || (msg.content.includes('https://') && msg.content.includes('replicate.delivery'))) ? (
                        <div className="space-y-2">
                          {msg.content.split('\n').map((line, lineIdx) => {
                            // Match both our API URLs and external URLs
                            const urlMatch = line.match(/(https?:\/\/[^\s]+|\/api\/images\/[^\s]+)/);
                            if (urlMatch) {
                              const imageUrl = urlMatch[1];
                              return (
                                <div key={lineIdx} className="space-y-2">
                                  <img 
                                    src={imageUrl} 
                                    alt="Generated image" 
                                    className="rounded-lg max-w-full h-auto shadow-lg"
                                  />
                                  <div className="flex gap-2 items-center">
                                    <a 
                                      href={imageUrl} 
                                      download 
                                      className="text-xs px-3 py-1 bg-s402-orange text-white rounded hover:bg-s402-orange/90 transition-colors"
                                    >
                                      ⬇ Download
                                    </a>
                                    <a 
                                      href={imageUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-s402-orange hover:underline"
                                    >
                                      Open in new tab →
                                    </a>
                                  </div>
                                </div>
                              );
                            }
                            return <div key={lineIdx}>{line}</div>;
                          })}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && !paymentRequest && (
                <div className="flex justify-start">
                  <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 shadow-soft dark:shadow-none">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-pulse">●</div>
                      <div>Thinking...</div>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'processing' && (
                <div className="flex justify-start">
                  <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 shadow-soft dark:shadow-none">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-pulse">⚡</div>
                      <div>Processing payment...</div>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'complete' && (
                <div className="flex justify-start">
                  <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 shadow-soft dark:shadow-none">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <div>✅</div>
                      <div>Payment complete</div>
                    </div>
                  </div>
                </div>
              )}

              {isGeneratingImage && (
                <div className="flex justify-start">
                  <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3 shadow-soft dark:shadow-none">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin">🎨</div>
                      <div>Generating image... (10-30 seconds)</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Payment Request Banner */}
        {paymentRequest && (
          <div className="border-t border-s402-orange bg-s402-orange/10 dark:bg-s402-orange/5 px-6 py-4 shadow-soft-lg dark:shadow-none">
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
                  onClick={() => setShowPaymentConfirm(true)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-s402-orange hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Pay & Execute'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tools Panel */}
        {showToolsPanel && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-s402-light-card dark:bg-gray-900 px-6 py-4 max-h-64 overflow-y-auto shadow-soft-lg dark:shadow-none">
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
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
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
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-800 bg-s402-light-card dark:bg-black px-6 py-4 shadow-soft-lg dark:shadow-none">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask your agent anything..."
              disabled={isLoading || !!paymentRequest || !currentSessionId}
              className="flex-1 bg-transparent border border-gray-700 dark:border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-s402-orange focus:ring-1 focus:ring-s402-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || !!paymentRequest || !currentSessionId}
              className="px-6 py-3 bg-s402-orange hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentConfirm && paymentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-s402-light-card dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg max-w-md w-full shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">Confirm Payment</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {hasActiveSession 
                  ? 'This payment will be processed automatically using your session wallet.'
                  : 'This payment will require signatures from your connected wallet.'}
              </p>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Tool:</span>
                  <span className="font-medium">{paymentRequest.tool.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                  <span className="font-medium text-s402-orange">${paymentRequest.tool.cost_usd.toFixed(3)} USD1</span>
                </div>
              </div>

              {hasActiveSession && (
                <label className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    id="dontShowAgain"
                    className="mt-0.5 w-4 h-4 rounded border-gray-300"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                      Don't show this again
                    </div>
                    <div className="text-yellow-700 dark:text-yellow-300 text-xs">
                      ⚠️ Payments will be processed automatically without confirmation. 
                      You can still see payment status during execution.
                    </div>
                  </div>
                </label>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentConfirm(false);
                    cancelPayment();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const checkbox = document.getElementById('dontShowAgain') as HTMLInputElement;
                    handlePaymentConfirm(checkbox?.checked || false);
                  }}
                  className="flex-1 px-4 py-3 bg-s402-orange hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  Confirm & Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
