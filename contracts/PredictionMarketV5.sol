// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TokenFactory.sol";

/**
 * @title PredictionMarketV5
 * @notice Enhanced prediction market with integrated token factory and x402 payment verification
 * @dev Combines market creation, token minting, and micropayment validation
 */
contract PredictionMarketV5 is Ownable, ReentrancyGuard {
    struct Market {
        uint256 id;
        string question;
        address oracleFeed;
        address marketToken;
        uint256 resolutionTime;
        bool resolved;
        bool outcome;
        uint256 totalYesPool;
        uint256 totalNoPool;
        uint256 createdAt;
        address creator;
    }

    struct X402PaymentProof {
        bytes32 nonce;
        uint256 amount;
        address token;
        address from;
        address facilitator;
        bytes signature;
    }

    TokenFactory public immutable tokenFactory;
    address public immutable x402Facilitator;
    address public immutable usdcToken;
    
    // x402 Pricing Tiers (USDC, 6 decimals)
    uint256 public constant MARKET_CREATION_FEE = 50000;   // $0.05 USDC
    uint256 public constant PLACE_BET_FEE = 10000;         // $0.01 USDC
    uint256 public constant RESOLVE_MARKET_FEE = 100000;   // $0.10 USDC

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(bytes32 => bool) public usedNonces; // Prevent replay attacks
    mapping(address => uint256[]) public creatorMarkets;

    event MarketCreated(
        uint256 indexed marketId,
        string question,
        address indexed marketToken,
        address indexed oracleFeed,
        uint256 resolutionTime,
        address creator
    );

    event PositionTaken(
        uint256 indexed marketId,
        address indexed user,
        bool position,
        uint256 amount
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 totalPayout
    );

    event PaymentVerified(
        address indexed payer,
        uint256 amount,
        bytes32 nonce
    );

    constructor(
        address _tokenFactory,
        address _x402Facilitator,
        address _usdcToken
    ) Ownable(msg.sender) {
        require(_tokenFactory != address(0), "Invalid factory");
        require(_x402Facilitator != address(0), "Invalid facilitator");
        require(_usdcToken != address(0), "Invalid USDC");

        tokenFactory = TokenFactory(_tokenFactory);
        x402Facilitator = _x402Facilitator;
        usdcToken = _usdcToken;
    }

    /**
     * @notice Create a new prediction market with OPTIONAL token minting and x402 payment verification
     * @param marketQuestion Human-readable question
     * @param oracleFeed Address of oracle feed for resolution
     * @param resolutionTime Unix timestamp when market can be resolved
     * @param useToken Whether to deploy a market token (OPTIONAL)
     * @param tokenSupply Initial supply for market token (ignored if useToken = false)
     * @param paymentProof x402 payment verification data
     */
    function createMarket(
        string memory marketQuestion,
        address oracleFeed,
        uint256 resolutionTime,
        bool useToken,
        uint256 tokenSupply,
        X402PaymentProof memory paymentProof
    ) external nonReentrant returns (uint256 marketId) {
        require(bytes(marketQuestion).length > 0, "Question required");
        require(oracleFeed != address(0), "Oracle required");
        require(resolutionTime > block.timestamp, "Invalid resolution time");

        // Verify x402 payment for market creation
        _verifyPayment(paymentProof, MARKET_CREATION_FEE);

        // Generate unique market ID
        marketId = ++marketCount;

        // Deploy market token ONLY if requested
        address marketToken = address(0);
        if (useToken) {
            require(tokenSupply > 0 && tokenSupply <= 1e36, "Invalid supply");
            
            string memory marketName = string(
                abi.encodePacked("Market-", _uint2str(marketId))
            );

            marketToken = tokenFactory.createToken(
                marketName,
                tokenSupply,
                oracleFeed
            );
        }

        // Create market
        markets[marketId] = Market({
            id: marketId,
            question: marketQuestion,
            oracleFeed: oracleFeed,
            marketToken: marketToken,
            resolutionTime: resolutionTime,
            resolved: false,
            outcome: false,
            totalYesPool: 0,
            totalNoPool: 0,
            createdAt: block.timestamp,
            creator: msg.sender
        });

        creatorMarkets[msg.sender].push(marketId);

        emit MarketCreated(
            marketId,
            marketQuestion,
            marketToken,
            oracleFeed,
            resolutionTime,
            msg.sender
        );

        return marketId;
    }

    /**
     * @notice Verify x402 payment proof with facilitator
     * @dev Enforces differentiated pricing per operation
     * @param proof Payment proof from user
     * @param requiredAmount Required payment amount for this operation
     */
    function _verifyPayment(
        X402PaymentProof memory proof,
        uint256 requiredAmount
    ) internal {
        require(proof.from == msg.sender, "Invalid payer");
        require(proof.token == usdcToken, "Invalid token");
        require(proof.amount >= requiredAmount, "Insufficient payment");
        require(proof.facilitator == x402Facilitator, "Invalid facilitator");
        require(!usedNonces[proof.nonce], "Nonce already used");

        // Reconstruct the signed message (MUST match X402Client.createPayment format)
        bytes32 message = keccak256(
            abi.encodePacked(
                proof.nonce,
                proof.amount,
                proof.token,
                proof.from,
                proof.facilitator
            )
        );

        // Add Ethereum Signed Message prefix
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );

        // Recover signer from signature
        address recoveredSigner = _recoverSigner(ethSignedMessageHash, proof.signature);

        // Verify signer matches claimed payer
        require(recoveredSigner == proof.from, "Invalid signature");

        // Mark nonce as used (prevent replay attacks)
        usedNonces[proof.nonce] = true;

        emit PaymentVerified(proof.from, proof.amount, proof.nonce);
    }

    /**
     * @notice Recover signer address from signature
     * @dev Standard ECDSA signature recovery
     */
    function _recoverSigner(
        bytes32 ethSignedMessageHash,
        bytes memory signature
    ) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Split signature into r, s, v components
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        // Handle legacy v values (27/28)
        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v value");

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    /**
     * @notice Take a position on a market with x402 payment
     * @param marketId Market to bet on
     * @param position true = YES, false = NO
     * @param paymentProof x402 payment proof ($0.01 USDC)
     */
    function takePosition(
        uint256 marketId,
        bool position,
        X402PaymentProof memory paymentProof
    ) external payable nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.resolutionTime, "Market closed");
        require(msg.value > 0, "Amount required");

        // Verify x402 payment for bet
        _verifyPayment(paymentProof, PLACE_BET_FEE);

        if (position) {
            market.totalYesPool += msg.value;
        } else {
            market.totalNoPool += msg.value;
        }

        emit PositionTaken(marketId, msg.sender, position, msg.value);
    }

    /**
     * @notice Resolve market based on oracle feed with x402 payment
     * @dev Can be called by anyone after resolution time (pays $0.10 for AI research)
     * @param marketId Market to resolve
     * @param outcome Resolution outcome (true = YES, false = NO)
     * @param paymentProof x402 payment proof ($0.10 USDC)
     */
    function resolveMarket(
        uint256 marketId,
        bool outcome,
        X402PaymentProof memory paymentProof
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.resolutionTime, "Too early");

        // Verify x402 payment for resolution
        _verifyPayment(paymentProof, RESOLVE_MARKET_FEE);

        market.resolved = true;
        market.outcome = outcome;

        uint256 totalPayout = market.totalYesPool + market.totalNoPool;

        emit MarketResolved(marketId, outcome, totalPayout);
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @notice Get markets created by address
     */
    function getMarketsByCreator(
        address creator
    ) external view returns (uint256[] memory) {
        return creatorMarkets[creator];
    }

    /**
     * @notice Convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
