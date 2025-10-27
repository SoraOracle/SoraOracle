// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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
