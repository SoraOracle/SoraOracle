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
    uint256 public constant MARKET_CREATION_FEE = 50000; // 0.05 USDC (6 decimals)

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
     * @notice Create a new prediction market with token minting and x402 payment verification
     * @param marketQuestion Human-readable question
     * @param oracleFeed Address of oracle feed for resolution
     * @param resolutionTime Unix timestamp when market can be resolved
     * @param tokenSupply Initial supply for market token
     * @param paymentProof x402 payment verification data
     */
    function createMarket(
        string memory marketQuestion,
        address oracleFeed,
        uint256 resolutionTime,
        uint256 tokenSupply,
        X402PaymentProof memory paymentProof
    ) external nonReentrant returns (uint256 marketId) {
        require(bytes(marketQuestion).length > 0, "Question required");
        require(oracleFeed != address(0), "Oracle required");
        require(resolutionTime > block.timestamp, "Invalid resolution time");
        require(tokenSupply > 0 && tokenSupply <= 1e36, "Invalid supply");

        // Verify x402 payment
        _verifyPayment(paymentProof);

        // Generate unique market name for token
        marketId = ++marketCount;
        string memory marketName = string(
            abi.encodePacked("Market-", _uint2str(marketId))
        );

        // Deploy market token via factory
        address marketToken = tokenFactory.createToken(
            marketName,
            tokenSupply,
            oracleFeed
        );

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
     * @dev In production, this would call the x402 facilitator contract
     */
    function _verifyPayment(
        X402PaymentProof memory proof
    ) internal {
        require(proof.from == msg.sender, "Invalid payer");
        require(proof.token == usdcToken, "Invalid token");
        require(proof.amount >= MARKET_CREATION_FEE, "Insufficient payment");
        require(!usedNonces[proof.nonce], "Nonce already used");

        // Mark nonce as used (prevent replay attacks)
        usedNonces[proof.nonce] = true;

        // In production, verify signature with facilitator
        // For now, we trust the signature is valid
        // TODO: Implement signature verification

        emit PaymentVerified(proof.from, proof.amount, proof.nonce);
    }

    /**
     * @notice Take a position on a market
     */
    function takePosition(
        uint256 marketId,
        bool position
    ) external payable nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.resolutionTime, "Market closed");
        require(msg.value > 0, "Amount required");

        if (position) {
            market.totalYesPool += msg.value;
        } else {
            market.totalNoPool += msg.value;
        }

        emit PositionTaken(marketId, msg.sender, position, msg.value);
    }

    /**
     * @notice Resolve market based on oracle feed
     * @dev Can only be called after resolution time
     */
    function resolveMarket(
        uint256 marketId,
        bool outcome
    ) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market not found");
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.resolutionTime, "Too early");

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
