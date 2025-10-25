const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RangeMarket", function () {
    let rangeMarket, soraOracle;
    let owner, creator, trader1;

    beforeEach(async function () {
        [owner, creator, trader1] = await ethers.getSigners();

        // Deploy SoraOracle first
        const SoraOracle = await ethers.getContractFactory("SoraOracle");
        soraOracle = await SoraOracle.deploy(owner.address);
        await soraOracle.waitForDeployment();

        const RangeMarket = await ethers.getContractFactory("RangeMarket");
        rangeMarket = await RangeMarket.deploy(await soraOracle.getAddress());
        await rangeMarket.waitForDeployment();
    });

    describe("Market Creation", function () {
        it("Should create range market", async function () {
            const question = "BTC price on Dec 31";
            const lowerBound = 30000;
            const upperBound = 35000;
            const deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            const oracleFee = ethers.parseEther("0.01");

            const marketId = await rangeMarket.connect(creator).createMarket.staticCall(
                question,
                lowerBound,
                upperBound,
                deadline,
                { value: oracleFee }
            );

            await rangeMarket.connect(creator).createMarket(
                question,
                lowerBound,
                upperBound,
                deadline,
                { value: oracleFee }
            );

            const market = await rangeMarket.getMarket(marketId);
            expect(market.question).to.equal(question);
            expect(market.lowerBound).to.equal(lowerBound);
            expect(market.upperBound).to.equal(upperBound);
        });

        it("Should reject invalid range", async function () {
            await expect(
                rangeMarket.createMarket(
                    "Test",
                    35000,
                    30000, // Upper < Lower
                    (await ethers.provider.getBlock('latest')).timestamp + 86400,
                    { value: ethers.parseEther("0.01") }
                )
            ).to.be.revertedWith("Invalid range");
        });
    });

    describe("Position Taking", function () {
        let marketId, deadline;

        beforeEach(async function () {
            deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
            
            marketId = await rangeMarket.connect(creator).createMarket.staticCall(
                "BTC price",
                30000,
                35000,
                deadline,
                { value: ethers.parseEther("0.01") }
            );

            await rangeMarket.connect(creator).createMarket(
                "BTC price",
                30000,
                35000,
                deadline,
                { value: ethers.parseEther("0.01") }
            );
        });

        it("Should take IN RANGE position", async function () {
            await rangeMarket.connect(trader1).takePosition(marketId, true, { value: ethers.parseEther("1.0") });

            const position = await rangeMarket.getPosition(marketId, trader1.address);
            expect(position.inRangeAmount).to.be.gt(0);
        });

        it("Should take OUT OF RANGE position", async function () {
            await rangeMarket.connect(trader1).takePosition(marketId, false, { value: ethers.parseEther("1.0") });

            const position = await rangeMarket.getPosition(marketId, trader1.address);
            expect(position.outRangeAmount).to.be.gt(0);
        });

        it("Should calculate odds", async function () {
            await rangeMarket.connect(trader1).takePosition(marketId, true, { value: ethers.parseEther("1.0") });

            const odds = await rangeMarket.getOdds(marketId);
            expect(odds.inRangeOdds).to.be.gt(0);
            expect(odds.outRangeOdds).to.be.gt(0);
        });
    });
});
