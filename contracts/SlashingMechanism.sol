// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./OracleStaking.sol";

/**
 * @title SlashingMechanism
 * @notice Penalize dishonest oracle providers
 * @dev Integrates with OracleStaking to slash stakes for bad behavior
 */
contract SlashingMechanism is Ownable, ReentrancyGuard {
    
    enum ViolationType { WRONG_ANSWER, DELAYED_ANSWER, MANIPULATION, COLLUSION }
    enum DisputeStatus { PENDING, INVESTIGATING, PROVEN, DISMISSED }

    struct Dispute {
        uint256 id;
        address accused;
        address accuser;
        ViolationType violationType;
        uint256 questionId;
        string evidence;
        uint256 slashAmount;
        uint32 timestamp;
        DisputeStatus status;
        uint8 votes;
        mapping(address => bool) voted;
    }

    struct SlashingRecord {
        address provider;
        uint256 amount;
        ViolationType violationType;
        uint32 timestamp;
        bool refunded;
    }

    mapping(uint256 => Dispute) public disputes;
    mapping(address => SlashingRecord[]) public slashingHistory;
    mapping(address => uint256) public totalSlashed;
    
    uint256 public disputeCounter;
    OracleStaking public stakingContract;
    
    uint256 public minimumSlashAmount = 0.01 ether;
    uint256 public maximumSlashPercentage = 5000; // 50% of stake
    uint8 public requiredVotes = 3;
    uint32 public disputePeriod = 3 days;

    event DisputeRaised(uint256 indexed disputeId, address indexed accused, ViolationType violationType);
    event DisputeVoted(uint256 indexed disputeId, address indexed voter, bool guilty);
    event Slashed(address indexed provider, uint256 amount, ViolationType violationType);
    event DisputeDismissed(uint256 indexed disputeId);
    event SlashRefunded(address indexed provider, uint256 amount);

    constructor(address _stakingContract) Ownable(msg.sender) {
        require(_stakingContract != address(0), "Invalid staking contract");
        stakingContract = OracleStaking(payable(_stakingContract));
    }

    /**
     * @notice Raise dispute against oracle provider
     * @param _accused Address of oracle provider
     * @param _violationType Type of violation
     * @param _questionId Related question ID
     * @param _evidence Evidence description
     */
    function raiseDispute(
        address _accused,
        ViolationType _violationType,
        uint256 _questionId,
        string memory _evidence
    ) external payable nonReentrant returns (uint256 disputeId) {
        require(msg.value >= 0.01 ether, "Insufficient dispute fee");
        require(_accused != address(0), "Invalid accused");
        require(bytes(_evidence).length > 0, "No evidence");

        // Check if accused is staking
        (uint256 stakedAmount,,,,) = stakingContract.getStaker(_accused);
        require(stakedAmount > 0, "Not a staker");

        disputeId = disputeCounter++;

        Dispute storage dispute = disputes[disputeId];
        dispute.id = disputeId;
        dispute.accused = _accused;
        dispute.accuser = msg.sender;
        dispute.violationType = _violationType;
        dispute.questionId = _questionId;
        dispute.evidence = _evidence;
        dispute.slashAmount = _calculateSlashAmount(_accused, _violationType);
        dispute.timestamp = uint32(block.timestamp);
        dispute.status = DisputeStatus.PENDING;
        dispute.votes = 0;

        emit DisputeRaised(disputeId, _accused, _violationType);
        return disputeId;
    }

    /**
     * @notice Vote on dispute (for authorized judges/stakers)
     * @param _disputeId Dispute ID
     * @param _guilty True if provider is guilty
     */
    function voteOnDispute(uint256 _disputeId, bool _guilty) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.status == DisputeStatus.PENDING || dispute.status == DisputeStatus.INVESTIGATING, "Not open");
        require(!dispute.voted[msg.sender], "Already voted");
        require(block.timestamp <= dispute.timestamp + disputePeriod, "Dispute expired");

        // Check voter has voting power (is staker)
        (uint256 stakedAmount,,,,) = stakingContract.getStaker(msg.sender);
        require(stakedAmount >= 1 ether, "Insufficient stake to vote");

        dispute.voted[msg.sender] = true;
        dispute.status = DisputeStatus.INVESTIGATING;

        if (_guilty) {
            dispute.votes++;
        }

        emit DisputeVoted(_disputeId, msg.sender, _guilty);

        // Check if enough votes to finalize
        if (dispute.votes >= requiredVotes) {
            _executeSlash(_disputeId);
        }
    }

    /**
     * @notice Execute slash if dispute proven
     */
    function _executeSlash(uint256 _disputeId) private {
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.votes >= requiredVotes, "Not enough votes");
        require(dispute.status == DisputeStatus.INVESTIGATING, "Not investigating");

        dispute.status = DisputeStatus.PROVEN;

        // Record slashing
        slashingHistory[dispute.accused].push(SlashingRecord({
            provider: dispute.accused,
            amount: dispute.slashAmount,
            violationType: dispute.violationType,
            timestamp: uint32(block.timestamp),
            refunded: false
        }));

        totalSlashed[dispute.accused] += dispute.slashAmount;

        // Note: Actual stake slashing would require integration with OracleStaking contract
        // For now, just emit event
        emit Slashed(dispute.accused, dispute.slashAmount, dispute.violationType);
    }

    /**
     * @notice Dismiss dispute if not enough evidence
     */
    function dismissDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        require(
            msg.sender == owner() || msg.sender == dispute.accuser,
            "Not authorized"
        );
        require(
            dispute.status == DisputeStatus.PENDING || dispute.status == DisputeStatus.INVESTIGATING,
            "Cannot dismiss"
        );
        require(block.timestamp > dispute.timestamp + disputePeriod, "Dispute period active");

        dispute.status = DisputeStatus.DISMISSED;

        // Refund dispute fee to accuser
        payable(dispute.accuser).transfer(0.01 ether);

        emit DisputeDismissed(_disputeId);
    }

    /**
     * @notice Calculate slash amount based on violation
     */
    function _calculateSlashAmount(address _provider, ViolationType _violationType) private view returns (uint256) {
        (uint256 stakedAmount,,,,) = stakingContract.getStaker(_provider);

        uint256 slashPercentage;
        if (_violationType == ViolationType.MANIPULATION || _violationType == ViolationType.COLLUSION) {
            slashPercentage = maximumSlashPercentage; // 50%
        } else if (_violationType == ViolationType.WRONG_ANSWER) {
            slashPercentage = 2000; // 20%
        } else { // DELAYED_ANSWER
            slashPercentage = 500; // 5%
        }

        uint256 slashAmount = (stakedAmount * slashPercentage) / 10000;
        
        // Ensure minimum and doesn't exceed maximum
        if (slashAmount < minimumSlashAmount) {
            slashAmount = minimumSlashAmount;
        }
        if (slashAmount > (stakedAmount * maximumSlashPercentage) / 10000) {
            slashAmount = (stakedAmount * maximumSlashPercentage) / 10000;
        }

        return slashAmount;
    }

    /**
     * @notice Get dispute details
     */
    function getDispute(uint256 _disputeId) external view returns (
        address accused,
        address accuser,
        ViolationType violationType,
        uint256 slashAmount,
        uint32 timestamp,
        DisputeStatus status,
        uint8 votes
    ) {
        Dispute storage dispute = disputes[_disputeId];
        return (
            dispute.accused,
            dispute.accuser,
            dispute.violationType,
            dispute.slashAmount,
            dispute.timestamp,
            dispute.status,
            dispute.votes
        );
    }

    /**
     * @notice Get slashing history for provider
     */
    function getSlashingHistory(address _provider) external view returns (SlashingRecord[] memory) {
        return slashingHistory[_provider];
    }

    /**
     * @notice Get pending disputes
     */
    function getPendingDisputes() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < disputeCounter; i++) {
            if (disputes[i].status == DisputeStatus.PENDING || disputes[i].status == DisputeStatus.INVESTIGATING) {
                count++;
            }
        }

        uint256[] memory pending = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < disputeCounter; i++) {
            if (disputes[i].status == DisputeStatus.PENDING || disputes[i].status == DisputeStatus.INVESTIGATING) {
                pending[index] = i;
                index++;
            }
        }

        return pending;
    }

    /**
     * @notice Update parameters
     */
    function setRequiredVotes(uint8 _required) external onlyOwner {
        require(_required >= 2 && _required <= 10, "Invalid vote count");
        requiredVotes = _required;
    }

    function setMaximumSlashPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 10000, "Cannot exceed 100%");
        maximumSlashPercentage = _percentage;
    }

    function setDisputePeriod(uint32 _period) external onlyOwner {
        require(_period >= 1 days && _period <= 7 days, "Invalid period");
        disputePeriod = _period;
    }

    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees");
        payable(owner()).transfer(balance);
    }

    receive() external payable {
        // Accept dispute fees
    }
}
