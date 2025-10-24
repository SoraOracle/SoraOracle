// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReferralRewards
 * @notice Reward users for referring traders to the platform
 * @dev Tracks referrals and distributes rewards from trading fees
 */
contract ReferralRewards is Ownable, ReentrancyGuard {
    
    struct Referrer {
        uint256 totalReferrals;
        uint256 totalVolume;      // Total volume from referrals
        uint256 earnedRewards;
        uint256 claimedRewards;
        bool isActive;
    }

    struct Referral {
        address referrer;
        uint256 timestamp;
        uint256 volumeGenerated;
    }

    // Referral reward percentage (5% of trading fees go to referrer)
    uint256 public constant REFERRAL_REWARD_PERCENTAGE = 5;
    
    // Minimum volume to become eligible referrer (1 BNB)
    uint256 public constant MIN_VOLUME_FOR_REFERRER = 1 ether;

    mapping(address => Referrer) public referrers;
    mapping(address => Referral) public referrals; // user => their referral info
    mapping(address => address[]) public referredUsers; // referrer => list of referred users
    
    uint256 public totalReferralRewards;
    uint256 public totalReferrals;

    mapping(address => bool) public authorizedMarkets;

    event ReferralRegistered(address indexed referee, address indexed referrer);
    event MarketAuthorized(address indexed market, bool authorized);
    event ReferralVolumeRecorded(address indexed referrer, address indexed referee, uint256 volume);
    event ReferralRewardEarned(address indexed referrer, uint256 amount);
    event ReferralRewardClaimed(address indexed referrer, uint256 amount);
    event ReferrerActivated(address indexed referrer);

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
     * @notice Register a referral relationship
     * @param _referrer Address of the referrer
     */
    function registerReferral(address _referrer) external {
        require(_referrer != address(0), "Invalid referrer");
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(referrals[msg.sender].referrer == address(0), "Already referred");
        require(referrers[_referrer].isActive || referrers[_referrer].totalVolume >= MIN_VOLUME_FOR_REFERRER, 
                "Referrer not eligible");

        referrals[msg.sender] = Referral({
            referrer: _referrer,
            timestamp: block.timestamp,
            volumeGenerated: 0
        });

        referrers[_referrer].totalReferrals++;
        referredUsers[_referrer].push(msg.sender);
        totalReferrals++;

        emit ReferralRegistered(msg.sender, _referrer);
    }

    /**
     * @notice Record volume from a referred user and distribute rewards
     * @dev Called by authorized contracts (prediction markets)
     * @param _user User who generated volume
     * @param _volume Volume generated
     * @param _fee Fee collected from this volume
     */
    function recordVolume(address _user, uint256 _volume, uint256 _fee) 
        external 
        payable 
    {
        require(authorizedMarkets[msg.sender], "Not authorized market");
        require(msg.value == _fee * REFERRAL_REWARD_PERCENTAGE / 100, "Incorrect reward amount");

        Referral storage referral = referrals[_user];
        if (referral.referrer == address(0)) {
            // No referrer, return funds
            (bool success, ) = msg.sender.call{value: msg.value}("");
            require(success, "Refund failed");
            return;
        }

        // Update referral stats
        referral.volumeGenerated += _volume;
        
        Referrer storage referrer = referrers[referral.referrer];
        referrer.totalVolume += _volume;
        referrer.earnedRewards += msg.value;
        
        totalReferralRewards += msg.value;

        emit ReferralVolumeRecorded(referral.referrer, _user, _volume);
        emit ReferralRewardEarned(referral.referrer, msg.value);
    }

    /**
     * @notice Claim accumulated referral rewards
     */
    function claimRewards() external nonReentrant {
        Referrer storage referrer = referrers[msg.sender];
        uint256 pending = referrer.earnedRewards - referrer.claimedRewards;
        require(pending > 0, "No rewards to claim");

        referrer.claimedRewards += pending;

        (bool success, ) = msg.sender.call{value: pending}("");
        require(success, "Transfer failed");

        emit ReferralRewardClaimed(msg.sender, pending);
    }

    /**
     * @notice Activate as referrer (for users who meet volume requirement)
     */
    function activateAsReferrer() external {
        Referrer storage referrer = referrers[msg.sender];
        require(!referrer.isActive, "Already active");
        require(referrer.totalVolume >= MIN_VOLUME_FOR_REFERRER, "Volume too low");

        referrer.isActive = true;
        emit ReferrerActivated(msg.sender);
    }

    /**
     * @notice Get pending rewards for referrer
     */
    function getPendingRewards(address _referrer) external view returns (uint256) {
        Referrer storage referrer = referrers[_referrer];
        return referrer.earnedRewards - referrer.claimedRewards;
    }

    /**
     * @notice Get referrer's referred users
     */
    function getReferredUsers(address _referrer) external view returns (address[] memory) {
        return referredUsers[_referrer];
    }

    /**
     * @notice Get referrer info
     */
    function getReferrerInfo(address _referrer) 
        external 
        view 
        returns (
            uint256 referralCount,
            uint256 volumeGenerated,
            uint256 earnedRewards,
            uint256 claimedRewards,
            uint256 pendingRewards,
            bool isActive
        ) 
    {
        Referrer storage ref = referrers[_referrer];
        return (
            ref.totalReferrals,
            ref.totalVolume,
            ref.earnedRewards,
            ref.claimedRewards,
            ref.earnedRewards - ref.claimedRewards,
            ref.isActive
        );
    }

    /**
     * @notice Check if user was referred
     */
    function getReferrer(address _user) external view returns (address) {
        return referrals[_user].referrer;
    }
}
