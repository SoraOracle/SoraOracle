// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SoraOracle.sol";

/**
 * @title DisputeResolution
 * @notice Decentralized dispute resolution for oracle answers with stake-based voting
 * @dev Allows community to challenge answers by staking BNB
 */
contract DisputeResolution is Ownable, ReentrancyGuard {
    
    enum DisputeStatus { PENDING, VOTING, RESOLVED, CANCELED }
    enum DisputeOutcome { UNDECIDED, CHALLENGER_WINS, PROVIDER_WINS }
    
    struct Dispute {
        uint256 questionId;
        address challenger;
        address oracleProvider;
        uint256 challengeStake;
        uint256 providerStake;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 createdAt;
        uint256 votingDeadline;
        DisputeStatus status;
        DisputeOutcome outcome;
        string reason;
        string proposedAnswer;
    }
    
    struct Vote {
        uint256 stake;
        bool votedForChallenger;
        bool claimed;
    }
    
    SoraOracle public immutable oracle;
    
    uint256 public constant MIN_CHALLENGE_STAKE = 0.05 ether;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant MIN_PROVIDER_STAKE = 0.1 ether;
    
    uint256 public disputeCounter;
    
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => bool) public questionDisputed; // questionId => has active dispute
    
    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 indexed questionId,
        address indexed challenger,
        uint256 stake,
        string reason
    );
    
    event VoteCast(
        uint256 indexed disputeId,
        address indexed voter,
        uint256 stake,
        bool votedForChallenger
    );
    
    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeOutcome outcome,
        uint256 totalStake
    );
    
    event StakeClaimed(
        uint256 indexed disputeId,
        address indexed claimer,
        uint256 amount
    );
    
    constructor(address _oracle) Ownable(msg.sender) {
        require(_oracle != address(0), "Invalid oracle");
        oracle = SoraOracle(payable(_oracle));
    }
    
    /**
     * @notice Challenge an oracle answer
     * @param _questionId Question ID to challenge
     * @param _reason Reason for challenge
     * @param _proposedAnswer Proposed correct answer
     */
    function createDispute(
        uint256 _questionId,
        string calldata _reason,
        string calldata _proposedAnswer
    ) external payable nonReentrant returns (uint256 disputeId) {
        require(msg.value >= MIN_CHALLENGE_STAKE, "Insufficient stake");
        require(!questionDisputed[_questionId], "Already disputed");
        require(bytes(_reason).length > 0, "Reason required");
        
        // Get question and answer from oracle
        (SoraOracle.Question memory question, SoraOracle.Answer memory answer) = 
            oracle.getQuestionWithAnswer(_questionId);
        
        require(answer.provider != address(0), "Question not answered");
        require(
            question.status == SoraOracle.AnswerStatus.ANSWERED,
            "Invalid status"
        );
        
        disputeId = disputeCounter++;
        
        disputes[disputeId] = Dispute({
            questionId: _questionId,
            challenger: msg.sender,
            oracleProvider: answer.provider,
            challengeStake: msg.value,
            providerStake: 0,
            totalVotesFor: 0,
            totalVotesAgainst: 0,
            createdAt: block.timestamp,
            votingDeadline: block.timestamp + VOTING_PERIOD,
            status: DisputeStatus.PENDING,
            outcome: DisputeOutcome.UNDECIDED,
            reason: _reason,
            proposedAnswer: _proposedAnswer
        });
        
        questionDisputed[_questionId] = true;
        
        emit DisputeCreated(disputeId, _questionId, msg.sender, msg.value, _reason);
    }
    
    /**
     * @notice Oracle provider responds to dispute by staking
     * @param _disputeId Dispute ID
     */
    function respondToDispute(uint256 _disputeId) external payable nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        
        require(msg.sender == dispute.oracleProvider, "Not the provider");
        require(dispute.status == DisputeStatus.PENDING, "Not pending");
        require(msg.value >= MIN_PROVIDER_STAKE, "Insufficient stake");
        
        dispute.providerStake = msg.value;
        dispute.status = DisputeStatus.VOTING;
        
        emit VoteCast(_disputeId, msg.sender, msg.value, false);
    }
    
    /**
     * @notice Vote on a dispute by staking
     * @param _disputeId Dispute ID
     * @param _voteForChallenger True to vote for challenger, false for provider
     */
    function voteOnDispute(uint256 _disputeId, bool _voteForChallenger) 
        external 
        payable 
        nonReentrant 
    {
        require(msg.value > 0, "Must stake to vote");
        Dispute storage dispute = disputes[_disputeId];
        
        require(dispute.status == DisputeStatus.VOTING, "Not in voting phase");
        require(block.timestamp < dispute.votingDeadline, "Voting ended");
        require(votes[_disputeId][msg.sender].stake == 0, "Already voted");
        
        votes[_disputeId][msg.sender] = Vote({
            stake: msg.value,
            votedForChallenger: _voteForChallenger,
            claimed: false
        });
        
        if (_voteForChallenger) {
            dispute.totalVotesFor += msg.value;
        } else {
            dispute.totalVotesAgainst += msg.value;
        }
        
        emit VoteCast(_disputeId, msg.sender, msg.value, _voteForChallenger);
    }
    
    /**
     * @notice Resolve dispute after voting period ends
     * @param _disputeId Dispute ID
     */
    function resolveDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        
        require(dispute.status == DisputeStatus.VOTING, "Not in voting");
        require(block.timestamp >= dispute.votingDeadline, "Voting ongoing");
        
        // Determine outcome based on total stakes
        uint256 totalForChallenger = dispute.totalVotesFor + dispute.challengeStake;
        uint256 totalForProvider = dispute.totalVotesAgainst + dispute.providerStake;
        
        if (totalForChallenger > totalForProvider) {
            dispute.outcome = DisputeOutcome.CHALLENGER_WINS;
        } else {
            dispute.outcome = DisputeOutcome.PROVIDER_WINS;
        }
        
        dispute.status = DisputeStatus.RESOLVED;
        
        uint256 totalStake = totalForChallenger + totalForProvider;
        
        emit DisputeResolved(_disputeId, dispute.outcome, totalStake);
    }
    
    /**
     * @notice Claim winnings after dispute is resolved
     * @param _disputeId Dispute ID
     */
    function claimWinnings(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        
        require(dispute.status == DisputeStatus.RESOLVED, "Not resolved");
        
        uint256 payout = 0;
        
        // Challenger claim
        if (msg.sender == dispute.challenger && dispute.outcome == DisputeOutcome.CHALLENGER_WINS) {
            uint256 totalWinningStake = dispute.totalVotesFor + dispute.challengeStake;
            uint256 totalLosingStake = dispute.totalVotesAgainst + dispute.providerStake;
            uint256 totalStake = totalWinningStake + totalLosingStake;
            
            payout = (dispute.challengeStake * totalStake) / totalWinningStake;
            dispute.challengeStake = 0;
        }
        // Provider claim
        else if (msg.sender == dispute.oracleProvider && dispute.outcome == DisputeOutcome.PROVIDER_WINS) {
            uint256 totalWinningStake = dispute.totalVotesAgainst + dispute.providerStake;
            uint256 totalLosingStake = dispute.totalVotesFor + dispute.challengeStake;
            uint256 totalStake = totalWinningStake + totalLosingStake;
            
            payout = (dispute.providerStake * totalStake) / totalWinningStake;
            dispute.providerStake = 0;
        }
        // Voter claim
        else {
            Vote storage vote = votes[_disputeId][msg.sender];
            require(vote.stake > 0, "No vote");
            require(!vote.claimed, "Already claimed");
            
            bool wonDispute = (
                (dispute.outcome == DisputeOutcome.CHALLENGER_WINS && vote.votedForChallenger) ||
                (dispute.outcome == DisputeOutcome.PROVIDER_WINS && !vote.votedForChallenger)
            );
            
            if (wonDispute) {
                uint256 totalWinningStake;
                uint256 totalLosingStake;
                
                if (dispute.outcome == DisputeOutcome.CHALLENGER_WINS) {
                    totalWinningStake = dispute.totalVotesFor + dispute.challengeStake;
                    totalLosingStake = dispute.totalVotesAgainst + dispute.providerStake;
                } else {
                    totalWinningStake = dispute.totalVotesAgainst + dispute.providerStake;
                    totalLosingStake = dispute.totalVotesFor + dispute.challengeStake;
                }
                
                uint256 totalStake = totalWinningStake + totalLosingStake;
                payout = (vote.stake * totalStake) / totalWinningStake;
            }
            
            vote.claimed = true;
        }
        
        require(payout > 0, "No winnings");
        
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");
        
        emit StakeClaimed(_disputeId, msg.sender, payout);
    }
    
    /**
     * @notice Cancel dispute if provider doesn't respond in time
     * @param _disputeId Dispute ID
     */
    function cancelDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        
        require(dispute.status == DisputeStatus.PENDING, "Not pending");
        require(
            block.timestamp > dispute.createdAt + 1 days,
            "Wait for provider response"
        );
        
        dispute.status = DisputeStatus.CANCELED;
        dispute.outcome = DisputeOutcome.CHALLENGER_WINS;
        questionDisputed[dispute.questionId] = false;
        
        // Refund challenger
        (bool success, ) = dispute.challenger.call{value: dispute.challengeStake}("");
        require(success, "Refund failed");
        
        emit DisputeResolved(_disputeId, DisputeOutcome.CHALLENGER_WINS, dispute.challengeStake);
    }
    
    /**
     * @notice Get dispute details
     * @param _disputeId Dispute ID
     * @return dispute Dispute information
     */
    function getDispute(uint256 _disputeId) external view returns (Dispute memory dispute) {
        return disputes[_disputeId];
    }
    
    /**
     * @notice Get voter information for a dispute
     * @param _disputeId Dispute ID
     * @param _voter Voter address
     * @return vote Vote information
     */
    function getVote(uint256 _disputeId, address _voter) external view returns (Vote memory vote) {
        return votes[_disputeId][_voter];
    }
    
    /**
     * @notice Check if a question has an active dispute
     * @param _questionId Question ID
     * @return hasDispute True if there's an active dispute
     */
    function hasActiveDispute(uint256 _questionId) external view returns (bool hasDispute) {
        return questionDisputed[_questionId];
    }
}
