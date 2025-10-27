// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SoraOracle.sol";
import "./interfaces/IIntegrations.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimplePredictionMarket
 * @notice MVP prediction market that uses Sora Oracle for outcome resolution
 * @dev Supports binary (yes/no) prediction markets
 */
contract SimplePredictionMarket is Ownable, ReentrancyGuard {
    
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
        uint96 yesAmount;    // 12 bytes - max ~79B BNB (plenty)
        uint96 noAmount;     // 12 bytes
        uint48 feesPaid;     // 6 bytes - max ~281k BNB fees
        bool claimed;        // 1 byte
        // Total: 31 bytes (1 slot)
    }

    SoraOracle public oracle;
    uint256 public marketCounter;
    uint256 public constant FEE_PERCENTAGE = 2; // 2% platform fee
    uint256 public accumulatedFees;
    
    // Optional integration contracts (can be address(0) if not used)
    address public referralRewards;
    address public marketFactory;
    address public liquidityIncentives;
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(address => bool) public approvedDistributors; // Authorized batch distributors

    event MarketCreated(uint256 indexed marketId, string question, uint256 resolutionTime);
    event PositionTaken(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event MarketCanceled(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event DistributorApproved(address indexed distributor, bool approved);

    constructor(address payable _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracle);
    }

    /**
     * @notice Set integration contract addresses (owner only)
     * @dev Addresses can be zero to disable integration
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

        // Integrate with MarketFactory if set
        if (marketFactory != address(0)) {
            // Note: Would need category and tags - for now skip or use defaults
            // This requires MarketFactory integration - left as TODO for production
        }

        // Integrate with LiquidityIncentives if set
        if (liquidityIncentives != address(0)) {
            try ILiquidityIncentives(liquidityIncentives).registerMarketCreation(marketId, msg.sender) {} 
            catch {}
        }

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
        // Note: fees are NOT added to accumulatedFees yet - only when market resolves

        Position storage position = positions[_marketId][msg.sender];
        uint256 newFees = uint256(position.feesPaid) + fee;
        uint256 newYes = uint256(position.yesAmount) + (_isYes ? betAmount : 0);
        uint256 newNo = uint256(position.noAmount) + (_isYes ? 0 : betAmount);
        
        require(newFees <= type(uint48).max, "Fee overflow");
        require(newYes <= type(uint96).max, "YES amount overflow");
        require(newNo <= type(uint96).max, "NO amount overflow");
        
        position.feesPaid = uint48(newFees);
        
        if (_isYes) {
            market.yesPool += betAmount;
            position.yesAmount = uint96(newYes);
        } else {
            market.noPool += betAmount;
            position.noAmount = uint96(newNo);
        }

        emit PositionTaken(_marketId, msg.sender, _isYes, betAmount);

        // Integrate with ReferralRewards if set (5% of fee goes to referrer)
        if (referralRewards != address(0) && fee > 0) {
            uint256 referralReward = (fee * 5) / 100; // 5% of fee
            try IReferralRewards(referralRewards).recordVolume{value: referralReward}(
                msg.sender, 
                msg.value, 
                fee
            ) {} catch {}
        }

        // Integrate with LiquidityIncentives if set
        if (liquidityIncentives != address(0) && (market.yesPool + market.noPool) > 0) {
            try ILiquidityIncentives(liquidityIncentives).addLiquidityIncentive(
                _marketId,
                betAmount
            ) {} catch {}
        }
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

        // Release platform fees now that market is resolved (won't be canceled)
        accumulatedFees += market.totalFees;

        emit MarketResolved(_marketId, market.outcome);
    }

    /**
     * @notice Claim winnings from a resolved market
     * @param _marketId Market ID
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        _claimWinningsFor(_marketId, msg.sender);
    }
    
    /**
     * @notice Claim winnings on behalf of a user (only approved distributors)
     * @param _marketId Market ID
     * @param _user User address to claim for
     */
    function claimWinningsFor(uint256 _marketId, address _user) external nonReentrant {
        require(approvedDistributors[msg.sender], "Not approved distributor");
        _claimWinningsFor(_marketId, _user);
    }
    
    /**
     * @notice Internal function to claim winnings
     * @param _marketId Market ID
     * @param _user User to claim for
     */
    function _claimWinningsFor(uint256 _marketId, address _user) internal {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][_user];
        
        require(market.status == MarketStatus.RESOLVED, "Not resolved");
        require(!position.claimed, "Already claimed");

        uint256 winnings = calculateWinnings(_marketId, _user);
        require(winnings > 0, "No winnings");

        position.claimed = true;

        (bool success, ) = payable(_user).call{value: winnings}("");
        require(success, "Transfer failed");

        emit WinningsClaimed(_marketId, _user, winnings);
    }
    
    /**
     * @notice Approve or revoke a batch distributor
     * @param _distributor Distributor address
     * @param _approved True to approve, false to revoke
     */
    function setDistributorApproval(address _distributor, bool _approved) external onlyOwner {
        require(_distributor != address(0), "Invalid distributor");
        approvedDistributors[_distributor] = _approved;
        emit DistributorApproved(_distributor, _approved);
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

    /**
     * @notice Cancel a market if oracle hasn't answered
     * @param _marketId Market ID
     * @dev Allows users to reclaim bets if oracle fails to answer
     */
    function cancelMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.OPEN, "Market not open");
        require(block.timestamp > market.resolutionTime + 7 days, "Too early to cancel");

        (, SoraOracle.Answer memory answer) = oracle.getQuestionWithAnswer(market.questionId);
        require(answer.confidenceScore == 0, "Already answered");

        market.status = MarketStatus.CANCELED;
        emit MarketCanceled(_marketId);
    }

    /**
     * @notice Claim refund from canceled market
     * @param _marketId Market ID
     * @dev Returns full stake including exact fees paid
     * Note: Canceled market fees were never added to accumulatedFees, so no deduction needed
     */
    function claimRefund(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        Position storage position = positions[_marketId][msg.sender];
        
        require(market.status == MarketStatus.CANCELED, "Market not canceled");
        require(!position.claimed, "Already claimed");

        uint256 netPosition = position.yesAmount + position.noAmount;
        uint256 feesPaid = position.feesPaid;
        uint256 fullRefund = netPosition + feesPaid;
        
        require(fullRefund > 0, "No position");

        position.claimed = true;

        (bool success, ) = msg.sender.call{value: fullRefund}("");
        require(success, "Refund failed");
    }

    /**
     * @notice Withdraw accumulated platform fees
     * @dev Only owner can withdraw
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");

        accumulatedFees = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");

        emit FeesWithdrawn(msg.sender, amount);
    }
}
