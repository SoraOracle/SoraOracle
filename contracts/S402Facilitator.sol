// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title S402Facilitator
 * @notice Sora's HTTP 402 protocol facilitator for BNB Chain
 * @dev Implements EIP-2612 permit() + transferFrom() for gasless approvals
 * 
 * S402 (SORA 402):
 * - Inspired by Coinbase's x402 but optimized for BNB Chain
 * - EIP-2612 permit() (BNB Chain USDC compatibility)
 * - Sequential nonces (handled by USDC contract)
 * - Two-step process: permit() then transferFrom()
 * - NOT x402-compliant (honest branding)
 * 
 * Network: BNB Chain (56) / BNB Testnet (97)
 * Token: USDC on BNB Chain (EIP-2612 compliant)
 * 
 * Reference: S402_SPECIFICATION.md
 */
contract S402Facilitator is ReentrancyGuard, Ownable {
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // USDC on BNB Chain (EIP-2612 compliant)
    IERC20 public immutable usdc;
    
    // Platform fee (basis points, e.g., 100 = 1%)
    uint256 public platformFeeBps = 100; // 1% platform fee
    
    // Accumulated platform fees
    uint256 public accumulatedFees;
    
    // Payment tracking
    mapping(address => uint256) public totalPaid;
    mapping(address => uint256) public totalReceived;
    
    // Used permit tracking (prevent replay)
    mapping(bytes32 => bool) public usedPermits;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event PaymentSettled(
        address indexed from,
        address indexed to,
        uint256 value,
        uint256 platformFee,
        uint256 nonce
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    /**
     * @notice Initialize facilitator with USDC address
     * @param _usdc USDC contract address on BNB Chain
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    // =============================================================================
    // EIP-2612: PERMIT + TRANSFERFROM (s402 Core)
    // =============================================================================
    
    /**
     * @notice Settle payment using EIP-2612 permit
     * @dev Two-step process: 1) permit() approval, 2) transferFrom()
     * 
     * @param owner User's address (payer)
     * @param spender This contract's address (must be this contract!)
     * @param value Amount to transfer (USDC, 6 decimals)
     * @param deadline Permit expiration timestamp
     * @param v Signature component
     * @param r Signature component
     * @param s Signature component
     * @param recipient Final recipient (service provider)
     * @return success True if payment settled successfully
     */
    function settlePaymentWithPermit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address recipient
    ) external nonReentrant returns (bool success) {
        require(owner != address(0), "Invalid owner");
        require(recipient != address(0), "Invalid recipient");
        require(spender == address(this), "Spender must be this contract");
        require(block.timestamp <= deadline, "Permit expired");
        require(value > 0, "Invalid value");
        
        // Create unique permit hash to prevent replay
        bytes32 permitHash = keccak256(abi.encodePacked(
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        ));
        
        require(!usedPermits[permitHash], "Permit already used");
        usedPermits[permitHash] = true;
        
        // Step 1: Execute permit (sets approval)
        // Call USDC.permit(owner, spender, value, deadline, v, r, s)
        IERC20Permit(address(usdc)).permit(
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        );
        
        // Calculate platform fee
        uint256 platformFee = (value * platformFeeBps) / 10000;
        uint256 recipientAmount = value - platformFee;
        
        // Step 2: Execute transferFrom (uses approval from permit)
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
        
        // Get nonce from USDC contract for event
        uint256 nonce = IERC20Permit(address(usdc)).nonces(owner) - 1;
        
        emit PaymentSettled(owner, recipient, value, platformFee, nonce);
        
        return true;
    }
    
    /**
     * @notice Batch settle multiple payments
     * @dev Processes multiple EIP-2612 permits in one transaction
     */
    function batchSettlePayments(
        address[] calldata owners,
        address[] calldata spenders,
        uint256[] calldata values,
        uint256[] calldata deadlines,
        uint8[] calldata v,
        bytes32[] calldata r,
        bytes32[] calldata s,
        address[] calldata recipients
    ) external nonReentrant returns (bool success) {
        require(
            owners.length == spenders.length &&
            owners.length == values.length &&
            owners.length == deadlines.length &&
            owners.length == v.length &&
            owners.length == recipients.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < owners.length; i++) {
            // Call single settle for each payment
            this.settlePaymentWithPermit(
                owners[i],
                spenders[i],
                values[i],
                deadlines[i],
                v[i],
                r[i],
                s[i],
                recipients[i]
            );
        }
        
        return true;
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update platform fee
     * @param newFeeBps New fee in basis points (100 = 1%)
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high (max 10%)");
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
     * @notice Check if permit has been used
     */
    function isPermitUsed(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external view returns (bool) {
        bytes32 permitHash = keccak256(abi.encodePacked(
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        ));
        return usedPermits[permitHash];
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
