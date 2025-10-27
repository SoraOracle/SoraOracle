// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustlessAPIRegistry
 * @notice Converts AI-discovered APIs into trustless oracle providers through crypto-economic incentives
 * 
 * THE BREAKTHROUGH:
 * - AI discovers APIs (automated, scalable)
 * - APIs must STAKE to be registered (skin in the game)
 * - APIs provide SIGNED data (cryptographically verifiable)
 * - Wrong data = SLASHED (economic penalty)
 * - Right data = REPUTATION (trust builds over time)
 * 
 * This makes AI discovery trustless!
 */
contract TrustlessAPIRegistry is Ownable, ReentrancyGuard {
    
    struct APIProvider {
        string name;
        string endpoint;
        address operator;          // Who operates this API
        uint256 stakeAmount;       // How much they've staked
        uint256 reputationScore;   // Builds over time
        uint256 successfulResponses;
        uint256 failedResponses;
        uint256 totalSlashed;
        bool isActive;
        uint256 registeredAt;
        string[] categories;
    }
    
    struct DataAttestation {
        bytes32 questionHash;      // Hash of the question
        bool outcome;              // YES/NO answer
        uint256 confidence;        // 0-100 (percentage)
        bytes signature;           // Signed by API provider
        uint256 timestamp;
        string dataProof;          // IPFS hash or merkle root
    }
    
    struct ConsensusRequest {
        bytes32 questionHash;
        string question;
        address[] selectedProviders;
        mapping(address => DataAttestation) attestations;
        uint256 attestationCount;
        bool resolved;
        bool finalOutcome;
        uint256 finalConfidence;
        uint256 createdAt;
    }
    
    // Storage
    mapping(string => APIProvider) public providers;  // name => provider
    mapping(address => string[]) public operatorAPIs; // operator => API names
    mapping(bytes32 => ConsensusRequest) public requests;
    mapping(string => bool) public categoryExists;
    
    string[] public allProviderNames;
    string[] public allCategories;
    
    // Constants
    uint256 public constant MIN_STAKE = 1000 * 10**6;  // 1000 USDC minimum
    uint256 public constant SLASH_PERCENTAGE = 20;     // 20% slash for wrong data
    uint256 public constant MIN_CONSENSUS = 3;         // Need 3+ sources
    uint256 public constant CONSENSUS_THRESHOLD = 66;  // 66% agreement
    
    // Events
    event APIRegistered(string indexed name, address indexed operator, uint256 stakeAmount, string[] categories);
    event APIStakeIncreased(string indexed name, uint256 newStake);
    event DataAttested(bytes32 indexed questionHash, string apiName, bool outcome, uint256 confidence);
    event ConsensusReached(bytes32 indexed questionHash, bool outcome, uint256 confidence, uint256 providersUsed);
    event APISlashed(string indexed name, uint256 slashAmount, bytes32 questionHash);
    event ReputationIncreased(string indexed name, uint256 newReputation);
    event CategoryAdded(string category);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Register a new API provider (discovered by AI or manually)
     * @dev Provider must stake USDC to be registered
     */
    function registerAPI(
        string memory name,
        string memory endpoint,
        string[] memory categories,
        bytes memory operatorSignature
    ) external payable nonReentrant {
        require(bytes(providers[name].name).length == 0, "API already registered");
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(bytes(name).length > 0, "Name required");
        require(bytes(endpoint).length > 0, "Endpoint required");
        require(categories.length > 0, "Categories required");
        
        // Verify operator signature (prevents unauthorized registration)
        bytes32 messageHash = keccak256(abi.encodePacked(name, endpoint, msg.sender));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address recovered = recoverSigner(ethSignedHash, operatorSignature);
        require(recovered == msg.sender, "Invalid operator signature");
        
        // Register provider
        providers[name] = APIProvider({
            name: name,
            endpoint: endpoint,
            operator: msg.sender,
            stakeAmount: msg.value,
            reputationScore: 0,
            successfulResponses: 0,
            failedResponses: 0,
            totalSlashed: 0,
            isActive: true,
            registeredAt: block.timestamp,
            categories: categories
        });
        
        operatorAPIs[msg.sender].push(name);
        allProviderNames.push(name);
        
        // Track categories
        for (uint i = 0; i < categories.length; i++) {
            if (!categoryExists[categories[i]]) {
                categoryExists[categories[i]] = true;
                allCategories.push(categories[i]);
                emit CategoryAdded(categories[i]);
            }
        }
        
        emit APIRegistered(name, msg.sender, msg.value, categories);
    }
    
    /**
     * @notice Increase stake for an API provider
     */
    function increaseStake(string memory name) external payable {
        APIProvider storage provider = providers[name];
        require(provider.operator == msg.sender, "Not operator");
        require(msg.value > 0, "No stake sent");
        
        provider.stakeAmount += msg.value;
        emit APIStakeIncreased(name, provider.stakeAmount);
    }
    
    /**
     * @notice Submit signed data attestation for a question
     * @dev Signature proves data came from registered API operator
     */
    function submitAttestation(
        string memory apiName,
        bytes32 questionHash,
        bool outcome,
        uint256 confidence,
        string memory dataProof,  // IPFS hash of raw API response
        bytes memory signature
    ) external {
        APIProvider storage provider = providers[apiName];
        require(provider.isActive, "API not active");
        require(provider.operator == msg.sender, "Not operator");
        require(confidence <= 100, "Invalid confidence");
        
        ConsensusRequest storage request = requests[questionHash];
        require(!request.resolved, "Already resolved");
        
        // Verify signature (proves operator signed this specific data)
        bytes32 messageHash = keccak256(abi.encodePacked(
            questionHash,
            outcome,
            confidence,
            dataProof,
            block.timestamp
        ));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address recovered = recoverSigner(ethSignedHash, signature);
        require(recovered == msg.sender, "Invalid data signature");
        
        // Store attestation
        request.attestations[msg.sender] = DataAttestation({
            questionHash: questionHash,
            outcome: outcome,
            confidence: confidence,
            signature: signature,
            timestamp: block.timestamp,
            dataProof: dataProof
        });
        
        request.attestationCount++;
        
        emit DataAttested(questionHash, apiName, outcome, confidence);
    }
    
    /**
     * @notice Compute consensus from multiple API providers
     * @dev Requires MIN_CONSENSUS providers with CONSENSUS_THRESHOLD agreement
     */
    function computeConsensus(
        bytes32 questionHash,
        address[] memory providerAddresses
    ) external returns (bool outcome, uint256 confidence) {
        ConsensusRequest storage request = requests[questionHash];
        require(!request.resolved, "Already resolved");
        require(providerAddresses.length >= MIN_CONSENSUS, "Need more providers");
        
        uint256 yesCount = 0;
        uint256 noCount = 0;
        uint256 totalConfidence = 0;
        uint256 validAttestations = 0;
        
        // Tally votes weighted by confidence
        for (uint i = 0; i < providerAddresses.length; i++) {
            DataAttestation memory attestation = request.attestations[providerAddresses[i]];
            
            if (attestation.timestamp > 0) {
                validAttestations++;
                totalConfidence += attestation.confidence;
                
                if (attestation.outcome) {
                    yesCount += attestation.confidence;
                } else {
                    noCount += attestation.confidence;
                }
            }
        }
        
        require(validAttestations >= MIN_CONSENSUS, "Insufficient attestations");
        
        // Determine consensus
        uint256 total = yesCount + noCount;
        bool consensusOutcome = yesCount > noCount;
        uint256 agreementPercentage = (consensusOutcome ? yesCount : noCount) * 100 / total;
        
        require(agreementPercentage >= CONSENSUS_THRESHOLD, "No consensus");
        
        // Update provider reputations
        _updateReputations(questionHash, providerAddresses, consensusOutcome);
        
        // Store result
        request.resolved = true;
        request.finalOutcome = consensusOutcome;
        request.finalConfidence = totalConfidence / validAttestations;
        
        emit ConsensusReached(questionHash, consensusOutcome, request.finalConfidence, validAttestations);
        
        return (consensusOutcome, request.finalConfidence);
    }
    
    /**
     * @notice Update provider reputations based on consensus
     * @dev Providers who agreed with consensus get reputation boost, others get slashed
     */
    function _updateReputations(
        bytes32 questionHash,
        address[] memory providerAddresses,
        bool consensusOutcome
    ) private {
        ConsensusRequest storage request = requests[questionHash];
        
        for (uint i = 0; i < providerAddresses.length; i++) {
            address providerAddr = providerAddresses[i];
            DataAttestation memory attestation = request.attestations[providerAddr];
            
            if (attestation.timestamp == 0) continue;
            
            // Find provider name
            string[] memory apis = operatorAPIs[providerAddr];
            for (uint j = 0; j < apis.length; j++) {
                APIProvider storage provider = providers[apis[j]];
                
                if (attestation.outcome == consensusOutcome) {
                    // CORRECT: Increase reputation
                    provider.successfulResponses++;
                    provider.reputationScore += attestation.confidence;
                    emit ReputationIncreased(apis[j], provider.reputationScore);
                    
                } else {
                    // WRONG: Slash stake
                    provider.failedResponses++;
                    uint256 slashAmount = (provider.stakeAmount * SLASH_PERCENTAGE) / 100;
                    provider.stakeAmount -= slashAmount;
                    provider.totalSlashed += slashAmount;
                    
                    // Deactivate if stake too low
                    if (provider.stakeAmount < MIN_STAKE) {
                        provider.isActive = false;
                    }
                    
                    emit APISlashed(apis[j], slashAmount, questionHash);
                }
            }
        }
    }
    
    /**
     * @notice Get providers for a specific category
     */
    function getProvidersForCategory(string memory category) 
        external 
        view 
        returns (string[] memory) 
    {
        uint256 count = 0;
        
        // Count matching providers
        for (uint i = 0; i < allProviderNames.length; i++) {
            APIProvider memory provider = providers[allProviderNames[i]];
            if (!provider.isActive) continue;
            
            for (uint j = 0; j < provider.categories.length; j++) {
                if (keccak256(bytes(provider.categories[j])) == keccak256(bytes(category))) {
                    count++;
                    break;
                }
            }
        }
        
        // Build result array
        string[] memory result = new string[](count);
        uint256 index = 0;
        
        for (uint i = 0; i < allProviderNames.length; i++) {
            APIProvider memory provider = providers[allProviderNames[i]];
            if (!provider.isActive) continue;
            
            for (uint j = 0; j < provider.categories.length; j++) {
                if (keccak256(bytes(provider.categories[j])) == keccak256(bytes(category))) {
                    result[index] = allProviderNames[i];
                    index++;
                    break;
                }
            }
        }
        
        return result;
    }
    
    /**
     * @notice Recover signer from signature
     */
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) 
        private 
        pure 
        returns (address) 
    {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        return ecrecover(ethSignedHash, v, r, s);
    }
    
    /**
     * @notice Get all active providers
     */
    function getAllActiveProviders() external view returns (string[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < allProviderNames.length; i++) {
            if (providers[allProviderNames[i]].isActive) {
                count++;
            }
        }
        
        string[] memory result = new string[](count);
        uint256 index = 0;
        
        for (uint i = 0; i < allProviderNames.length; i++) {
            if (providers[allProviderNames[i]].isActive) {
                result[index] = allProviderNames[i];
                index++;
            }
        }
        
        return result;
    }
}
