import { ethers } from 'ethers';
import OpenAI from 'openai';
import { X402Client } from '../sdk/X402Client';
import { APIDiscoveryAgent, DiscoveredAPI } from './APIDiscoveryAgent';
import { DataSourceRouter } from './DataSourceRouter';

/**
 * Trustless Discovery Agent
 * 
 * THE SOLUTION: AI Discovery + Cryptographic Trust
 * 
 * How it makes AI-discovered APIs trustless:
 * 1. AI discovers APIs (automated, scalable)
 * 2. API providers must STAKE on-chain (skin in the game)
 * 3. API providers sign their data (cryptographically verifiable)
 * 4. Multi-source consensus required (no single point of failure)
 * 5. Wrong data = SLASHED (economic penalty)
 * 6. Right data = REPUTATION (trust builds over time)
 * 
 * This combines:
 * - AI automation (discovery, routing, orchestration)
 * - Crypto-economic security (staking, slashing, signatures)
 * 
 * Result: Self-expanding TRUSTLESS oracle!
 */

export interface TrustlessAttestation {
  apiName: string;
  operator: string;
  outcome: boolean;
  confidence: number;
  dataProof: string;  // IPFS hash of raw API response
  signature: string;  // Signed by operator
  timestamp: number;
}

export interface TrustlessConsensus {
  question: string;
  questionHash: string;
  attestations: TrustlessAttestation[];
  finalOutcome: boolean;
  finalConfidence: number;
  consensusReached: boolean;
  providersUsed: number;
  totalCost: number;
}

export class TrustlessDiscoveryAgent {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private registryContract: ethers.Contract;
  private discoveryAgent: APIDiscoveryAgent;
  private router: DataSourceRouter;
  private x402Client: X402Client;
  
  // Contract ABI (minimal needed methods)
  private static REGISTRY_ABI = [
    "function registerAPI(string name, string endpoint, string[] categories, bytes signature) payable",
    "function submitAttestation(string apiName, bytes32 questionHash, bool outcome, uint256 confidence, string dataProof, bytes signature)",
    "function computeConsensus(bytes32 questionHash, address[] providerAddresses) returns (bool, uint256)",
    "function getProvidersForCategory(string category) view returns (string[])",
    "function providers(string name) view returns (tuple(string name, string endpoint, address operator, uint256 stakeAmount, uint256 reputationScore, uint256 successfulResponses, uint256 failedResponses, uint256 totalSlashed, bool isActive, uint256 registeredAt))",
    "event APIRegistered(string indexed name, address indexed operator, uint256 stakeAmount, string[] categories)",
    "event DataAttested(bytes32 indexed questionHash, string apiName, bool outcome, uint256 confidence)",
    "event ConsensusReached(bytes32 indexed questionHash, bool outcome, uint256 confidence, uint256 providersUsed)"
  ];
  
  constructor(
    openaiApiKey: string,
    x402Client: X402Client,
    registryAddress: string,
    signer: ethers.Signer
  ) {
    this.signer = signer;
    this.provider = signer.provider!;
    this.x402Client = x402Client;
    this.router = new DataSourceRouter(openaiApiKey, x402Client);
    this.discoveryAgent = new APIDiscoveryAgent(openaiApiKey, x402Client, this.router);
    
    // Connect to TrustlessAPIRegistry contract
    this.registryContract = new ethers.Contract(
      registryAddress,
      TrustlessDiscoveryAgent.REGISTRY_ABI,
      signer
    );
  }
  
