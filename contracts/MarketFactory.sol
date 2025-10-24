// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimplePredictionMarket.sol";
import "./MultiOutcomeMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MarketFactory
 * @notice Factory contract for creating and tracking all types of markets
 * @dev Provides centralized market creation with metadata and discovery
 */
contract MarketFactory is Ownable {
    
    enum MarketType { BINARY, MULTI_OUTCOME }
    
    struct MarketMetadata {
        address marketContract;
        uint256 marketId;
        MarketType marketType;
        string category;
        string[] tags;
        address creator;
        uint256 createdAt;
        uint256 totalVolume;
        bool isFeatured;
    }

    // All markets across all contracts
    MarketMetadata[] public allMarkets;
    
    // Category => market indices
    mapping(string => uint256[]) public marketsByCategory;
    
    // Tag => market indices
    mapping(string => uint256[]) public marketsByTag;
    
    // Creator => market indices
    mapping(address => uint256[]) public marketsByCreator;
    
    // Contract addresses
    address public binaryMarketContract;
    address public multiOutcomeMarketContract;
    
    mapping(address => bool) public authorizedMarkets;
    
    uint256 public totalVolume;
    uint256 public totalMarkets;

    event MarketCreated(
        uint256 indexed globalId,
        address indexed marketContract,
        uint256 marketId,
        MarketType marketType,
        string category,
        address indexed creator
    );
    event MarketVolumeUpdated(uint256 indexed globalId, uint256 newVolume);
    event MarketFeatured(uint256 indexed globalId, bool featured);
    event MarketAuthorized(address indexed market, bool authorized);

    constructor(address _binaryMarket, address _multiOutcomeMarket) Ownable(msg.sender) {
        binaryMarketContract = _binaryMarket;
        multiOutcomeMarketContract = _multiOutcomeMarket;
        authorizedMarkets[_binaryMarket] = true;
        authorizedMarkets[_multiOutcomeMarket] = true;
    }

    /**
     * @notice Authorize/deauthorize market contracts
     */
    function setMarketAuthorization(address _market, bool _authorized) external onlyOwner {
        require(_market != address(0), "Invalid market");
        authorizedMarkets[_market] = _authorized;
        emit MarketAuthorized(_market, _authorized);
    }

    /**
     * @notice Register a newly created market
     * @dev Called after market is created in specific contract
     */
    function registerMarket(
        address _marketContract,
        uint256 _marketId,
        MarketType _marketType,
        string memory _category,
        string[] memory _tags,
        address _creator
    ) external returns (uint256 globalId) {
        require(authorizedMarkets[msg.sender], "Not authorized market");
        
        globalId = allMarkets.length;
        
        allMarkets.push(MarketMetadata({
            marketContract: _marketContract,
            marketId: _marketId,
            marketType: _marketType,
            category: _category,
            tags: _tags,
            creator: _creator,
            createdAt: block.timestamp,
            totalVolume: 0,
            isFeatured: false
        }));

        marketsByCategory[_category].push(globalId);
        marketsByCreator[_creator].push(globalId);
        
        for (uint i = 0; i < _tags.length; i++) {
            marketsByTag[_tags[i]].push(globalId);
        }

        totalMarkets++;

        emit MarketCreated(globalId, _marketContract, _marketId, _marketType, _category, _creator);
    }

    /**
     * @notice Update market volume
     */
    function updateMarketVolume(uint256 _globalId, uint256 _newVolume) external {
        require(authorizedMarkets[msg.sender], "Not authorized market");
        require(_globalId < allMarkets.length, "Invalid market");
        
        MarketMetadata storage market = allMarkets[_globalId];
        uint256 volumeIncrease = _newVolume - market.totalVolume;
        
        market.totalVolume = _newVolume;
        totalVolume += volumeIncrease;

        emit MarketVolumeUpdated(_globalId, _newVolume);
    }

    /**
     * @notice Feature/unfeature a market (owner only)
     */
    function setFeatured(uint256 _globalId, bool _featured) external onlyOwner {
        require(_globalId < allMarkets.length, "Invalid market");
        allMarkets[_globalId].isFeatured = _featured;
        emit MarketFeatured(_globalId, _featured);
    }

    /**
     * @notice Get markets by category
     */
    function getMarketsByCategory(string memory _category) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return marketsByCategory[_category];
    }

    /**
     * @notice Get markets by tag
     */
    function getMarketsByTag(string memory _tag) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return marketsByTag[_tag];
    }

    /**
     * @notice Get markets by creator
     */
    function getMarketsByCreator(address _creator) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return marketsByCreator[_creator];
    }

    /**
     * @notice Get all featured markets
     */
    function getFeaturedMarkets() external view returns (uint256[] memory) {
        uint256 featuredCount = 0;
        for (uint i = 0; i < allMarkets.length; i++) {
            if (allMarkets[i].isFeatured) featuredCount++;
        }

        uint256[] memory featured = new uint256[](featuredCount);
        uint256 index = 0;
        for (uint i = 0; i < allMarkets.length; i++) {
            if (allMarkets[i].isFeatured) {
                featured[index++] = i;
            }
        }

        return featured;
    }

    /**
     * @notice Get total number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Get market metadata
     */
    function getMarket(uint256 _globalId) 
        external 
        view 
        returns (
            address marketContract,
            uint256 marketId,
            MarketType marketType,
            string memory category,
            address creator,
            uint256 createdAt,
            uint256 volume,
            bool featured
        ) 
    {
        require(_globalId < allMarkets.length, "Invalid market");
        MarketMetadata storage market = allMarkets[_globalId];
        
        return (
            market.marketContract,
            market.marketId,
            market.marketType,
            market.category,
            market.creator,
            market.createdAt,
            market.totalVolume,
            market.isFeatured
        );
    }
}
