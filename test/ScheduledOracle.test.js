const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ScheduledOracle", function () {
    let scheduledOracle;
    let owner, dataProvider, user;

    beforeEach(async function () {
        [owner, dataProvider, user] = await ethers.getSigners();

        const ScheduledOracle = await ethers.getContractFactory("ScheduledOracle");
        scheduledOracle = await ScheduledOracle.deploy();
        await scheduledOracle.waitForDeployment();
    });

    describe("Feed Creation", function () {
        it("Should create custom data feed", async function () {
            const feedId = ethers.id("BTC-PRICE");
            const updateInterval = 3600; // 1 hour
            const updateFee = ethers.parseEther("0.001");

            await scheduledOracle.createCustomFeed(
                feedId,
                1, // FeedType.WEATHER
                updateInterval,
                dataProvider.address,
                { value: updateFee }
            );

            const feed = await scheduledOracle.feeds(feedId);
            expect(feed.active).to.be.true;
            expect(feed.updateInterval).to.equal(updateInterval);
            expect(feed.dataProvider).to.equal(dataProvider.address);
        });

        it("Should reject short update intervals", async function () {
            const feedId = ethers.id("TEST-FEED");
            const updateFee = ethers.parseEther("0.001");

            await expect(
                scheduledOracle.createCustomFeed(
                    feedId,
                    1,
                    30, // 30 seconds - too short
                    dataProvider.address,
                    { value: updateFee }
                )
            ).to.be.revertedWith("Min 1 minute interval");
        });

        it("Should reject insufficient fee", async function () {
            const feedId = ethers.id("TEST-FEED");

            await expect(
                scheduledOracle.createCustomFeed(
                    feedId,
                    1,
                    3600,
                    dataProvider.address,
                    { value: ethers.parseEther("0.0001") }
                )
            ).to.be.revertedWith("Insufficient fee");
        });
    });

    describe("Feed Updates", function () {
        let feedId;

        beforeEach(async function () {
            feedId = ethers.id("BTC-PRICE");
            const updateFee = ethers.parseEther("0.001");

            await scheduledOracle.createCustomFeed(
                feedId,
                1,
                3600,
                dataProvider.address,
                { value: updateFee }
            );
        });

        it("Should update feed value", async function () {
            const value = 42000;
            const confidence = 95;

            await scheduledOracle.connect(dataProvider).updateFeed(feedId, value, confidence);

            const result = await scheduledOracle.getCurrentValue(feedId);
            expect(result.value).to.equal(value);
            expect(result.confidence).to.equal(confidence);
        });

        it("Should store value in history", async function () {
            await scheduledOracle.connect(dataProvider).updateFeed(feedId, 42000, 95);

            // Advance time and update again
            await time.increase(3600);
            await scheduledOracle.connect(dataProvider).updateFeed(feedId, 43000, 96);

            const history = await scheduledOracle.getFeedHistory(feedId);
            expect(history.length).to.equal(2);
            expect(history[0]).to.equal(42000);
            expect(history[1]).to.equal(43000);
        });

        it("Should reject unauthorized updates", async function () {
            await expect(
                scheduledOracle.connect(user).updateFeed(feedId, 42000, 95)
            ).to.be.revertedWith("Not authorized");
        });

        it("Should reject early updates", async function () {
            await scheduledOracle.connect(dataProvider).updateFeed(feedId, 42000, 95);

            await expect(
                scheduledOracle.connect(dataProvider).updateFeed(feedId, 43000, 96)
            ).to.be.revertedWith("Too early");
        });
    });

    describe("Feed Queries", function () {
        it("Should get feeds needing update", async function () {
            const feedId1 = ethers.id("FEED-1");
            const feedId2 = ethers.id("FEED-2");
            const updateFee = ethers.parseEther("0.001");

            await scheduledOracle.createCustomFeed(feedId1, 1, 3600, dataProvider.address, { value: updateFee });
            await scheduledOracle.createCustomFeed(feedId2, 1, 3600, dataProvider.address, { value: updateFee });

            // Update one feed
            await scheduledOracle.connect(dataProvider).updateFeed(feedId1, 100, 90);

            // Advance time
            await time.increase(3700);

            const needsUpdate = await scheduledOracle.getFeedsNeedingUpdate();
            expect(needsUpdate.length).to.equal(2); // Both need update now
        });
    });

    describe("Feed Deactivation", function () {
        it("Should deactivate feed", async function () {
            const feedId = ethers.id("TEST-FEED");
            const updateFee = ethers.parseEther("0.001");

            await scheduledOracle.createCustomFeed(feedId, 1, 3600, dataProvider.address, { value: updateFee });
            await scheduledOracle.deactivateFeed(feedId);

            const feed = await scheduledOracle.feeds(feedId);
            expect(feed.active).to.be.false;
        });
    });
});