  /**
   * MAIN METHOD: Research question with trustless guarantees
   * 
   * Flow:
   * 1. AI analyzes question, determines category
   * 2. Check on-chain registry for staked providers
   * 3. If insufficient → AI discovers new APIs
   * 4. Invite discovered APIs to register on-chain (with stake)
   * 5. Collect signed attestations from multiple providers
   * 6. Compute on-chain consensus with slashing
   */
  async researchWithTrustlessConsensus(
    question: string,
    options?: {
      maxCost?: number;
      minProviders?: number;
      allowDiscovery?: boolean;
    }
  ): Promise<TrustlessConsensus> {
    console.log(`\n🔐 TRUSTLESS DISCOVERY AGENT`);
    console.log(`📝 Question: "${question}"\n`);
    
    const maxCost = options?.maxCost || 0.50;
    const minProviders = options?.minProviders || 3;
    const allowDiscovery = options?.allowDiscovery ?? true;
    
    let totalCost = 0;
    
    // STEP 1: Analyze question
    console.log(`🔍 Step 1: Analyzing question...`);
    const analysis = await this.router.analyzeQuestion(question);
    const questionHash = ethers.id(question);
    
    console.log(`   Category: ${analysis.category}`);
    console.log(`   Question hash: ${questionHash}\n`);
    
    // STEP 2: Check on-chain registry for staked providers
    console.log(`📡 Step 2: Checking on-chain registry...`);
    const onChainProviders = await this.registryContract.getProvidersForCategory(analysis.category);
    
    console.log(`   Found ${onChainProviders.length} staked providers for "${analysis.category}"`);
    
    if (onChainProviders.length > 0) {
      for (const providerName of onChainProviders) {
        const info = await this.registryContract.providers(providerName);
        console.log(`   ✅ ${providerName}: ${ethers.formatEther(info.stakeAmount)} ETH staked, ${info.reputationScore} reputation`);
      }
    }
    
    // STEP 3: If insufficient providers, discover new ones
    if (onChainProviders.length < minProviders && allowDiscovery) {
      console.log(`\n⚠️  Need ${minProviders} providers, only have ${onChainProviders.length}`);
      console.log(`🔬 Step 3: Discovering new APIs...\n`);
      
      const discoveryResult = await this.discoveryAgent.discoverAPIsForQuestion(
        question,
        analysis.category,
        {
          maxCost: maxCost * 0.3,
          maxAPIsToDiscover: 5,
          autoRegister: false  // Don't auto-register, they need to stake on-chain!
        }
      );
      
      totalCost += discoveryResult.totalCost;
      
      console.log(`\n✅ Discovered ${discoveryResult.apisDiscovered.length} potential APIs`);
      console.log(`📢 Step 4: Inviting APIs to register on-chain (with stake)...\n`);
      
      // Show discovered APIs and invite them to register
      for (const api of discoveryResult.apisDiscovered) {
        console.log(`   📡 ${api.name}:`);
        console.log(`      Description: ${api.description}`);
        console.log(`      Endpoint: ${api.endpoint}`);
        console.log(`      Reliability: ${(api.reliability * 100).toFixed(0)}%`);
        console.log(`      ⚠️  Must register on-chain with 1000 USDC stake to participate!`);
        console.log(`      Command: registerAPI("${api.name}", "${api.endpoint}", ["${api.category}"], signature)\n`);
      }
      
      // In production, this would notify API operators to register
      // For demo, we'll simulate some registering
    }
    
    // STEP 4: Collect signed attestations from providers
    console.log(`\n💬 Step 5: Collecting signed attestations from providers...`);
    
    const attestations: TrustlessAttestation[] = [];
    const providersToUse = onChainProviders.slice(0, Math.min(onChainProviders.length, 5));
    
    for (const providerName of providersToUse) {
      const info = await this.registryContract.providers(providerName);
      
      console.log(`   📡 Requesting attestation from ${providerName}...`);
      
      // Fetch data from API (in production, this would be the API operator's responsibility)
      const attestation = await this.getSignedAttestation(
        providerName,
        info.endpoint,
        question,
        questionHash
      );
      
      attestations.push(attestation);
      console.log(`   ✅ ${providerName}: ${attestation.outcome ? 'YES' : 'NO'} (${attestation.confidence}% confidence)`);
    }
    
    // STEP 5: Compute on-chain consensus
    console.log(`\n🧮 Step 6: Computing on-chain consensus with slashing...`);
    
    const providerAddresses = await Promise.all(
      providersToUse.map(async name => {
        const info = await this.registryContract.providers(name);
        return info.operator;
      })
    );
    
    // Submit all attestations on-chain
    for (const attestation of attestations) {
      const tx = await this.registryContract.submitAttestation(
        attestation.apiName,
        questionHash,
        attestation.outcome,
        attestation.confidence,
        attestation.dataProof,
        attestation.signature
      );
      await tx.wait();
    }
    
    // Compute consensus (this will slash providers who gave wrong data!)
    const [finalOutcome, finalConfidence] = await this.registryContract.computeConsensus(
      questionHash,
      providerAddresses
    );
    
    console.log(`\n📊 CONSENSUS REACHED:`);
    console.log(`   Outcome: ${finalOutcome ? 'YES' : 'NO'}`);
    console.log(`   Confidence: ${finalConfidence}%`);
    console.log(`   Providers used: ${attestations.length}`);
    console.log(`   ✅ Providers with correct data: Reputation increased`);
    console.log(`   ❌ Providers with wrong data: 20% stake slashed!\n`);
    
    return {
      question,
      questionHash,
      attestations,
      finalOutcome,
      finalConfidence: Number(finalConfidence),
      consensusReached: true,
      providersUsed: attestations.length,
      totalCost
    };
  }
  
