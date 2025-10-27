// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimplePredictionMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BatchPayoutDistributor
 * @notice Automatically distributes winnings to all market participants
 * @dev Enables gas-efficient batch payouts instead of individual claims
 */
contract BatchPayoutDistributor is Ownable, ReentrancyGuard {
    
    SimplePredictionMarket public immutable market;
    
    // Track distributed payouts to prevent double-claims
    mapping(uint256 => mapping(address => bool)) public distributed;
    
    event BatchDistributionStarted(uint256 indexed marketId, uint256 participantCount);
    event WinningsDistributed(uint256 indexed marketId, address indexed winner, uint256 amount);
    event DistributionFailed(uint256 indexed marketId, address indexed participant, string reason);
    event DistributionCompleted(uint256 indexed marketId, uint256 successCount, uint256 failureCount);
    
    constructor(address _market) Ownable(msg.sender) {
        require(_market != address(0), "Invalid market");
        market = SimplePredictionMarket(_market);
    }
    
    /**
     * @notice Batch distribute winnings to all participants in a resolved market
     * @param _marketId Market ID
     * @param _participants Array of all addresses that participated in the market
     * @dev Caller must provide participant list since contract can't enumerate mappings
     * @return successCount Number of successful distributions
     * @return failureCount Number of failed distributions
     */
    function distributeWinnings(
        uint256 _marketId,
        address[] calldata _participants
    ) 
        external
        nonReentrant
        returns (uint256 successCount, uint256 failureCount)
    {
        require(_participants.length > 0, "No participants");
        require(_participants.length <= 100, "Too many participants, split into batches");
        
        // Verify market is resolved
        SimplePredictionMarket.Market memory marketData = market.getMarket(_marketId);
        require(
            marketData.status == SimplePredictionMarket.MarketStatus.RESOLVED,
            "Market not resolved"
        );
        
        emit BatchDistributionStarted(_marketId, _participants.length);
        
        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            
            // Skip if already distributed
            if (distributed[_marketId][participant]) {
                continue;
            }
            
            // Check if participant has winnings
            uint256 winnings = market.calculateWinnings(_marketId, participant);
            
            if (winnings == 0) {
                failureCount++;
                emit DistributionFailed(_marketId, participant, "No winnings");
                continue;
            }
            
            // Check if already claimed directly
            SimplePredictionMarket.Position memory position = market.getPosition(_marketId, participant);
            if (position.claimed) {
                distributed[_marketId][participant] = true;
                failureCount++;
                emit DistributionFailed(_marketId, participant, "Already claimed");
                continue;
            }
            
            // Attempt distribution via market's claimWinnings
            // We use a try-catch to handle any failures gracefully
            try this._distributeSingle(_marketId, participant) {
                distributed[_marketId][participant] = true;
                successCount++;
                emit WinningsDistributed(_marketId, participant, winnings);
            } catch Error(string memory reason) {
                failureCount++;
                emit DistributionFailed(_marketId, participant, reason);
            } catch {
                failureCount++;
                emit DistributionFailed(_marketId, participant, "Unknown error");
            }
        }
        
        emit DistributionCompleted(_marketId, successCount, failureCount);
    }
    
    /**
     * @notice Internal helper to distribute to a single participant
     * @dev Separated for try-catch in batch distribution
     * @param _marketId Market ID
     * @param _participant Participant address
     */
    function _distributeSingle(uint256 _marketId, address _participant) external {
        require(msg.sender == address(this), "Internal only");
        
        // Use delegated claiming (requires this contract to be approved distributor)
        market.claimWinningsFor(_marketId, _participant);
    }
    
    /**
     * @notice Check how many participants have unclaimed winnings
     * @param _marketId Market ID
     * @param _participants Array of potential winners
     * @return unclaimedCount Number of participants with unclaimed winnings
     * @return totalUnclaimed Total amount of unclaimed winnings
     */
    function getUnclaimedStats(
        uint256 _marketId,
        address[] calldata _participants
    )
        external
        view
        returns (uint256 unclaimedCount, uint256 totalUnclaimed)
    {
        for (uint256 i = 0; i < _participants.length; i++) {
            SimplePredictionMarket.Position memory position = market.getPosition(_marketId, _participants[i]);
            
            if (!position.claimed && !distributed[_marketId][_participants[i]]) {
                uint256 winnings = market.calculateWinnings(_marketId, _participants[i]);
                if (winnings > 0) {
                    unclaimedCount++;
                    totalUnclaimed += winnings;
                }
            }
        }
    }
    
    /**
     * @notice Get list of participants with unclaimed winnings
     * @param _marketId Market ID  
     * @param _participants Array of potential winners
     * @return winners Array of addresses with unclaimed winnings
     * @return amounts Array of corresponding winning amounts
     */
    function getUnclaimedWinners(
        uint256 _marketId,
        address[] calldata _participants
    )
        external
        view
        returns (address[] memory winners, uint256[] memory amounts)
    {
        // First pass: count unclaimed
        uint256 count = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            SimplePredictionMarket.Position memory position = market.getPosition(_marketId, _participants[i]);
            if (!position.claimed && !distributed[_marketId][_participants[i]]) {
                uint256 winnings = market.calculateWinnings(_marketId, _participants[i]);
                if (winnings > 0) {
                    count++;
                }
            }
        }
        
        // Second pass: collect data
        winners = new address[](count);
        amounts = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _participants.length; i++) {
            SimplePredictionMarket.Position memory position = market.getPosition(_marketId, _participants[i]);
            if (!position.claimed && !distributed[_marketId][_participants[i]]) {
                uint256 winnings = market.calculateWinnings(_marketId, _participants[i]);
                if (winnings > 0) {
                    winners[index] = _participants[i];
                    amounts[index] = winnings;
                    index++;
                }
            }
        }
    }
}
