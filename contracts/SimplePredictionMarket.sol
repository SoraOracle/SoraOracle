// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SoraOracle.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimplePredictionMarket
 * @notice MVP prediction market that uses Sora Oracle for outcome resolution
 * @dev Supports binary (yes/no) prediction markets
 */
contract SimplePredictionMarket is ReentrancyGuard {
    
    enum MarketStatus { OPEN, CLOSED, RESOLVED, CANCELED }
    enum Outcome { UNRESOLVED, YES, NO }

    struct Market {
        string question;
        uint256 questionId;
        uint256 resolutionTime;
        uint256 yesPool;
        uint256 noPool;
        MarketStatus status;
        Outcome outcome;
        uint256 totalFees;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    SoraOracle public oracle;
    uint256 public marketCounter;
    uint256 public constant FEE_PERCENTAGE = 2; // 2% platform fee
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;

    event MarketCreated(uint256 indexed marketId, string question, uint256 resolutionTime);
    event PositionTaken(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor(address payable _oracle) {
        require(_oracle != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracle);
    }

    /**
     * @notice Create a new prediction market
     * @param _question The yes/no question
     * @param _resolutionTime When the market should resolve
     */
    function createMarket(string memory _question, uint256 _resolutionTime) 
        external 
        payable 
        returns (uint256 marketId) 
    {
        require(_resolutionTime > block.timestamp, "Invalid resolution time");
        require(bytes(_question).length > 0, "Question empty");

        // Ask the oracle (forwards the fee)
        uint256 oracleFee = oracle.oracleFee();
        require(msg.value >= oracleFee, "Insufficient oracle fee");
        
        uint256 questionId = oracle.askYesNoQuestion{value: oracleFee}(_question, _resolutionTime);
        
        marketId = marketCounter++;
        markets[marketId] = Market({
            question: _question,
            questionId: questionId,
            resolutionTime: _resolutionTime,
            yesPool: 0,
            noPool: 0,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            totalFees: 0
        });

        emit MarketCreated(marketId, _question, _resolutionTime);

        // Return any excess payment
        if (msg.value > oracleFee) {
            (bool success, ) = msg.sender.call{value: msg.value - oracleFee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Take a position on a market
     * @param _marketId Market ID
     * @param _isYes True for YES, false for NO
     */
    function takePosition(uint256 _marketId, bool _isYes) 
        external 
        payable 
        nonReentrant 
    {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp < market.resolutionTime, "Market expired");
        require(msg.value > 0, "Amount must be > 0");

        uint256 fee = (msg.value * FEE_PERCENTAGE) / 100;
        uint256 betAmount = msg.value - fee;

        market.totalFees += fee;

        if (_isYes) {
            market.yesPool += betAmount;
            positions[_marketId][msg.sender].yesAmount += betAmount;
        } else {
            market.noPool += betAmount;
            positions[_marketId][msg.sender].noAmount += betAmount;
        }

        emit PositionTaken(_marketId, msg.sender, _isYes, betAmount);
    }

    /**
     * @notice Resolve market using oracle answer
     * @param _marketId Market ID
     */
    function resolveMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp >= market.resolutionTime, "Too early");

        // Get oracle answer
        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(market.questionId);
        require(answer.confidenceScore > 0, "Not answered yet");

        market.outcome = answer.boolAnswer ? Outcome.YES : Outcome.NO;
        market.status = MarketStatus.RESOLVED;

        emit MarketResolved(_marketId, market.outcome);
    }

    /**
     * @notice Claim winnings from a resolved market
     * @param _marketId Market ID
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][msg.sender];
        
        require(market.status == MarketStatus.RESOLVED, "Not resolved");
        require(!position.claimed, "Already claimed");

        uint256 winnings = calculateWinnings(_marketId, msg.sender);
        require(winnings > 0, "No winnings");

        position.claimed = true;

        (bool success, ) = msg.sender.call{value: winnings}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(_marketId, msg.sender, winnings);
    }

    /**
     * @notice Calculate potential winnings for a user
     * @param _marketId Market ID
     * @param _user User address
     */
    function calculateWinnings(uint256 _marketId, address _user) 
        public 
        view 
        returns (uint256) 
    {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][_user];

        if (market.status != MarketStatus.RESOLVED || position.claimed) {
            return 0;
        }

        uint256 totalPool = market.yesPool + market.noPool;
        if (totalPool == 0) return 0;

        if (market.outcome == Outcome.YES && position.yesAmount > 0) {
            if (market.yesPool == 0) return 0;
            return (position.yesAmount * totalPool) / market.yesPool;
        } else if (market.outcome == Outcome.NO && position.noAmount > 0) {
            if (market.noPool == 0) return 0;
            return (position.noAmount * totalPool) / market.noPool;
        }

        return 0;
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 _marketId) 
        external 
        view 
        returns (Market memory) 
    {
        return markets[_marketId];
    }

    /**
     * @notice Get user position
     */
    function getPosition(uint256 _marketId, address _user) 
        external 
        view 
        returns (Position memory) 
    {
        return positions[_marketId][_user];
    }
}
