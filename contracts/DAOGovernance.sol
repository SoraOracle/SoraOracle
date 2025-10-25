// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DAOGovernance
 * @notice Decentralized governance for oracle system parameters
 * @dev Token-weighted voting on proposals (fees, parameters, oracle providers)
 */
contract DAOGovernance is Ownable, ReentrancyGuard {
    
    enum ProposalType { FEE_CHANGE, PARAMETER_CHANGE, ORACLE_ADDITION, ORACLE_REMOVAL, GENERAL }
    enum ProposalStatus { PENDING, ACTIVE, PASSED, FAILED, EXECUTED, CANCELLED }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        string title;
        string description;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint32 startTime;
        uint32 endTime;
        ProposalStatus status;
        bytes executionData;        // Encoded function call
    }

    struct Vote {
        bool hasVoted;
        bool support;
        uint256 votePower;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(address => uint256) public votingPower;  // Based on stake/activity
    
    uint256 public proposalCounter;
    uint256 public proposalThreshold = 100 ether;   // Min stake to create proposal
    uint256 public quorum = 1000 ether;              // Min votes for validity
    uint32 public votingPeriod = 3 days;
    uint16 public passPercentage = 6000;            // 60% required to pass

    address[] public voters;

    event ProposalCreated(uint256 indexed proposalId, ProposalType proposalType, string title, address proposer);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votePower);
    event ProposalExecuted(uint256 indexed proposalId, bool success);
    event ProposalCancelled(uint256 indexed proposalId);
    event VotingPowerUpdated(address indexed voter, uint256 newPower);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create governance proposal
     * @param _proposalType Type of proposal
     * @param _title Proposal title
     * @param _description Detailed description
     * @param _executionData Encoded function call (if applicable)
     */
    function createProposal(
        ProposalType _proposalType,
        string memory _title,
        string memory _description,
        bytes memory _executionData
    ) external nonReentrant returns (uint256 proposalId) {
        require(votingPower[msg.sender] >= proposalThreshold, "Insufficient voting power");
        require(bytes(_title).length > 0, "Empty title");

        proposalId = proposalCounter++;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: _proposalType,
            title: _title,
            description: _description,
            proposer: msg.sender,
            forVotes: 0,
            againstVotes: 0,
            startTime: uint32(block.timestamp),
            endTime: uint32(block.timestamp + votingPeriod),
            status: ProposalStatus.ACTIVE,
            executionData: _executionData
        });

        emit ProposalCreated(proposalId, _proposalType, _title, msg.sender);
        return proposalId;
    }

    /**
     * @notice Cast vote on proposal
     * @param _proposalId Proposal to vote on
     * @param _support True for yes, false for no
     */
    function castVote(uint256 _proposalId, bool _support) external nonReentrant {
        require(votingPower[msg.sender] > 0, "No voting power");
        
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting ended");

        Vote storage vote = votes[_proposalId][msg.sender];
        require(!vote.hasVoted, "Already voted");

        uint256 power = votingPower[msg.sender];

        vote.hasVoted = true;
        vote.support = _support;
        vote.votePower = power;

        if (_support) {
            proposal.forVotes += power;
        } else {
            proposal.againstVotes += power;
        }

        emit VoteCast(_proposalId, msg.sender, _support, power);
    }

    /**
     * @notice Finalize proposal after voting period
     */
    function finalizeProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp > proposal.endTime, "Voting not ended");

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        
        // Check quorum
        if (totalVotes < quorum) {
            proposal.status = ProposalStatus.FAILED;
            return;
        }

        // Check if passed
        uint256 forPercentage = (proposal.forVotes * 10000) / totalVotes;
        if (forPercentage >= passPercentage) {
            proposal.status = ProposalStatus.PASSED;
        } else {
            proposal.status = ProposalStatus.FAILED;
        }
    }

    /**
     * @notice Execute passed proposal
     */
    function executeProposal(uint256 _proposalId) external nonReentrant onlyOwner {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.status == ProposalStatus.PASSED, "Not passed");

        proposal.status = ProposalStatus.EXECUTED;

        // Execute proposal action (if executionData provided)
        if (proposal.executionData.length > 0) {
            (bool success,) = address(this).call(proposal.executionData);
            emit ProposalExecuted(_proposalId, success);
        } else {
            emit ProposalExecuted(_proposalId, true);
        }
    }

    /**
     * @notice Cancel proposal (proposer or owner only)
     */
    function cancelProposal(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized"
        );
        require(
            proposal.status == ProposalStatus.PENDING || proposal.status == ProposalStatus.ACTIVE,
            "Cannot cancel"
        );

        proposal.status = ProposalStatus.CANCELLED;
        emit ProposalCancelled(_proposalId);
    }

    /**
     * @notice Update voting power (called by staking contract)
     * @param _voter Address of voter
     * @param _power New voting power
     */
    function updateVotingPower(address _voter, uint256 _power) external onlyOwner {
        uint256 oldPower = votingPower[_voter];
        votingPower[_voter] = _power;

        // Add to voters list if new
        if (oldPower == 0 && _power > 0) {
            voters.push(_voter);
        }

        emit VotingPowerUpdated(_voter, _power);
    }

    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 _proposalId) external view returns (
        ProposalType proposalType,
        string memory title,
        string memory description,
        address proposer,
        uint256 forVotes,
        uint256 againstVotes,
        uint32 endTime,
        ProposalStatus status
    ) {
        Proposal memory proposal = proposals[_proposalId];
        return (
            proposal.proposalType,
            proposal.title,
            proposal.description,
            proposal.proposer,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.endTime,
            proposal.status
        );
    }

    /**
     * @notice Get vote details
     */
    function getVote(uint256 _proposalId, address _voter) external view returns (
        bool hasVoted,
        bool support,
        uint256 votePower
    ) {
        Vote memory vote = votes[_proposalId][_voter];
        return (vote.hasVoted, vote.support, vote.votePower);
    }

    /**
     * @notice Get active proposals
     */
    function getActiveProposals() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < proposalCounter; i++) {
            if (proposals[i].status == ProposalStatus.ACTIVE) {
                count++;
            }
        }

        uint256[] memory activeList = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < proposalCounter; i++) {
            if (proposals[i].status == ProposalStatus.ACTIVE) {
                activeList[index] = i;
                index++;
            }
        }

        return activeList;
    }

    /**
     * @notice Update governance parameters
     */
    function setProposalThreshold(uint256 _newThreshold) external onlyOwner {
        proposalThreshold = _newThreshold;
    }

    function setQuorum(uint256 _newQuorum) external onlyOwner {
        quorum = _newQuorum;
    }

    function setVotingPeriod(uint32 _newPeriod) external onlyOwner {
        require(_newPeriod >= 1 days && _newPeriod <= 14 days, "Invalid period");
        votingPeriod = _newPeriod;
    }

    function setPassPercentage(uint16 _newPercentage) external onlyOwner {
        require(_newPercentage >= 5000 && _newPercentage <= 9000, "Must be 50-90%");
        passPercentage = _newPercentage;
    }
}
