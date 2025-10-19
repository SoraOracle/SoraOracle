// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/SoraOracle.sol";
import "../../contracts/PancakeTWAPOracle.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PricePredictionMarket
 * @notice Prediction market for token price targets using TWAP
 * @dev Uses permissionless TWAP oracles - works with ANY PancakeSwap pair
 * 
 * Example: "Will CAKE reach $5 by Dec 31st?"
 */
contract PricePredictionMarket is ReentrancyGuard {
    SoraOracle public oracle;
    uint256 public marketCounter;
    
    struct PriceMarket {
        uint256 id;
        address pairAddress;
        address token;
        uint256 targetPrice;
        uint256 deadline;
        uint256 totalYes;
        uint256 totalNo;
        bool resolved;
        bool outcome;
        uint256 finalPrice;
        string description;
    }
    
    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }
    
    mapping(uint256 => PriceMarket) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    
    event PriceMarketCreated(
        uint256 indexed marketId,
        address indexed pair,
        address indexed token,
        uint256 targetPrice,
        uint256 deadline
    );
    event PositionTaken(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 finalPrice);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    /**
     * @notice Create price prediction market (permissionless - any token!)
     * @param _pairAddress PancakeSwap pair address
     * @param _token Token to track
     * @param _targetPrice Target price in paired token (e.g., BUSD)
     * @param _deadline When to check price
     * @param _description Human-readable description
     */
    function createPriceMarket(
        address _pairAddress,
        address _token,
        uint256 _targetPrice,
        uint256 _deadline,
        string memory _description
    ) external returns (uint256 marketId) {
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_targetPrice > 0, "Invalid target price");
        
        // Verify TWAP oracle exists or will be created (permissionless!)
        uint256 currentPrice = oracle.getTWAPPrice(_pairAddress, _token, 1 ether);
        require(currentPrice > 0, "Invalid pair/token");
        
        // Check if TWAP is ready
        PancakeTWAPOracle twap = oracle.twapOracles(_pairAddress);
        require(twap.canConsult(), "TWAP not ready - wait 5 min after oracle creation");
        
        marketId = marketCounter++;
        markets[marketId] = PriceMarket({
            id: marketId,
            pairAddress: _pairAddress,
            token: _token,
            targetPrice: _targetPrice,
            deadline: _deadline,
            totalYes: 0,
            totalNo: 0,
            resolved: false,
            outcome: false,
            finalPrice: 0,
            description: _description
        });
        
        emit PriceMarketCreated(marketId, _pairAddress, _token, _targetPrice, _deadline);
    }
    
    /**
     * @notice Bet YES (will reach target) or NO (won't reach)
     */
    function takePosition(uint256 _marketId, bool _isYes) external payable nonReentrant {
        PriceMarket storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.deadline, "Betting closed");
        require(msg.value > 0, "Must send BNB");
        
        Position storage position = positions[_marketId][msg.sender];
        
        if (_isYes) {
            position.yesAmount += msg.value;
            market.totalYes += msg.value;
        } else {
            position.noAmount += msg.value;
            market.totalNo += msg.value;
        }
        
        emit PositionTaken(_marketId, msg.sender, _isYes, msg.value);
    }
    
    /**
     * @notice Resolve market using TWAP price at deadline
     */
    function resolveMarket(uint256 _marketId) external nonReentrant {
        PriceMarket storage market = markets[_marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.deadline, "Market not closed");
        
        // Get manipulation-resistant TWAP price
        PancakeTWAPOracle twap = oracle.twapOracles(market.pairAddress);
        require(twap.canConsult(), "TWAP not ready");
        
        uint256 finalPrice = oracle.getTWAPPrice(
            market.pairAddress,
            market.token,
            1 ether
        );
        
        market.resolved = true;
        market.finalPrice = finalPrice;
        market.outcome = finalPrice >= market.targetPrice;
        
        emit MarketResolved(_marketId, market.outcome, finalPrice);
    }
    
    /**
     * @notice Claim winnings
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        PriceMarket storage market = markets[_marketId];
        require(market.resolved, "Not resolved");
        
        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");
        
        uint256 winningAmount;
        
        if (market.outcome && position.yesAmount > 0) {
            // Price reached target - YES wins
            winningAmount = (position.yesAmount * (market.totalYes + market.totalNo)) / market.totalYes;
        } else if (!market.outcome && position.noAmount > 0) {
            // Price didn't reach - NO wins
            winningAmount = (position.noAmount * (market.totalYes + market.totalNo)) / market.totalNo;
        }
        
        require(winningAmount > 0, "No winnings");
        position.claimed = true;
        
        (bool success, ) = payable(msg.sender).call{value: winningAmount}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(_marketId, msg.sender, winningAmount);
    }
    
    /**
     * @notice Get current price (for display)
     */
    function getCurrentPrice(uint256 _marketId) external view returns (uint256) {
        PriceMarket memory market = markets[_marketId];
        PancakeTWAPOracle twap = oracle.twapOracles(market.pairAddress);
        
        if (address(twap) == address(0)) {
            return 0;
        }
        
        return twap.getCurrentPrice(market.token, 1 ether);
    }
    
    /**
     * @notice Get market details
     */
    function getMarket(uint256 _marketId) external view returns (PriceMarket memory) {
        return markets[_marketId];
    }
}
