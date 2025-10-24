// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IPancakePair.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PancakeTWAPOracle
 * @notice Time-Weighted Average Price oracle for PancakeSwap V2 pairs
 * @dev Provides manipulation-resistant price feeds using Uniswap V2 TWAP pattern
 */
contract PancakeTWAPOracle is Ownable {
    struct Observation {
        uint32 timestamp;
        uint256 price0Cumulative;
        uint256 price1Cumulative;
    }

    IPancakePair public immutable pair;
    address public immutable token0;
    address public immutable token1;
    
    Observation public observationOld;
    Observation public observationNew;
    
    uint32 public constant MIN_PERIOD = 5 minutes;
    uint224 constant Q112 = 2**112;

    event OracleUpdated(uint32 timestamp, uint256 price0Cumulative, uint256 price1Cumulative);

    constructor(address _pair) Ownable(msg.sender) {
        require(_pair != address(0), "Invalid pair address");
        pair = IPancakePair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
        
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices();
        require(price0Cumulative > 0 || price1Cumulative > 0, "No data");
        
        observationOld = Observation({
            timestamp: blockTimestamp,
            price0Cumulative: price0Cumulative,
            price1Cumulative: price1Cumulative
        });
        
        observationNew = observationOld;
    }

    /**
     * @notice Compute current cumulative prices
     * @dev Follows Uniswap V2 oracle pattern - adds time-weighted price since last update
     */
    function currentCumulativePrices() public view returns (
        uint256 price0Cumulative,
        uint256 price1Cumulative,
        uint32 blockTimestamp
    ) {
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        
        price0Cumulative = pair.price0CumulativeLast();
        price1Cumulative = pair.price1CumulativeLast();
        blockTimestamp = uint32(block.timestamp);
        
        // If time has elapsed since the last update, compute the time-weighted price
        if (blockTimestampLast != blockTimestamp) {
            uint32 timeElapsed;
            unchecked {
                timeElapsed = blockTimestamp - blockTimestampLast;
            }
            
            // Add the accumulated price during the elapsed time
            // price0 = reserve1 / reserve0, encoded as UQ112x112
            // price1 = reserve0 / reserve1, encoded as UQ112x112
            if (reserve0 != 0 && reserve1 != 0) {
                unchecked {
                    price0Cumulative += uint256(uint224(reserve1)) * Q112 / reserve0 * timeElapsed;
                    price1Cumulative += uint256(uint224(reserve0)) * Q112 / reserve1 * timeElapsed;
                }
            }
        }
    }

    function update() external {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices();
        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - observationNew.timestamp;
        }
        
        require(timeElapsed >= MIN_PERIOD, "Period not elapsed");
        
        observationOld = observationNew;
        
        observationNew = Observation({
            timestamp: blockTimestamp,
            price0Cumulative: price0Cumulative,
            price1Cumulative: price1Cumulative
        });

        emit OracleUpdated(blockTimestamp, price0Cumulative, price1Cumulative);
    }

    /**
     * @notice Get TWAP price - falls back to spot if bootstrapping
     * @dev Permissionless: returns spot price for first 5 min after oracle creation
     * @param token Token to price  
     * @param amountIn Amount of input token
     * @return amountOut Expected output based on TWAP (or spot during bootstrap)
     */
    function consult(address token, uint256 amountIn) external view returns (uint256 amountOut) {
        require(token == token0 || token == token1, "Invalid token");
        
        uint32 timeElapsed;
        unchecked {
            timeElapsed = observationNew.timestamp - observationOld.timestamp;
        }
        
        // Bootstrap mode: return spot price if not enough data yet
        if (timeElapsed < MIN_PERIOD) {
            return _getCurrentPrice(token, amountIn);
        }
        
        // Normal mode: return TWAP
        uint256 priceCumulativeDelta;
        if (token == token0) {
            unchecked {
                priceCumulativeDelta = observationNew.price0Cumulative - observationOld.price0Cumulative;
            }
            uint224 priceAverage = uint224(priceCumulativeDelta / timeElapsed);
            amountOut = (amountIn * priceAverage) / Q112;
        } else {
            unchecked {
                priceCumulativeDelta = observationNew.price1Cumulative - observationOld.price1Cumulative;
            }
            uint224 priceAverage = uint224(priceCumulativeDelta / timeElapsed);
            amountOut = (amountIn * priceAverage) / Q112;
        }
    }
    
    /**
     * @notice Check if oracle has enough data for true TWAP (vs spot fallback)
     * @return bool True if MIN_PERIOD elapsed (using TWAP), false if using spot
     */
    function canConsult() external view returns (bool) {
        uint32 timeElapsed;
        unchecked {
            timeElapsed = observationNew.timestamp - observationOld.timestamp;
        }
        return timeElapsed >= MIN_PERIOD;
    }

    function getCurrentPrice(address token, uint256 amountIn) external view returns (uint256 amountOut) {
        return _getCurrentPrice(token, amountIn);
    }

    function _getCurrentPrice(address token, uint256 amountIn) internal view returns (uint256 amountOut) {
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
        uint32 timeElapsed;
        unchecked {
            timeElapsed = uint32(block.timestamp) - observationNew.timestamp;
        }
        return timeElapsed >= MIN_PERIOD;
    }
}
