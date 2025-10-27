/**
 * Check BNB Chain USDC for EIP-3009 Support
 * 
 * This script verifies if Binance Bridged USDC supports:
 * 1. EIP-3009 transferWithAuthorization (random nonces)
 * 2. EIP-2612 permit (sequential nonces) - already confirmed
 */

import { ethers } from 'ethers';

// BNB Chain USDC address
const BNB_USDC = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const BNB_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const BNB_MAINNET_RPC = 'https://bsc-dataseed.binance.org';

// EIP-3009 ABI
const EIP3009_ABI = [
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() external view returns (bytes32)'
];

// EIP-2612 ABI
const EIP2612_ABI = [
  'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
  'function nonces(address owner) external view returns (uint256)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)'
];

async function checkUSDCSupport() {
  console.log('\n🔍 Checking BNB Chain USDC Support...\n');
  
  // Connect to BNB Chain mainnet
  const provider = new ethers.JsonRpcProvider(BNB_MAINNET_RPC);
  const usdcContract = new ethers.Contract(BNB_USDC, [...EIP3009_ABI, ...EIP2612_ABI], provider);
  
  const results: any = {
    address: BNB_USDC,
    network: 'BNB Chain Mainnet',
    eip2612: false,
    eip3009: false,
    features: []
  };
  
  // Check EIP-2612 support
  try {
    const domainSeparator = await usdcContract.DOMAIN_SEPARATOR();
    results.eip2612 = true;
    results.domainSeparator = domainSeparator;
    console.log('✅ EIP-2612 (permit): SUPPORTED');
    console.log(`   Domain Separator: ${domainSeparator}\n`);
  } catch (error) {
    console.log('❌ EIP-2612 (permit): NOT SUPPORTED\n');
  }
  
  // Check EIP-3009 support
  try {
    const transferTypehash = await usdcContract.TRANSFER_WITH_AUTHORIZATION_TYPEHASH();
    results.eip3009 = true;
    results.transferTypehash = transferTypehash;
    console.log('✅ EIP-3009 (transferWithAuthorization): SUPPORTED');
    console.log(`   Transfer Typehash: ${transferTypehash}\n`);
  } catch (error) {
    console.log('❌ EIP-3009 (transferWithAuthorization): NOT SUPPORTED\n');
  }
  
  // Check for additional functions
  const methodsToCheck = [
    { name: 'transferWithAuthorization', desc: 'Random nonce transfers' },
    { name: 'receiveWithAuthorization', desc: 'Random nonce receives' },
    { name: 'authorizationState', desc: 'Nonce usage tracking' }
  ];
  
  for (const method of methodsToCheck) {
    try {
      const hasMethod = typeof usdcContract[method.name] === 'function';
      if (hasMethod) {
        results.features.push(method.name);
        console.log(`✅ ${method.name}: Available (${method.desc})`);
      }
    } catch (error) {
      console.log(`❌ ${method.name}: Not available`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (results.eip3009) {
    console.log('\n🎉 EXCELLENT NEWS!');
    console.log('BNB Chain USDC supports EIP-3009 with random nonces!');
    console.log('✅ Parallel transactions ARE possible!');
    console.log('\nRecommendation: Switch from EIP-2612 to EIP-3009');
  } else if (results.eip2612) {
    console.log('\n⚠️ LIMITED SUPPORT');
    console.log('BNB Chain USDC only supports EIP-2612 (sequential nonces)');
    console.log('❌ Native parallel transactions NOT possible with USDC contract');
    console.log('\nWorkarounds available:');
    console.log('1. EIP-4337 Smart Accounts (custom nonce logic)');
    console.log('2. Multi-wallet strategy (parallel per address)');
    console.log('3. Off-chain batching with on-chain settlement');
  } else {
    console.log('\n❌ NO SUPPORT');
    console.log('BNB Chain USDC does not support meta-transactions');
  }
  
  console.log('\n');
  return results;
}

// Run the check
checkUSDCSupport()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
