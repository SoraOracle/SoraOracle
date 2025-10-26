// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title X402Facilitator
 * @notice On-chain payment facilitator for x402 micropayments on BNB Chain
 * @dev Handles USDC payment verification and settlement for API access
 * 
 * Features:
 * - ECDSA signature verification
 * - Nonce-based replay protection
 * - Automatic USDC settlement
 * - Fee collection mechanism
 * - Emergency withdrawal
 */
contract X402Facilitator is ReentrancyGuard, Ownable {
    
    // BNB Chain USDC token address
    IERC20 public immutable usdc;
    
    // Platform fee (basis points, e.g., 100 = 1%)
    uint256 public platformFeeBps = 100; // 1% platform fee
    
    // Accumulated platform fees
    uint256 public accumulatedFees;
    
    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;
    
    // Payment tracking
    mapping(address => uint256) public totalPaid;
    mapping(address => uint256) public totalReceived;
    
    // Events
    event PaymentVerified(
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        bytes32 nonce,
        uint256 platformFee
    );
    
    event PaymentSettled(
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        bytes32 nonce
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    
    /**
     * @notice Initialize facilitator with USDC token address
     * @param _usdc BNB Chain USDC token address
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    /**
     * @notice Verify payment proof signature
     * @param nonce Unique payment nonce
     * @param amount Payment amount in USDC (6 decimals)
     * @param token Token address (must be USDC)
     * @param payer Address making the payment
     * @param recipient Address receiving the payment
     * @param signature ECDSA signature
     * @return bool True if signature is valid
     */
    function verifyPayment(
        bytes32 nonce,
        uint256 amount,
        address token,
        address payer,
        address recipient,
        bytes memory signature
    ) public view returns (bool) {
        // Verify token is USDC
        require(token == address(usdc), "Invalid token");
        
        // Check nonce hasn't been used
        require(!usedNonces[nonce], "Nonce already used");
        
        // Reconstruct message hash (must match client-side signing)
        bytes32 messageHash = keccak256(
            abi.encodePacked(nonce, amount, token, payer, recipient)
        );
        
        // Add Ethereum Signed Message prefix
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        
        // Recover signer from signature
        address recoveredSigner = recoverSigner(ethSignedMessageHash, signature);
        
        // Verify signer matches payer
        return recoveredSigner == payer;
    }
    
    /**
     * @notice Settle payment - transfer USDC from payer to recipient
     * @param nonce Unique payment nonce
     * @param amount Payment amount in USDC (6 decimals)
     * @param token Token address (must be USDC)
     * @param payer Address making the payment
     * @param recipient Address receiving the payment
     * @param signature ECDSA signature
     */
    function settlePayment(
        bytes32 nonce,
        uint256 amount,
        address token,
        address payer,
        address recipient,
        bytes memory signature
    ) external nonReentrant {
        // Verify payment proof
        require(
            verifyPayment(nonce, amount, token, payer, recipient, signature),
            "Invalid payment proof"
        );
        
        // Mark nonce as used (replay protection)
        usedNonces[nonce] = true;
        
        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 netAmount = amount - platformFee;
        
        // Transfer USDC from payer to recipient
        require(
            usdc.transferFrom(payer, recipient, netAmount),
            "USDC transfer to recipient failed"
        );
        
        // Transfer platform fee to facilitator
        if (platformFee > 0) {
            require(
                usdc.transferFrom(payer, address(this), platformFee),
                "USDC fee transfer failed"
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
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        require(usdc.transfer(to, amount), "Fee withdrawal failed");
        
        emit FeesWithdrawn(to, amount);
    }
    
    /**
     * @notice Emergency withdrawal (only owner)
     * @dev Should only be used in case of critical issues
     * @param token Token to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(IERC20(token).transfer(to, amount), "Emergency withdrawal failed");
    }
    
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
     * @param nonce Nonce to check
     * @return bool True if nonce has been used
     */
    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
    
    /**
     * @notice Recover signer address from signature
     * @param messageHash Hash of the signed message
     * @param signature ECDSA signature
     * @return address Recovered signer address
     */
    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Adjust v if needed (some wallets return 0/1 instead of 27/28)
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        return ecrecover(messageHash, v, r, s);
    }
}
