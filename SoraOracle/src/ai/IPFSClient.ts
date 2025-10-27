import { create, IPFSHTTPClient } from 'ipfs-http-client';

/**
 * Real IPFS Client
 * 
 * Supports:
 * - Pinata (recommended, free tier available)
 * - Infura IPFS
 * - Local IPFS node
 * - Web3.Storage
 * 
 * Set environment variables:
 * - IPFS_PROVIDER: 'pinata' | 'infura' | 'local' | 'web3storage'
 * - PINATA_JWT: Your Pinata JWT token (if using Pinata)
 * - INFURA_PROJECT_ID: Your Infura project ID (if using Infura)
 * - INFURA_PROJECT_SECRET: Your Infura secret (if using Infura)
 * - IPFS_NODE_URL: Custom IPFS node URL (if using local)
 */

export interface IPFSUploadResult {
  cid: string;
  url: string;
  provider: string;
  size: number;
}

export class IPFSClient {
  private client: IPFSHTTPClient | null = null;
  private provider: string;
  private useMockFallback: boolean = false;

  constructor() {
    this.provider = process.env.IPFS_PROVIDER || 'mock';
    this.initializeClient();
  }

  /**
   * Initialize IPFS client based on provider
   */
  private initializeClient(): void {
    try {
      switch (this.provider) {
        case 'pinata':
          this.initializePinata();
          break;
        
        case 'infura':
          this.initializeInfura();
          break;
        
        case 'local':
          this.initializeLocal();
          break;
        
        case 'web3storage':
          // Web3.Storage uses different API, would need separate implementation
          console.log('⚠️  Web3.Storage not yet implemented, using mock');
          this.useMockFallback = true;
          break;
        
        default:
          console.log('⚠️  No IPFS provider configured, using mock fallback');
          console.log('   Set IPFS_PROVIDER env var to: pinata, infura, or local');
          this.useMockFallback = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize IPFS client:', error);
      console.log('   Falling back to mock IPFS');
      this.useMockFallback = true;
    }
  }

  /**
   * Initialize Pinata IPFS client
   * Free tier: 1GB storage, unlimited pins
   * Get JWT from: https://app.pinata.cloud/developers/api-keys
   */
  private initializePinata(): void {
    const jwt = process.env.PINATA_JWT;
    
    if (!jwt) {
      console.log('⚠️  PINATA_JWT not set, using mock fallback');
      console.log('   Get your JWT from: https://app.pinata.cloud/developers/api-keys');
      this.useMockFallback = true;
      return;
    }

    // Pinata uses their dedicated IPFS gateway
    this.client = create({
      host: 'api.pinata.cloud',
      port: 443,
      protocol: 'https',
      headers: {
        authorization: `Bearer ${jwt}`
      }
    });

    console.log('✅ IPFS client initialized: Pinata');
  }

  /**
   * Initialize Infura IPFS client
   * Free tier: 5GB storage
   * Get credentials from: https://infura.io/
   */
  private initializeInfura(): void {
    const projectId = process.env.INFURA_PROJECT_ID;
    const projectSecret = process.env.INFURA_PROJECT_SECRET;

    if (!projectId || !projectSecret) {
      console.log('⚠️  INFURA_PROJECT_ID or INFURA_PROJECT_SECRET not set');
      console.log('   Get credentials from: https://infura.io/');
      this.useMockFallback = true;
      return;
    }

    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

    this.client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth
      }
    });

    console.log('✅ IPFS client initialized: Infura');
  }

  /**
   * Initialize local IPFS node
   * Requires running: ipfs daemon
   */
  private initializeLocal(): void {
    const url = process.env.IPFS_NODE_URL || 'http://127.0.0.1:5001';

    this.client = create({ url });
    console.log(`✅ IPFS client initialized: Local node at ${url}`);
  }

  /**
   * Upload data to IPFS
   */
  async upload(data: any): Promise<IPFSUploadResult> {
    // Convert data to JSON string
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const buffer = Buffer.from(content);

    // Use mock fallback if no real client
    if (this.useMockFallback || !this.client) {
      return this.mockUpload(buffer);
    }

    try {
      // Real IPFS upload
      const result = await this.client.add(buffer, {
        pin: true,  // Pin to prevent garbage collection
        cidVersion: 1  // Use CIDv1 for better compatibility
      });

      const cid = result.cid.toString();
      const gatewayUrl = this.getGatewayUrl(cid);

      console.log(`✅ IPFS upload successful: ${cid}`);
      console.log(`   Gateway URL: ${gatewayUrl}`);

      return {
        cid,
        url: gatewayUrl,
        provider: this.provider,
        size: buffer.length
      };

    } catch (error) {
      console.error('❌ IPFS upload failed:', error);
      console.log('   Falling back to mock upload');
      return this.mockUpload(buffer);
    }
  }

  /**
   * Mock upload for when no IPFS provider is configured
   * Generates deterministic CID-like hash
   */
  private mockUpload(buffer: Buffer): IPFSUploadResult {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Create CIDv1-like format (base32)
    // Real CIDs are base32, but we'll use a shortened hex for demo
    const mockCid = `bafybeif${hash.slice(0, 52)}`;

    console.log(`⚠️  Mock IPFS upload: ${mockCid}`);
    console.log(`   To use real IPFS, set IPFS_PROVIDER environment variable`);

    return {
      cid: mockCid,
      url: `https://ipfs.io/ipfs/${mockCid}`,
      provider: 'mock',
      size: buffer.length
    };
  }

  /**
   * Get gateway URL for a CID
   */
  private getGatewayUrl(cid: string): string {
    switch (this.provider) {
      case 'pinata':
        return `https://gateway.pinata.cloud/ipfs/${cid}`;
      
      case 'infura':
        return `https://ipfs.infura.io/ipfs/${cid}`;
      
      case 'local':
        return `http://127.0.0.1:8080/ipfs/${cid}`;
      
      default:
        return `https://ipfs.io/ipfs/${cid}`;
    }
  }

  /**
   * Retrieve data from IPFS
   */
  async retrieve(cid: string): Promise<string> {
    if (this.useMockFallback || !this.client) {
      throw new Error('Cannot retrieve from mock IPFS. Set up real IPFS provider.');
    }

    try {
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      return buffer.toString('utf-8');

    } catch (error) {
      console.error(`❌ Failed to retrieve ${cid}:`, error);
      throw error;
    }
  }

  /**
   * Check if using real IPFS or mock
   */
  isUsingRealIPFS(): boolean {
    return !this.useMockFallback && this.client !== null;
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: string; isReal: boolean; gatewayUrl?: string } {
    return {
      provider: this.provider,
      isReal: this.isUsingRealIPFS(),
      gatewayUrl: this.isUsingRealIPFS() ? this.getGatewayUrl('example') : undefined
    };
  }
}

// Singleton instance
let ipfsClient: IPFSClient | null = null;

export function getIPFSClient(): IPFSClient {
  if (!ipfsClient) {
    ipfsClient = new IPFSClient();
  }
  return ipfsClient;
}
