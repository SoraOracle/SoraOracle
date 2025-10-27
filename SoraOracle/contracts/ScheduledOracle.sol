// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PancakeTWAPOracle.sol";

/**
 * @title ScheduledOracle
 * @notice Provides automatic, recurring data feeds for prices, weather, sports, etc.
 * @dev Supports custom update intervals and on-chain cron jobs
 */
contract ScheduledOracle is Ownable, ReentrancyGuard {
    
    enum FeedType { PRICE, WEATHER, SPORTS, CUSTOM }

    struct DataFeed {
        FeedType feedType;
        uint32 updateInterval;      // Seconds between updates
        uint32 lastUpdate;
        uint64 currentValue;
        uint8 confidenceScore;
        bool active;
        address dataProvider;
    }

    struct PriceConfig {
        address pancakePair;
        address twapOracle;
        bool useTWAP;
    }

    mapping(bytes32 => DataFeed) public feeds;
    mapping(bytes32 => PriceConfig) public priceConfigs;
    mapping(bytes32 => uint64[]) public feedHistory; // Last 100 values
    
    bytes32[] public activeFeedIds;
    uint256 public updateFee = 0.001 ether;
    uint8 public constant MAX_HISTORY = 100;

    event FeedCreated(bytes32 indexed feedId, FeedType feedType, uint32 updateInterval, address dataProvider);
    event FeedUpdated(bytes32 indexed feedId, uint64 newValue, uint8 confidence, uint32 timestamp);
    event FeedDeactivated(bytes32 indexed feedId);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a scheduled price feed
     * @param _feedId Unique identifier for feed
     * @param _updateInterval Seconds between updates
     * @param _pancakePair PancakeSwap pair address
     * @param _useTWAP Whether to use TWAP oracle
     */
    function createPriceFeed(
        bytes32 _feedId,
        uint32 _updateInterval,
        address _pancakePair,
        bool _useTWAP
    ) external payable onlyOwner {
        require(msg.value >= updateFee, "Insufficient fee");
        require(!feeds[_feedId].active, "Feed exists");
        require(_updateInterval >= 60, "Min 1 minute interval");

        feeds[_feedId] = DataFeed({
            feedType: FeedType.PRICE,
            updateInterval: _updateInterval,
            lastUpdate: 0,
            currentValue: 0,
            confidenceScore: 100,
            active: true,
            dataProvider: address(this)
        });

        priceConfigs[_feedId] = PriceConfig({
            pancakePair: _pancakePair,
            twapOracle: address(0),
            useTWAP: _useTWAP
        });

        activeFeedIds.push(_feedId);
        emit FeedCreated(_feedId, FeedType.PRICE, _updateInterval, address(this));
    }

    /**
     * @notice Create a custom data feed (weather, sports, etc.)
     * @param _feedId Unique identifier
     * @param _feedType Type of data
     * @param _updateInterval Update frequency
     * @param _dataProvider Address authorized to update
     */
    function createCustomFeed(
        bytes32 _feedId,
        FeedType _feedType,
        uint32 _updateInterval,
        address _dataProvider
    ) external payable onlyOwner {
        require(msg.value >= updateFee, "Insufficient fee");
        require(!feeds[_feedId].active, "Feed exists");
        require(_updateInterval >= 60, "Min 1 minute interval");
        require(_dataProvider != address(0), "Invalid provider");

        feeds[_feedId] = DataFeed({
            feedType: _feedType,
            updateInterval: _updateInterval,
            lastUpdate: 0,
            currentValue: 0,
            confidenceScore: 0,
            active: true,
            dataProvider: _dataProvider
        });

        activeFeedIds.push(_feedId);
        emit FeedCreated(_feedId, _feedType, _updateInterval, _dataProvider);
    }

    /**
     * @notice Update a data feed value (called by keeper/provider)
     * @param _feedId Feed to update
     * @param _value New value
     * @param _confidence Confidence score (0-100)
     */
    function updateFeed(
        bytes32 _feedId,
        uint64 _value,
        uint8 _confidence
    ) external nonReentrant {
        DataFeed storage feed = feeds[_feedId];
        require(feed.active, "Feed not active");
        require(msg.sender == feed.dataProvider || msg.sender == owner(), "Not authorized");
        require(_confidence <= 100, "Invalid confidence");
        require(block.timestamp >= feed.lastUpdate + feed.updateInterval, "Too early");

        feed.currentValue = _value;
        feed.confidenceScore = _confidence;
        feed.lastUpdate = uint32(block.timestamp);

        // Store in history (circular buffer)
        uint64[] storage history = feedHistory[_feedId];
        if (history.length < MAX_HISTORY) {
            history.push(_value);
        } else {
            // Overwrite oldest value
            history[uint256(feed.lastUpdate) % MAX_HISTORY] = _value;
        }

        emit FeedUpdated(_feedId, _value, _confidence, uint32(block.timestamp));
    }

    /**
     * @notice Auto-update price feed from TWAP oracle
     * @param _feedId Feed to update
     */
    function autoUpdatePriceFeed(bytes32 _feedId) external nonReentrant {
        DataFeed storage feed = feeds[_feedId];
        require(feed.active, "Feed not active");
        require(feed.feedType == FeedType.PRICE, "Not price feed");
        require(block.timestamp >= feed.lastUpdate + feed.updateInterval, "Too early");

        PriceConfig memory config = priceConfigs[_feedId];
        require(config.pancakePair != address(0), "No pair configured");

        uint64 price;
        if (config.useTWAP && config.twapOracle != address(0)) {
            // Get TWAP price
            PancakeTWAPOracle twap = PancakeTWAPOracle(config.twapOracle);
            address token = twap.token0(); // Get token0 address
            price = uint64(twap.consult(token, 1e18)); // 1 token worth in token1
        } else {
            // Get spot price (would need PancakeSwap interface)
            revert("Spot price not implemented yet");
        }

        feed.currentValue = price;
        feed.confidenceScore = 95; // TWAP is high confidence
        feed.lastUpdate = uint32(block.timestamp);

        // Store in history
        uint64[] storage history = feedHistory[_feedId];
        if (history.length < MAX_HISTORY) {
            history.push(price);
        } else {
            history[uint256(feed.lastUpdate) % MAX_HISTORY] = price;
        }

        emit FeedUpdated(_feedId, price, 95, uint32(block.timestamp));
    }

    /**
     * @notice Get current feed value
     */
    function getCurrentValue(bytes32 _feedId) external view returns (
        uint64 value,
        uint8 confidence,
        uint32 lastUpdate,
        bool needsUpdate
    ) {
        DataFeed memory feed = feeds[_feedId];
        bool needs = block.timestamp >= feed.lastUpdate + feed.updateInterval;
        return (feed.currentValue, feed.confidenceScore, feed.lastUpdate, needs);
    }

    /**
     * @notice Get feed history
     */
    function getFeedHistory(bytes32 _feedId) external view returns (uint64[] memory) {
        return feedHistory[_feedId];
    }

    /**
     * @notice Get all feeds that need updating
     */
    function getFeedsNeedingUpdate() external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < activeFeedIds.length; i++) {
            DataFeed memory feed = feeds[activeFeedIds[i]];
            if (feed.active && block.timestamp >= feed.lastUpdate + feed.updateInterval) {
                count++;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < activeFeedIds.length; i++) {
            DataFeed memory feed = feeds[activeFeedIds[i]];
            if (feed.active && block.timestamp >= feed.lastUpdate + feed.updateInterval) {
                result[index] = activeFeedIds[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @notice Deactivate a feed
     */
    function deactivateFeed(bytes32 _feedId) external onlyOwner {
        require(feeds[_feedId].active, "Feed not active");
        feeds[_feedId].active = false;
        emit FeedDeactivated(_feedId);
    }

    /**
     * @notice Set TWAP oracle for price feed
     */
    function setTWAPOracle(bytes32 _feedId, address _twapOracle) external onlyOwner {
        require(feeds[_feedId].active, "Feed not active");
        require(feeds[_feedId].feedType == FeedType.PRICE, "Not price feed");
        priceConfigs[_feedId].twapOracle = _twapOracle;
    }

    /**
     * @notice Update fee for creating feeds
     */
    function setUpdateFee(uint256 _newFee) external onlyOwner {
        updateFee = _newFee;
    }
}
