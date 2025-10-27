// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LiquidityIncentives
 * @notice Reward early market creators and liquidity providers
 * @dev Distributes rewards to users who create markets and provide initial liquidity
 */
contract LiquidityIncentives is Ownable, ReentrancyGuard {
    
    struct MarketIncentive {
        address creator;
        uint256 createdAt;
        uint256 initialLiquidity;
        uint256 rewardEarned;
        bool rewardClaimed;
    }

    struct CreatorStats {
        uint256 marketsCreated;
        uint256 totalLiquidityProvided;
        uint256 totalRewardsEarned;
        uint256 totalRewardsClaimed;
    }

    // Reward pool
    uint256 public rewardPool;
    
    // Reward per market created (0.01 BNB)
    uint256 public constant MARKET_CREATION_REWARD = 0.01 ether;
    
    // Reward percentage for initial liquidity (1% of liquidity provided)
    uint256 public constant LIQUIDITY_REWARD_PERCENTAGE = 1;
    
    // Minimum liquidity to qualify for rewards (0.1 BNB)
    uint256 public constant MIN_LIQUIDITY_FOR_REWARD = 0.1 ether;

    mapping(uint256 => MarketIncentive) public marketIncentives;
    mapping(address => CreatorStats) public creatorStats;
    mapping(address => bool) public authorizedMarkets;
    
    uint256 public totalRewardsDistributed;
    uint256 public totalMarketsIncentivized;

    event MarketIncentiveRegistered(uint256 indexed marketId, address indexed creator, uint256 reward);
    event LiquidityIncentiveAdded(uint256 indexed marketId, uint256 liquidity, uint256 reward);
    event IncentiveRewardClaimed(uint256 indexed marketId, address indexed creator, uint256 amount);
    event RewardPoolFunded(uint256 amount);
    event MarketAuthorized(address indexed market, bool authorized);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Authorize/deauthorize market contracts
     */
    function setMarketAuthorization(address _market, bool _authorized) external onlyOwner {
        require(_market != address(0), "Invalid market");
        authorizedMarkets[_market] = _authorized;
        emit MarketAuthorized(_market, _authorized);
    }

    /**
     * @notice Fund the reward pool
     */
    function fundRewardPool() external payable {
        require(msg.value > 0, "Zero amount");
        rewardPool += msg.value;
        emit RewardPoolFunded(msg.value);
    }

    /**
     * @notice Register market creation incentive
     * @param _marketId Market ID
     * @param _creator Market creator
     */
    function registerMarketCreation(uint256 _marketId, address _creator) 
        external 
    {
        require(authorizedMarkets[msg.sender], "Not authorized market");
        require(marketIncentives[_marketId].creator == address(0), "Already registered");

        uint256 reward = MARKET_CREATION_REWARD;
        if (rewardPool < reward) {
            reward = 0; // No reward if pool empty
        }

        marketIncentives[_marketId] = MarketIncentive({
            creator: _creator,
            createdAt: block.timestamp,
            initialLiquidity: 0,
            rewardEarned: reward,
            rewardClaimed: false
        });

        if (reward > 0) {
            rewardPool -= reward;
        }

        CreatorStats storage stats = creatorStats[_creator];
        stats.marketsCreated++;
        stats.totalRewardsEarned += reward;

        totalMarketsIncentivized++;

        emit MarketIncentiveRegistered(_marketId, _creator, reward);
    }

    /**
     * @notice Add liquidity incentive
     * @param _marketId Market ID
     * @param _liquidityAmount Liquidity provided
     */
    function addLiquidityIncentive(uint256 _marketId, uint256 _liquidityAmount) 
        external 
    {
        require(authorizedMarkets[msg.sender], "Not authorized market");
        MarketIncentive storage incentive = marketIncentives[_marketId];
        require(incentive.creator != address(0), "Market not registered");
        require(_liquidityAmount >= MIN_LIQUIDITY_FOR_REWARD, "Liquidity too low");

        uint256 reward = (_liquidityAmount * LIQUIDITY_REWARD_PERCENTAGE) / 100;
        if (rewardPool < reward) {
            reward = 0;
        }

        if (reward > 0) {
            incentive.rewardEarned += reward;
            incentive.initialLiquidity += _liquidityAmount;
            rewardPool -= reward;

            CreatorStats storage stats = creatorStats[incentive.creator];
            stats.totalLiquidityProvided += _liquidityAmount;
            stats.totalRewardsEarned += reward;

            emit LiquidityIncentiveAdded(_marketId, _liquidityAmount, reward);
        }
    }

    /**
     * @notice Claim market creation and liquidity rewards
     * @param _marketId Market ID
     */
    function claimReward(uint256 _marketId) external nonReentrant {
        MarketIncentive storage incentive = marketIncentives[_marketId];
        require(incentive.creator == msg.sender, "Not creator");
        require(!incentive.rewardClaimed, "Already claimed");
        require(incentive.rewardEarned > 0, "No reward");

        uint256 reward = incentive.rewardEarned;
        incentive.rewardClaimed = true;

        CreatorStats storage stats = creatorStats[msg.sender];
        stats.totalRewardsClaimed += reward;
        totalRewardsDistributed += reward;

        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Transfer failed");

        emit IncentiveRewardClaimed(_marketId, msg.sender, reward);
    }

    /**
     * @notice Claim rewards from multiple markets
     * @param _marketIds Array of market IDs
     */
    function claimMultipleRewards(uint256[] calldata _marketIds) 
        external 
        nonReentrant 
    {
        uint256 totalReward = 0;

        for (uint i = 0; i < _marketIds.length; i++) {
            MarketIncentive storage incentive = marketIncentives[_marketIds[i]];
            
            if (incentive.creator == msg.sender && 
                !incentive.rewardClaimed && 
                incentive.rewardEarned > 0) 
            {
                totalReward += incentive.rewardEarned;
                incentive.rewardClaimed = true;
                emit IncentiveRewardClaimed(_marketIds[i], msg.sender, incentive.rewardEarned);
            }
        }

        require(totalReward > 0, "No rewards to claim");

        CreatorStats storage stats = creatorStats[msg.sender];
        stats.totalRewardsClaimed += totalReward;
        totalRewardsDistributed += totalReward;

        (bool success, ) = msg.sender.call{value: totalReward}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Get creator statistics
     */
    function getCreatorStats(address _creator) 
        external 
        view 
        returns (
            uint256 marketsCreated,
            uint256 totalLiquidityProvided,
            uint256 totalRewardsEarned,
            uint256 totalRewardsClaimed,
            uint256 pendingRewards
        ) 
    {
        CreatorStats storage stats = creatorStats[_creator];
        return (
            stats.marketsCreated,
            stats.totalLiquidityProvided,
            stats.totalRewardsEarned,
            stats.totalRewardsClaimed,
            stats.totalRewardsEarned - stats.totalRewardsClaimed
        );
    }

    /**
     * @notice Get market incentive info
     */
    function getMarketIncentive(uint256 _marketId) 
        external 
        view 
        returns (
            address creator,
            uint256 initialLiquidity,
            uint256 rewardEarned,
            bool rewardClaimed
        ) 
    {
        MarketIncentive storage incentive = marketIncentives[_marketId];
        return (
            incentive.creator,
            incentive.initialLiquidity,
            incentive.rewardEarned,
            incentive.rewardClaimed
        );
    }

    /**
     * @notice Owner can withdraw excess funds
     */
    function withdrawExcess(uint256 _amount) external onlyOwner {
        require(_amount <= rewardPool, "Insufficient pool");
        rewardPool -= _amount;
        (bool success, ) = owner().call{value: _amount}("");
        require(success, "Transfer failed");
    }

    receive() external payable {
        rewardPool += msg.value;
        emit RewardPoolFunded(msg.value);
    }
}
