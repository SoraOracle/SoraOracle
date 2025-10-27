// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OracleReputationTracker
 * @notice Tracks oracle provider performance, accuracy, and reputation metrics
 * @dev Decentralized reputation system for oracle providers
 */
contract OracleReputationTracker is Ownable {
    
    struct ProviderStats {
        uint256 totalAnswers;
        uint256 totalEarnings;
        uint256 challengesLost;
        uint256 challengesWon;
        uint256 avgConfidenceScore;
        uint256 avgResponseTime;
        uint256 firstAnswerTimestamp;
        uint256 lastAnswerTimestamp;
        bool isActive;
    }
    
    struct AnswerRecord {
        uint256 questionId;
        uint256 timestamp;
        uint8 confidenceScore;
        uint256 responseTime;
        bool challenged;
        bool challengeResult; // true if provider won
        uint256 earnings;
    }
    
    mapping(address => ProviderStats) public providerStats;
    mapping(address => AnswerRecord[]) public providerHistory;
    mapping(address => mapping(uint256 => bool)) public hasRecorded;
    mapping(address => bool) public authorizedRecorders;
    
    address[] public allProviders;
    
    event AnswerRecorded(
        address indexed provider,
        uint256 indexed questionId,
        uint256 earnings,
        uint8 confidenceScore
    );
    
    event ChallengeRecorded(
        address indexed provider,
        uint256 indexed questionId,
        bool providerWon
    );
    
    event ProviderActivated(address indexed provider);
    event ProviderDeactivated(address indexed provider);
    event RecorderAuthorized(address indexed recorder);
    event RecorderRevoked(address indexed recorder);
    
    modifier onlyAuthorized() {
        require(
            authorizedRecorders[msg.sender] || msg.sender == owner(),
            "Not authorized to record"
        );
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Authorize an address to record answers (e.g., oracle contract, bot)
     * @param _recorder Address to authorize
     */
    function authorizeRecorder(address _recorder) external onlyOwner {
        require(_recorder != address(0), "Invalid recorder");
        authorizedRecorders[_recorder] = true;
        emit RecorderAuthorized(_recorder);
    }
    
    /**
     * @notice Revoke recorder authorization
     * @param _recorder Address to revoke
     */
    function revokeRecorder(address _recorder) external onlyOwner {
        authorizedRecorders[_recorder] = false;
        emit RecorderRevoked(_recorder);
    }
    
    /**
     * @notice Record a new answer provided by an oracle
     * @param _provider Address of the oracle provider
     * @param _questionId Question ID that was answered
     * @param _questionTimestamp When the question was asked
     * @param _answerTimestamp When the answer was provided
     * @param _confidenceScore Confidence score (0-100)
     * @param _earnings Amount earned for this answer
     */
    function recordAnswer(
        address _provider,
        uint256 _questionId,
        uint256 _questionTimestamp,
        uint256 _answerTimestamp,
        uint8 _confidenceScore,
        uint256 _earnings
    ) external onlyAuthorized {
        require(_provider != address(0), "Invalid provider");
        require(!hasRecorded[_provider][_questionId], "Already recorded");
        require(_answerTimestamp >= _questionTimestamp, "Invalid timestamps");
        
        ProviderStats storage stats = providerStats[_provider];
        
        // Initialize if first answer
        if (stats.totalAnswers == 0) {
            stats.firstAnswerTimestamp = _answerTimestamp;
            stats.isActive = true;
            allProviders.push(_provider);
            emit ProviderActivated(_provider);
        }
        
        // Calculate response time
        uint256 responseTime = _answerTimestamp - _questionTimestamp;
        
        // Update rolling averages
        stats.avgConfidenceScore = (
            (stats.avgConfidenceScore * stats.totalAnswers) + _confidenceScore
        ) / (stats.totalAnswers + 1);
        
        stats.avgResponseTime = (
            (stats.avgResponseTime * stats.totalAnswers) + responseTime
        ) / (stats.totalAnswers + 1);
        
        // Update stats
        stats.totalAnswers++;
        stats.totalEarnings += _earnings;
        stats.lastAnswerTimestamp = _answerTimestamp;
        
        // Record answer
        providerHistory[_provider].push(AnswerRecord({
            questionId: _questionId,
            timestamp: _answerTimestamp,
            confidenceScore: _confidenceScore,
            responseTime: responseTime,
            challenged: false,
            challengeResult: false,
            earnings: _earnings
        }));
        
        hasRecorded[_provider][_questionId] = true;
        
        emit AnswerRecorded(_provider, _questionId, _earnings, _confidenceScore);
    }
    
    /**
     * @notice Record the result of a challenge/dispute
     * @param _provider Oracle provider address
     * @param _questionId Question that was challenged
     * @param _providerWon True if provider's answer was upheld
     */
    function recordChallenge(
        address _provider,
        uint256 _questionId,
        bool _providerWon
    ) external onlyAuthorized {
        require(hasRecorded[_provider][_questionId], "Answer not recorded");
        
        ProviderStats storage stats = providerStats[_provider];
        
        if (_providerWon) {
            stats.challengesWon++;
        } else {
            stats.challengesLost++;
        }
        
        // Update answer record
        AnswerRecord[] storage history = providerHistory[_provider];
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i].questionId == _questionId) {
                history[i].challenged = true;
                history[i].challengeResult = _providerWon;
                break;
            }
        }
        
        emit ChallengeRecorded(_provider, _questionId, _providerWon);
    }
    
    /**
     * @notice Calculate reputation score for a provider (0-1000)
     * @param _provider Provider address
     * @return score Reputation score
     */
    function getReputationScore(address _provider) external view returns (uint256 score) {
        ProviderStats memory stats = providerStats[_provider];
        
        if (stats.totalAnswers == 0) {
            return 0;
        }
        
        // Base score from total answers (max 300 points)
        uint256 volumeScore = stats.totalAnswers > 100 
            ? 300 
            : (stats.totalAnswers * 3);
        
        // Accuracy score from challenges (max 400 points)
        uint256 totalChallenges = stats.challengesWon + stats.challengesLost;
        uint256 accuracyScore = totalChallenges == 0 
            ? 400 
            : (stats.challengesWon * 400) / totalChallenges;
        
        // Confidence score (max 200 points)
        uint256 confidenceScore = (stats.avgConfidenceScore * 2);
        
        // Speed bonus (max 100 points) - faster responses = higher score
        uint256 speedScore = 100;
        if (stats.avgResponseTime > 1 days) {
            speedScore = 50;
        } else if (stats.avgResponseTime > 12 hours) {
            speedScore = 75;
        }
        
        score = volumeScore + accuracyScore + confidenceScore + speedScore;
    }
    
    /**
     * @notice Get provider statistics
     * @param _provider Provider address
     * @return stats Provider statistics
     */
    function getProviderStats(address _provider) external view returns (ProviderStats memory stats) {
        return providerStats[_provider];
    }
    
    /**
     * @notice Get provider answer history
     * @param _provider Provider address
     * @param _offset Starting index
     * @param _limit Number of records to return
     * @return records Answer records
     */
    function getProviderHistory(
        address _provider,
        uint256 _offset,
        uint256 _limit
    ) external view returns (AnswerRecord[] memory records) {
        AnswerRecord[] storage history = providerHistory[_provider];
        
        if (_offset >= history.length) {
            return new AnswerRecord[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > history.length) {
            end = history.length;
        }
        
        uint256 resultLength = end - _offset;
        records = new AnswerRecord[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            records[i] = history[_offset + i];
        }
    }
    
    /**
     * @notice Get total number of oracle providers
     * @return Total providers count
     */
    function getTotalProviders() external view returns (uint256) {
        return allProviders.length;
    }
    
    /**
     * @notice Get leaderboard of top providers
     * @param _limit Number of top providers to return
     * @return providers Array of provider addresses sorted by reputation
     * @return scores Array of reputation scores
     */
    function getLeaderboard(uint256 _limit) 
        external 
        view 
        returns (address[] memory providers, uint256[] memory scores) 
    {
        uint256 totalProviders = allProviders.length;
        uint256 resultLength = _limit > totalProviders ? totalProviders : _limit;
        
        providers = new address[](resultLength);
        scores = new uint256[](resultLength);
        
        // Simple selection (not optimized for large datasets)
        for (uint256 i = 0; i < resultLength; i++) {
            uint256 maxScore = 0;
            address maxProvider = address(0);
            
            for (uint256 j = 0; j < totalProviders; j++) {
                address provider = allProviders[j];
                uint256 score = this.getReputationScore(provider);
                
                // Check if already in results
                bool alreadyAdded = false;
                for (uint256 k = 0; k < i; k++) {
                    if (providers[k] == provider) {
                        alreadyAdded = true;
                        break;
                    }
                }
                
                if (!alreadyAdded && score > maxScore) {
                    maxScore = score;
                    maxProvider = provider;
                }
            }
            
            providers[i] = maxProvider;
            scores[i] = maxScore;
        }
    }
    
    /**
     * @notice Mark a provider as inactive (owner only)
     * @param _provider Provider to deactivate
     */
    function deactivateProvider(address _provider) external onlyOwner {
        providerStats[_provider].isActive = false;
        emit ProviderDeactivated(_provider);
    }
}
