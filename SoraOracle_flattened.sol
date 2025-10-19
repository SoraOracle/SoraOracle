// Sources flattened with hardhat v2.26.3 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File @openzeppelin/contracts/utils/Pausable.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}


// File contracts/interfaces/IPancakePair.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;

interface IPancakePair {
    function price0CumulativeLast() external view returns (uint256);
    function price1CumulativeLast() external view returns (uint256);
    function getReserves() external view returns (
        uint112 reserve0,
        uint112 reserve1,
        uint32 blockTimestampLast
    );
    function token0() external view returns (address);
    function token1() external view returns (address);
}


// File contracts/PancakeTWAPOracle.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;


/**
 * @title PancakeTWAPOracle
 * @notice Time-Weighted Average Price oracle for PancakeSwap V2 pairs
 * @dev Provides manipulation-resistant price feeds using Uniswap V2 TWAP pattern
 */
contract PancakeTWAPOracle is Ownable {
    struct Observation {
        uint32 timestamp;
        uint256 price0Cumulative;
        uint256 price1Cumulative;
    }

    IPancakePair public immutable pair;
    address public immutable token0;
    address public immutable token1;
    
    Observation public observationOld;
    Observation public observationNew;
    
    uint32 public constant MIN_PERIOD = 5 minutes;
    uint224 constant Q112 = 2**112;

    event OracleUpdated(uint32 timestamp, uint256 price0Cumulative, uint256 price1Cumulative);

    constructor(address _pair) Ownable(msg.sender) {
        require(_pair != address(0), "Invalid pair address");
        pair = IPancakePair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
        
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices();
        require(price0Cumulative > 0 || price1Cumulative > 0, "No data");
        
        observationOld = Observation({
            timestamp: blockTimestamp,
            price0Cumulative: price0Cumulative,
            price1Cumulative: price1Cumulative
        });
        
        observationNew = observationOld;
    }

    /**
     * @notice Compute current cumulative prices
     * @dev Follows Uniswap V2 oracle pattern - adds time-weighted price since last update
     */
    function currentCumulativePrices() public view returns (
        uint256 price0Cumulative,
        uint256 price1Cumulative,
        uint32 blockTimestamp
    ) {
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        
        price0Cumulative = pair.price0CumulativeLast();
        price1Cumulative = pair.price1CumulativeLast();
        blockTimestamp = uint32(block.timestamp);
        
        // If time has elapsed since the last update, compute the time-weighted price
        if (blockTimestampLast != blockTimestamp) {
            uint32 timeElapsed;
            unchecked {
                timeElapsed = blockTimestamp - blockTimestampLast;
            }
            
            // Add the accumulated price during the elapsed time
            // price0 = reserve1 / reserve0, encoded as UQ112x112
            // price1 = reserve0 / reserve1, encoded as UQ112x112
            if (reserve0 != 0 && reserve1 != 0) {
                unchecked {
                    price0Cumulative += uint256(uint224(reserve1)) * Q112 / reserve0 * timeElapsed;
                    price1Cumulative += uint256(uint224(reserve0)) * Q112 / reserve1 * timeElapsed;
                }
            }
        }
    }

    function update() external {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices();
        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - observationNew.timestamp;
        }
        
        require(timeElapsed >= MIN_PERIOD, "Period not elapsed");
        
        observationOld = observationNew;
        
        observationNew = Observation({
            timestamp: blockTimestamp,
            price0Cumulative: price0Cumulative,
            price1Cumulative: price1Cumulative
        });

        emit OracleUpdated(blockTimestamp, price0Cumulative, price1Cumulative);
    }

    /**
     * @notice Get TWAP price - falls back to spot if bootstrapping
     * @dev Permissionless: returns spot price for first 5 min after oracle creation
     * @param token Token to price  
     * @param amountIn Amount of input token
     * @return amountOut Expected output based on TWAP (or spot during bootstrap)
     */
    function consult(address token, uint256 amountIn) external view returns (uint256 amountOut) {
        require(token == token0 || token == token1, "Invalid token");
        
        uint32 timeElapsed;
        unchecked {
            timeElapsed = observationNew.timestamp - observationOld.timestamp;
        }
        
        // Bootstrap mode: return spot price if not enough data yet
        if (timeElapsed < MIN_PERIOD) {
            return _getCurrentPrice(token, amountIn);
        }
        
        // Normal mode: return TWAP
        uint256 priceCumulativeDelta;
        if (token == token0) {
            unchecked {
                priceCumulativeDelta = observationNew.price0Cumulative - observationOld.price0Cumulative;
            }
            uint224 priceAverage = uint224(priceCumulativeDelta / timeElapsed);
            amountOut = (amountIn * priceAverage) / Q112;
        } else {
            unchecked {
                priceCumulativeDelta = observationNew.price1Cumulative - observationOld.price1Cumulative;
            }
            uint224 priceAverage = uint224(priceCumulativeDelta / timeElapsed);
            amountOut = (amountIn * priceAverage) / Q112;
        }
    }
    
    /**
     * @notice Check if oracle has enough data for true TWAP (vs spot fallback)
     * @return bool True if MIN_PERIOD elapsed (using TWAP), false if using spot
     */
    function canConsult() external view returns (bool) {
        uint32 timeElapsed;
        unchecked {
            timeElapsed = observationNew.timestamp - observationOld.timestamp;
        }
        return timeElapsed >= MIN_PERIOD;
    }

    function getCurrentPrice(address token, uint256 amountIn) external view returns (uint256 amountOut) {
        return _getCurrentPrice(token, amountIn);
    }

    function _getCurrentPrice(address token, uint256 amountIn) internal view returns (uint256 amountOut) {
        require(token == token0 || token == token1, "Invalid token");
        
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, "No reserves");
        
        if (token == token0) {
            amountOut = (amountIn * reserve1) / reserve0;
        } else {
            amountOut = (amountIn * reserve0) / reserve1;
        }
    }

    function canUpdate() external view returns (bool) {
        uint32 timeElapsed;
        unchecked {
            timeElapsed = uint32(block.timestamp) - observationNew.timestamp;
        }
        return timeElapsed >= MIN_PERIOD;
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}


// File contracts/SoraOracle.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;




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
