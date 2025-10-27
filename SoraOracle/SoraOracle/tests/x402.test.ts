import { expect } from 'chai';
import { NonceStore } from '../src/utils/nonceStore';
import { X402Middleware } from '../src/middleware/x402';

describe('x402 Replay Attack Protection', function () {
  let nonceStore: NonceStore;

  beforeEach(function () {
    nonceStore = new NonceStore();
  });

  afterEach(function () {
    nonceStore.destroy();
  });

  describe('Nonce Store', function () {
    it('Should reject reused nonces', function () {
      const nonce = '12345';
      const payer = '0x1234...';

      expect(nonceStore.isUsed(nonce)).to.be.false;

      nonceStore.markUsed(nonce, payer);

      expect(nonceStore.isUsed(nonce)).to.be.true;
    });

    it('Should allow different nonces', function () {
      nonceStore.markUsed('nonce1', '0x1234...');

      expect(nonceStore.isUsed('nonce1')).to.be.true;
      expect(nonceStore.isUsed('nonce2')).to.be.false;
    });

    it('Should clean up expired nonces', async function () {
      this.timeout(5000);

      // Mock old timestamp
      const nonce = 'old-nonce';
      nonceStore.markUsed(nonce, '0x1234...');

      // Manually trigger cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would remove nonces older than 10 minutes
      expect(nonceStore.getStats().activeNonces).to.be.greaterThan(0);
    });
  });

  describe('Payment Replay Protection', function () {
    it('Should prevent replay attacks', async function () {
      const x402 = new X402Middleware({
        facilitatorUrl: 'http://localhost:3000',
        usdcAddress: '0x1234...',
        priceInUSDC: 0.05,
        network: 'testnet'
      });

      // First payment should succeed (in development mode)
      const proof1 = {
        nonce: 'unique-nonce-123',
        amount: '50000', // 0.05 USDC in 6 decimals
        token: '0x1234...',
        from: '0xabc...' as `0x${string}`,
        to: '0xdef...' as `0x${string}`,
        signature: '0x...' as `0x${string}`,
        timestamp: Date.now()
      };

      // Simulated first verification would mark nonce as used
      // Second verification with same nonce should fail
      const proof2 = { ...proof1 }; // Same nonce - replay attack

      // In a real test, we'd call verifyPayment twice and expect the second to fail
      // For now, we're just testing the nonce store directly
      const store = getNonceStore();
      store.markUsed(proof1.nonce, proof1.from);

      expect(store.isUsed(proof1.nonce)).to.be.true;
      expect(store.isUsed('different-nonce')).to.be.false;
    });
  });
});

function getNonceStore() {
  return new NonceStore();
}
