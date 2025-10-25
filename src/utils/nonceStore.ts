/**
 * Nonce Store for x402 Payment Replay Protection
 * In production, use Redis or PostgreSQL
 */

interface NonceRecord {
  nonce: string;
  timestamp: number;
  payer: string;
  status: 'pending' | 'confirmed';
}

export class NonceStore {
  private usedNonces: Map<string, NonceRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired nonces every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Atomically claim a nonce for verification (prevents concurrent reuse)
   * @returns true if claimed successfully, false if already in use
   */
  claimNonce(nonce: string, payer: string): boolean {
    if (this.usedNonces.has(nonce)) {
      return false; // Already claimed or confirmed
    }
    
    // Atomically mark as pending
    this.usedNonces.set(nonce, {
      nonce,
      timestamp: Date.now(),
      payer,
      status: 'pending'
    });
    
    return true;
  }

  /**
   * Confirm a pending nonce after successful verification
   */
  confirmNonce(nonce: string): void {
    const record = this.usedNonces.get(nonce);
    if (record && record.status === 'pending') {
      record.status = 'confirmed';
    }
  }

  /**
   * Release a pending nonce if verification failed
   */
  releaseNonce(nonce: string): void {
    const record = this.usedNonces.get(nonce);
    if (record && record.status === 'pending') {
      this.usedNonces.delete(nonce);
    }
  }

  /**
   * Check if nonce has been used or is pending
   */
  isUsed(nonce: string): boolean {
    return this.usedNonces.has(nonce);
  }

  /**
   * Mark nonce as used (legacy - prefer claimNonce/confirmNonce)
   */
  markUsed(nonce: string, payer: string): void {
    this.usedNonces.set(nonce, {
      nonce,
      timestamp: Date.now(),
      payer,
      status: 'confirmed'
    });
  }

  /**
   * Clean up expired nonces (older than 10 minutes)
   */
  private cleanup(): void {
    const now = Date.now();
    const expiryTime = 600000; // 10 minutes

    for (const [nonce, record] of this.usedNonces.entries()) {
      if (now - record.timestamp > expiryTime) {
        this.usedNonces.delete(nonce);
      }
    }

    console.log(`[NonceStore] Cleaned up expired nonces. Active: ${this.usedNonces.size}`);
  }

  /**
   * Get store statistics
   */
  getStats(): { activeNonces: number } {
    return {
      activeNonces: this.usedNonces.size
    };
  }

  /**
   * Destroy store and cleanup
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.usedNonces.clear();
  }
}

// Singleton instance for in-memory storage
// In production, replace with Redis/PostgreSQL
let globalNonceStore: NonceStore | null = null;

export function getNonceStore(): NonceStore {
  if (!globalNonceStore) {
    globalNonceStore = new NonceStore();
  }
  return globalNonceStore;
}
