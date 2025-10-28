// Test calling USD1 permit() directly with the user's signature
const { ethers } = require('ethers');

const USD1_ADDRESS = '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d';
const S402_ADDRESS = '0x75c8CCD195F7B5Fb288B107B45FaF9a1289d7Df1';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

// User's data from the failed transaction
const OWNER = '0x290f6cB6457A87d64cb309Fe66F9d64a4df0addE';
const VALUE = ethers.parseUnits('0.01', 18);
const DEADLINE = 1761620701; // From the transaction
const PERMIT_V = 27;
const PERMIT_R = '0x2b3997005062e1935a40d4802f58870fe86881749310b3ceb2c1df8f08f1ddee';
const PERMIT_S = '0x12a5946a9092078f3c65aa2dbd1b9dee4ff66e79e34fb7be48d9e5c260cd7ef6';

async function main() {
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  
  console.log('Testing USD1 permit() directly\n');
  console.log('Owner:', OWNER);
  console.log('Spender:', S402_ADDRESS);
  console.log('Value:', ethers.formatUnits(VALUE, 18), 'USD1');
  console.log('Deadline:', new Date(DEADLINE * 1000).toISOString());
  console.log('Signature: v=', PERMIT_V, 'r=', PERMIT_R.substring(0, 10) + '...', 's=', PERMIT_S.substring(0, 10) + '...');
  console.log('');
  
  const usd1 = new ethers.Contract(USD1_ADDRESS, [
    'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
    'function nonces(address owner) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)'
  ], provider);
  
  // Check current nonce
  const nonce = await usd1.nonces(OWNER);
  console.log('Current nonce:', nonce.toString());
  
  // Check current allowance
  const currentAllowance = await usd1.allowance(OWNER, S402_ADDRESS);
  console.log('Current allowance:', ethers.formatUnits(currentAllowance, 18), 'USD1');
  console.log('');
  
  // Try to simulate the permit call
  console.log('Simulating permit() call...');
  try {
    const permitData = usd1.interface.encodeFunctionData('permit', [
      OWNER,
      S402_ADDRESS,
      VALUE,
      DEADLINE,
      PERMIT_V,
      PERMIT_R,
      PERMIT_S
    ]);
    
    const result = await provider.call({
      to: USD1_ADDRESS,
      data: permitData,
      from: OWNER
    });
    
    console.log('✅ Permit call would succeed!');
    console.log('Result:', result);
  } catch (err) {
    console.log('❌ Permit call would fail:', err.message);
    console.log('');
    
    // Try to identify the issue
    if (err.message.includes('deadline')) {
      console.log('→ Possible reason: Deadline expired');
    } else if (err.message.includes('nonce')) {
      console.log('→ Possible reason: Wrong nonce (permit already used)');
    } else if (err.message.includes('signature')) {
      console.log('→ Possible reason: Invalid signature');
    } else if (err.data) {
      console.log('→ Error data:', err.data);
    }
  }
  
  // Also try estimating gas
  console.log('');
  console.log('Estimating gas for permit()...');
  try {
    const gasEstimate = await provider.estimateGas({
      to: USD1_ADDRESS,
      data: usd1.interface.encodeFunctionData('permit', [
        OWNER,
        S402_ADDRESS,
        VALUE,
        DEADLINE,
        PERMIT_V,
        PERMIT_R,
        PERMIT_S
      ]),
      from: OWNER
    });
    
    console.log('✅ Gas estimate:', gasEstimate.toString());
  } catch (err) {
    console.log('❌ Gas estimation failed');
    console.log('Error:', err.shortMessage || err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
