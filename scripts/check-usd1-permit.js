// Script to check USD1's actual EIP-2612 domain parameters
const { ethers } = require('ethers');

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  
  const usd1 = new ethers.Contract(USD1_ADDRESS, [
    'function DOMAIN_SEPARATOR() external view returns (bytes32)',
    'function name() external view returns (string)',
    'function version() external view returns (string)',
    'function nonces(address owner) external view returns (uint256)',
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
    'function eip712Domain() external view returns (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions)'
  ], provider);
  
  console.log('========================================');
  console.log('USD1 Token EIP-2612 Analysis');
  console.log('Address:', USD1_ADDRESS);
  console.log('Network: BSC Mainnet (56)');
  console.log('========================================\n');
  
  // Try to get DOMAIN_SEPARATOR
  try {
    const domainSeparator = await usd1.DOMAIN_SEPARATOR();
    console.log('✅ DOMAIN_SEPARATOR:', domainSeparator);
  } catch (err) {
    console.log('❌ DOMAIN_SEPARATOR() not available:', err.message);
  }
  
  // Try to get name
  try {
    const name = await usd1.name();
    console.log('✅ name():', name);
  } catch (err) {
    console.log('❌ name() failed:', err.message);
  }
  
  // Try to get version
  try {
    const version = await usd1.version();
    console.log('✅ version():', version);
  } catch (err) {
    console.log('❌ version() not available:', err.message);
  }
  
  // Try EIP-5267 eip712Domain()
  try {
    const domain = await usd1.eip712Domain();
    console.log('✅ eip712Domain():');
    console.log('  - name:', domain[1]);
    console.log('  - version:', domain[2]);
    console.log('  - chainId:', domain[3].toString());
    console.log('  - verifyingContract:', domain[4]);
  } catch (err) {
    console.log('❌ eip712Domain() not available:', err.message);
  }
  
  // Try to get nonces for a test address
  try {
    const testAddress = '0x0000000000000000000000000000000000000001';
    const nonce = await usd1.nonces(testAddress);
    console.log('✅ nonces() works, test nonce:', nonce.toString());
  } catch (err) {
    console.log('❌ nonces() failed:', err.message);
  }
  
  // Manually calculate what the DOMAIN_SEPARATOR should be
  console.log('\n========================================');
  console.log('Calculating Expected DOMAIN_SEPARATOR:');
  console.log('========================================\n');
  
  try {
    const name = await usd1.name();
    
    // Try different version values
    const versions = ['1', '2', 'v1', 'USD1'];
    
    for (const version of versions) {
      const domain = {
        name: name,
        version: version,
        chainId: 56,  // BSC mainnet
        verifyingContract: USD1_ADDRESS
      };
      
      const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
      console.log(`Domain with version="${version}":`, domainSeparator);
    }
    
    // Try with chainId 1 (Ethereum mainnet) in case it's cached from deployment
    console.log('\nTrying with chainId=1 (in case cached from ETH deployment):');
    for (const version of versions) {
      const domain = {
        name: name,
        version: version,
        chainId: 1,  // Ethereum mainnet
        verifyingContract: USD1_ADDRESS
      };
      
      const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
      console.log(`Domain with version="${version}" chainId=1:`, domainSeparator);
    }
    
  } catch (err) {
    console.log('Failed to calculate domains:', err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
