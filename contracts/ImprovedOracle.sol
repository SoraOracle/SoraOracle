// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ImprovedOracle is Ownable, ReentrancyGuard, Pausable {
    struct Question {
        address requester;
        string question;
        string answer;
        uint256 bounty;
        uint256 timestamp;
        bool answered;
        bool withdrawn;
    }

    mapping(uint256 => Question) public questions;
    uint256 public questionCounter;
    uint256 public minimumBounty;
    
    address public oracleProvider;
    uint256 public providerBalance;

    event QuestionAsked(
        uint256 indexed questionId,
        address indexed requester,
        string question,
        uint256 bounty,
        uint256 timestamp
    );

    event AnswerProvided(
        uint256 indexed questionId,
        string answer,
        uint256 timestamp
    );

    event BountyWithdrawn(
        uint256 indexed questionId,
        address indexed requester,
        uint256 amount
    );

    event OracleProviderUpdated(
        address indexed oldProvider,
        address indexed newProvider
    );

    event MinimumBountyUpdated(
        uint256 oldBounty,
        uint256 newBounty
    );

    modifier onlyOracleProvider() {
        require(msg.sender == oracleProvider, "Only oracle provider can call this");
        _;
    }

    constructor(address _oracleProvider) Ownable(msg.sender) {
        require(_oracleProvider != address(0), "Invalid oracle provider address");
        oracleProvider = _oracleProvider;
        minimumBounty = 0.01 ether;
    }

    function askOracle(string memory _question) external payable whenNotPaused nonReentrant {
        require(msg.value >= minimumBounty, "Bounty too low");
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(bytes(_question).length <= 500, "Question too long");

        uint256 questionId = questionCounter++;
        
        questions[questionId] = Question({
            requester: msg.sender,
            question: _question,
            answer: "",
            bounty: msg.value,
            timestamp: block.timestamp,
            answered: false,
            withdrawn: false
        });

        emit QuestionAsked(questionId, msg.sender, _question, msg.value, block.timestamp);
    }

    function provideAnswer(uint256 _questionId, string memory _answer) 
        external 
        onlyOracleProvider 
        whenNotPaused 
        nonReentrant 
    {
        Question storage q = questions[_questionId];
        require(!q.answered, "Question already answered");
        require(!q.withdrawn, "Question already refunded");
        require(bytes(_answer).length > 0, "Answer cannot be empty");
        require(bytes(_answer).length <= 1000, "Answer too long");

        q.answer = _answer;
        q.answered = true;

        providerBalance += q.bounty;

        emit AnswerProvided(_questionId, _answer, block.timestamp);
    }

    function withdraw() external onlyOracleProvider nonReentrant {
        uint256 amount = providerBalance;
        require(amount > 0, "No balance to withdraw");

        providerBalance = 0;
        
        (bool success, ) = payable(oracleProvider).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    function refundUnansweredQuestion(uint256 _questionId) 
        external 
        nonReentrant 
    {
        Question storage q = questions[_questionId];
        require(msg.sender == q.requester, "Only requester can refund");
        require(!q.answered, "Question already answered");
        require(!q.withdrawn, "Already withdrawn");
        require(block.timestamp >= q.timestamp + 7 days, "Must wait 7 days");

        q.withdrawn = true;
        uint256 refundAmount = q.bounty;
        q.bounty = 0;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");

        emit BountyWithdrawn(_questionId, msg.sender, refundAmount);
    }

    function setOracleProvider(address _newProvider) external onlyOwner {
        require(_newProvider != address(0), "Invalid provider address");
        address oldProvider = oracleProvider;
        oracleProvider = _newProvider;
        emit OracleProviderUpdated(oldProvider, _newProvider);
    }

    function setMinimumBounty(uint256 _newMinimum) external onlyOwner {
        uint256 oldMinimum = minimumBounty;
        minimumBounty = _newMinimum;
        emit MinimumBountyUpdated(oldMinimum, _newMinimum);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getQuestion(uint256 _questionId) 
        external 
        view 
        returns (
            address requester,
            string memory question,
            string memory answer,
            uint256 bounty,
            uint256 timestamp,
            bool answered,
            bool withdrawn
        ) 
    {
        Question memory q = questions[_questionId];
        return (
            q.requester,
            q.question,
            q.answer,
            q.bounty,
            q.timestamp,
            q.answered,
            q.withdrawn
        );
    }

    function getTotalQuestions() external view returns (uint256) {
        return questionCounter;
    }

    receive() external payable {
        revert("Direct transfers not allowed");
    }
}
