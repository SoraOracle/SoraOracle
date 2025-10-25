// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SoraOracle.sol";

contract OrderBookMarket is Ownable, ReentrancyGuard {
    SoraOracle public oracle;

    struct Order {
        address trader;
        bool isBuy;
        bool isYes;
        uint256 price;
        uint256 amount;
        uint256 filled;
        uint256 timestamp;
        bool cancelled;
    }

    struct Market {
        uint256 questionId;
        string question;
        uint32 deadline;
        uint256 totalYesVolume;
        uint256 totalNoVolume;
        bool resolved;
        bool outcome;
        uint256 feePercentage;
        uint256 collectedFees;
    }

    uint256 public marketCounter;
    uint256 public orderCounter;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(uint256 => Order)) public orders;
    mapping(uint256 => uint256[]) public marketOrders;
    mapping(address => uint256[]) public userOrders;
    mapping(uint256 => mapping(address => uint256)) public yesPositions;
    mapping(uint256 => mapping(address => uint256)) public noPositions;

    uint256 public constant FEE_PERCENTAGE = 200;
    uint256 public constant MIN_ORDER_SIZE = 0.01 ether;
    uint256 public constant MAX_PRICE = 10000;

    event MarketCreated(uint256 indexed marketId, string question, uint32 deadline);
    event OrderPlaced(uint256 indexed marketId, uint256 indexed orderId, address indexed trader, bool isBuy, bool isYes, uint256 price, uint256 amount);
    event OrderMatched(uint256 indexed marketId, uint256 buyOrderId, uint256 sellOrderId, uint256 matchedAmount, uint256 price);
    event OrderCancelled(uint256 indexed marketId, uint256 indexed orderId, address indexed trader);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed trader, uint256 amount);

    constructor(address _oracleAddress) Ownable(msg.sender) {
        oracle = SoraOracle(payable(_oracleAddress));
    }

    function createMarket(
        string memory _question,
        uint32 _deadline
    ) external payable returns (uint256) {
        require(bytes(_question).length > 0, "Empty question");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(msg.value >= 0.01 ether, "Insufficient creation fee");

        uint256 questionId = oracle.askOracle{value: msg.value}(_question, _deadline);
        uint256 marketId = marketCounter++;

        markets[marketId] = Market({
            questionId: questionId,
            question: _question,
            deadline: _deadline,
            totalYesVolume: 0,
            totalNoVolume: 0,
            resolved: false,
            outcome: false,
            feePercentage: FEE_PERCENTAGE,
            collectedFees: 0
        });

        emit MarketCreated(marketId, _question, _deadline);
        return marketId;
    }

    function placeOrder(
        uint256 _marketId,
        bool _isBuy,
        bool _isYes,
        uint256 _price,
        uint256 _amount
    ) external payable nonReentrant returns (uint256) {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.deadline, "Market expired");
        require(_price > 0 && _price <= MAX_PRICE, "Invalid price");
        require(_amount >= MIN_ORDER_SIZE, "Order too small");

        uint256 requiredDeposit = _isBuy ? (_amount * _price) / MAX_PRICE : _amount;
        require(msg.value >= requiredDeposit, "Insufficient deposit");

        uint256 orderId = orderCounter++;

        orders[_marketId][orderId] = Order({
            trader: msg.sender,
            isBuy: _isBuy,
            isYes: _isYes,
            price: _price,
            amount: _amount,
            filled: 0,
            timestamp: block.timestamp,
            cancelled: false
        });

        marketOrders[_marketId].push(orderId);
        userOrders[msg.sender].push(orderId);

        emit OrderPlaced(_marketId, orderId, msg.sender, _isBuy, _isYes, _price, _amount);

        uint256 spent = _matchOrders(_marketId, orderId);

        if (_isBuy) {
            Order storage placedOrder = orders[_marketId][orderId];
            uint256 unfilledDeposit = ((placedOrder.amount - placedOrder.filled) * placedOrder.price) / MAX_PRICE;
            uint256 totalUsed = spent + unfilledDeposit;
            if (msg.value > totalUsed) {
                payable(msg.sender).transfer(msg.value - totalUsed);
            }
        } else {
            if (msg.value > requiredDeposit) {
                payable(msg.sender).transfer(msg.value - requiredDeposit);
            }
        }

        return orderId;
    }

    function _matchOrders(uint256 _marketId, uint256 _newOrderId) internal returns (uint256 totalSpent) {
        Order storage newOrder = orders[_marketId][_newOrderId];
        uint256[] storage orderIds = marketOrders[_marketId];
        totalSpent = 0;

        while (newOrder.filled < newOrder.amount) {
            uint256 bestOrderId = type(uint256).max;
            uint256 bestPrice = newOrder.isBuy ? type(uint256).max : 0;
            uint256 bestTime = type(uint256).max;

            for (uint256 i = 0; i < orderIds.length; i++) {
                if (orderIds[i] == _newOrderId) continue;
                
                Order storage existing = orders[_marketId][orderIds[i]];
                if (existing.cancelled || existing.filled >= existing.amount) continue;
                if ((newOrder.isBuy == existing.isBuy) || (newOrder.isYes != existing.isYes)) continue;
                
                bool priceOk = newOrder.isBuy ? newOrder.price >= existing.price : newOrder.price <= existing.price;
                if (!priceOk) continue;

                bool isBetterPrice = newOrder.isBuy 
                    ? existing.price < bestPrice
                    : existing.price > bestPrice;
                
                bool isSamePrice = existing.price == bestPrice;
                bool isEarlier = existing.timestamp < bestTime;

                if (isBetterPrice || (isSamePrice && isEarlier)) {
                    bestOrderId = orderIds[i];
                    bestPrice = existing.price;
                    bestTime = existing.timestamp;
                }
            }

            if (bestOrderId == type(uint256).max) break;

            Order storage bestOrder = orders[_marketId][bestOrderId];
            uint256 matchQty = _min(newOrder.amount - newOrder.filled, bestOrder.amount - bestOrder.filled);

            newOrder.filled += matchQty;
            bestOrder.filled += matchQty;

            if (newOrder.isBuy) {
                totalSpent += (matchQty * bestPrice) / MAX_PRICE;
            }

            _processMatch(_marketId, newOrder.isBuy ? _newOrderId : bestOrderId, newOrder.isBuy ? bestOrderId : _newOrderId, matchQty, bestPrice, newOrder.isYes, newOrder.isBuy ? newOrder.trader : bestOrder.trader);
        }
        
        return totalSpent;
    }

    function _processMatch(uint256 _marketId, uint256 _buyId, uint256 _sellId, uint256 _amt, uint256 _px, bool _isYes, address _buyer) internal {
        uint256 fee = (_amt * FEE_PERCENTAGE) / 10000;
        markets[_marketId].collectedFees += fee;

        address seller = orders[_marketId][_sellId].trader;

        if (_isYes) {
            markets[_marketId].totalYesVolume += _amt;
            yesPositions[_marketId][_buyer] += _amt;
            noPositions[_marketId][seller] += _amt;
        } else {
            markets[_marketId].totalNoVolume += _amt;
            noPositions[_marketId][_buyer] += _amt;
            yesPositions[_marketId][seller] += _amt;
        }

        uint256 cost = (_amt * _px) / MAX_PRICE;
        if (cost > fee) {
            payable(seller).transfer(cost - fee);
        }

        emit OrderMatched(_marketId, _buyId, _sellId, _amt, _px);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function cancelOrder(uint256 _marketId, uint256 _orderId) external nonReentrant {
        Order storage order = orders[_marketId][_orderId];
        require(order.trader == msg.sender, "Not order owner");
        require(!order.cancelled, "Already cancelled");
        require(order.filled < order.amount, "Fully filled");

        order.cancelled = true;

        uint256 unfilledAmount = order.amount - order.filled;
        uint256 refund = order.isBuy
            ? (unfilledAmount * order.price) / MAX_PRICE
            : unfilledAmount;

        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        emit OrderCancelled(_marketId, _orderId, msg.sender);
    }

    function resolveMarket(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.deadline, "Not expired");

        (address provider, uint8 confidenceScore, bool boolAnswer, uint64 numericAnswer, uint32 answerTimestamp) = oracle.answers(market.questionId);
        require(provider != address(0), "Not answered");

        market.resolved = true;
        market.outcome = numericAnswer > 0 || boolAnswer;

        emit MarketResolved(_marketId, market.outcome);
    }

    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Not resolved");

        uint256 yesPos = yesPositions[_marketId][msg.sender];
        uint256 noPos = noPositions[_marketId][msg.sender];
        require(yesPos > 0 || noPos > 0, "No position");

        yesPositions[_marketId][msg.sender] = 0;
        noPositions[_marketId][msg.sender] = 0;

        uint256 payout = market.outcome ? yesPos : noPos;

        if (payout > 0) {
            payable(msg.sender).transfer(payout);
            emit WinningsClaimed(_marketId, msg.sender, payout);
        }
    }

    function getOrderBook(uint256 _marketId, bool _isYes) external view returns (
        Order[] memory buyOrders,
        Order[] memory sellOrders
    ) {
        uint256[] storage orderIds = marketOrders[_marketId];
        uint256 buyCount = 0;
        uint256 sellCount = 0;

        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[_marketId][orderIds[i]];
            if (order.cancelled || order.filled >= order.amount || order.isYes != _isYes) continue;

            if (order.isBuy) {
                buyCount++;
            } else {
                sellCount++;
            }
        }

        buyOrders = new Order[](buyCount);
        sellOrders = new Order[](sellCount);

        uint256 buyIndex = 0;
        uint256 sellIndex = 0;

        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[_marketId][orderIds[i]];
            if (order.cancelled || order.filled >= order.amount || order.isYes != _isYes) continue;

            if (order.isBuy) {
                buyOrders[buyIndex++] = order;
            } else {
                sellOrders[sellIndex++] = order;
            }
        }

        return (buyOrders, sellOrders);
    }

    function getMarketPrice(uint256 _marketId, bool _isYes) external view returns (uint256) {
        uint256[] storage orderIds = marketOrders[_marketId];
        uint256 bestBid = 0;
        uint256 bestAsk = MAX_PRICE;

        for (uint256 i = 0; i < orderIds.length; i++) {
            Order storage order = orders[_marketId][orderIds[i]];
            if (order.cancelled || order.filled >= order.amount || order.isYes != _isYes) continue;

            if (order.isBuy && order.price > bestBid) {
                bestBid = order.price;
            } else if (!order.isBuy && order.price < bestAsk) {
                bestAsk = order.price;
            }
        }

        return bestBid > 0 ? (bestBid + bestAsk) / 2 : 5000;
    }

    function getUserOrders(address _user) external view returns (uint256[] memory) {
        return userOrders[_user];
    }

    function getMarketOrders(uint256 _marketId) external view returns (uint256[] memory) {
        return marketOrders[_marketId];
    }

    function setOracle(address payable _oracleAddress) external onlyOwner {
        require(_oracleAddress != address(0), "Invalid oracle");
        oracle = SoraOracle(_oracleAddress);
    }

    receive() external payable {}
}
