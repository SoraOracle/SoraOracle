// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SimplePredictionMarket.sol";

/**
 * @title ConditionalMarket
 * @notice Prediction market that depends on outcomes of other markets
 * @dev Example: "Will BTC hit $100k IF Fed cuts rates?" depends on Fed rate decision market
 */
contract ConditionalMarket is Ownable, ReentrancyGuard {
    
    enum MarketStatus { ACTIVE, PARENT_UNRESOLVED, CONDITION_NOT_MET, RESOLVED, CANCELLED }

    struct Market {
        string question;
        address parentMarket;       // Market this depends on
        uint8 requiredParentOutcome; // Outcome needed for this market to activate
        uint256 yesPool;
        uint256 noPool;
        uint256 totalFees;
        uint32 createdAt;
        uint32 resolvedAt;
        MarketStatus status;
        bool finalOutcome;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    uint256 public marketCounter;
    uint256 public feePercentage = 200; // 2%

    event MarketCreated(uint256 indexed marketId, string question, address indexed parentMarket, uint8 requiredOutcome);
    event PositionTaken(uint256 indexed marketId, address indexed user, bool prediction, uint256 amount);
    event ParentResolved(uint256 indexed marketId, bool conditionMet);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create conditional market
     * @param _question Market question
     * @param _parentMarket Address of parent market
     * @param _requiredParentOutcome Required parent outcome (0=no, 1=yes for binary)
     */
    function createMarket(
        string memory _question,
        address _parentMarket,
        uint8 _requiredParentOutcome
    ) external payable returns (uint256 marketId) {
        require(bytes(_question).length > 0, "Empty question");
        require(_parentMarket != address(0), "Invalid parent market");

        marketId = marketCounter++;

        markets[marketId] = Market({
            question: _question,
            parentMarket: _parentMarket,
            requiredParentOutcome: _requiredParentOutcome,
            yesPool: 0,
            noPool: 0,
            totalFees: 0,
            createdAt: uint32(block.timestamp),
            resolvedAt: 0,
            status: MarketStatus.ACTIVE,
            finalOutcome: false
        });

        emit MarketCreated(marketId, _question, _parentMarket, _requiredParentOutcome);
        return marketId;
    }

    /**
     * @notice Take position in conditional market
     * @param _marketId Market ID
     * @param _prediction True for yes, false for no
     */
    function takePosition(uint256 _marketId, bool _prediction) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.ACTIVE, "Market not active");
        require(msg.value > 0, "Must send BNB");

        // Calculate fee
        uint256 fee = (msg.value * feePercentage) / 10000;
        uint256 betAmount = msg.value - fee;

        market.totalFees += fee;

        if (_prediction) {
            market.yesPool += betAmount;
            positions[_marketId][msg.sender].yesAmount += betAmount;
        } else {
            market.noPool += betAmount;
            positions[_marketId][msg.sender].noAmount += betAmount;
        }

        emit PositionTaken(_marketId, msg.sender, _prediction, betAmount);
    }

    /**
     * @notice Check parent market and update status
     * @param _marketId Market to check
     */
    function checkParentMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.ACTIVE, "Market not active");

        // Try to get parent market outcome
        SimplePredictionMarket parentMarket = SimplePredictionMarket(market.parentMarket);
        
        // Check parent market status and outcome
        try parentMarket.markets(0) returns (
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            SimplePredictionMarket.MarketStatus status,
            SimplePredictionMarket.Outcome outcome,
            uint256
        ) {
            // Check if resolved
            if (status == SimplePredictionMarket.MarketStatus.RESOLVED) {
                // Check if condition met
                bool conditionMet = (outcome == SimplePredictionMarket.Outcome.YES && market.requiredParentOutcome == 1) || 
                                   (outcome == SimplePredictionMarket.Outcome.NO && market.requiredParentOutcome == 0);
                
                if (conditionMet) {
                    market.status = MarketStatus.PARENT_UNRESOLVED; // Ready for resolution
                } else {
                    market.status = MarketStatus.CONDITION_NOT_MET;
                    _refundAll(_marketId);
                }

                emit ParentResolved(_marketId, conditionMet);
            }
        } catch {
            revert("Invalid parent market");
        }
    }

    /**
     * @notice Resolve conditional market (only if parent condition met)
     * @param _marketId Market to resolve
     * @param _outcome Final outcome
     */
    function resolveMarket(uint256 _marketId, bool _outcome) external onlyOwner nonReentrant {
        Market storage market = markets[_marketId];
        require(
            market.status == MarketStatus.PARENT_UNRESOLVED || market.status == MarketStatus.ACTIVE,
            "Cannot resolve"
        );

        market.finalOutcome = _outcome;
        market.resolvedAt = uint32(block.timestamp);
        market.status = MarketStatus.RESOLVED;

        emit MarketResolved(_marketId, _outcome);
    }

    /**
     * @notice Claim winnings
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.RESOLVED, "Not resolved");
        
        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");
        require(position.yesAmount > 0 || position.noAmount > 0, "No position");

        uint256 winningPool = market.finalOutcome ? market.yesPool : market.noPool;
        uint256 losingPool = market.finalOutcome ? market.noPool : market.yesPool;
        uint256 userWinningAmount = market.finalOutcome ? position.yesAmount : position.noAmount;

        require(userWinningAmount > 0, "Not a winner");

        // Calculate payout: original bet + proportional share of losing pool
        uint256 payout = userWinningAmount + ((userWinningAmount * losingPool) / winningPool);

        position.claimed = true;
        payable(msg.sender).transfer(payout);

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    /**
     * @notice Refund all participants if condition not met
     */
    function _refundAll(uint256 _marketId) private {
        Market storage market = markets[_marketId];
        market.status = MarketStatus.CANCELLED;
        
        // Note: In production, would need to track all participants
        // For now, users can call refund() themselves
    }

    /**
     * @notice Get refund if market cancelled
     */
    function getRefund(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.CONDITION_NOT_MET || market.status == MarketStatus.CANCELLED, "Not cancelled");
        
        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");
        require(position.yesAmount > 0 || position.noAmount > 0, "No position");

        uint256 refundAmount = position.yesAmount + position.noAmount;
        position.claimed = true;
        
        payable(msg.sender).transfer(refundAmount);
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        address parentMarket,
        uint256 yesPool,
        uint256 noPool,
        MarketStatus status,
        bool finalOutcome
    ) {
        Market memory market = markets[_marketId];
        return (
            market.question,
            market.parentMarket,
            market.yesPool,
            market.noPool,
            market.status,
            market.finalOutcome
        );
    }

    /**
     * @notice Get user position
     */
    function getPosition(uint256 _marketId, address _user) external view returns (
        uint256 yesAmount,
        uint256 noAmount,
        bool claimed
    ) {
        Position memory position = positions[_marketId][_user];
        return (position.yesAmount, position.noAmount, position.claimed);
    }
}
