// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title X402Facilitator
 * @notice Official x402 protocol facilitator for BNB Chain
 * @dev Implements EIP-712 typed data signing for payment verification
 * 
 * Compatible with Coinbase x402 specification:
 * - EIP-712 domain separator
 * - EIP-2612 Permit for USDC on BNB Chain
 * - Official message format
 * - HTTP 402 payment protocol
 * 
 * Reference: https://github.com/coinbase/x402
 */
contract X402Facilitator is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    
    // =============================================================================
    // EIP-712 DOMAIN SEPARATOR
    // =============================================================================
    
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 public constant PAYMENT_TYPEHASH = keccak256(
        "Payment(address recipient,uint256 amount,address assetContract,string nonce,uint256 expiration)"
    );
    
    string public constant name = "x402";
    string public constant version = "1";
    
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // Supported token (USDC on BNB Chain)
    IERC20 public immutable token;
    
    // Platform fee (basis points, e.g., 100 = 1%)
    uint256 public platformFeeBps = 100; // 1% platform fee
    
    // Accumulated platform fees
    uint256 public accumulatedFees;
    
    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;
    
    // Payment tracking
    mapping(address => uint256) public totalPaid;
    mapping(address => uint256) public totalReceived;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event PaymentVerified(
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        string nonce,
        uint256 platformFee
    );
    
    event PaymentSettled(
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        string nonce
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    /**
     * @notice Initialize facilitator with token address
     * @param _token Token contract address (USDC on BNB Chain)
     */
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        
        // Calculate domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid,
                address(this)
            )
        );
    }
    
    // =============================================================================
    // PAYMENT VERIFICATION (EIP-712)
    // =============================================================================
    
    /**
     * @notice Verify x402 payment proof using EIP-712 typed data
     * @param recipient Address receiving the payment
     * @param amount Payment amount (6 decimals for USDC)
     * @param assetContract Token contract address (must match this.token)
     * @param nonce Unique payment nonce (string)
     * @param expiration Payment expiration timestamp
     * @param signature ECDSA signature from payer
     * @param payer Expected payer address
     * @return bool True if signature is valid
     */
    function verifyPayment(
        address recipient,
        uint256 amount,
        address assetContract,
        string memory nonce,
        uint256 expiration,
        bytes memory signature,
        address payer
    ) public view returns (bool) {
        // Verify token matches
        require(assetContract == address(token), "Invalid asset contract");
        
        // Check nonce hasn't been used
        bytes32 nonceHash = keccak256(bytes(nonce));
        require(!usedNonces[nonceHash], "Nonce already used");
        
        // Check expiration
        require(block.timestamp <= expiration, "Payment expired");
        
        // Construct EIP-712 struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_TYPEHASH,
                recipient,
                amount,
                assetContract,
                keccak256(bytes(nonce)),
                expiration
            )
        );
        
        // Construct final digest
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        // Recover signer from signature
        address recoveredSigner = digest.recover(signature);
        
        // Verify signer matches payer
        return recoveredSigner == payer && recoveredSigner != address(0);
    }
    
    // =============================================================================
    // PAYMENT SETTLEMENT
    // =============================================================================
    
    /**
     * @notice Settle payment using EIP-2612 Permit (gasless approval + transfer)
     * @param recipient Address receiving the payment
     * @param amount Payment amount
     * @param assetContract Token contract address
     * @param nonce Unique payment nonce
     * @param expiration Payment expiration
     * @param signature Payment signature
     * @param payer Payer address
     */
    function settlePayment(
        address recipient,
        uint256 amount,
        address assetContract,
        string memory nonce,
        uint256 expiration,
        bytes memory signature,
        address payer
    ) external nonReentrant {
        // Verify payment proof
        require(
            verifyPayment(recipient, amount, assetContract, nonce, expiration, signature, payer),
            "Invalid payment proof"
        );
        
        // Mark nonce as used (replay protection)
        bytes32 nonceHash = keccak256(bytes(nonce));
        usedNonces[nonceHash] = true;
        
        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 netAmount = amount - platformFee;
        
        // Transfer tokens from payer to recipient
        require(
            token.transferFrom(payer, recipient, netAmount),
            "Token transfer to recipient failed"
        );
        
        // Transfer platform fee to facilitator
        if (platformFee > 0) {
            require(
                token.transferFrom(payer, address(this), platformFee),
                "Token fee transfer failed"
            );
            accumulatedFees += platformFee;
        }
        
        // Update tracking
        totalPaid[payer] += amount;
        totalReceived[recipient] += netAmount;
        
        emit PaymentSettled(payer, recipient, amount, nonce);
        emit PaymentVerified(payer, recipient, amount, nonce, platformFee);
    }
    
    /**
     * @notice Settle payment with EIP-2612 Permit (one-step approval + settlement)
     * @param recipient Address receiving the payment
     * @param amount Payment amount
     * @param nonce Unique payment nonce (string)
     * @param expiration Payment expiration
     * @param signature Payment signature
     * @param payer Payer address
     * @param permitDeadline Permit deadline
     * @param permitV Permit signature v
     * @param permitR Permit signature r
     * @param permitS Permit signature s
     */
    function settlePaymentWithPermit(
        address recipient,
        uint256 amount,
        string memory nonce,
        uint256 expiration,
        bytes memory signature,
        address payer,
        uint256 permitDeadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external nonReentrant {
        // Verify payment proof
        require(
            verifyPayment(recipient, amount, address(token), nonce, expiration, signature, payer),
            "Invalid payment proof"
        );
        
        // Mark nonce as used
        bytes32 nonceHash = keccak256(bytes(nonce));
        usedNonces[nonceHash] = true;
        
        // Get permit nonce from token contract
        IERC20Permit permitToken = IERC20Permit(address(token));
        
        // Execute permit (gasless approval)
        permitToken.permit(
            payer,
            address(this),
            amount,
            permitDeadline,
            permitV,
            permitR,
            permitS
        );
        
        // Calculate fees
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 netAmount = amount - platformFee;
        
        // Transfer tokens
        require(
            token.transferFrom(payer, recipient, netAmount),
            "Token transfer to recipient failed"
        );
        
        if (platformFee > 0) {
            require(
                token.transferFrom(payer, address(this), platformFee),
                "Token fee transfer failed"
            );
            accumulatedFees += platformFee;
        }
        
        // Update tracking
        totalPaid[payer] += amount;
        totalReceived[recipient] += netAmount;
        
        emit PaymentSettled(payer, recipient, amount, nonce);
        emit PaymentVerified(payer, recipient, amount, nonce, platformFee);
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update platform fee (only owner)
     * @param newFeeBps New fee in basis points (100 = 1%)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high (max 10%)");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @notice Withdraw accumulated platform fees (only owner)
     * @param to Address to send fees to
     */
    function withdrawFees(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        require(token.transfer(to, amount), "Fee withdrawal failed");
        
        emit FeesWithdrawn(to, amount);
    }
    
    /**
     * @notice Emergency withdrawal (only owner)
     * @param tokenAddress Token to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(IERC20(tokenAddress).transfer(to, amount), "Emergency withdrawal failed");
    }
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get payment stats for an address
     * @param addr Address to check
     * @return paid Total amount paid
     * @return received Total amount received
     */
    function getPaymentStats(address addr) 
        external 
        view 
        returns (uint256 paid, uint256 received) 
    {
        return (totalPaid[addr], totalReceived[addr]);
    }
    
    /**
     * @notice Check if nonce has been used
     * @param nonce Nonce to check (string)
     * @return bool True if nonce has been used
     */
    function isNonceUsed(string memory nonce) external view returns (bool) {
        return usedNonces[keccak256(bytes(nonce))];
    }
    
    /**
     * @notice Get domain separator
     * @return bytes32 EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }
}
