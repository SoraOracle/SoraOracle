// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SoraOracle.sol";

/**
 * @title TimeSeriesMarket
 * @notice Prediction market over multiple time periods
 * @dev Example: "Will BTC increase each month for Q1 2025?" (3 periods)
 */
contract TimeSeriesMarket is Ownable, ReentrancyGuard {
    
    struct TimePeriod {
        uint32 deadline;
        uint256 questionId;         // Oracle question ID
        uint64 result;              // Actual value at deadline
        bool resolved;
    }

    struct Market {
        string question;
        TimePeriod[] periods;
        uint256 successPool;        // Bet on ALL periods succeeding
        uint256 failurePool;        // Bet on ANY period failing
        uint256 totalFees;
        uint32 createdAt;
        bool allResolved;
        bool allSuccess;            // True if all periods succeeded
    }

    struct Position {
        uint256 successAmount;
        uint256 failureAmount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    
    uint256 public marketCounter;
    uint256 public feePercentage = 200; // 2%
    SoraOracle public oracle;

    event MarketCreated(uint256 indexed marketId, string question, uint8 periodCount);
    event PositionTaken(uint256 indexed marketId, address indexed user, bool predictSuccess, uint256 amount);
    event PeriodResolved(uint256 indexed marketId, uint8 periodIndex, uint64 result);
    event MarketResolved(uint256 indexed marketId, bool allSuccess);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout);

    constructor(address payable _oracleAddress) Ownable(msg.sender) {
        require(_oracleAddress != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracleAddress);
    }

    /**
     * @notice Create time series market
     * @param _question Base question
     * @param _deadlines Array of period deadlines
     */
    function createMarket(
        string memory _question,
        uint32[] memory _deadlines
    ) external payable returns (uint256 marketId) {
        require(bytes(_question).length > 0, "Empty question");
        require(_deadlines.length >= 2 && _deadlines.length <= 12, "2-12 periods only");
        
        // Verify deadlines are in ascending order
        for (uint256 i = 1; i < _deadlines.length; i++) {
            require(_deadlines[i] > _deadlines[i-1], "Deadlines not ascending");
        }

        marketId = marketCounter++;

        // Create market with empty periods array
        Market storage market = markets[marketId];
        market.question = _question;
        market.successPool = 0;
        market.failurePool = 0;
        market.totalFees = 0;
        market.createdAt = uint32(block.timestamp);
        market.allResolved = false;
        market.allSuccess = false;

        // Ask oracle for each period
        uint256 oracleFeePerQuestion = 0.01 ether; // Standard oracle fee
        require(msg.value >= oracleFeePerQuestion * _deadlines.length, "Insufficient oracle fees");

        for (uint256 i = 0; i < _deadlines.length; i++) {
            string memory periodQuestion = string(abi.encodePacked(
                _question,
                " - Period ",
                uint2str(i + 1)
            ));

            uint256 questionId = oracle.askOracle{value: oracleFeePerQuestion}(
                periodQuestion,
                _deadlines[i]
            );

            market.periods.push(TimePeriod({
                deadline: _deadlines[i],
                questionId: questionId,
                result: 0,
                resolved: false
            }));
        }

        emit MarketCreated(marketId, _question, uint8(_deadlines.length));
        return marketId;
    }

    /**
     * @notice Take position
     * @param _marketId Market ID
     * @param _predictAllSuccess True to bet all periods succeed
     */
    function takePosition(uint256 _marketId, bool _predictAllSuccess) external payable nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.allResolved, "Market resolved");
        require(msg.value > 0, "Must send BNB");

        uint256 fee = (msg.value * feePercentage) / 10000;
        uint256 betAmount = msg.value - fee;

        market.totalFees += fee;

        if (_predictAllSuccess) {
            market.successPool += betAmount;
            positions[_marketId][msg.sender].successAmount += betAmount;
        } else {
            market.failurePool += betAmount;
            positions[_marketId][msg.sender].failureAmount += betAmount;
        }

        emit PositionTaken(_marketId, msg.sender, _predictAllSuccess, betAmount);
    }

    /**
     * @notice Resolve a specific period
     * @param _marketId Market ID
     * @param _periodIndex Period to resolve
     */
    function resolvePeriod(uint256 _marketId, uint8 _periodIndex) external nonReentrant {
        Market storage market = markets[_marketId];
        require(_periodIndex < market.periods.length, "Invalid period");
        
        TimePeriod storage period = market.periods[_periodIndex];
        require(!period.resolved, "Period already resolved");
        require(block.timestamp >= period.deadline, "Not yet deadline");

        // Get answer from oracle
        (, , , uint64 numericAnswer,) = oracle.answers(period.questionId);
        require(numericAnswer > 0, "Oracle not answered");

        period.result = numericAnswer;
        period.resolved = true;

        emit PeriodResolved(_marketId, _periodIndex, numericAnswer);

        // Check if all periods resolved
        _checkAllResolved(_marketId);
    }

    /**
     * @notice Check if all periods resolved and finalize market
     */
    function _checkAllResolved(uint256 _marketId) private {
        Market storage market = markets[_marketId];
        
        bool allResolved = true;
        bool allSuccess = true;

        for (uint256 i = 0; i < market.periods.length; i++) {
            if (!market.periods[i].resolved) {
                allResolved = false;
                break;
            }

            // Check success criteria (can be customized per market type)
            // For now, assume success = result > 0
            if (market.periods[i].result == 0) {
                allSuccess = false;
            }
        }

        if (allResolved) {
            market.allResolved = true;
            market.allSuccess = allSuccess;
            emit MarketResolved(_marketId, allSuccess);
        }
    }

    /**
     * @notice Claim winnings
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.allResolved, "Not all periods resolved");

        Position storage position = positions[_marketId][msg.sender];
        require(!position.claimed, "Already claimed");
        require(position.successAmount > 0 || position.failureAmount > 0, "No position");

        uint256 winningPool = market.allSuccess ? market.successPool : market.failurePool;
        uint256 losingPool = market.allSuccess ? market.failurePool : market.successPool;
        uint256 userWinningAmount = market.allSuccess ? position.successAmount : position.failureAmount;

        require(userWinningAmount > 0, "Not a winner");
        require(winningPool > 0, "No winning pool");

        // Parimutuel payout
        uint256 payout = userWinningAmount + ((userWinningAmount * losingPool) / winningPool);

        position.claimed = true;
        payable(msg.sender).transfer(payout);

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    /**
     * @notice Get market details
     */
    function getMarket(uint256 _marketId) external view returns (
        string memory question,
        uint8 periodCount,
        uint256 successPool,
        uint256 failurePool,
        bool allResolved,
        bool allSuccess
    ) {
        Market storage market = markets[_marketId];
        return (
            market.question,
            uint8(market.periods.length),
            market.successPool,
            market.failurePool,
            market.allResolved,
            market.allSuccess
        );
    }

    /**
     * @notice Get period details
     */
    function getPeriod(uint256 _marketId, uint8 _periodIndex) external view returns (
        uint32 deadline,
        uint64 result,
        bool resolved
    ) {
        Market storage market = markets[_marketId];
        require(_periodIndex < market.periods.length, "Invalid period");
        
        TimePeriod storage period = market.periods[_periodIndex];
        return (period.deadline, period.result, period.resolved);
    }

    /**
     * @notice Get user position
     */
    function getPosition(uint256 _marketId, address _user) external view returns (
        uint256 successAmount,
        uint256 failureAmount,
        bool claimed
    ) {
        Position memory position = positions[_marketId][_user];
        return (position.successAmount, position.failureAmount, position.claimed);
    }

    /**
     * @notice Convert uint to string (helper)
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        
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
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        
        return string(bstr);
    }
}
