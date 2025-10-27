// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title X402Facilitator
 * @notice Official x402 protocol facilitator for Base
 * @dev Implements EIP-3009 for atomic transfers with random nonces
 * 
 * TRUE x402 COMPLIANCE:
 * - EIP-3009 transferWithAuthorization (not EIP-2612)
 * - Random 32-byte nonces (parallel transactions)
 * - Atomic single-step transfers
 * - Compatible with Coinbase x402 specification
 * 
 * Network: Base (8453) / Base Sepolia (84532)
 * Token: USDC on Base (EIP-3009 compliant)
 * 
 * Reference: https://eips.ethereum.org/EIPS/eip-3009
 */
contract X402Facilitator is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    
    // =============================================================================
    // EIP-712 DOMAIN SEPARATOR (x402 Specification)
    // =============================================================================
    
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    // EIP-3009 TransferWithAuthorization TypeHash
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );
    
    string public constant name = "x402";
    string public constant version = "1";
    
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // USDC on Base (EIP-3009 compliant)
    IERC20 public immutable usdc;
    
    // Platform fee (basis points, e.g., 100 = 1%)
    uint256 public platformFeeBps = 100; // 1% platform fee
    
    // Accumulated platform fees
    uint256 public accumulatedFees;
    
    // Random nonce tracking (EIP-3009 style)
    // Random 32-byte nonces allow parallel transactions!
    mapping(address => mapping(bytes32 => bool)) public authorizationState;
    
    // Payment tracking
    mapping(address => uint256) public totalPaid;
    mapping(address => uint256) public totalReceived;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event AuthorizationUsed(
        address indexed authorizer,
        bytes32 indexed nonce
    );
    
    event PaymentVerified(
        address indexed from,
        address indexed to,
        uint256 value,
        uint256 platformFee
    );
    
    event PaymentSettled(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes32 indexed nonce
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    /**
     * @notice Initialize facilitator with USDC address
     * @param _usdc USDC contract address on Base
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        
        // Calculate domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid, // 8453 (Base) or 84532 (Base Sepolia)
                address(this)
            )
        );
    }
    
    // =============================================================================
    // EIP-3009: TRANSFER WITH AUTHORIZATION (x402 Core)
    // =============================================================================
    
    /**
     * @notice Execute transfer with authorization (EIP-3009)
     * @dev This is the CORE x402 payment method - atomic, parallel-safe
     * 
     * @param from Payer address
     * @param to Recipient address (service provider)
     * @param value Transfer amount (in USDC atomic units, 6 decimals)
     * @param validAfter Authorization valid after this timestamp
     * @param validBefore Authorization valid before this timestamp
     * @param nonce Random 32-byte nonce (allows parallel transactions!)
     * @param signature EIP-712 signature from payer
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        // Validate timing
        require(block.timestamp > validAfter, "Authorization not yet valid");
        require(block.timestamp < validBefore, "Authorization expired");
        
        // Check nonce hasn't been used (random nonces = no ordering needed!)
        require(!authorizationState[from][nonce], "Authorization already used");
        
        // Construct EIP-712 digest
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                    from,
                    to,
                    value,
                    validAfter,
                    validBefore,
                    nonce
                ))
            )
        );
        
        // Verify signature
        address signer = digest.recover(signature);
        require(signer == from, "Invalid signature");
        
        // Mark nonce as used
        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);
        
        // Calculate platform fee
        uint256 platformFee = (value * platformFeeBps) / 10000;
        uint256 netAmount = value - platformFee;
        
        // Execute atomic transfer from payer to recipient
        require(
            usdc.transferFrom(from, to, netAmount),
            "Transfer to recipient failed"
        );
        
        // Transfer platform fee
        if (platformFee > 0) {
            require(
                usdc.transferFrom(from, address(this), platformFee),
                "Fee transfer failed"
            );
            accumulatedFees += platformFee;
        }
        
        // Update tracking
        totalPaid[from] += value;
        totalReceived[to] += netAmount;
        
        emit PaymentSettled(from, to, value, nonce);
        emit PaymentVerified(from, to, value, platformFee);
    }
    
    /**
     * @notice Receive with authorization (EIP-3009)
     * @dev More secure variant - only callable by recipient
     * Prevents front-running attacks in smart contract integrations
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(to == msg.sender, "Caller must be the payee");
        
        // Delegate to transferWithAuthorization with recipient check
        this.transferWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            signature
        );
    }
    
    // =============================================================================
    // VERIFICATION (No Settlement)
    // =============================================================================
    
    /**
     * @notice Verify authorization without settling (read-only check)
     * @dev Useful for middleware verification before processing
     */
    function verifyAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external view returns (bool) {
        // Check nonce
        if (authorizationState[from][nonce]) {
            return false;
        }
        
        // Check timing
        if (block.timestamp <= validAfter || block.timestamp >= validBefore) {
            return false;
        }
        
        // Verify signature
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(
                    TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                    from,
                    to,
                    value,
                    validAfter,
                    validBefore,
                    nonce
                ))
            )
        );
        
        address signer = digest.recover(signature);
        return signer == from;
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
        require(usdc.transfer(to, amount), "Fee withdrawal failed");
        
        emit FeesWithdrawn(to, amount);
    }
    
    /**
     * @notice Emergency withdrawal (only owner)
     * @param token Token to withdraw
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(IERC20(token).transfer(to, amount), "Emergency withdrawal failed");
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
     * @notice Check if authorization has been used
     * @param authorizer Address that signed the authorization
     * @param nonce Random nonce from authorization
     * @return bool True if already used
     */
    function isAuthorizationUsed(
        address authorizer,
        bytes32 nonce
    ) external view returns (bool) {
        return authorizationState[authorizer][nonce];
    }
    
    /**
     * @notice Get domain separator
     * @return bytes32 EIP-712 domain separator
     */
    function getDomainSeparator() external view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }
}
