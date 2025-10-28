// Test if we can create a valid permit signature for USD1
const { ethers } = require('ethers');

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

// Test with a known wallet
const PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'; // Dummy key for testing
const SPENDER = '0x75c8CCD195F7B5Fb288B107B45FaF9a1289d7Df1'; // S402 Facilitator

async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Testing USD1 Permit Signature Generation');
  console.log('==========================================\n');
  console.log('Test wallet:', wallet.address);
  console.log('Spender:', SPENDER);
  console.log('USD1:', USD1_ADDRESS);
  console.log('');
  
  const usd1 = new ethers.Contract(USD1_ADDRESS, [
    'function DOMAIN_SEPARATOR() external view returns (bytes32)',
    'function name() external view returns (string)',
    'function nonces(address owner) external view returns (uint256)',
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external'
  ], provider);
  
  // Get current nonce
  const nonce = await usd1.nonces(wallet.address);
  console.log('Current nonce:', nonce.toString());
  
  // Get token name
  const name = await usd1.name();
  console.log('Token name:', name);
  
  // Create permit data
  const value = ethers.parseUnits('10', 18);
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  
  console.log('\nPermit Parameters:');
  console.log('- value:', ethers.formatUnits(value, 18), 'USD1');
  console.log('- deadline:', new Date(deadline * 1000).toISOString());
  console.log('- nonce:', nonce.toString());
  
  // Create EIP-712 domain
  const domain = {
    name: name,
    version: '1',
    chainId: 56,
    verifyingContract: USD1_ADDRESS
  };
  
  console.log('\nEIP-712 Domain:');
  console.log(JSON.stringify(domain, null, 2));
  
  // Calculate domain separator
  const calculatedDomainSep = ethers.TypedDataEncoder.hashDomain(domain);
  const actualDomainSep = await usd1.DOMAIN_SEPARATOR();
  
  console.log('\nDomain Separator Check:');
  console.log('Calculated:', calculatedDomainSep);
  console.log('Actual:    ', actualDomainSep);
  console.log('Match:', calculatedDomainSep === actualDomainSep ? '✅ YES' : '❌ NO');
  
  // Define permit types
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };
  
  const message = {
    owner: wallet.address,
    spender: SPENDER,
    value: value,
    nonce: nonce,
    deadline: deadline
  };
  
  console.log('\nPermit Message:');
  console.log(JSON.stringify({
    ...message,
    value: value.toString(),
    nonce: nonce.toString()
  }, null, 2));
  
  // Sign the permit
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);
  
  console.log('\nGenerated Signature:');
  console.log('- r:', sig.r);
  console.log('- s:', sig.s);
  console.log('- v:', sig.v);
  console.log('- compact:', signature);
  
  // Try to estimate gas for the permit call (will fail if signature is invalid)
  console.log('\nTesting permit() call (dry run)...');
  try {
    const permitData = usd1.interface.encodeFunctionData('permit', [
      wallet.address,
      SPENDER,
      value,
      deadline,
      sig.v,
      sig.r,
      sig.s
    ]);
    
    console.log('Permit calldata:', permitData);
    
    // Try to estimate gas
    const gasEstimate = await provider.estimateGas({
      to: USD1_ADDRESS,
      data: permitData,
      from: wallet.address
    });
    
    console.log('✅ Gas estimate succeeded:', gasEstimate.toString());
    console.log('✅ Permit signature is VALID!');
    
  } catch (err) {
    console.log('❌ Permit call failed:', err.message);
    
    if (err.message.includes('missing revert data')) {
      console.log('\n⚠️  This suggests the permit() function reverts without a reason string.');
      console.log('⚠️  Possible causes:');
      console.log('   - Signature format is wrong');
      console.log('   - USD1 does not actually support EIP-2612 permit');
      console.log('   - There is a bug in USD1\'s permit implementation');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
