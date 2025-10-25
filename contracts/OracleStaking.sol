// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OracleStaking
 * @notice Oracle providers stake BNB to build reputation and earn rewards
 * @dev Higher stakes = higher weight in aggregated oracles
 */
contract OracleStaking is Ownable, ReentrancyGuard {
    
    struct Staker {
        uint256 stakedAmount;
        uint256 rewardDebt;
        uint32 stakeTimestamp;
        uint32 totalAnswers;
        uint32 accurateAnswers;
        uint16 reputationScore;     // 0-1000
        bool active;
    }

    struct RewardPool {
        uint256 totalRewards;
        uint256 rewardsPerShare;    // Accumulated rewards per staked BNB
        uint256 lastUpdateTime;
    }

    mapping(address => Staker) public stakers;
    address[] public stakerList;
    
    RewardPool public rewardPool;
    
    uint256 public totalStaked;
    uint256 public minimumStake = 0.1 ether;
    uint256 public rewardRate = 100; // Rewards per second per BNB staked (scaled by 1e18)
    uint32 public unstakeLockPeriod = 7 days;

    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event RewardsClaimed(address indexed staker, uint256 reward);
    event AnswerRecorded(address indexed staker, bool accurate);
    event ReputationUpdated(address indexed staker, uint16 newScore);

    constructor() Ownable(msg.sender) {
        rewardPool.lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Stake BNB to become oracle provider
     */
    function stake() external payable nonReentrant {
        require(msg.value >= minimumStake, "Below minimum stake");

        _updateRewardPool();

        Staker storage staker = stakers[msg.sender];
        
        // Claim pending rewards if already staking
        if (staker.stakedAmount > 0) {
            _claimRewards(msg.sender);
        } else {
            // New staker
            stakerList.push(msg.sender);
            staker.stakeTimestamp = uint32(block.timestamp);
            staker.active = true;
        }

        staker.stakedAmount += msg.value;
        staker.rewardDebt = (staker.stakedAmount * rewardPool.rewardsPerShare) / 1e18;
        totalStaked += msg.value;

        emit Staked(msg.sender, msg.value);
    }

    /**
     * @notice Unstake BNB and claim rewards
     * @param _amount Amount to unstake
     */
    function unstake(uint256 _amount) external nonReentrant {
        Staker storage staker = stakers[msg.sender];
        require(staker.stakedAmount >= _amount, "Insufficient stake");
        require(
            block.timestamp >= staker.stakeTimestamp + unstakeLockPeriod,
            "Stake locked"
        );

        _updateRewardPool();
        
        // Claim rewards before updating stake
        if (staker.stakedAmount > 0) {
            uint256 pending = ((staker.stakedAmount * rewardPool.rewardsPerShare) / 1e18) - staker.rewardDebt;
            if (pending > 0 && address(this).balance >= pending + _amount) {
                payable(msg.sender).transfer(pending);
                emit RewardsClaimed(msg.sender, pending);
            }
        }

        staker.stakedAmount -= _amount;
        totalStaked -= _amount;

        if (staker.stakedAmount == 0) {
            staker.active = false;
            staker.rewardDebt = 0;
        } else {
            staker.rewardDebt = (staker.stakedAmount * rewardPool.rewardsPerShare) / 1e18;
        }

        payable(msg.sender).transfer(_amount);

        emit Unstaked(msg.sender, _amount);
    }

    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewardPool();
        _claimRewards(msg.sender);
    }

    /**
     * @notice Internal reward claim
     */
    function _claimRewards(address _staker) private {
        Staker storage staker = stakers[_staker];
        if (staker.stakedAmount == 0) return;

        uint256 pending = ((staker.stakedAmount * rewardPool.rewardsPerShare) / 1e18) - staker.rewardDebt;
        
        if (pending > 0 && address(this).balance >= pending) {
            payable(_staker).transfer(pending);
            emit RewardsClaimed(_staker, pending);
        }

        staker.rewardDebt = (staker.stakedAmount * rewardPool.rewardsPerShare) / 1e18;
    }

    /**
     * @notice Update reward pool accumulator
     */
    function _updateRewardPool() private {
        if (block.timestamp <= rewardPool.lastUpdateTime) return;
        if (totalStaked == 0) {
            rewardPool.lastUpdateTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - rewardPool.lastUpdateTime;
        uint256 rewards = timeElapsed * rewardRate * totalStaked / 1e18;

        rewardPool.rewardsPerShare += (rewards * 1e18) / totalStaked;
        rewardPool.totalRewards += rewards;
        rewardPool.lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Record oracle answer (called by oracle contract)
     * @param _provider Oracle provider address
     * @param _accurate Whether answer was accurate
     */
    function recordAnswer(address _provider, bool _accurate) external onlyOwner {
        Staker storage staker = stakers[_provider];
        require(staker.active, "Not active staker");

        staker.totalAnswers++;
        if (_accurate) {
            staker.accurateAnswers++;
        }

        // Update reputation score
        uint16 newScore = _calculateReputation(staker.accurateAnswers, staker.totalAnswers);
        staker.reputationScore = newScore;

        emit AnswerRecorded(_provider, _accurate);
        emit ReputationUpdated(_provider, newScore);
    }

    /**
     * @notice Calculate reputation score (0-1000)
     */
    function _calculateReputation(uint32 accurate, uint32 total) private pure returns (uint16) {
        if (total == 0) return 500; // Default neutral score
        
        uint256 accuracy = (uint256(accurate) * 1000) / uint256(total);
        
        // Bonus for high volume
        uint256 volumeBonus = 0;
        if (total >= 100) volumeBonus = 50;
        else if (total >= 50) volumeBonus = 30;
        else if (total >= 10) volumeBonus = 10;

        uint256 finalScore = accuracy + volumeBonus;
        if (finalScore > 1000) finalScore = 1000;

        return uint16(finalScore);
    }

    /**
     * @notice Get pending rewards for staker
     */
    function pendingRewards(address _staker) external view returns (uint256) {
        Staker memory staker = stakers[_staker];
        if (staker.stakedAmount == 0) return 0;

        uint256 currentRewardsPerShare = rewardPool.rewardsPerShare;
        
        if (block.timestamp > rewardPool.lastUpdateTime && totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - rewardPool.lastUpdateTime;
            uint256 rewards = timeElapsed * rewardRate * totalStaked / 1e18;
            currentRewardsPerShare += (rewards * 1e18) / totalStaked;
        }

        return ((staker.stakedAmount * currentRewardsPerShare) / 1e18) - staker.rewardDebt;
    }

    /**
     * @notice Get staker info
     */
    function getStaker(address _staker) external view returns (
        uint256 stakedAmount,
        uint32 totalAnswers,
        uint32 accurateAnswers,
        uint16 reputationScore,
        bool active
    ) {
        Staker memory staker = stakers[_staker];
        return (
            staker.stakedAmount,
            staker.totalAnswers,
            staker.accurateAnswers,
            staker.reputationScore,
            staker.active
        );
    }

    /**
     * @notice Get stake weight (for aggregated oracle)
     * @return weight in basis points (0-10000)
     */
    function getStakeWeight(address _staker) external view returns (uint16) {
        Staker memory staker = stakers[_staker];
        if (!staker.active || totalStaked == 0) return 0;

        // Weight based on stake amount and reputation
        uint256 stakeRatio = (staker.stakedAmount * 5000) / totalStaked; // Max 50% from stake
        uint256 reputationBonus = (uint256(staker.reputationScore) * 5000) / 1000; // Max 50% from reputation

        uint256 totalWeight = stakeRatio + reputationBonus;
        if (totalWeight > 10000) totalWeight = 10000;

        return uint16(totalWeight);
    }

    /**
     * @notice Get all active stakers
     */
    function getActiveStakers() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < stakerList.length; i++) {
            if (stakers[stakerList[i]].active) {
                count++;
            }
        }

        address[] memory activeList = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < stakerList.length; i++) {
            if (stakers[stakerList[i]].active) {
                activeList[index] = stakerList[i];
                index++;
            }
        }

        return activeList;
    }

    /**
     * @notice Update minimum stake
     */
    function setMinimumStake(uint256 _newMinimum) external onlyOwner {
        minimumStake = _newMinimum;
    }

    /**
     * @notice Update reward rate
     */
    function setRewardRate(uint256 _newRate) external onlyOwner {
        _updateRewardPool();
        rewardRate = _newRate;
    }

    /**
     * @notice Add rewards to pool
     */
    function addRewards() external payable onlyOwner {
        require(msg.value > 0, "No rewards");
        _updateRewardPool();
    }

    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        payable(owner()).transfer(_amount);
    }

    receive() external payable {
        // Accept BNB for rewards
    }
}
