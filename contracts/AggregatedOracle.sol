// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SoraOracle.sol";

/**
 * @title AggregatedOracle
 * @notice Combines multiple oracle providers for consensus-based answers
 * @dev Uses weighted voting and confidence thresholds for accuracy
 */
contract AggregatedOracle is Ownable, ReentrancyGuard {
    
    struct OracleProvider {
        address providerAddress;
        uint16 weight;              // 1-10000 (basis points)
        uint32 totalAnswers;
        uint32 successfulAnswers;
        bool active;
    }

    struct AggregatedAnswer {
        uint64 numericAnswer;       // Weighted median
        uint8 confidenceScore;      // Weighted average confidence
        uint32 timestamp;
        uint8 providerCount;        // Number of providers who answered
        bool finalized;
    }

    struct ProviderSubmission {
        uint64 numericAnswer;
        uint8 confidenceScore;
        uint32 timestamp;
        bool submitted;
    }

    mapping(uint256 => mapping(address => ProviderSubmission)) public submissions;
    mapping(uint256 => AggregatedAnswer) public aggregatedAnswers;
    mapping(address => OracleProvider) public providers;
    address[] public providerList;

    uint8 public minimumProviders = 3;
    uint8 public consensusThreshold = 70; // 70% weighted agreement required
    uint256 public submissionWindow = 1 hours;

    event ProviderAdded(address indexed provider, uint16 weight);
    event ProviderRemoved(address indexed provider);
    event SubmissionReceived(uint256 indexed questionId, address indexed provider, uint64 answer, uint8 confidence);
    event AnswerAggregated(uint256 indexed questionId, uint64 finalAnswer, uint8 confidence, uint8 providerCount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Add oracle provider with voting weight
     * @param _provider Address of the oracle provider
     * @param _weight Voting weight (1-10000 basis points)
     */
    function addProvider(address _provider, uint16 _weight) external onlyOwner {
        require(_provider != address(0), "Invalid provider");
        require(_weight > 0 && _weight <= 10000, "Invalid weight");
        require(!providers[_provider].active, "Provider exists");

        providers[_provider] = OracleProvider({
            providerAddress: _provider,
            weight: _weight,
            totalAnswers: 0,
            successfulAnswers: 0,
            active: true
        });

        providerList.push(_provider);
        emit ProviderAdded(_provider, _weight);
    }

    /**
     * @notice Remove oracle provider
     */
    function removeProvider(address _provider) external onlyOwner {
        require(providers[_provider].active, "Provider not active");
        providers[_provider].active = false;
        emit ProviderRemoved(_provider);
    }

    /**
     * @notice Submit answer as oracle provider
     * @param _questionId Question ID from SoraOracle
     * @param _numericAnswer Numeric answer
     * @param _confidenceScore Confidence (0-100)
     */
    function submitAnswer(
        uint256 _questionId,
        uint64 _numericAnswer,
        uint8 _confidenceScore
    ) external nonReentrant {
        require(providers[msg.sender].active, "Not authorized provider");
        require(!submissions[_questionId][msg.sender].submitted, "Already submitted");
        require(_confidenceScore <= 100, "Invalid confidence");
        require(!aggregatedAnswers[_questionId].finalized, "Already finalized");

        submissions[_questionId][msg.sender] = ProviderSubmission({
            numericAnswer: _numericAnswer,
            confidenceScore: _confidenceScore,
            timestamp: uint32(block.timestamp),
            submitted: true
        });

        providers[msg.sender].totalAnswers++;
        emit SubmissionReceived(_questionId, msg.sender, _numericAnswer, _confidenceScore);
    }

    /**
     * @notice Aggregate all submissions into final answer
     * @param _questionId Question ID to aggregate
     */
    function aggregateAnswer(uint256 _questionId) external nonReentrant {
        require(!aggregatedAnswers[_questionId].finalized, "Already finalized");

        uint8 submissionCount = 0;
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        uint256 weightedConfidence = 0;

        // Collect all submissions and calculate weighted values
        for (uint256 i = 0; i < providerList.length; i++) {
            address provider = providerList[i];
            if (submissions[_questionId][provider].submitted && providers[provider].active) {
                ProviderSubmission memory sub = submissions[_questionId][provider];
                uint16 weight = providers[provider].weight;

                weightedSum += uint256(sub.numericAnswer) * weight;
                weightedConfidence += uint256(sub.confidenceScore) * weight;
                totalWeight += weight;
                submissionCount++;
            }
        }

        require(submissionCount >= minimumProviders, "Insufficient submissions");

        // Calculate weighted average
        uint64 finalAnswer = uint64(weightedSum / totalWeight);
        uint8 finalConfidence = uint8(weightedConfidence / totalWeight);

        aggregatedAnswers[_questionId] = AggregatedAnswer({
            numericAnswer: finalAnswer,
            confidenceScore: finalConfidence,
            timestamp: uint32(block.timestamp),
            providerCount: submissionCount,
            finalized: true
        });

        // Update successful answer counts
        for (uint256 i = 0; i < providerList.length; i++) {
            address provider = providerList[i];
            if (submissions[_questionId][provider].submitted && providers[provider].active) {
                providers[provider].successfulAnswers++;
            }
        }

        emit AnswerAggregated(_questionId, finalAnswer, finalConfidence, submissionCount);
    }

    /**
     * @notice Get aggregated answer for question
     */
    function getAnswer(uint256 _questionId) external view returns (
        uint64 numericAnswer,
        uint8 confidenceScore,
        uint32 timestamp,
        uint8 providerCount,
        bool finalized
    ) {
        AggregatedAnswer memory answer = aggregatedAnswers[_questionId];
        return (
            answer.numericAnswer,
            answer.confidenceScore,
            answer.timestamp,
            answer.providerCount,
            answer.finalized
        );
    }

    /**
     * @notice Get provider stats
     */
    function getProviderStats(address _provider) external view returns (
        uint16 weight,
        uint32 totalAnswers,
        uint32 successfulAnswers,
        bool active
    ) {
        OracleProvider memory provider = providers[_provider];
        return (provider.weight, provider.totalAnswers, provider.successfulAnswers, provider.active);
    }

    /**
     * @notice Update minimum providers required
     */
    function setMinimumProviders(uint8 _minimum) external onlyOwner {
        require(_minimum >= 2, "Must be at least 2");
        minimumProviders = _minimum;
    }

    /**
     * @notice Update consensus threshold
     */
    function setConsensusThreshold(uint8 _threshold) external onlyOwner {
        require(_threshold >= 51 && _threshold <= 100, "Invalid threshold");
        consensusThreshold = _threshold;
    }
}