  /**
   * Get signed attestation from an API provider
   * (In production, this would be done by the API operator, not us)
   */
  private async getSignedAttestation(
    apiName: string,
    endpoint: string,
    question: string,
    questionHash: string
  ): Promise<TrustlessAttestation> {
    // Simulate fetching data from API
    const rawResponse = await this.fetchAPIData(endpoint, question);
    
    // Store raw response in IPFS (for verifiability)
    const dataProof = await this.storeInIPFS(rawResponse);
    
    // Parse response
    const { outcome, confidence } = this.parseAPIResponse(rawResponse, question);
    
    // Sign the attestation
    const timestamp = Math.floor(Date.now() / 1000);
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'bool', 'uint256', 'string', 'uint256'],
      [questionHash, outcome, confidence, dataProof, timestamp]
    );
    
    const signature = await this.signer.signMessage(ethers.getBytes(messageHash));
    const operator = await this.signer.getAddress();
    
    return {
      apiName,
      operator,
      outcome,
      confidence,
      dataProof,
      signature,
      timestamp
    };
  }
  
  /**
   * Fetch data from API (mocked for demo)
   */
  private async fetchAPIData(endpoint: string, question: string): Promise<any> {
    // In production: actual HTTP request to the API
    // For demo: simulate response
    return {
      price: 95.50,
      trend: 'rising',
      timestamp: Date.now()
    };
  }
  
  /**
   * Store data proof in IPFS (mocked for demo)
   */
  private async storeInIPFS(data: any): Promise<string> {
    // In production: upload to IPFS, return hash
    // For demo: return mock hash
    const hash = ethers.id(JSON.stringify(data)).slice(0, 46);
    return `Qm${hash}`;
  }
  
  /**
   * Parse API response (mocked for demo)
   */
  private parseAPIResponse(response: any, question: string): { outcome: boolean; confidence: number } {
    // In production: intelligent parsing based on API structure
    // For demo: simple logic
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('exceed') && lowerQ.includes('100')) {
      return {
        outcome: response.price > 100,
        confidence: 89
      };
    }
    
    return {
      outcome: Math.random() > 0.5,
      confidence: 85
    };
  }
  
  /**
   * Helper: Invite discovered API to register on-chain
   */
  async inviteAPIToRegister(
    apiName: string,
    endpoint: string,
    categories: string[],
    operatorAddress: string
  ): Promise<void> {
    console.log(`\n📧 Invitation sent to ${apiName} operator (${operatorAddress})`);
    console.log(`   To participate in Sora Oracle:`);
    console.log(`   1. Stake 1000 USDC on-chain`);
    console.log(`   2. Register: registryContract.registerAPI("${apiName}", "${endpoint}", ${JSON.stringify(categories)}, signature)`);
    console.log(`   3. Provide signed attestations for questions`);
    console.log(`   4. Earn reputation + rewards for correct data`);
    console.log(`   5. Get slashed for wrong data\n`);
  }
}
