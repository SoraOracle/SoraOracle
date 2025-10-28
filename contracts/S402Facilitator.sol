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
 * - EIP-2612 permit() (World Liberty Financial USD1 compatibility)
 * - Sequential nonces (handled by USD1 contract)
 * - Two-step process: permit() then transferFrom()
 * - NOT x402-compliant (honest branding)
 * 
 * Network: BNB Chain (56) / BNB Testnet (97)
 * Token: USD1 on BNB Chain (EIP-2612 compliant, 18 decimals)
 * 
 * Reference: S402_SPECIFICATION.md
 */

// Structs to avoid stack too deep
struct Signature {
    uint8 v;
    bytes32 r;
    bytes32 s;
}

struct PaymentData {
    address owner;
    uint256 value;
    uint256 deadline;
    address recipient;
    bytes32 nonce;
}

contract S402Facilitator is ReentrancyGuard, Pausable, Ownable {
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // USD1 on BNB Chain (World Liberty Financial, EIP-2612 compliant, 18 decimals)
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
     * @notice Initialize facilitator with USD1 address
     * @param _usdc USD1 contract address on BNB Chain (World Liberty Financial)
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USD1 address");
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
     * @notice Settle payment using existing allowance (no permit needed)
     * @dev Requires user to have approved the contract beforehand
     * 
     * @param payment Payment data (owner, value, deadline, recipient, nonce)
     * @param authSig Authorization signature for payment (includes recipient)
     * @return True if payment settled successfully
     */
    function settlePayment(
        PaymentData calldata payment,
        Signature calldata authSig
    ) external nonReentrant whenNotPaused returns (bool) {
        require(payment.owner != address(0) && payment.recipient != address(0), "Invalid address");
        require(block.timestamp <= payment.deadline && payment.value > 0, "Invalid params");
        
        bytes32 hash = keccak256(abi.encodePacked(
            payment.owner, payment.recipient, payment.value, payment.deadline, payment.nonce
        ));
        require(!usedPayments[hash], "Payment used");
        usedPayments[hash] = true;
        
        _verifyAuth(payment, authSig);
        _doTransfers(payment);
        return true;
    }
    
    function settlePaymentWithPermit(
        PaymentData calldata payment,
        Signature calldata permitSig,
        Signature calldata authSig
    ) external nonReentrant whenNotPaused returns (bool) {
        require(payment.owner != address(0) && payment.recipient != address(0), "Invalid address");
        require(block.timestamp <= payment.deadline && payment.value > 0, "Invalid params");
        
        bytes32 hash = keccak256(abi.encodePacked(
            payment.owner, payment.recipient, payment.value, payment.deadline, payment.nonce
        ));
        require(!usedPayments[hash], "Payment used");
        usedPayments[hash] = true;
        
        _verifyAuth(payment, authSig);
        
        IERC20Permit(address(usdc)).permit(
            payment.owner, address(this), payment.value, payment.deadline,
            permitSig.v, permitSig.r, permitSig.s
        );
        
        _doTransfers(payment);
        return true;
    }
    
    function _verifyAuth(PaymentData calldata p, Signature calldata sig) internal view {
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(PAYMENT_TYPEHASH, p.owner, address(this), p.value, p.deadline, p.recipient, p.nonce))
        ));
        address signer = ecrecover(digest, sig.v, sig.r, sig.s);
        require(signer == p.owner && signer != address(0), "Bad sig");
    }
    
    function _doTransfers(PaymentData calldata p) internal {
        uint256 fee = (p.value * platformFeeBps) / 10000;
        uint256 amt = p.value - fee;
        
        require(usdc.transferFrom(p.owner, p.recipient, amt), "Transfer failed");
        if (fee > 0) {
            require(usdc.transferFrom(p.owner, address(this), fee), "Fee failed");
            accumulatedFees += fee;
        }
        
        totalPaid[p.owner] += p.value;
        totalReceived[p.recipient] += amt;
        emit PaymentSettled(p.owner, p.recipient, p.value, fee, p.nonce);
    }
    
    function batchSettlePayments(
        PaymentData[] calldata payments,
        Signature[] calldata permitSigs,
        Signature[] calldata authSigs
    ) external whenNotPaused returns (bool) {
        uint256 len = payments.length;
        require(len == permitSigs.length && len == authSigs.length, "Length mismatch");
        
        for (uint256 i; i < len; ++i) {
            _settle(payments[i], permitSigs[i], authSigs[i]);
        }
        return true;
    }
    
    function _settle(PaymentData calldata p, Signature calldata pSig, Signature calldata aSig) internal {
        require(p.owner != address(0) && p.recipient != address(0), "Invalid addr");
        require(block.timestamp <= p.deadline && p.value > 0, "Invalid params");
        
        bytes32 h = keccak256(abi.encodePacked(p.owner, p.recipient, p.value, p.deadline, p.nonce));
        require(!usedPayments[h], "Used");
        usedPayments[h] = true;
        
        _verifyAuth(p, aSig);
        IERC20Permit(address(usdc)).permit(p.owner, address(this), p.value, p.deadline, pSig.v, pSig.r, pSig.s);
        _doTransfers(p);
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
