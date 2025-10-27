/**
 * Test Real Infrastructure
 * 
 * This demo tests the REAL infrastructure components:
 * 1. IPFS upload (real if configured, mock fallback)
 * 2. TLS certificate verification (real HTTPS cert checks)
 * 3. API discovery (real APIs.guru search)
 * 
 * Run with:
 * npx tsx examples/test-real-infrastructure.ts
 * 
 * For real IPFS, set:
 * export IPFS_PROVIDER=pinata
 * export PINATA_JWT=your_jwt
 */

import { getIPFSClient } from '../src/ai/IPFSClient';
import { getTLSVerifier } from '../src/ai/TLSVerifier';
import { APIDiscoveryAgent } from '../src/ai/APIDiscoveryAgent';
import { DataSourceRouter } from '../src/ai/DataSourceRouter';
import { X402Client } from '../src/sdk/X402Client';

async function main() {
  console.log('\n🧪 Testing Real Infrastructure Components\n');
  console.log('='.repeat(60));

  // Test 1: IPFS Upload
  console.log('\n1️⃣  Testing IPFS Storage');
  console.log('-'.repeat(60));
  
  const ipfsClient = getIPFSClient();
  const ipfsInfo = ipfsClient.getProviderInfo();
  
  console.log(`   Provider: ${ipfsInfo.provider}`);
  console.log(`   Real IPFS: ${ipfsInfo.isReal ? 'YES ✅' : 'NO (using mock)'}`);
  
  const testData = {
    question: 'Will BTC hit $100K by 2025?',
    answer: 'YES',
    confidence: 0.85,
    sources: ['CoinGecko', 'CryptoCompare'],
    timestamp: Date.now()
  };

  console.log('\n   Uploading test data to IPFS...');
  const ipfsResult = await ipfsClient.upload(testData);
  
  console.log(`   ✅ Upload successful!`);
  console.log(`   CID: ${ipfsResult.cid}`);
  console.log(`   URL: ${ipfsResult.url}`);
  console.log(`   Provider: ${ipfsResult.provider}`);
  console.log(`   Size: ${ipfsResult.size} bytes`);

  // Test 2: TLS Certificate Verification
  console.log('\n\n2️⃣  Testing TLS Certificate Verification');
  console.log('-'.repeat(60));

  const TLSVerifier = getTLSVerifier();
  
  const testURLs = [
    'https://api.coingecko.com',
    'https://api.github.com',
    'https://api.openweathermap.org'
  ];

  for (const url of testURLs) {
    console.log(`\n   Verifying: ${url}`);
    
    try {
      const tlsResult = await TLSVerifier.verifyURL(url);
      
      if (tlsResult.verified) {
        console.log(`   ✅ TLS Verified`);
        console.log(`      Issuer: ${tlsResult.issuer}`);
        console.log(`      Valid: ${tlsResult.validFrom.toISOString().split('T')[0]} to ${tlsResult.validTo.toISOString().split('T')[0]}`);
        console.log(`      Fingerprint: ${tlsResult.fingerprint.substring(0, 20)}...`);
      } else {
        console.log(`   ❌ TLS Verification Failed: ${tlsResult.error}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  // Test 3: Real API Discovery
  console.log('\n\n3️⃣  Testing Real API Discovery (APIs.guru)');
  console.log('-'.repeat(60));

  // Create mock X402 client for demo
  const mockWallet = new (await import('ethers')).Wallet('0x' + '1'.repeat(64));
  const mockX402 = new X402Client({
    facilitatorUrl: 'https://mock-facilitator.example.com',
    facilitatorAddress: '0x' + '0'.repeat(40),
    usdcAddress: '0x' + '1'.repeat(40),
    network: 'testnet',
    signer: mockWallet
  });

  const router = new DataSourceRouter('mock-key', mockX402);
  const discoveryAgent = new APIDiscoveryAgent('mock-key', mockX402, router);

  console.log('\n   Searching APIs.guru for "weather" APIs...');
  console.log('   (This makes a REAL HTTP request to apis.guru)\n');

  try {
    // Access the private method via any - just for demo
    const realAPIs = await (discoveryAgent as any).searchAPIsGuru(
      ['weather', 'climate'],
      'weather'
    );

    if (realAPIs.length > 0) {
      console.log(`   ✅ Found ${realAPIs.length} real APIs from APIs.guru:\n`);
      
      realAPIs.forEach((api: any, i: number) => {
        console.log(`   ${i + 1}. ${api.name}`);
        console.log(`      Description: ${api.description.substring(0, 80)}...`);
        console.log(`      Endpoint: ${api.endpoint.substring(0, 60)}...`);
        console.log(`      Free: ${api.pricing.free ? 'YES' : 'NO'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No APIs found (might be connection issue)');
    }
  } catch (error: any) {
    console.log(`   ❌ API discovery failed: ${error.message}`);
    console.log('   (This is expected if no internet connection)');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Infrastructure Test Summary');
  console.log('='.repeat(60));
  console.log(`
IPFS:            ${ipfsInfo.isReal ? '✅ REAL' : '⚠️  MOCK'} (${ipfsInfo.provider})
TLS Verification: ✅ REAL (Node.js HTTPS module)
API Discovery:    ✅ REAL (APIs.guru integration)

To enable real IPFS:
  export IPFS_PROVIDER=pinata
  export PINATA_JWT=your_jwt_from_pinata_cloud

Get free Pinata JWT: https://app.pinata.cloud/developers/api-keys
  `);

  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
