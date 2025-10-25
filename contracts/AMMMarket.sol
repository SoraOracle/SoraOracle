// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AMMMarket
 * @notice Automated Market Maker for prediction markets (like Polymarket)
 * @dev Uses constant product formula (x * y = k) for continuous liquidity
 */
contract AMMMarket is Ownable, ReentrancyGuard {
    
    struct Market {
        string question;
        uint256 yesReserve;        // YES token reserve
        uint256 noReserve;         // NO token reserve
        uint256 k;                 // Constant product (x * y = k)
        uint256 totalLiquidity;
        uint32 createdAt;
        uint32 resolvedAt;
        bool resolved;
        bool finalOutcome;
    }

    struct LiquidityPosition {
        uint256 liquidityTokens;
        uint256 yesTokens;
        uint256 noTokens;
        bool claimed;
    }

    struct UserPosition {
        uint256 yesTokens;
        uint256 noTokens;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => LiquidityPosition)) public liquidityProviders;
    mapping(uint256 => mapping(address => UserPosition)) public userPositions;
    
    uint256 public marketCounter;
    uint256 public tradingFee = 30; // 0.3% (in basis points)
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    event MarketCreated(uint256 indexed marketId, string question, uint256 initialLiquidity);
    event LiquidityAdded(uint256 indexed marketId, address indexed provider, uint256 yesAmount, uint256 noAmount, uint256 liquidityTokens);
    event LiquidityRemoved(uint256 indexed marketId, address indexed provider, uint256 yesAmount, uint256 noAmount);
    event TokensTraded(uint256 indexed marketId, address indexed trader, bool buyYes, uint256 amountIn, uint256 amountOut);
    event MarketResolved(uint256 indexed marketId, bool outcome);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create AMM market with initial liquidity
     * @param _question Market question
     * @param _initialYes Initial YES tokens
     * @param _initialNo Initial NO tokens
     */
    function createMarket(
        string memory _question,
        uint256 _initialYes,
        uint256 _initialNo
    ) external payable returns (uint256 marketId) {
        require(bytes(_question).length > 0, "Empty question");
        require(_initialYes >= MINIMUM_LIQUIDITY && _initialNo >= MINIMUM_LIQUIDITY, "Insufficient liquidity");
        require(msg.value == _initialYes + _initialNo, "Incorrect BNB amount");

        marketId = marketCounter++;

        uint256 k = _initialYes * _initialNo;
        uint256 liquidityTokens = sqrt(k);

        markets[marketId] = Market({
            question: _question,
            yesReserve: _initialYes,
            noReserve: _initialNo,
            k: k,
            totalLiquidity: liquidityTokens,
            createdAt: uint32(block.timestamp),
            resolvedAt: 0,
            resolved: false,
            finalOutcome: false
        });

        liquidityProviders[marketId][msg.sender] = LiquidityPosition({
            liquidityTokens: liquidityTokens,
            yesTokens: _initialYes,
            noTokens: _initialNo,
            claimed: false
        });

        emit MarketCreated(marketId, _question, liquidityTokens);
        emit LiquidityAdded(marketId, msg.sender, _initialYes, _initialNo, liquidityTokens);

        return marketId;
    }

    /**
     * @notice Add liquidity to existing market
     * @param _marketId Market to add liquidity
     * @param _yesAmount YES tokens to add
     * @param _noAmount NO tokens to add
     */
    function addLiquidity(
        uint256 _marketId,
        uint256 _yesAmount,
        uint256 _noAmount
    ) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");
        require(msg.value == _yesAmount + _noAmount, "Incorrect BNB");

        // Calculate optimal amounts based on current ratio
        uint256 yesRatio = (market.yesReserve * 1e18) / market.totalLiquidity;
        uint256 noRatio = (market.noReserve * 1e18) / market.totalLiquidity;

        uint256 liquidityTokens = (_yesAmount * 1e18) / yesRatio;

        market.yesReserve += _yesAmount;
        market.noReserve += _noAmount;
        market.k = market.yesReserve * market.noReserve;
        market.totalLiquidity += liquidityTokens;

        LiquidityPosition storage position = liquidityProviders[_marketId][msg.sender];
        position.liquidityTokens += liquidityTokens;
        position.yesTokens += _yesAmount;
        position.noTokens += _noAmount;

        emit LiquidityAdded(_marketId, msg.sender, _yesAmount, _noAmount, liquidityTokens);
    }

    /**
     * @notice Remove liquidity from market
     * @param _marketId Market ID
     * @param _liquidityTokens Amount of liquidity tokens to burn
     */
    function removeLiquidity(uint256 _marketId, uint256 _liquidityTokens) external nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");

        LiquidityPosition storage position = liquidityProviders[_marketId][msg.sender];
        require(position.liquidityTokens >= _liquidityTokens, "Insufficient liquidity");

        uint256 yesAmount = (market.yesReserve * _liquidityTokens) / market.totalLiquidity;
        uint256 noAmount = (market.noReserve * _liquidityTokens) / market.totalLiquidity;

        position.liquidityTokens -= _liquidityTokens;
        position.yesTokens -= yesAmount;
        position.noTokens -= noAmount;

        market.yesReserve -= yesAmount;
        market.noReserve -= noAmount;
        market.totalLiquidity -= _liquidityTokens;
        market.k = market.yesReserve * market.noReserve;

        payable(msg.sender).transfer(yesAmount + noAmount);

        emit LiquidityRemoved(_marketId, msg.sender, yesAmount, noAmount);
    }

    /**
     * @notice Buy outcome tokens (YES or NO)
     * @param _marketId Market ID
     * @param _buyYes True to buy YES, false to buy NO
     */
    function buyTokens(uint256 _marketId, bool _buyYes) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");
        require(msg.value > 0, "Must send BNB");

        uint256 fee = (msg.value * tradingFee) / 10000;
        uint256 amountIn = msg.value - fee;

        uint256 amountOut;
        if (_buyYes) {
            // Buy YES tokens: Add to NO reserve, remove from YES reserve
            amountOut = getAmountOut(amountIn, market.noReserve, market.yesReserve);
            market.noReserve += amountIn;
            market.yesReserve -= amountOut;
            userPositions[_marketId][msg.sender].yesTokens += amountOut;
        } else {
            // Buy NO tokens: Add to YES reserve, remove from NO reserve
            amountOut = getAmountOut(amountIn, market.yesReserve, market.noReserve);
            market.yesReserve += amountIn;
            market.noReserve -= amountOut;
            userPositions[_marketId][msg.sender].noTokens += amountOut;
        }

        // Update k
        market.k = market.yesReserve * market.noReserve;

        emit TokensTraded(_marketId, msg.sender, _buyYes, amountIn, amountOut);
    }

    /**
     * @notice Sell outcome tokens
     * @param _marketId Market ID
     * @param _sellYes True to sell YES, false to sell NO
     * @param _amount Amount of tokens to sell
     */
    function sellTokens(uint256 _marketId, bool _sellYes, uint256 _amount) external nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");

        UserPosition storage position = userPositions[_marketId][msg.sender];
        
        uint256 amountOut;
        if (_sellYes) {
            require(position.yesTokens >= _amount, "Insufficient YES tokens");
            amountOut = getAmountOut(_amount, market.yesReserve, market.noReserve);
            market.yesReserve += _amount;
            market.noReserve -= amountOut;
            position.yesTokens -= _amount;
        } else {
            require(position.noTokens >= _amount, "Insufficient NO tokens");
            amountOut = getAmountOut(_amount, market.noReserve, market.yesReserve);
            market.noReserve += _amount;
            market.yesReserve -= amountOut;
            position.noTokens -= _amount;
        }

        uint256 fee = (amountOut * tradingFee) / 10000;
        uint256 amountOutAfterFee = amountOut - fee;

        market.k = market.yesReserve * market.noReserve;

        payable(msg.sender).transfer(amountOutAfterFee);

        emit TokensTraded(_marketId, msg.sender, !_sellYes, _amount, amountOutAfterFee);
    }

    /**
     * @notice Calculate output amount using constant product formula
     * @param amountIn Input amount
     * @param reserveIn Input reserve
     * @param reserveOut Output reserve
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }

    /**
     * @notice Resolve market
     */
    function resolveMarket(uint256 _marketId, bool _outcome) external onlyOwner nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Already resolved");

        market.resolved = true;
        market.finalOutcome = _outcome;
        market.resolvedAt = uint32(block.timestamp);

        emit MarketResolved(_marketId, _outcome);
    }

    /**
     * @notice Claim winnings after resolution
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Not resolved");

        UserPosition storage position = userPositions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");

        uint256 winningTokens = market.finalOutcome ? position.yesTokens : position.noTokens;
        require(winningTokens > 0, "No winning position");

        // Each winning token is worth 1 BNB
        position.claimed = true;
        payable(msg.sender).transfer(winningTokens);
    }

    /**
     * @notice Get current price (probability) of YES outcome
     * @return Price in basis points (5000 = 50%)
     */
    function getCurrentPrice(uint256 _marketId) external view returns (uint256) {
        Market memory market = markets[_marketId];
        return (market.noReserve * 10000) / (market.yesReserve + market.noReserve);
    }

    /**
     * @notice Square root function for liquidity calculation
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
