// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SoraOracle.sol";

/**
 * @title RangeMarket
 * @notice Bet on whether a value will fall within a specific range
 * @dev Example: "Will BTC be between $30k-$35k on Dec 31?"
 */
contract RangeMarket is Ownable, ReentrancyGuard {
    
    struct Market {
        string question;
        uint256 questionId;         // SoraOracle question ID
        uint64 lowerBound;
        uint64 upperBound;
        uint256 inRangePool;
        uint256 outRangePool;
        uint256 totalFees;
        uint32 createdAt;
        uint32 deadline;
        uint32 resolvedAt;
        bool resolved;
        bool inRange;               // Final outcome: true if in range
    }

    struct Position {
        uint256 inRangeAmount;
        uint256 outRangeAmount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    
    uint256 public marketCounter;
    uint256 public feePercentage = 200; // 2%
    SoraOracle public oracle;

    event MarketCreated(uint256 indexed marketId, string question, uint64 lowerBound, uint64 upperBound, uint32 deadline);
    event PositionTaken(uint256 indexed marketId, address indexed user, bool predictInRange, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint64 finalValue, bool inRange);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout);

    constructor(address payable _oracleAddress) Ownable(msg.sender) {
        require(_oracleAddress != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracleAddress);
    }

    /**
     * @notice Create range prediction market
     * @param _question Market question
     * @param _lowerBound Lower bound of range
     * @param _upperBound Upper bound of range
     * @param _deadline Resolution deadline
     */
    function createMarket(
        string memory _question,
        uint64 _lowerBound,
        uint64 _upperBound,
        uint32 _deadline
    ) external payable returns (uint256 marketId) {
        require(bytes(_question).length > 0, "Empty question");
        require(_upperBound > _lowerBound, "Invalid range");
        require(_deadline > block.timestamp, "Invalid deadline");

        // Ask oracle for the value at deadline
        uint256 questionId = oracle.askOracle{value: msg.value}(_question, _deadline);

        marketId = marketCounter++;

        markets[marketId] = Market({
            question: _question,
            questionId: questionId,
            lowerBound: _lowerBound,
            upperBound: _upperBound,
            inRangePool: 0,
            outRangePool: 0,
            totalFees: 0,
            createdAt: uint32(block.timestamp),
            deadline: _deadline,
            resolvedAt: 0,
            resolved: false,
            inRange: false
        });

        emit MarketCreated(marketId, _question, _lowerBound, _upperBound, _deadline);
        return marketId;
    }

    /**
     * @notice Take position on range outcome
     * @param _marketId Market ID
     * @param _predictInRange True to bet IN range, false for OUT of range
     */
    function takePosition(uint256 _marketId, bool _predictInRange) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.deadline, "Market closed");
        require(msg.value > 0, "Must send BNB");

        uint256 fee = (msg.value * feePercentage) / 10000;
        uint256 betAmount = msg.value - fee;

        market.totalFees += fee;

        if (_predictInRange) {
            market.inRangePool += betAmount;
            positions[_marketId][msg.sender].inRangeAmount += betAmount;
        } else {
            market.outRangePool += betAmount;
            positions[_marketId][msg.sender].outRangeAmount += betAmount;
        }

        emit PositionTaken(_marketId, msg.sender, _predictInRange, betAmount);
    }

    /**
     * @notice Resolve market using oracle answer
     */
    function resolveMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.deadline, "Not yet deadline");

        // Get answer from oracle
        (, , , uint64 numericAnswer,) = oracle.answers(market.questionId);
        require(numericAnswer > 0, "Oracle not answered yet");

        // Check if value is in range
        bool valueInRange = numericAnswer >= market.lowerBound && numericAnswer <= market.upperBound;

        market.inRange = valueInRange;
        market.resolved = true;
        market.resolvedAt = uint32(block.timestamp);

        emit MarketResolved(_marketId, numericAnswer, valueInRange);
    }

    /**
     * @notice Claim winnings
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Not resolved");

        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");
        require(position.inRangeAmount > 0 || position.outRangeAmount > 0, "No position");

        uint256 winningPool = market.inRange ? market.inRangePool : market.outRangePool;
        uint256 losingPool = market.inRange ? market.outRangePool : market.inRangePool;
        uint256 userWinningAmount = market.inRange ? position.inRangeAmount : position.outRangeAmount;

        require(userWinningAmount > 0, "Not a winner");
        require(winningPool > 0, "No winning pool");

        // Parimutuel payout
        uint256 payout = userWinningAmount + ((userWinningAmount * losingPool) / winningPool);

        position.claimed = true;
        payable(msg.sender).transfer(payout);

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        uint64 lowerBound,
        uint64 upperBound,
        uint256 inRangePool,
        uint256 outRangePool,
        uint32 deadline,
        bool resolved,
        bool inRange
    ) {
        Market memory market = markets[_marketId];
        return (
            market.question,
            market.lowerBound,
            market.upperBound,
            market.inRangePool,
            market.outRangePool,
            market.deadline,
            market.resolved,
            market.inRange
        );
    }

    /**
     * @notice Get user position
     */
    function getPosition(uint256 _marketId, address _user) external view returns (
        uint256 inRangeAmount,
        uint256 outRangeAmount,
        bool claimed
    ) {
        Position memory position = positions[_marketId][_user];
        return (position.inRangeAmount, position.outRangeAmount, position.claimed);
    }

    /**
     * @notice Get current odds
     */
    function getOdds(uint256 _marketId) external view returns (
        uint256 inRangeOdds,
        uint256 outRangeOdds
    ) {
        Market memory market = markets[_marketId];
        uint256 totalPool = market.inRangePool + market.outRangePool;
        
        if (totalPool == 0) {
            return (5000, 5000); // 50/50 if no bets
        }

        // Calculate as percentage of total pool (basis points)
        if (market.inRangePool == 0) {
            inRangeOdds = 1; // Minimum odds to avoid zero
            outRangeOdds = 9999;
        } else if (market.outRangePool == 0) {
            inRangeOdds = 9999;
            outRangeOdds = 1; // Minimum odds to avoid zero
        } else {
            inRangeOdds = (market.inRangePool * 10000) / totalPool;
            outRangeOdds = 10000 - inRangeOdds;
        }
    }

    /**
     * @notice Update oracle address
     */
    function setOracle(address payable _oracleAddress) external onlyOwner {
        require(_oracleAddress != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracleAddress);
    }
}
