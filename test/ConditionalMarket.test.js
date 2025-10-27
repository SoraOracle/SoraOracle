const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConditionalMarket", function () {
    let conditionalMarket, parentMarket, soraOracle;
    let owner, creator, trader;

    beforeEach(async function () {
        [owner, creator, trader] = await ethers.getSigners();

        // Deploy SoraOracle
        const SoraOracle = await ethers.getContractFactory("SoraOracle");
        soraOracle = await SoraOracle.deploy(owner.address);
        await soraOracle.waitForDeployment();

        // Deploy parent market (SimplePredictionMarket)
        const SimplePredictionMarket = await ethers.getContractFactory("SimplePredictionMarket");
        parentMarket = await SimplePredictionMarket.deploy(await soraOracle.getAddress());
        await parentMarket.waitForDeployment();
        
        // Create a market on the parent
        const deadline = (await ethers.provider.getBlock('latest')).timestamp + 86400;
        await parentMarket.createMarket(
            "Will Fed cut rates?",
            deadline,
            { value: ethers.parseEther("0.01") }
        );

        // Deploy ConditionalMarket
        const ConditionalMarket = await ethers.getContractFactory("ConditionalMarket");
        conditionalMarket = await ConditionalMarket.deploy();
        await conditionalMarket.waitForDeployment();
    });

    describe("Market Creation", function () {
        it("Should create conditional market", async function () {
            const question = "Will BTC hit $100k IF Fed cuts rates?";
            const requiredOutcome = 1; // Yes

            const marketId = await conditionalMarket.createMarket(
                question,
                await parentMarket.getAddress(),
                requiredOutcome
            );

            await expect(marketId).to.emit(conditionalMarket, "MarketCreated");
        });
    });

    describe("Position Taking", function () {
        let marketId;

        beforeEach(async function () {
            marketId = await conditionalMarket.createMarket.staticCall(
                "BTC $100k IF Fed cuts",
                await parentMarket.getAddress(),
                1
            );

            await conditionalMarket.createMarket(
                "BTC $100k IF Fed cuts",
                await parentMarket.getAddress(),
                1
            );
        });

        it("Should take position", async function () {
            await conditionalMarket.connect(trader).takePosition(marketId, true, { value: ethers.parseEther("1.0") });

            const position = await conditionalMarket.getPosition(marketId, trader.address);
            expect(position.yesAmount).to.be.gt(0);
        });
    });

    describe("Market Info", function () {
        it("Should get market details", async function () {
            const marketId = await conditionalMarket.createMarket.staticCall(
                "Test conditional",
                await parentMarket.getAddress(),
                1
            );

            await conditionalMarket.createMarket(
                "Test conditional",
                await parentMarket.getAddress(),
                1
            );

            const market = await conditionalMarket.getMarket(marketId);
            expect(market.question).to.equal("Test conditional");
            expect(market.parentMarket).to.equal(await parentMarket.getAddress());
        });
    });
});
