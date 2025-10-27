const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AMMMarket", function () {
    let ammMarket;
    let owner, creator, trader1, trader2;

    beforeEach(async function () {
        [owner, creator, trader1, trader2] = await ethers.getSigners();

        const AMMMarket = await ethers.getContractFactory("AMMMarket");
        ammMarket = await AMMMarket.deploy();
        await ammMarket.waitForDeployment();
    });

    describe("Market Creation", function () {
        it("Should create AMM market with initial liquidity", async function () {
            const question = "Will BTC hit $100k in 2025?";
            const initialYes = ethers.parseEther("1.0");
            const initialNo = ethers.parseEther("1.0");

            const marketId = await ammMarket.connect(creator).createMarket.staticCall(
                question,
                initialYes,
                initialNo,
                { value: initialYes + initialNo }
            );

            await ammMarket.connect(creator).createMarket(
                question,
                initialYes,
                initialNo,
                { value: initialYes + initialNo }
            );

            const market = await ammMarket.markets(marketId);
            expect(market.question).to.equal(question);
            expect(market.yesReserve).to.equal(initialYes);
            expect(market.noReserve).to.equal(initialNo);
        });

        it("Should reject insufficient liquidity", async function () {
            const question = "Test";
            const tooLow = 500; // Below MINIMUM_LIQUIDITY of 1000

            await expect(
                ammMarket.createMarket(question, tooLow, tooLow, { value: tooLow * 2 })
            ).to.be.revertedWith("Insufficient liquidity");
        });
    });

    describe("Token Trading", function () {
        let marketId;

        beforeEach(async function () {
            const initialLiquidity = ethers.parseEther("10.0");
            
            marketId = await ammMarket.connect(creator).createMarket.staticCall(
                "Test Market",
                initialLiquidity,
                initialLiquidity,
                { value: initialLiquidity * 2n }
            );

            await ammMarket.connect(creator).createMarket(
                "Test Market",
                initialLiquidity,
                initialLiquidity,
                { value: initialLiquidity * 2n }
            );
        });

        it("Should buy YES tokens", async function () {
            const buyAmount = ethers.parseEther("1.0");

            await ammMarket.connect(trader1).buyTokens(marketId, true, { value: buyAmount });

            const position = await ammMarket.userPositions(marketId, trader1.address);
            expect(position.yesTokens).to.be.gt(0);
        });

        it("Should update reserves after trade", async function () {
            const marketBefore = await ammMarket.markets(marketId);
            const initialYesReserve = marketBefore.yesReserve;

            await ammMarket.connect(trader1).buyTokens(marketId, true, { value: ethers.parseEther("1.0") });

            const marketAfter = await ammMarket.markets(marketId);
            expect(marketAfter.yesReserve).to.be.lt(initialYesReserve); // YES reserve decreased
        });

        it("Should calculate price correctly", async function () {
            const initialPrice = await ammMarket.getCurrentPrice(marketId);
            expect(initialPrice).to.equal(5000); // 50/50 initially

            // Buy YES tokens (increases YES price)
            await ammMarket.connect(trader1).buyTokens(marketId, true, { value: ethers.parseEther("5.0") });

            const newPrice = await ammMarket.getCurrentPrice(marketId);
            expect(newPrice).to.be.gt(initialPrice); // YES more expensive now
        });
    });

    describe("Market Resolution", function () {
        let marketId;

        beforeEach(async function () {
            const initialLiquidity = ethers.parseEther("10.0");
            
            marketId = await ammMarket.connect(creator).createMarket.staticCall(
                "Test Market",
                initialLiquidity,
                initialLiquidity,
                { value: initialLiquidity * 2n }
            );

            await ammMarket.connect(creator).createMarket(
                "Test Market",
                initialLiquidity,
                initialLiquidity,
                { value: initialLiquidity * 2n }
            );

            await ammMarket.connect(trader1).buyTokens(marketId, true, { value: ethers.parseEther("1.0") });
        });

        it("Should resolve market", async function () {
            await ammMarket.resolveMarket(marketId, true);

            const market = await ammMarket.markets(marketId);
            expect(market.resolved).to.be.true;
            expect(market.finalOutcome).to.be.true;
        });

        it("Should allow claiming winnings", async function () {
            await ammMarket.resolveMarket(marketId, true);

            const balanceBefore = await ethers.provider.getBalance(trader1.address);
            const tx = await ammMarket.connect(trader1).claimWinnings(marketId);
            const receipt = await tx.wait();
            const balanceAfter = await ethers.provider.getBalance(trader1.address);

            expect(balanceAfter).to.be.gt(balanceBefore - receipt.gasUsed * receipt.gasPrice);
        });
    });
});
