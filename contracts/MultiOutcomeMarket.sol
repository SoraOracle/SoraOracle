// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SoraOracle.sol";
import "./interfaces/IIntegrations.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MultiOutcomeMarket
 * @notice Prediction markets with multiple outcomes (not just yes/no)
 * @dev Example: "Who will win the election?" -> [Candidate A, Candidate B, Candidate C]
 */
contract MultiOutcomeMarket is Ownable, ReentrancyGuard {
    
    enum MarketStatus { OPEN, CLOSED, RESOLVED, CANCELED }

    struct Market {
        string question;
        uint256 questionId;
        uint256 resolutionTime;
        uint8 numOutcomes;
        mapping(uint8 => uint256) outcomePools; // outcome index => BNB pooled
        mapping(uint8 => string) outcomeLabels; // outcome index => label
        MarketStatus status;
        uint8 winningOutcome;
        uint256 totalPool;
        uint256 totalFees;
    }

    struct Position {
        mapping(uint8 => uint256) amounts; // outcome index => amount
        bool claimed;
    }

    SoraOracle public oracle;
    uint256 public marketCounter;
    uint256 public constant FEE_PERCENTAGE = 2;
    uint256 public accumulatedFees;
    
    // Optional integration contracts (can be address(0) if not used)
    address public referralRewards;
    address public marketFactory;
    address public liquidityIncentives;
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;

    event MultiOutcomeMarketCreated(
        uint256 indexed marketId, 
        string question, 
        uint8 numOutcomes,
        uint256 resolutionTime
    );
    event OutcomePositionTaken(
        uint256 indexed marketId, 
        address indexed user, 
        uint8 outcome, 
        uint256 amount
    );
    event MultiOutcomeMarketResolved(uint256 indexed marketId, uint8 winningOutcome);
    event MultiOutcomeWinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor(address payable _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracle);
    }

    /**
     * @notice Set integration contract addresses (owner only)
     */
    function setIntegrations(
        address _referralRewards,
        address _marketFactory,
        address _liquidityIncentives
    ) external onlyOwner {
        referralRewards = _referralRewards;
        marketFactory = _marketFactory;
        liquidityIncentives = _liquidityIncentives;
    }

    /**
     * @notice Create a multi-outcome prediction market
     * @param _question The question
     * @param _outcomeLabels Array of outcome labels (e.g., ["Alice", "Bob", "Charlie"])
     * @param _resolutionTime When the market resolves
     */
    function createMarket(
        string memory _question,
        string[] memory _outcomeLabels,
        uint256 _resolutionTime
    ) external payable returns (uint256 marketId) {
        require(_resolutionTime > block.timestamp, "Invalid resolution time");
        require(_outcomeLabels.length >= 2 && _outcomeLabels.length <= 10, "2-10 outcomes required");
        require(bytes(_question).length > 0, "Question empty");

        uint256 oracleFee = oracle.oracleFee();
        require(msg.value >= oracleFee, "Insufficient oracle fee");
        
        // Ask as general question - oracle will provide numeric answer (0-9 for outcome index)
        uint256 questionId = oracle.askOracle{value: oracleFee}(_question, _resolutionTime);
        
        marketId = marketCounter++;
        Market storage market = markets[marketId];
        market.question = _question;
        market.questionId = questionId;
        market.resolutionTime = _resolutionTime;
        market.numOutcomes = uint8(_outcomeLabels.length);
        market.status = MarketStatus.OPEN;
        
        for (uint8 i = 0; i < _outcomeLabels.length; i++) {
            market.outcomeLabels[i] = _outcomeLabels[i];
        }

        emit MultiOutcomeMarketCreated(marketId, _question, uint8(_outcomeLabels.length), _resolutionTime);

        // Integrate with LiquidityIncentives if set
        if (liquidityIncentives != address(0)) {
            try ILiquidityIncentives(liquidityIncentives).registerMarketCreation(marketId, msg.sender) {} 
            catch {}
        }

        if (msg.value > oracleFee) {
            (bool success, ) = msg.sender.call{value: msg.value - oracleFee}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Take a position on a specific outcome
     * @param _marketId Market ID
     * @param _outcome Outcome index (0 to numOutcomes-1)
     */
    function takePosition(uint256 _marketId, uint8 _outcome) 
        external 
        payable 
        nonReentrant 
    {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(_outcome < market.numOutcomes, "Invalid outcome");
        require(msg.value > 0, "Zero bet");
        require(block.timestamp < market.resolutionTime, "Market expired");

        uint256 fee = (msg.value * FEE_PERCENTAGE) / 100;
        uint256 netAmount = msg.value - fee;

        market.outcomePools[_outcome] += netAmount;
        market.totalPool += netAmount;
        market.totalFees += fee;
        // Note: fees are NOT added to accumulatedFees yet - only when market resolves

        positions[_marketId][msg.sender].amounts[_outcome] += netAmount;

        emit OutcomePositionTaken(_marketId, msg.sender, _outcome, netAmount);

        // Integrate with ReferralRewards if set
        if (referralRewards != address(0) && fee > 0) {
            uint256 referralReward = (fee * 5) / 100;
            try IReferralRewards(referralRewards).recordVolume{value: referralReward}(
                msg.sender,
                msg.value,
                fee
            ) {} catch {}
        }

        // Integrate with LiquidityIncentives if set
        if (liquidityIncentives != address(0) && market.totalPool > 0) {
            try ILiquidityIncentives(liquidityIncentives).addLiquidityIncentive(
                _marketId,
                netAmount
            ) {} catch {}
        }
    }

    /**
     * @notice Resolve market based on oracle answer
     * @dev Reads numeric answer from oracle and uses it as winning outcome index
     */
    function resolveMarket(uint256 _marketId) 
        external 
        nonReentrant
    {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp >= market.resolutionTime, "Too early");

        // Get oracle answer - numeric answer contains the outcome index (0 to numOutcomes-1)
        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(market.questionId);
        require(answer.confidenceScore > 0, "Not answered yet");
        
        // Oracle provides numeric answer as the winning outcome index
        uint8 winningOutcome = uint8(answer.numericAnswer);
        require(winningOutcome < market.numOutcomes, "Invalid outcome from oracle");
        
        market.status = MarketStatus.RESOLVED;
        market.winningOutcome = winningOutcome;

        // Release platform fees now that market is resolved (won't be canceled)
        accumulatedFees += market.totalFees;

        emit MultiOutcomeMarketResolved(_marketId, winningOutcome);
    }

    /**
     * @notice Claim winnings from resolved market
     */
    function claimWinnings(uint256 _marketId) 
        external 
        nonReentrant 
    {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.RESOLVED, "Not resolved");
        
        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");

        uint256 winningAmount = position.amounts[market.winningOutcome];
        require(winningAmount > 0, "No winning position");

        uint256 winningPool = market.outcomePools[market.winningOutcome];
        require(winningPool > 0, "No winning pool");

        uint256 payout = (winningAmount * market.totalPool) / winningPool;
        
        position.claimed = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");

        emit MultiOutcomeWinningsClaimed(_marketId, msg.sender, payout);
    }

    /**
     * @notice Get outcome label
     */
    function getOutcomeLabel(uint256 _marketId, uint8 _outcome) 
        external 
        view 
        returns (string memory) 
    {
        return markets[_marketId].outcomeLabels[_outcome];
    }

    /**
     * @notice Get pool for specific outcome
     */
    function getOutcomePool(uint256 _marketId, uint8 _outcome) 
        external 
        view 
        returns (uint256) 
    {
        return markets[_marketId].outcomePools[_outcome];
    }

    /**
     * @notice Get user position for specific outcome
     */
    function getUserPosition(uint256 _marketId, address _user, uint8 _outcome) 
        external 
        view 
        returns (uint256) 
    {
        return positions[_marketId][_user].amounts[_outcome];
    }

    /**
     * @notice Cancel a market if oracle hasn't answered
     * @param _marketId Market ID
     * @dev Allows users to reclaim bets if oracle fails to answer
     */
    function cancelMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp > market.resolutionTime + 7 days, "Too early to cancel");

        // In production, verify oracle hasn't answered
        // For now, allow cancellation after 7 days

        market.status = MarketStatus.CANCELED;
        // Note: market.totalFees never added to accumulatedFees, so will be refunded
    }

    /**
     * @notice Claim refund from canceled market
     * @param _marketId Market ID
     */
    function claimRefund(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][msg.sender];
        
        require(market.status == MarketStatus.CANCELED, "Market not canceled");
        require(!position.claimed, "Already claimed");

        // Calculate total position across all outcomes
        uint256 totalPosition = 0;
        for (uint8 i = 0; i < market.numOutcomes; i++) {
            totalPosition += position.amounts[i];
        }

        // Calculate fees paid proportionally
        uint256 feesPaid = 0;
        if (market.totalPool > 0) {
            feesPaid = (totalPosition * market.totalFees) / market.totalPool;
        }

        uint256 fullRefund = totalPosition + feesPaid;
        require(fullRefund > 0, "No position");

        position.claimed = true;

        (bool success, ) = msg.sender.call{value: fullRefund}("");
        require(success, "Refund failed");
    }

    /**
     * @notice Get market basic info (since struct has mappings, can't return full struct)
     */
    function getMarket(uint256 _marketId)
        external
        view
        returns (
            string memory question,
            uint256 questionId,
            uint256 resolutionTime,
            uint8 numOutcomes,
            MarketStatus status,
            uint8 winningOutcome,
            uint256 totalPool,
            uint256 totalFees
        )
    {
        Market storage m = markets[_marketId];
        return (
            m.question,
            m.questionId,
            m.resolutionTime,
            m.numOutcomes,
            m.status,
            m.winningOutcome,
            m.totalPool,
            m.totalFees
        );
    }

    /**
     * @notice Owner withdraws accumulated fees
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
    }
}
