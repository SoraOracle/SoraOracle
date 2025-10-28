// Debug script to test permit with actual parameters
const { ethers } = require('ethers');

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const S402_ADDRESS = '0x75c8CCD195F7B5Fb288B107B45FaF9a1289d7Df1';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

// Parse the transaction data from the error message
const TX_DATA = '0x45c9d465000000000000000000000000290f6cb6457a87d64cb309fe66f9d64a4df0adde000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000000000006900346d00000000000000000000000089907f51be80c12e63eb62fa7680c3960ac0c18fb2c6a4d8cd13af1fa5003c47e64a3d06cfb6e8f86cee53b990e4e7c7406be05b000000000000000000000000000000000000000000000000000000000000001b2b3997005062e1935a40d4802f58870fe86881749310b3ceb2c1df8f08f1ddee12a5946a9092078f3c65aa2dbd1b9dee4ff66e79e34fb7be48d9e5c260cd7ef6000000000000000000000000000000000000000000000000000000000000001bed965a85a3cb650a98703ae934856e605f415adb71389e2c2cd1c0a725c6743528009c762972263976c572ebdcc7331b47cb95b5f18e77d78532c530dbfb2ae9';

async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  
  // Decode the transaction data
  const iface = new ethers.Interface([
    'function settlePaymentWithPermit((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) permitSig, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)'
  ]);
  
  console.log('Decoding transaction data...\n');
  const decoded = iface.parseTransaction({ data: TX_DATA });
  
  console.log('Function:', decoded.name);
  console.log('\nPayment Data:');
  console.log('  owner:', decoded.args[0].owner);
  console.log('  value:', ethers.formatUnits(decoded.args[0].value, 18), 'USD1');
  console.log('  deadline:', new Date(Number(decoded.args[0].deadline) * 1000).toISOString());
  console.log('  recipient:', decoded.args[0].recipient);
  console.log('  nonce:', decoded.args[0].nonce);
  
  console.log('\nPermit Signature:');
  console.log('  v:', decoded.args[1].v);
  console.log('  r:', decoded.args[1].r);
  console.log('  s:', decoded.args[1].s);
  
  console.log('\nAuth Signature:');
  console.log('  v:', decoded.args[2].v);
  console.log('  r:', decoded.args[2].r);
  console.log('  s:', decoded.args[2].s);
  
  // Test individual components
  console.log('\n========================================');
  console.log('Testing Individual Components');
  console.log('========================================\n');
  
  const owner = decoded.args[0].owner;
  const value = decoded.args[0].value;
  const deadline = decoded.args[0].deadline;
  const recipient = decoded.args[0].recipient;
  const nonce = decoded.args[0].nonce;
  const permitSig = decoded.args[1];
  const authSig = decoded.args[2];
  
  // Check USD1 balance
  const usd1 = new ethers.Contract(USD1_ADDRESS, [
    'function balanceOf(address) external view returns (uint256)',
    'function nonces(address) external view returns (uint256)',
    'function name() external view returns (string)',
    'function DOMAIN_SEPARATOR() external view returns (bytes32)'
  ], provider);
  
  const balance = await usd1.balanceOf(owner);
  const usd1Nonce = await usd1.nonces(owner);
  const tokenName = await usd1.name();
  const domainSep = await usd1.DOMAIN_SEPARATOR();
  
  console.log('1. USD1 Balance Check:');
  console.log('   Owner:', owner);
  console.log('   Balance:', ethers.formatUnits(balance, 18), 'USD1');
  console.log('   Required:', ethers.formatUnits(value, 18), 'USD1');
  console.log('   Sufficient?', balance >= value ? '✅ YES' : '❌ NO');
  
  console.log('\n2. USD1 Nonce Check:');
  console.log('   Current nonce:', usd1Nonce.toString());
  
  console.log('\n3. Permit Signature Validation:');
  console.log('   Token name:', tokenName);
  console.log('   DOMAIN_SEPARATOR:', domainSep);
  
  // Reconstruct permit domain
  const permitDomain = {
    name: tokenName,
    version: '1',
    chainId: 56,
    verifyingContract: USD1_ADDRESS
  };
  
  const permitTypes = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };
  
  const permitMessage = {
    owner: owner,
    spender: S402_ADDRESS,
    value: value,
    nonce: usd1Nonce,
    deadline: deadline
  };
  
  // Reconstruct digest
  const permitDigest = ethers.TypedDataEncoder.hash(permitDomain, permitTypes, permitMessage);
  const permitSigner = ethers.recoverAddress(permitDigest, {
    v: permitSig.v,
    r: permitSig.r,
    s: permitSig.s
  });
  
  console.log('   Expected signer:', owner);
  console.log('   Recovered signer:', permitSigner);
  console.log('   Valid?', permitSigner.toLowerCase() === owner.toLowerCase() ? '✅ YES' : '❌ NO');
  
  console.log('\n4. Auth Signature Validation:');
  
  // Reconstruct auth domain
  const authDomain = {
    name: 'S402Facilitator',
    version: '1',
    chainId: 56,
    verifyingContract: S402_ADDRESS
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
    owner: owner,
    spender: S402_ADDRESS,
    value: value,
    deadline: deadline,
    recipient: recipient,
    nonce: nonce
  };
  
  const authDigest = ethers.TypedDataEncoder.hash(authDomain, authTypes, authMessage);
  const authSigner = ethers.recoverAddress(authDigest, {
    v: authSig.v,
    r: authSig.r,
    s: authSig.s
  });
  
  console.log('   Expected signer:', owner);
  console.log('   Recovered signer:', authSigner);
  console.log('   Valid?', authSigner.toLowerCase() === owner.toLowerCase() ? '✅ YES' : '❌ NO');
  
  // Try to simulate the call
  console.log('\n5. Simulating Contract Call:');
  try {
    const result = await provider.call({
      to: S402_ADDRESS,
      data: TX_DATA,
      from: owner
    });
    console.log('   ✅ Call would succeed');
    console.log('   Result:', result);
  } catch (err) {
    console.log('   ❌ Call would fail:', err.message);
    
    if (err.message.includes('insufficient funds')) {
      console.log('   → Insufficient USD1 balance');
    } else if (err.message.includes('nonce')) {
      console.log('   → Nonce mismatch - permit already used or wrong nonce');
    } else {
      console.log('   → Unknown error, likely permit signature issue');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
