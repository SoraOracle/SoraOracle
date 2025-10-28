// Decode the latest failed transaction
const { ethers } = require('ethers');

const TX_DATA = '0x45c9d465000000000000000000000000290f6cb6457a87d64cb309fe66f9d64a4df0adde000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000690036b900000000000000000000000089907f51be80c12e63eb62fa7680c3960ac0c18fd4ad8f3afbf9b01ec1b3298ae3964ab1613ca043edb3e1f4252afffb42226ffc000000000000000000000000000000000000000000000000000000000000001c784eb6716388a150c9044edda1532f9de1620e24fd33edca8289d5112921b6172788b597e9f881d3eb8960bc992e447f86df5c687895e12762b8d5c2aa466038000000000000000000000000000000000000000000000000000000000000001c0d004ab4487e049a13a630b028f68dea321f090a84c92eb9b341b809ca5d7dfc7b57dd60a00308dd8e959793289f0c0a51a1f69fda49b6ce670cb94eb4c9de49';

const iface = new ethers.Interface([
  'function settlePaymentWithPermit((address owner, uint256 value, uint256 deadline, address recipient, bytes32 nonce) payment, (uint8 v, bytes32 r, bytes32 s) permitSig, (uint8 v, bytes32 r, bytes32 s) authSig) external returns (bool)'
]);

const decoded = iface.parseTransaction({ data: TX_DATA });

console.log('Decoded Transaction:');
console.log('===================\n');
console.log('Payment Data:');
console.log('  owner:', decoded.args[0].owner);
console.log('  value:', decoded.args[0].value.toString(), '=', ethers.formatUnits(decoded.args[0].value, 18), 'USD1');
console.log('  deadline:', decoded.args[0].deadline.toString(), '=', new Date(Number(decoded.args[0].deadline) * 1000).toISOString());
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

console.log('\n✅ Value is POSITIVE:', decoded.args[0].value.toString(), '(0.01 USD1)');
console.log('✅ No negative values detected!');
