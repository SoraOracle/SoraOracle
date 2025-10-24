// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SoraOracle.sol";
import "./SimplePredictionMarket.sol";

/**
 * @title AutomatedMarketResolver
 * @notice Automated helper contract for resolving prediction markets
 * @dev Monitors oracle answers and automatically resolves markets when conditions are met
 */
contract AutomatedMarketResolver {
    
    SoraOracle public immutable oracle;
    SimplePredictionMarket public immutable market;
    
    uint256 public constant MIN_CONFIDENCE_THRESHOLD = 80;
    
    event MarketAutoResolved(
        uint256 indexed marketId,
        uint256 indexed questionId,
        bool outcome,
        uint8 confidence
    );
    
    event ResolutionFailed(
        uint256 indexed marketId,
        string reason
    );
    
    constructor(address _oracle, address _market) {
        require(_oracle != address(0), "Invalid oracle");
        require(_market != address(0), "Invalid market");
        oracle = SoraOracle(payable(_oracle));
        market = SimplePredictionMarket(_market);
    }
    
    /**
     * @notice Automatically resolve a market if oracle answer meets requirements
     * @param _marketId Market ID to resolve
     * @return success True if market was resolved
     */
    function tryResolveMarket(uint256 _marketId) 
        external 
        returns (bool success) 
    {
        // Get market details
        SimplePredictionMarket.Market memory marketData;
        (
            marketData.question,
            marketData.questionId,
            marketData.resolutionTime,
            marketData.yesPool,
            marketData.noPool,
            marketData.status,
            marketData.outcome,
            marketData.totalFees
        ) = market.markets(_marketId);
        
        uint256 questionId = marketData.questionId;
        SimplePredictionMarket.MarketStatus status = marketData.status;
        
        // Verify market is still open or closed (not resolved)
        if (
            status != SimplePredictionMarket.MarketStatus.OPEN &&
            status != SimplePredictionMarket.MarketStatus.CLOSED
        ) {
            emit ResolutionFailed(_marketId, "Market already resolved or canceled");
            return false;
        }
        
        // Get oracle answer
        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(questionId);
        
        // Check if answer exists
        if (answer.provider == address(0)) {
            emit ResolutionFailed(_marketId, "No answer yet");
            return false;
        }
        
        // Check confidence threshold
        if (answer.confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
            emit ResolutionFailed(_marketId, "Confidence too low");
            return false;
        }
        
        // Resolve market
        try market.resolveMarket(_marketId) {
            emit MarketAutoResolved(
                _marketId,
                questionId,
                answer.boolAnswer,
                answer.confidenceScore
            );
            return true;
        } catch Error(string memory reason) {
            emit ResolutionFailed(_marketId, reason);
            return false;
        } catch {
            emit ResolutionFailed(_marketId, "Unknown error");
            return false;
        }
    }
    
    /**
     * @notice Batch resolve multiple markets
     * @param _marketIds Array of market IDs to resolve
     * @return successCount Number of successfully resolved markets
     */
    function batchResolveMarkets(uint256[] calldata _marketIds) 
        external 
        returns (uint256 successCount) 
    {
        for (uint256 i = 0; i < _marketIds.length; i++) {
            if (this.tryResolveMarket(_marketIds[i])) {
                successCount++;
            }
        }
    }
    
    /**
     * @notice Check if a market is ready to be resolved
     * @param _marketId Market ID
     * @return ready True if market can be resolved
     * @return reason Reason why it can or cannot be resolved
     */
    function canResolveMarket(uint256 _marketId) 
        external 
        view 
        returns (bool ready, string memory reason) 
    {
        // Get market details
        SimplePredictionMarket.Market memory marketData;
        (
            marketData.question,
            marketData.questionId,
            marketData.resolutionTime,
            marketData.yesPool,
            marketData.noPool,
            marketData.status,
            marketData.outcome,
            marketData.totalFees
        ) = market.markets(_marketId);
        
        uint256 questionId = marketData.questionId;
        uint256 resolutionTime = marketData.resolutionTime;
        SimplePredictionMarket.MarketStatus status = marketData.status;
        
        // Check market status
        if (status == SimplePredictionMarket.MarketStatus.RESOLVED) {
            return (false, "Already resolved");
        }
        
        if (status == SimplePredictionMarket.MarketStatus.CANCELED) {
            return (false, "Market canceled");
        }
        
        // Check if resolution time has passed
        if (block.timestamp < resolutionTime) {
            return (false, "Resolution time not reached");
        }
        
        // Get oracle answer
        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(questionId);
        
        if (answer.provider == address(0)) {
            return (false, "No answer yet");
        }
        
        if (answer.confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
            return (false, "Confidence too low");
        }
        
        return (true, "Ready to resolve");
    }
    
    /**
     * @notice Get batch resolution status for multiple markets
     * @param _marketIds Array of market IDs
     * @return readyMarkets Array of market IDs that are ready to resolve
     */
    function getBatchResolutionStatus(uint256[] calldata _marketIds) 
        external 
        view 
        returns (uint256[] memory readyMarkets) 
    {
        uint256 readyCount = 0;
        uint256[] memory temp = new uint256[](_marketIds.length);
        
        for (uint256 i = 0; i < _marketIds.length; i++) {
            (bool ready, ) = this.canResolveMarket(_marketIds[i]);
            if (ready) {
                temp[readyCount] = _marketIds[i];
                readyCount++;
            }
        }
        
        readyMarkets = new uint256[](readyCount);
        for (uint256 i = 0; i < readyCount; i++) {
            readyMarkets[i] = temp[i];
        }
    }
}
