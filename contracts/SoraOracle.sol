// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./PancakeTWAPOracle.sol";

/**
 * @title SoraOracle
 * @notice Decentralized oracle for prediction markets with TWAP integration
 * @dev Supports price feeds, yes/no questions, and numeric predictions
 */
contract SoraOracle is Ownable, ReentrancyGuard, Pausable {
    
    enum QuestionType { GENERAL, PRICE, YESNO, NUMERIC }
    enum AnswerStatus { PENDING, ANSWERED, DISPUTED, FINALIZED }

    struct Question {
        address requester;          // 20 bytes
        uint88 bounty;              // 11 bytes (max ~309k BNB - plenty)
        uint32 timestamp;           // 4 bytes (good until 2106)
        uint32 deadline;            // 4 bytes
        QuestionType questionType;  // 1 byte
        AnswerStatus status;        // 1 byte
        bool refunded;              // 1 byte
        // Total: 32 bytes (1 slot) + hash in separate mapping
    }

    struct Answer {
        address provider;           // 20 bytes
        uint8 confidenceScore;      // 1 byte (0-100)
        bool boolAnswer;            // 1 byte
        // 10 bytes free in slot
        uint64 numericAnswer;       // 8 bytes (for most price data)
        uint32 timestamp;           // 4 bytes
        // Slot 2: 12 bytes used, 20 free
        // Text/dataSource in events only
    }

    mapping(uint256 => Question) public questions;
    mapping(uint256 => Answer) public answers;
    mapping(uint256 => bytes32) public questionHashes; // Hash of question text
    mapping(address => PancakeTWAPOracle) public twapOracles;
    
    uint256 public questionCounter;
    uint256 public oracleFee = 0.01 ether;
    address public oracleProvider;
    uint256 public providerBalance;
    uint256 public constant REFUND_PERIOD = 7 days;
    uint256 public constant TWAP_DEPLOYMENT_FEE = 0.02 ether; // Covers ~2M gas deployment cost

    event QuestionAsked(
        uint256 indexed questionId,
        address indexed requester,
        QuestionType questionType,
        string question,
        uint256 bounty,
        uint256 deadline
    );

    event AnswerProvided(
        uint256 indexed questionId,
        string textAnswer,
        uint256 numericAnswer,
        uint8 confidenceScore,
        string dataSource
    );

    event TWAPOracleAdded(address indexed pairAddress, address indexed oracleAddress);
    event OracleFeeUpdated(uint256 oldFee, uint256 newFee);

    modifier onlyOracleProvider() {
        require(msg.sender == oracleProvider, "Only oracle provider");
        _;
    }

    constructor(address _oracleProvider) Ownable(msg.sender) {
        require(_oracleProvider != address(0), "Invalid provider");
        oracleProvider = _oracleProvider;
    }

    /**
     * @notice Ask a general question to the oracle
     * @param _question The question to ask
     * @param _deadline Timestamp by which answer is needed
     */
    function askOracle(
        string memory _question,
        uint256 _deadline
    ) external payable whenNotPaused nonReentrant returns (uint256 questionId) {
        return _askQuestion(QuestionType.GENERAL, _question, _deadline);
    }

    /**
     * @notice Ask a price-related question (can use TWAP)
     * @param _question The price question
     * @param _deadline Timestamp by which answer is needed
     */
    function askPriceQuestion(
        string memory _question,
        uint256 _deadline
    ) external payable whenNotPaused nonReentrant returns (uint256 questionId) {
        return _askQuestion(QuestionType.PRICE, _question, _deadline);
    }

    /**
     * @notice Ask a yes/no question
     * @param _question The yes/no question
     * @param _deadline Timestamp by which answer is needed
     */
    function askYesNoQuestion(
        string memory _question,
        uint256 _deadline
    ) external payable whenNotPaused nonReentrant returns (uint256 questionId) {
        return _askQuestion(QuestionType.YESNO, _question, _deadline);
    }

    function _askQuestion(
        QuestionType _type,
        string memory _question,
        uint256 _deadline
    ) private returns (uint256 questionId) {
        require(msg.value >= oracleFee, "Insufficient fee");
        require(bytes(_question).length > 0, "Question empty");
        require(bytes(_question).length <= 500, "Question too long");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(_deadline <= type(uint32).max, "Deadline overflow");
        require(msg.value <= type(uint88).max, "Bounty overflow");

        questionId = questionCounter++;
        
        questions[questionId] = Question({
            requester: msg.sender,
            questionType: _type,
            bounty: uint88(msg.value),
            timestamp: uint32(block.timestamp),
            deadline: uint32(_deadline),
            status: AnswerStatus.PENDING,
            refunded: false
        });

        // Store question hash, emit full text in event
        questionHashes[questionId] = keccak256(bytes(_question));
        emit QuestionAsked(questionId, msg.sender, _type, _question, msg.value, _deadline);
    }

    /**
     * @notice Provide an answer to a question
     * @param _questionId The question ID
     * @param _textAnswer Text answer (for general questions) - emitted in event only
     * @param _numericAnswer Numeric answer (for price/numeric questions) - max uint64
     * @param _boolAnswer Boolean answer (for yes/no questions)
     * @param _confidenceScore Confidence score 0-100
     * @param _dataSource Data source used (e.g., "TWAP", "Manual", "API") - emitted in event only
     */
    function provideAnswer(
        uint256 _questionId,
        string memory _textAnswer,
        uint256 _numericAnswer,
        bool _boolAnswer,
        uint8 _confidenceScore,
        string memory _dataSource
    ) external onlyOracleProvider whenNotPaused nonReentrant {
        Question storage q = questions[_questionId];
        require(q.status == AnswerStatus.PENDING, "Already answered");
        require(!q.refunded, "Already refunded");
        require(_confidenceScore <= 100, "Invalid confidence");
        require(bytes(_dataSource).length > 0, "Data source required");
        require(_numericAnswer <= type(uint64).max, "Numeric answer overflow");

        answers[_questionId] = Answer({
            provider: msg.sender,
            confidenceScore: _confidenceScore,
            boolAnswer: _boolAnswer,
            numericAnswer: uint64(_numericAnswer),
            timestamp: uint32(block.timestamp)
        });

        q.status = AnswerStatus.ANSWERED;
        providerBalance += q.bounty;

        emit AnswerProvided(_questionId, _textAnswer, _numericAnswer, _confidenceScore, _dataSource);
    }

    /**
     * @notice Get price from TWAP oracle for a token pair
     * @dev Oracle must exist (use addTWAPOracle first)
     * @param _pairAddress PancakeSwap pair address
     * @param _token Token to price
     * @param _amount Amount of tokens
     */
    function getTWAPPrice(
        address _pairAddress,
        address _token,
        uint256 _amount
    ) external view returns (uint256) {
        require(address(twapOracles[_pairAddress]) != address(0), "Oracle not found - call addTWAPOracle first");
        return twapOracles[_pairAddress].consult(_token, _amount);
    }

    /**
     * @notice Add a TWAP oracle for a trading pair (permissionless)
     * @dev Anyone can add any PancakeSwap pair - caller pays deployment cost
     * @param _pairAddress PancakeSwap pair address
     */
    function addTWAPOracle(address _pairAddress) external payable {
        require(address(twapOracles[_pairAddress]) == address(0), "Already exists");
        require(msg.value >= TWAP_DEPLOYMENT_FEE, "Insufficient deployment fee");
        _createTWAPOracle(_pairAddress);
        
        // Refund excess
        if (msg.value > TWAP_DEPLOYMENT_FEE) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - TWAP_DEPLOYMENT_FEE}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Internal function to create TWAP oracle
     * @param _pairAddress PancakeSwap pair address
     */
    function _createTWAPOracle(address _pairAddress) internal {
        require(_pairAddress != address(0), "Invalid pair");
        
        PancakeTWAPOracle newOracle = new PancakeTWAPOracle(_pairAddress);
        twapOracles[_pairAddress] = newOracle;
        
        emit TWAPOracleAdded(_pairAddress, address(newOracle));
    }

    /**
     * @notice Refund unanswered question after refund period
     */
    function refundUnansweredQuestion(uint256 _questionId) external nonReentrant {
        Question storage q = questions[_questionId];
        require(msg.sender == q.requester, "Only requester");
        require(q.status == AnswerStatus.PENDING, "Already answered");
        require(!q.refunded, "Already refunded");
        require(block.timestamp >= q.timestamp + REFUND_PERIOD, "Too early");

        q.refunded = true;
        uint256 refundAmount = q.bounty;
        q.bounty = 0;

        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");
    }

    /**
     * @notice Withdraw oracle provider earnings
     */
    function withdraw() external onlyOracleProvider nonReentrant {
        uint256 amount = providerBalance;
        require(amount > 0, "No balance");

        providerBalance = 0;
        
        (bool success, ) = payable(oracleProvider).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Get full question and answer data
     */
    function getQuestionWithAnswer(uint256 _questionId) 
        external 
        view 
        returns (
            Question memory question,
            Answer memory answer
        ) 
    {
        return (questions[_questionId], answers[_questionId]);
    }

    /**
     * @notice Update oracle fee
     */
    function setOracleFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = oracleFee;
        oracleFee = _newFee;
        emit OracleFeeUpdated(oldFee, _newFee);
    }

    /**
     * @notice Update oracle provider address
     */
    function setOracleProvider(address _newProvider) external onlyOwner {
        require(_newProvider != address(0), "Invalid provider");
        oracleProvider = _newProvider;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    receive() external payable {
        revert("Direct transfers not allowed");
    }
}
