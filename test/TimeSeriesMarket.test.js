const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TimeSeriesMarket", function () {
    let timeSeriesMarket, soraOracle;
    let owner, creator, trader;

    beforeEach(async function () {
        [owner, creator, trader] = await ethers.getSigners();

        const SoraOracle = await ethers.getContractFactory("SoraOracle");
        soraOracle = await SoraOracle.deploy(owner.address);
        await soraOracle.waitForDeployment();

        const TimeSeriesMarket = await ethers.getContractFactory("TimeSeriesMarket");
        timeSeriesMarket = await TimeSeriesMarket.deploy(await soraOracle.getAddress());
        await timeSeriesMarket.waitForDeployment();
    });

    describe("Market Creation", function () {
        it("Should create time series market", async function () {
            const question = "Will BTC increase each month in Q1?";
            const now = (await ethers.provider.getBlock('latest')).timestamp;
            const deadlines = [
                now + 30 * 86400,  // Month 1
                now + 60 * 86400,  // Month 2
                now + 90 * 86400   // Month 3
            ];
            const oracleFees = ethers.parseEther("0.03"); // 0.01 per period

            const marketId = await timeSeriesMarket.connect(creator).createMarket.staticCall(
                question,
                deadlines,
                { value: oracleFees }
            );

            await timeSeriesMarket.connect(creator).createMarket(
                question,
                deadlines,
                { value: oracleFees }
            );

            const market = await timeSeriesMarket.getMarket(marketId);
            expect(market.question).to.equal(question);
            expect(market.periodCount).to.equal(3);
        });

        it("Should reject invalid period count", async function () {
            await expect(
                timeSeriesMarket.createMarket(
                    "Test",
                    [Math.floor(Date.now() / 1000) + 86400], // Only 1 period
                    { value: ethers.parseEther("0.01") }
                )
            ).to.be.revertedWith("2-12 periods only");
        });

        it("Should reject non-ascending deadlines", async function () {
            const now = Math.floor(Date.now() / 1000);
            
            await expect(
                timeSeriesMarket.createMarket(
                    "Test",
                    [now + 86400, now + 7200], // Second deadline before first
                    { value: ethers.parseEther("0.02") }
                )
            ).to.be.revertedWith("Deadlines not ascending");
        });
    });

    describe("Position Taking", function () {
        let marketId;

        beforeEach(async function () {
            const now = (await ethers.provider.getBlock('latest')).timestamp;
            const deadlines = [now + 86400, now + 172800];

            marketId = await timeSeriesMarket.connect(creator).createMarket.staticCall(
                "Test series",
                deadlines,
                { value: ethers.parseEther("0.02") }
            );

            await timeSeriesMarket.connect(creator).createMarket(
                "Test series",
                deadlines,
                { value: ethers.parseEther("0.02") }
            );
        });

        it("Should take success position", async function () {
            await timeSeriesMarket.connect(trader).takePosition(marketId, true, { value: ethers.parseEther("1.0") });

            const position = await timeSeriesMarket.getPosition(marketId, trader.address);
            expect(position.successAmount).to.be.gt(0);
        });

        it("Should take failure position", async function () {
            await timeSeriesMarket.connect(trader).takePosition(marketId, false, { value: ethers.parseEther("1.0") });

            const position = await timeSeriesMarket.getPosition(marketId, trader.address);
            expect(position.failureAmount).to.be.gt(0);
        });
    });

    describe("Period Info", function () {
        it("Should get period details", async function () {
            const now = (await ethers.provider.getBlock('latest')).timestamp;
            const deadlines = [now + 86400, now + 172800];

            const marketId = await timeSeriesMarket.connect(creator).createMarket.staticCall(
                "Test",
                deadlines,
                { value: ethers.parseEther("0.02") }
            );

            await timeSeriesMarket.connect(creator).createMarket(
                "Test",
                deadlines,
                { value: ethers.parseEther("0.02") }
            );

            const period = await timeSeriesMarket.getPeriod(marketId, 0);
            expect(period.resolved).to.be.false;
            expect(period.deadline).to.equal(deadlines[0]);
        });
    });
});
