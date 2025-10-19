// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IPancakePair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PancakeTWAPOracle
 * @notice Time-Weighted Average Price oracle for PancakeSwap V2 pairs
 * @dev Provides manipulation-resistant price feeds for prediction markets
 */
contract PancakeTWAPOracle is Ownable {
    struct Observation {
        uint32 timestamp;
        uint256 price0Cumulative;
        uint256 price1Cumulative;
    }

    IPancakePair public pair;
    address public token0;
    address public token1;
    
    Observation public observationOld;
    Observation public observationNew;
    
    uint32 public constant MIN_PERIOD = 30 minutes;
    uint224 constant Q112 = 2**112;

    event OracleUpdated(uint32 timestamp, uint256 price0Cumulative, uint256 price1Cumulative);

    constructor(address _pair) Ownable(msg.sender) {
        require(_pair != address(0), "Invalid pair address");
        pair = IPancakePair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
        
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestamp) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, "No reserves");
        
        observationOld = Observation({
            timestamp: blockTimestamp,
            price0Cumulative: pair.price0CumulativeLast(),
            price1Cumulative: pair.price1CumulativeLast()
        });
        
        observationNew = observationOld;
    }

    function update() external {
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestamp) = pair.getReserves();
        uint32 timeElapsed = blockTimestamp - observationNew.timestamp;
        
        require(timeElapsed >= MIN_PERIOD, "Period not elapsed");
        require(reserve0 != 0 && reserve1 != 0, "No reserves");
        
        observationOld = observationNew;
        
        observationNew = Observation({
            timestamp: blockTimestamp,
            price0Cumulative: pair.price0CumulativeLast(),
            price1Cumulative: pair.price1CumulativeLast()
        });

        emit OracleUpdated(blockTimestamp, observationNew.price0Cumulative, observationNew.price1Cumulative);
    }

    function consult(address token, uint256 amountIn) external view returns (uint256 amountOut) {
        require(token == token0 || token == token1, "Invalid token");
        
        uint32 timeElapsed = observationNew.timestamp - observationOld.timestamp;
        require(timeElapsed >= MIN_PERIOD, "Insufficient data");
        
        if (token == token0) {
            uint256 priceCumulativeDelta = observationNew.price0Cumulative - observationOld.price0Cumulative;
            uint224 priceAverage = uint224(priceCumulativeDelta / timeElapsed);
            amountOut = (amountIn * priceAverage) / Q112;
        } else {
            uint256 priceCumulativeDelta = observationNew.price1Cumulative - observationOld.price1Cumulative;
            uint224 priceAverage = uint224(priceCumulativeDelta / timeElapsed);
            amountOut = (amountIn * priceAverage) / Q112;
        }
    }

    function getCurrentPrice(address token, uint256 amountIn) external view returns (uint256 amountOut) {
        require(token == token0 || token == token1, "Invalid token");
        
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, "No reserves");
        
        if (token == token0) {
            amountOut = (amountIn * reserve1) / reserve0;
        } else {
            amountOut = (amountIn * reserve0) / reserve1;
        }
    }

    function canUpdate() external view returns (bool) {
        (,, uint32 blockTimestamp) = pair.getReserves();
        uint32 timeElapsed = blockTimestamp - observationNew.timestamp;
        return timeElapsed >= MIN_PERIOD;
    }
}
