// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/SoraOracle.sol";
import "../../contracts/PancakeTWAPOracle.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BasicPredictionMarket
 * @notice Simple binary prediction market using Sora Oracle
 * @dev Perfect starting point for building your own prediction markets
 */
contract BasicPredictionMarket is ReentrancyGuard {
    SoraOracle public oracle;
    uint256 public marketCounter;
    
    struct Market {
        uint256 id;
        string question;
        address creator;
        uint256 deadline;
        uint256 questionId;
        uint256 totalYes;
        uint256 totalNo;
        bool resolved;
        bool outcome;
        uint256 createdAt;
    }
    
    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    
    event MarketCreated(uint256 indexed marketId, string question, uint256 deadline);
    event PositionTaken(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    /**
     * @notice Create a new prediction market
     * @param _question The question to predict on
     * @param _deadline When betting closes (Unix timestamp)
     * @return marketId The ID of the created market
     */
    function createMarket(
        string memory _question,
        uint256 _deadline
    ) external payable returns (uint256 marketId) {
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(msg.value >= 0.01 ether, "Need 0.01 BNB for oracle fee");
        
        // Ask oracle for resolution
        uint256 questionId = oracle.askYesNoQuestion{value: msg.value}(
            _question,
            _deadline
        );
        
        marketId = marketCounter++;
        markets[marketId] = Market({
            id: marketId,
            question: _question,
            creator: msg.sender,
            deadline: _deadline,
            questionId: questionId,
            totalYes: 0,
            totalNo: 0,
            resolved: false,
            outcome: false,
            createdAt: block.timestamp
        });
        
        emit MarketCreated(marketId, _question, _deadline);
    }
    
    /**
     * @notice Bet on YES or NO
     * @param _marketId Market to bet on
     * @param _isYes true for YES, false for NO
     */
    function takPosition(uint256 _marketId, bool _isYes) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.deadline, "Betting closed");
        require(msg.value > 0, "Must send BNB");
        
        Position storage position = positions[_marketId][msg.sender];
        
        if (_isYes) {
            position.yesAmount += msg.value;
            market.totalYes += msg.value;
        } else {
            position.noAmount += msg.value;
            market.totalNo += msg.value;
        }
        
        emit PositionTaken(_marketId, msg.sender, _isYes, msg.value);
    }
    
    /**
     * @notice Resolve market using oracle answer
     * @param _marketId Market to resolve
     */
    function resolveMarket(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.deadline, "Market not closed");
        
        // Get answer from oracle
        (SoraOracle.Question memory question, SoraOracle.Answer memory answer) = 
            oracle.getQuestionWithAnswer(market.questionId);
            
        require(question.status == SoraOracle.AnswerStatus.ANSWERED, "Not answered yet");
        
        market.resolved = true;
        market.outcome = answer.boolAnswer;
        
        emit MarketResolved(_marketId, answer.boolAnswer);
    }
    
    /**
     * @notice Claim winnings after market resolves
     * @param _marketId Market to claim from
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Not resolved");
        
        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");
        
        uint256 winningAmount;
        
        if (market.outcome) {
            // YES won
            if (position.yesAmount > 0) {
                winningAmount = (position.yesAmount * (market.totalYes + market.totalNo)) / market.totalYes;
            }
        } else {
            // NO won
            if (position.noAmount > 0) {
                winningAmount = (position.noAmount * (market.totalYes + market.totalNo)) / market.totalNo;
            }
        }
        
        require(winningAmount > 0, "No winnings");
        position.claimed = true;
        
        (bool success, ) = payable(msg.sender).call{value: winningAmount}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(_marketId, msg.sender, winningAmount);
    }
    
    /**
     * @notice Get market details
     */
    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }
    
    /**
     * @notice Get user's position
     */
    function getPosition(uint256 _marketId, address _user) external view returns (Position memory) {
        return positions[_marketId][_user];
    }
    
    /**
     * @notice Calculate potential winnings
     */
    function calculateWinnings(uint256 _marketId, address _user, bool _assumeYes) 
        external 
        view 
        returns (uint256) 
    {
        Market memory market = markets[_marketId];
        Position memory position = positions[_marketId][_user];
        
        if (_assumeYes && position.yesAmount > 0 && market.totalYes > 0) {
            return (position.yesAmount * (market.totalYes + market.totalNo)) / market.totalYes;
        } else if (!_assumeYes && position.noAmount > 0 && market.totalNo > 0) {
            return (position.noAmount * (market.totalYes + market.totalNo)) / market.totalNo;
        }
        
        return 0;
    }
}
