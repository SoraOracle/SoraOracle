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


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.4.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
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


// File contracts/S402Facilitator.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.20;




/**
 * @title S402Facilitator
 * @notice Sora's HTTP 402 protocol facilitator for BNB Chain
 * @dev Implements EIP-2612 permit() + transferFrom() for gasless approvals
 * 
 * SECURITY FIXES v2:
 * - Recipient is now part of signed message (prevents front-running)
 * - Batch function uses internal calls (fixes reentrancy issue)
 * - Emergency pause mechanism (Pausable)
 * - Comprehensive input validation
 * 
 * S402 (SORA 402):
 * - Inspired by Coinbase's x402 but optimized for BNB Chain
 * - EIP-2612 permit() (BNB Chain USDC compatibility)
 * - Sequential nonces (handled by USDC contract)
 * - Two-step process: permit() then transferFrom()
 * - NOT x402-compliant (honest branding)0
 * 
 * Network: BNB Chain (56) / BNB Testnet (97)
 * Token: USDC on BNB Chain (EIP-2612 compliant)
 * 
 * Reference: S402_SPECIFICATION.md
 */
contract S402Facilitator is ReentrancyGuard, Pausable, Ownable {
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // USDC on BNB Chain (EIP-2612 compliant)
    IERC20 public immutable usdc;
    
    // Platform fee (basis points, e.g., 100 = 1%)
    uint256 public platformFeeBps = 100; // 1% platform fee
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10% max
    
    // Accumulated platform fees
    uint256 public accumulatedFees;
    
    // Payment tracking
    mapping(address => uint256) public totalPaid;
    mapping(address => uint256) public totalReceived;
    
    // Used payment tracking (prevents replay) - NOW INCLUDES RECIPIENT
    mapping(bytes32 => bool) public usedPayments;
    
    // Domain separator for EIP-712
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // EIP-712 TypeHash for payment authorization
    bytes32 public constant PAYMENT_TYPEHASH = keccak256(
        "PaymentAuthorization(address owner,address spender,uint256 value,uint256 deadline,address recipient,bytes32 nonce)"
    );
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event PaymentSettled(
        address indexed from,
        address indexed to,
        uint256 value,
        uint256 platformFee,
        bytes32 nonce
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event EmergencyPause(address indexed by);
    event EmergencyUnpause(address indexed by);
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    /**
     * @notice Initialize facilitator with USDC address
     * @param _usdc USDC contract address on BNB Chain
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        
        // Set up EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("S402Facilitator")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }
    
    // =============================================================================
    // EIP-2612: PERMIT + TRANSFERFROM (s402 Core) - FIXED VERSION
    // =============================================================================
    
    /**
     * @notice Settle payment using EIP-2612 permit with signed recipient
     * @dev SECURITY FIX: Recipient is now part of signed authorization
     * 
     * User signs: PaymentAuthorization(owner, spender, value, deadline, recipient, nonce)
     * This prevents front-running attacks where recipient could be changed
     * 
     * @param owner User's address (payer)
     * @param value Amount to transfer (USDC, 6 decimals)
     * @param deadline Permit expiration timestamp
     * @param recipient Final recipient (service provider) - NOW VERIFIED IN SIGNATURE
     * @param nonce Random nonce (prevents replay)
     * @param permitV Permit signature v
     * @param permitR Permit signature r
     * @param permitS Permit signature s
     * @param authV Authorization signature v
     * @param authR Authorization signature r
     * @param authS Authorization signature s
     * @return success True if payment settled successfully
     */
    function settlePaymentWithPermit(
        address owner,
        uint256 value,
        uint256 deadline,
        address recipient,
        bytes32 nonce,
        // Permit signature (for USDC approval)
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS,
        // Authorization signature (for payment details including recipient)
        uint8 authV,
        bytes32 authR,
        bytes32 authS
    ) external nonReentrant whenNotPaused returns (bool success) {
        // Input validation
        require(owner != address(0), "Invalid owner");
        require(recipient != address(0), "Invalid recipient");
        require(block.timestamp <= deadline, "Deadline expired");
        require(value > 0, "Invalid value");
        
        // Check payment hasn't been used (prevents replay)
        bytes32 paymentHash = keccak256(abi.encodePacked(
            owner,
            recipient,
            value,
            deadline,
            nonce
        ));
        
        require(!usedPayments[paymentHash], "Payment already used");
        usedPayments[paymentHash] = true;
        
        // SECURITY FIX: Verify authorization signature includes recipient
        bytes32 authDigest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    PAYMENT_TYPEHASH,
                    owner,
                    address(this), // spender
                    value,
                    deadline,
                    recipient,     // ← RECIPIENT IS NOW PART OF SIGNATURE
                    nonce
                ))
            )
        );
        
        address authSigner = ecrecover(authDigest, authV, authR, authS);
        require(authSigner == owner, "Invalid authorization signature");
        require(authSigner != address(0), "Invalid signature");
        
        // Step 1: Execute EIP-2612 permit (sets approval on USDC contract)
        IERC20Permit(address(usdc)).permit(
            owner,
            address(this), // spender
            value,
            deadline,
            permitV,
            permitR,
            permitS
        );
        
        // Calculate platform fee
        uint256 platformFee = (value * platformFeeBps) / 10000;
        uint256 recipientAmount = value - platformFee;
        
        // Step 2: Execute transfers using permit approval
        // Transfer to recipient
        require(
            usdc.transferFrom(owner, recipient, recipientAmount),
            "Transfer to recipient failed"
        );
        
        // Transfer platform fee to this contract
        if (platformFee > 0) {
            require(
                usdc.transferFrom(owner, address(this), platformFee),
                "Platform fee transfer failed"
            );
            accumulatedFees += platformFee;
        }
        
        // Update tracking
        totalPaid[owner] += value;
        totalReceived[recipient] += recipientAmount;
        
        emit PaymentSettled(owner, recipient, value, platformFee, nonce);
        
        return true;
    }
    
    /**
     * @notice Batch settle multiple payments - FIXED VERSION
     * @dev Uses internal function to avoid reentrancy guard issues
     */
    function batchSettlePayments(
        address[] calldata owners,
        uint256[] calldata values,
        uint256[] calldata deadlines,
        address[] calldata recipients,
        bytes32[] calldata nonces,
        uint8[] calldata permitV,
        bytes32[] calldata permitR,
        bytes32[] calldata permitS,
        uint8[] calldata authV,
        bytes32[] calldata authR,
        bytes32[] calldata authS
    ) external whenNotPaused returns (bool success) {
        require(
            owners.length == values.length &&
            owners.length == deadlines.length &&
            owners.length == recipients.length &&
            owners.length == nonces.length &&
            owners.length == permitV.length &&
            owners.length == authV.length,
            "Array length mismatch"
        );
        
        // SECURITY FIX: Use internal settlement to avoid reentrancy issues
        for (uint256 i = 0; i < owners.length; i++) {
            _settlePaymentInternal(
                owners[i],
                values[i],
                deadlines[i],
                recipients[i],
                nonces[i],
                permitV[i], permitR[i], permitS[i],
                authV[i], authR[i], authS[i]
            );
        }
        
        return true;
    }
    
    /**
     * @notice Internal settlement function (no reentrancy guard)
     * @dev Used by batch function to avoid reentrancy conflicts
     */
    function _settlePaymentInternal(
        address owner,
        uint256 value,
        uint256 deadline,
        address recipient,
        bytes32 nonce,
        uint8 permitV, bytes32 permitR, bytes32 permitS,
        uint8 authV, bytes32 authR, bytes32 authS
    ) internal {
        // Input validation
        require(owner != address(0), "Invalid owner");
        require(recipient != address(0), "Invalid recipient");
        require(block.timestamp <= deadline, "Deadline expired");
        require(value > 0, "Invalid value");
        
        // Check payment hasn't been used
        bytes32 paymentHash = keccak256(abi.encodePacked(
            owner, recipient, value, deadline, nonce
        ));
        require(!usedPayments[paymentHash], "Payment already used");
        usedPayments[paymentHash] = true;
        
        // Verify authorization signature
        bytes32 authDigest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    PAYMENT_TYPEHASH,
                    owner,
                    address(this),
                    value,
                    deadline,
                    recipient,
                    nonce
                ))
            )
        );
        
        address authSigner = ecrecover(authDigest, authV, authR, authS);
        require(authSigner == owner && authSigner != address(0), "Invalid authorization");
        
        // Execute permit
        IERC20Permit(address(usdc)).permit(
            owner, address(this), value, deadline,
            permitV, permitR, permitS
        );
        
        // Calculate fees and transfer
        uint256 platformFee = (value * platformFeeBps) / 10000;
        uint256 recipientAmount = value - platformFee;
        
        require(usdc.transferFrom(owner, recipient, recipientAmount), "Transfer failed");
        
        if (platformFee > 0) {
            require(usdc.transferFrom(owner, address(this), platformFee), "Fee transfer failed");
            accumulatedFees += platformFee;
        }
        
        totalPaid[owner] += value;
        totalReceived[recipient] += recipientAmount;
        
        emit PaymentSettled(owner, recipient, value, platformFee, nonce);
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update platform fee
     * @param newFeeBps New fee in basis points (100 = 1%)
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "Fee too high");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @notice Withdraw accumulated platform fees
     * @param to Recipient address
     */
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(accumulatedFees > 0, "No fees to withdraw");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        
        require(usdc.transfer(to, amount), "Transfer failed");
        
        emit FeesWithdrawn(to, amount);
    }
    
    /**
     * @notice Emergency pause (stops all settlements)
     */
    function pause() external onlyOwner {
        _pause();
        emit EmergencyPause(msg.sender);
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get payment statistics for a user
     */
    function getStats(address user) external view returns (
        uint256 paid,
        uint256 received,
        uint256 balance
    ) {
        return (
            totalPaid[user],
            totalReceived[user],
            usdc.balanceOf(user)
        );
    }
    
    /**
     * @notice Check if payment has been used
     */
    function isPaymentUsed(
        address owner,
        address recipient,
        uint256 value,
        uint256 deadline,
        bytes32 nonce
    ) external view returns (bool) {
        bytes32 paymentHash = keccak256(abi.encodePacked(
            owner, recipient, value, deadline, nonce
        ));
        return usedPayments[paymentHash];
    }
    
    /**
     * @notice Get payment hash for tracking
     */
    function getPaymentHash(
        address owner,
        address recipient,
        uint256 value,
        uint256 deadline,
        bytes32 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            owner, recipient, value, deadline, nonce
        ));
    }
}

/**
 * @dev Interface for EIP-2612 permit function
 */
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    
    function nonces(address owner) external view returns (uint256);
}
