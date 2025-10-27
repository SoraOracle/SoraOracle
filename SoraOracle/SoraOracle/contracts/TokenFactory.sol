// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MarketToken
 * @notice Minimal ERC-20 token for prediction markets
 * @dev Deployed by TokenFactory for each new market
 */
contract MarketToken is ERC20 {
    address public immutable oracleFeed;
    uint256 public immutable createdAt;
    string public marketName;

    constructor(
        string memory _marketName,
        string memory _symbol,
        uint256 _initialSupply,
        address _oracleFeed,
        address _recipient
    ) ERC20(_marketName, _symbol) {
        require(_initialSupply > 0, "Initial supply must be > 0");
        require(_oracleFeed != address(0), "Invalid oracle feed");
        require(_recipient != address(0), "Invalid recipient");

        marketName = _marketName;
        oracleFeed = _oracleFeed;
        createdAt = block.timestamp;

        _mint(_recipient, _initialSupply);
    }
}

/**
 * @title TokenFactory
 * @notice Factory contract to deploy ERC-20 tokens for prediction markets
 * @dev Gas-optimized for BNB Chain deployment
 */
contract TokenFactory is Ownable {
    struct TokenMetadata {
        string name;
        string symbol;
        uint256 totalSupply;
        address oracleFeed;
        uint256 createdAt;
    }

    // Deployed tokens registry
    address[] public deployedTokens;
    mapping(address => TokenMetadata) public tokenMetadata;
    mapping(string => address) public marketNameToToken;

    // Events
    event TokenCreated(
        address indexed tokenAddress,
        string marketName,
        string symbol,
        uint256 initialSupply,
        address oracleFeed
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Deploy a new market token
     * @param marketName Human-readable market name (e.g., "BTC-100K")
     * @param initialSupply Token supply in wei (e.g., 1e27 for 1B tokens)
     * @param oracleFeed Address of validated oracle feed
     * @return tokenAddress Address of deployed token
     */
    function createToken(
        string memory marketName,
        uint256 initialSupply,
        address oracleFeed
    ) external returns (address tokenAddress) {
        require(bytes(marketName).length > 0, "Market name required");
        require(initialSupply > 0 && initialSupply <= 1e36, "Invalid supply");
        require(oracleFeed != address(0), "Invalid oracle feed");
        require(
            marketNameToToken[marketName] == address(0),
            "Market already exists"
        );

        // Generate symbol from market name
        string memory symbol = _generateSymbol(marketName);

        // Deploy new token
        MarketToken token = new MarketToken(
            marketName,
            symbol,
            initialSupply,
            oracleFeed,
            msg.sender
        );

        tokenAddress = address(token);

        // Register token
        deployedTokens.push(tokenAddress);
        tokenMetadata[tokenAddress] = TokenMetadata({
            name: marketName,
            symbol: symbol,
            totalSupply: initialSupply,
            oracleFeed: oracleFeed,
            createdAt: block.timestamp
        });
        marketNameToToken[marketName] = tokenAddress;

        emit TokenCreated(
            tokenAddress,
            marketName,
            symbol,
            initialSupply,
            oracleFeed
        );

        return tokenAddress;
    }

    /**
     * @notice Get all deployed token addresses
     */
    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    /**
     * @notice Get token metadata
     */
    function getTokenMetadata(
        address token
    ) external view returns (TokenMetadata memory) {
        return tokenMetadata[token];
    }

    /**
     * @notice Check if market exists
     */
    function marketExists(string memory marketName) external view returns (bool) {
        return marketNameToToken[marketName] != address(0);
    }

    /**
     * @notice Get token address for market
     */
    function getTokenForMarket(
        string memory marketName
    ) external view returns (address) {
        return marketNameToToken[marketName];
    }

    /**
     * @notice Generate symbol from market name
     * @dev Removes special characters and converts to uppercase
     */
    function _generateSymbol(
        string memory marketName
    ) internal pure returns (string memory) {
        bytes memory nameBytes = bytes(marketName);
        bytes memory symbolBytes = new bytes(nameBytes.length);
        uint256 symbolLength = 0;

        for (uint256 i = 0; i < nameBytes.length; i++) {
            bytes1 char = nameBytes[i];
            // Keep A-Z, a-z, 0-9
            if (
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A) // a-z
            ) {
                // Convert to uppercase
                if (char >= 0x61 && char <= 0x7A) {
                    symbolBytes[symbolLength] = bytes1(uint8(char) - 32);
                } else {
                    symbolBytes[symbolLength] = char;
                }
                symbolLength++;
            }
        }

        // Create final symbol with correct length
        bytes memory finalSymbol = new bytes(symbolLength);
        for (uint256 i = 0; i < symbolLength; i++) {
            finalSymbol[i] = symbolBytes[i];
        }

        return string(finalSymbol);
    }
}
