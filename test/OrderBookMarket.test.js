const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("OrderBookMarket", function () {
    let orderBookMarket, soraOracle;
    let owner, trader1, trader2, trader3, oracleProvider;

    beforeEach(async function () {
        [owner, trader1, trader2, trader3, oracleProvider] = await ethers.getSigners();

        const SoraOracle = await ethers.getContractFactory("SoraOracle");
        soraOracle = await SoraOracle.deploy(oracleProvider.address);
        await soraOracle.waitForDeployment();

        const OrderBookMarket = await ethers.getContractFactory("OrderBookMarket");
        orderBookMarket = await OrderBookMarket.deploy(await soraOracle.getAddress());
        await orderBookMarket.waitForDeployment();
    });

    describe("Market Creation", function () {
        it("Should create market with valid parameters", async function () {
            const question = "Will BTC hit $100k by EOY?";
            const deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;

            const tx = await orderBookMarket.connect(trader1).createMarket(
                question,
                deadline,
                { value: ethers.parseEther("0.01") }
            );

            await expect(tx).to.emit(orderBookMarket, "MarketCreated");

            const market = await orderBookMarket.markets(0);
            expect(market.question).to.equal(question);
            expect(market.deadline).to.equal(deadline);
            expect(market.resolved).to.be.false;
        });

        it("Should reject market with insufficient fee", async function () {
            const deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;

            await expect(
                orderBookMarket.createMarket("Question?", deadline, { value: ethers.parseEther("0.001") })
            ).to.be.revertedWith("Insufficient creation fee");
        });
    });

    describe("Order Placement", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            marketId = await orderBookMarket.connect(trader1).createMarket.staticCall(
                "Will ETH hit $5k?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );

            await orderBookMarket.connect(trader1).createMarket(
                "Will ETH hit $5k?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
        });

        it("Should place buy order", async function () {
            const price = 6000;
            const amount = ethers.parseEther("1.0");
            const deposit = (amount * BigInt(price)) / BigInt(10000);

            const orderId = await orderBookMarket.connect(trader1).placeOrder.staticCall(
                marketId,
                true,
                true,
                price,
                amount,
                { value: deposit }
            );

            await expect(
                orderBookMarket.connect(trader1).placeOrder(
                    marketId,
                    true,
                    true,
                    price,
                    amount,
                    { value: deposit }
                )
            ).to.emit(orderBookMarket, "OrderPlaced");

            const order = await orderBookMarket.orders(marketId, orderId);
            expect(order.trader).to.equal(trader1.address);
            expect(order.isBuy).to.be.true;
            expect(order.isYes).to.be.true;
            expect(order.price).to.equal(price);
            expect(order.amount).to.equal(amount);
        });

        it("Should place sell order", async function () {
            const price = 5500;
            const amount = ethers.parseEther("1.0");

            await expect(
                orderBookMarket.connect(trader2).placeOrder(
                    marketId,
                    false,
                    true,
                    price,
                    amount,
                    { value: amount }
                )
            ).to.emit(orderBookMarket, "OrderPlaced");
        });

        it("Should reject order with invalid price", async function () {
            await expect(
                orderBookMarket.connect(trader1).placeOrder(
                    marketId,
                    true,
                    true,
                    0,
                    ethers.parseEther("1.0"),
                    { value: ethers.parseEther("0.6") }
                )
            ).to.be.revertedWith("Invalid price");
        });

        it("Should reject order after deadline", async function () {
            await time.increaseTo(deadline + 1);

            await expect(
                orderBookMarket.connect(trader1).placeOrder(
                    marketId,
                    true,
                    true,
                    6000,
                    ethers.parseEther("1.0"),
                    { value: ethers.parseEther("0.6") }
                )
            ).to.be.revertedWith("Market expired");
        });
    });

    describe("Order Matching", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will SOL hit $200?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;
        });

        it("Should match buy and sell orders", async function () {
            const price = 6000;
            const amount = ethers.parseEther("1.0");

            await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                false,
                true,
                price,
                amount,
                { value: amount }
            );

            const deposit = (amount * BigInt(price)) / BigInt(10000);
            await expect(
                orderBookMarket.connect(trader2).placeOrder(
                    marketId,
                    true,
                    true,
                    price,
                    amount,
                    { value: deposit }
                )
            ).to.emit(orderBookMarket, "OrderMatched");
        });

        it("Should partially fill orders", async function () {
            const price = 6000;
            const sellAmount = ethers.parseEther("2.0");
            const buyAmount = ethers.parseEther("1.0");

            await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                false,
                true,
                price,
                sellAmount,
                { value: sellAmount }
            );

            const deposit = (buyAmount * BigInt(price)) / BigInt(10000);
            await orderBookMarket.connect(trader2).placeOrder(
                marketId,
                true,
                true,
                price,
                buyAmount,
                { value: deposit }
            );

            const sellOrder = await orderBookMarket.orders(marketId, 0);
            expect(sellOrder.filled).to.equal(buyAmount);
        });
    });

    describe("Order Cancellation", function () {
        let marketId, orderId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will AVAX hit $50?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;

            const price = 6000;
            const amount = ethers.parseEther("1.0");
            const deposit = (amount * BigInt(price)) / BigInt(10000);

            orderId = await orderBookMarket.connect(trader1).placeOrder.staticCall(
                marketId,
                true,
                true,
                price,
                amount,
                { value: deposit }
            );

            await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                true,
                true,
                price,
                amount,
                { value: deposit }
            );
        });

        it("Should cancel order and refund", async function () {
            await expect(
                orderBookMarket.connect(trader1).cancelOrder(marketId, orderId)
            ).to.emit(orderBookMarket, "OrderCancelled");

            const order = await orderBookMarket.orders(marketId, orderId);
            expect(order.cancelled).to.be.true;
        });

        it("Should reject cancellation by non-owner", async function () {
            await expect(
                orderBookMarket.connect(trader2).cancelOrder(marketId, orderId)
            ).to.be.revertedWith("Not order owner");
        });
    });

    describe("Market Resolution", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will MATIC hit $2?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;
        });

        it("Should resolve market after deadline", async function () {
            await time.increaseTo(deadline + 1);

            const market = await orderBookMarket.markets(marketId);
            await soraOracle.connect(oracleProvider).provideAnswer(market.questionId, "Yes", 1, true, 100, "Test source");

            await expect(
                orderBookMarket.resolveMarket(marketId)
            ).to.emit(orderBookMarket, "MarketResolved");

            const resolvedMarket = await orderBookMarket.markets(marketId);
            expect(resolvedMarket.resolved).to.be.true;
        });

        it("Should reject resolution before deadline", async function () {
            await expect(
                orderBookMarket.resolveMarket(marketId)
            ).to.be.revertedWith("Not expired");
        });
    });

    describe("Order Book View", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will LINK hit $30?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;
        });

        it("Should return order book", async function () {
            const amount = ethers.parseEther("1.0");

            await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                true,
                true,
                6000,
                amount,
                { value: (amount * BigInt(6000)) / BigInt(10000) }
            );

            await orderBookMarket.connect(trader2).placeOrder(
                marketId,
                false,
                true,
                6500,
                amount,
                { value: amount }
            );

            const [buyOrders, sellOrders] = await orderBookMarket.getOrderBook(marketId, true);
            expect(buyOrders.length).to.be.gt(0);
            expect(sellOrders.length).to.be.gt(0);
        });
    });

    describe("Market Price", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will DOT hit $10?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;
        });

        it("Should calculate market price from order book", async function () {
            const amount = ethers.parseEther("1.0");

            await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                true,
                true,
                6000,
                amount,
                { value: (amount * BigInt(6000)) / BigInt(10000) }
            );

            await orderBookMarket.connect(trader2).placeOrder(
                marketId,
                false,
                true,
                6500,
                amount,
                { value: amount }
            );

            const price = await orderBookMarket.getMarketPrice(marketId, true);
            expect(price).to.be.gt(0);
        });
    });

    describe("Regression: Sell-side Collateral Retention", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will ADA hit $1?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;
        });

        it("Should retain seller collateral through settlement when NO wins", async function () {
            const amount = ethers.parseEther("1.0");
            const sellPrice = 6000;

            const sellerBalanceBefore = await ethers.provider.getBalance(trader2.address);

            const buyTx = await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                true,
                true,
                sellPrice,
                amount,
                { value: (amount * BigInt(sellPrice)) / BigInt(10000) }
            );
            const buyReceipt = await buyTx.wait();
            const buyGas = buyReceipt.gasUsed * buyReceipt.gasPrice;

            const sellTx = await orderBookMarket.connect(trader2).placeOrder(
                marketId,
                false,
                true,
                sellPrice,
                amount,
                { value: amount }
            );
            const sellReceipt = await sellTx.wait();
            const sellGas = sellReceipt.gasUsed * sellReceipt.gasPrice;

            const sellerBalanceAfter = await ethers.provider.getBalance(trader2.address);
            const sellerSpent = sellerBalanceBefore - sellerBalanceAfter;
            const proceeds = (amount * BigInt(sellPrice)) / BigInt(10000);
            const fee = (amount * BigInt(200)) / BigInt(10000);
            const expectedSpent = amount - proceeds + fee + sellGas;

            expect(sellerSpent).to.be.closeTo(expectedSpent, ethers.parseEther("0.001"));

            await time.increaseTo(deadline + 1);
            const market = await orderBookMarket.markets(marketId);
            await soraOracle.connect(oracleProvider).provideAnswer(market.questionId, "No", 0, false, 100, "Test");
            await orderBookMarket.resolveMarket(marketId);

            const sellerWinningsBefore = await ethers.provider.getBalance(trader2.address);
            const claimTx = await orderBookMarket.connect(trader2).claimWinnings(marketId);
            const claimReceipt = await claimTx.wait();
            const claimGas = claimReceipt.gasUsed * claimReceipt.gasPrice;
            const sellerWinningsAfter = await ethers.provider.getBalance(trader2.address);

            expect(sellerWinningsAfter - sellerWinningsBefore + claimGas).to.equal(amount);
        });
    });

    describe("Regression: Buy-side Price Improvement", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            await orderBookMarket.connect(trader1).createMarket(
                "Will SOL hit $200?",
                deadline,
                { value: ethers.parseEther("0.01") }
            );
            marketId = 0;
        });

        it("Should refund price improvement when buy executes below limit", async function () {
            const amount = ethers.parseEther("1.0");
            const limitPrice = 7000;
            const restingPrice = 6000;

            await orderBookMarket.connect(trader2).placeOrder(
                marketId,
                false,
                true,
                restingPrice,
                amount,
                { value: amount }
            );

            const buyerBalanceBefore = await ethers.provider.getBalance(trader1.address);
            const depositedAmount = (amount * BigInt(limitPrice)) / BigInt(10000);

            const buyTx = await orderBookMarket.connect(trader1).placeOrder(
                marketId,
                true,
                true,
                limitPrice,
                amount,
                { value: depositedAmount }
            );
            const buyReceipt = await buyTx.wait();
            const buyGas = buyReceipt.gasUsed * buyReceipt.gasPrice;

            const buyerBalanceAfter = await ethers.provider.getBalance(trader1.address);
            const actualSpent = (amount * BigInt(restingPrice)) / BigInt(10000);
            const expectedCost = actualSpent + buyGas;
            const actualCost = buyerBalanceBefore - buyerBalanceAfter;

            expect(actualCost).to.be.closeTo(expectedCost, ethers.parseEther("0.001"));
        });
    });
});
