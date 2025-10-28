import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits, Signature } from 'ethers';
import './S402DemoPage.css';

const S402_FACILITATOR_ADDRESS = '0x605c5c8d83152bd98ecAc9B77a845349DA3c48a3';
const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';

const S402_ABI = [
  'function settlePaymentWithPermit((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) permitSig, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)',
  'function settlePayment((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)',
  'function getStats(address user) external view returns (uint256 paid, uint256 received, uint256 balance)',
  'function platformFeeBps() external view returns (uint256)',
  'event PaymentSettled(address indexed from, address indexed to, uint256 value, uint256 platformFee, bytes32 nonce)'
];

const USD1_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function nonces(address owner) external view returns (uint256)',
  'function name() external view returns (string)',
  'function version() external view returns (string)'
];

interface Stats {
  paid: string;
  received: string;
  balance: string;
}

interface WalletProps {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
  switchChain: (chainId: number) => Promise<void>;
}

interface S402DemoPageProps {
  wallet: WalletProps;
}

export function S402DemoPage({ wallet }: S402DemoPageProps) {
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('10');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [platformFee, setPlatformFee] = useState<string>('');
  const [showBuyWidget, setShowBuyWidget] = useState(false);
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (wallet.address && wallet.chainId === 56) {
      loadPlatformFee();
      loadStats(wallet.address, new BrowserProvider(window.ethereum));
      checkApproval();
    }
  }, [wallet.address, wallet.chainId]);

  const checkApproval = async () => {
    if (!wallet.address) return;
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      const usd1Contract = new Contract(USD1_ADDRESS, USD1_ABI, provider);
      const allowance = await usd1Contract.allowance(wallet.address, S402_FACILITATOR_ADDRESS);
      
      // If allowance is less than 1000 USD1, show approval button
      setApprovalNeeded(allowance < parseUnits('1000', 18));
    } catch (err) {
      console.error('Failed to check approval:', err);
    }
  };

  const approveUSD1 = async () => {
    try {
      setApproving(true);
      setError('');
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const usd1Contract = new Contract(USD1_ADDRESS, USD1_ABI, signer);
      
      // Approve max amount for convenience
      const maxApproval = parseUnits('1000000', 18); // 1M USD1
      console.log('Approving USD1 for S402Facilitator...');
      const tx = await usd1Contract.approve(S402_FACILITATOR_ADDRESS, maxApproval);
      
      console.log('Waiting for approval confirmation...');
      await tx.wait();
      
      setApprovalNeeded(false);
      console.log('USD1 approved successfully!');
    } catch (err: any) {
      console.error('Approval error:', err);
      setError(`Approval failed: ${err.message || err.toString()}`);
    } finally {
      setApproving(false);
    }
  };

  const loadPlatformFee = async () => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const facilitator = new Contract(S402_FACILITATOR_ADDRESS, S402_ABI, provider);
      const feeBps = await facilitator.platformFeeBps();
      setPlatformFee(`${(Number(feeBps) / 100).toFixed(2)}%`);
    } catch (err: any) {
      console.error('Failed to load platform fee:', err);
    }
  };

  const loadStats = async (address: string, provider: BrowserProvider) => {
    try {
      const facilitator = new Contract(S402_FACILITATOR_ADDRESS, S402_ABI, provider);
      const usd1Contract = new Contract(USD1_ADDRESS, USD1_ABI, provider);
      
      const userStats = await facilitator.getStats(address);
      const usd1Balance = await usd1Contract.balanceOf(address);
      
      setStats({
        paid: parseFloat(formatUnits(userStats[0], 18)).toFixed(4),
        received: parseFloat(formatUnits(userStats[1], 18)).toFixed(4),
        balance: parseFloat(formatUnits(usd1Balance, 18)).toFixed(4)
      });
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const generateNonce = () => {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const makePayment = async () => {
    if (!wallet.address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!recipientAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTxHash('');

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const amountInUnits = parseUnits(amount, 18);
      
      if (amountInUnits <= 0) {
        setError('Amount must be greater than 0');
        return;
      }
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const deadline = currentTimestamp + 3600; // 1 hour from NOW
      const nonce = generateNonce();
      
      console.log('🔐 Starting S402 Gasless Payment');
      console.log('⏰ Timestamp check:');
      console.log('   Current time:', new Date().toISOString());
      console.log('   Current timestamp (unix):', currentTimestamp);
      console.log('   Deadline timestamp (unix):', deadline);
      console.log('   Deadline (ISO):', new Date(deadline * 1000).toISOString());
      console.log('   Time until deadline:', Math.floor((deadline - currentTimestamp) / 60), 'minutes');
      
      // Step 1: Create EIP-712 domain for payment authorization
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
        owner: wallet.address,
        spender: S402_FACILITATOR_ADDRESS,
        value: amountInUnits,
        deadline: deadline,
        recipient: recipientAddress,
        nonce: nonce
      };
      
      // Step 2: Sign authorization
      console.log('✍️  Requesting authorization signature...');
      const authSigRaw = await signer.signTypedData(authDomain, authTypes, authMessage);
      const authSig = Signature.from(authSigRaw);
      
      console.log('✅ Authorization signature created');
      console.log('   v:', authSig.v);
      console.log('   r:', authSig.r);
      console.log('   s:', authSig.s);
      
      // Step 3: Prepare payment data
      const payment = {
        owner: wallet.address,
        value: amountInUnits,
        deadline: deadline,
        recipient: recipientAddress,
        nonce: nonce
      };
      
      const authSigStruct = {
        v: authSig.v,
        r: authSig.r,
        s: authSig.s
      };
      
      // Step 4: Submit to S402 Facilitator
      const facilitator = new Contract(S402_FACILITATOR_ADDRESS, S402_ABI, signer);
      
      console.log('📤 Submitting S402 payment (using allowance)...');
      console.log('   Amount:', formatUnits(amountInUnits, 18), 'USD1');
      console.log('   To:', recipientAddress);
      console.log('   Platform Fee:', platformFee);
      
      console.log('📋 Payment struct:');
      console.log('   payment.owner:', payment.owner);
      console.log('   payment.value (BigInt):', payment.value.toString());
      console.log('   payment.value (formatted):', formatUnits(payment.value, 18));
      console.log('   payment.deadline:', payment.deadline);
      console.log('   payment.recipient:', payment.recipient);
      console.log('   payment.nonce:', payment.nonce);
      
      console.log('📋 Auth signature struct:');
      console.log('   v:', authSigStruct.v);
      console.log('   r:', authSigStruct.r);
      console.log('   s:', authSigStruct.s);
      
      const tx = await facilitator.settlePayment(payment, authSigStruct);
      
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      
      console.log('🎉 Payment successful!');
      console.log('   TX:', receipt.hash);
      
      setTxHash(receipt.hash);
      await loadStats(wallet.address, provider);
      
      setAmount('10');
      setRecipientAddress('');
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      setError(`Payment failed: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`s402-demo-page ${wallet.address ? 'wallet-connected' : ''}`}>
      <div className="demo-container">
        <h1>S402 Payment Protocol</h1>
        <p className="subtitle">Gasless USD1 payments on BNB Chain</p>

        <div className="card">
          <h3>Contract Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>S402 Facilitator:</label>
              <a 
                href={`https://bscscan.com/address/${S402_FACILITATOR_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contract-link"
              >
                {S402_FACILITATOR_ADDRESS}
              </a>
            </div>
            <div className="info-item">
              <label>Platform Fee:</label>
              <span>{platformFee || 'Not connected'}</span>
            </div>
          </div>
        </div>

        {!wallet.address ? (
          <div className="card">
            <button onClick={wallet.connect} className="connect-button">
              Connect MetaMask
            </button>
            <p className="note">Make sure you're on BNB Chain Mainnet</p>
          </div>
        ) : wallet.chainId !== 56 ? (
          <div className="card">
            <p className="error">⚠️ Wrong Network</p>
            <p className="note">Please switch to BNB Chain Mainnet (Chain ID: 56)</p>
            <button 
              onClick={() => wallet.switchChain(56)} 
              className="switch-button"
            >
              Switch to BNB Chain
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <h3>Your Account</h3>
              {stats && (
                <div className="stats-grid">
                  <div className="stat-item">
                    <label>USD1 Balance</label>
                    <span className="amount">{stats.balance} USD1</span>
                  </div>
                  <div className="stat-item">
                    <label>Total Paid</label>
                    <span className="amount-gray">{stats.paid} USD1</span>
                  </div>
                  <div className="stat-item">
                    <label>Total Received</label>
                    <span className="amount-gray">{stats.received} USD1</span>
                  </div>
                </div>
              )}
            </div>

            {approvalNeeded && (
              <div className="card" style={{ border: '1px solid #F97316' }}>
                <h3 style={{ color: '#F97316' }}>⚠️ Approval Required</h3>
                <p style={{ marginBottom: '16px', color: '#A1A1A1' }}>
                  You need to approve the S402 Facilitator to spend your USD1 tokens. This is a one-time transaction.
                </p>
                <button 
                  onClick={approveUSD1} 
                  disabled={approving}
                  className="approve-button"
                >
                  {approving ? 'Approving...' : 'Approve USD1'}
                </button>
              </div>
            )}

            <div className="card buy-usd1-card">
              <div 
                className="buy-usd1-header"
                onClick={() => setShowBuyWidget(!showBuyWidget)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Buy USD1
                  <span style={{ 
                    transform: showBuyWidget ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    fontSize: '20px'
                  }}>
                    ▼
                  </span>
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#999' }}>
                  Swap any token for USD1 on PancakeSwap or 1inch
                </p>
              </div>
              
              {showBuyWidget && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <a
                    href={`https://app.1inch.io/#/56/simple/swap/BNB/${USD1_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="swap-link swap-1inch"
                  >
                    <div className="swap-link-content">
                      <div>
                        <strong>1inch DEX Aggregator</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#999' }}>
                          Best rates across all BSC DEXs
                        </p>
                      </div>
                      <span style={{ fontSize: '24px' }}>→</span>
                    </div>
                  </a>
                  
                  <a
                    href={`https://pancakeswap.finance/swap?outputCurrency=${USD1_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="swap-link swap-pancake"
                  >
                    <div className="swap-link-content">
                      <div>
                        <strong>PancakeSwap</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#999' }}>
                          Leading BSC DEX with deep liquidity
                        </p>
                      </div>
                      <span style={{ fontSize: '24px' }}>→</span>
                    </div>
                  </a>
                  
                  <div style={{ 
                    padding: '12px', 
                    background: '#1A1A1A', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#A1A1A1'
                  }}>
                    <strong style={{ color: '#F97316' }}>Note:</strong> Links open in new tab. Make sure you're connected to BNB Chain (BSC) in your wallet.
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h3>Send Payment (S402 Gasless)</h3>
              <p style={{ color: '#A1A1A1', fontSize: '14px', marginBottom: '16px' }}>
                One signature, zero gas fees! Pay only with USD1 using S402.
              </p>
              <div className="form">
                <div className="form-group">
                  <label>Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Amount (USD1)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10"
                    min="0"
                    step="0.01"
                    className="input"
                  />
                </div>
                <button 
                  onClick={makePayment} 
                  disabled={loading || !recipientAddress || !amount}
                  className="payment-button"
                >
                  {loading ? 'Processing...' : 'Send Payment'}
                </button>
              </div>
            </div>

            {error && (
              <div className="card error-card">
                <p className="error">⚠️ {error}</p>
              </div>
            )}

            {txHash && (
              <div className="card success-card">
                <p className="success">✅ Payment Successful!</p>
                <a 
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  View Transaction →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
