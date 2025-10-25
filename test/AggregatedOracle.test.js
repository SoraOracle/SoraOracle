const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AggregatedOracle", function () {
    let aggregatedOracle;
    let owner, provider1, provider2, provider3, user;

    beforeEach(async function () {
        [owner, provider1, provider2, provider3, user] = await ethers.getSigners();

        const AggregatedOracle = await ethers.getContractFactory("AggregatedOracle");
        aggregatedOracle = await AggregatedOracle.deploy();
        await aggregatedOracle.waitForDeployment();
    });

    describe("Provider Management", function () {
        it("Should add oracle provider with weight", async function () {
            await aggregatedOracle.addProvider(provider1.address, 5000);
            
            const stats = await aggregatedOracle.getProviderStats(provider1.address);
            expect(stats.weight).to.equal(5000);
            expect(stats.active).to.be.true;
        });

        it("Should remove oracle provider", async function () {
            await aggregatedOracle.addProvider(provider1.address, 5000);
            await aggregatedOracle.removeProvider(provider1.address);
            
            const stats = await aggregatedOracle.getProviderStats(provider1.address);
            expect(stats.active).to.be.false;
        });

        it("Should reject invalid weight", async function () {
            await expect(
                aggregatedOracle.addProvider(provider1.address, 0)
            ).to.be.revertedWith("Invalid weight");

            await expect(
                aggregatedOracle.addProvider(provider1.address, 10001)
            ).to.be.revertedWith("Invalid weight");
        });
    });

    describe("Answer Submission", function () {
        beforeEach(async function () {
            await aggregatedOracle.addProvider(provider1.address, 5000);
            await aggregatedOracle.addProvider(provider2.address, 3000);
            await aggregatedOracle.addProvider(provider3.address, 2000);
        });

        it("Should submit answer as provider", async function () {
            const questionId = 1;
            const answer = 42000;
            const confidence = 85;

            await aggregatedOracle.connect(provider1).submitAnswer(questionId, answer, confidence);

            const submission = await aggregatedOracle.submissions(questionId, provider1.address);
            expect(submission.numericAnswer).to.equal(answer);
            expect(submission.confidenceScore).to.equal(confidence);
            expect(submission.submitted).to.be.true;
        });

        it("Should reject non-provider submissions", async function () {
            await expect(
                aggregatedOracle.connect(user).submitAnswer(1, 42000, 85)
            ).to.be.revertedWith("Not authorized provider");
        });

        it("Should reject duplicate submissions", async function () {
            await aggregatedOracle.connect(provider1).submitAnswer(1, 42000, 85);
            
            await expect(
                aggregatedOracle.connect(provider1).submitAnswer(1, 43000, 90)
            ).to.be.revertedWith("Already submitted");
        });
    });

    describe("Answer Aggregation", function () {
        beforeEach(async function () {
            await aggregatedOracle.addProvider(provider1.address, 5000); // 50%
            await aggregatedOracle.addProvider(provider2.address, 3000); // 30%
            await aggregatedOracle.addProvider(provider3.address, 2000); // 20%
        });

        it("Should aggregate answers with weighted average", async function () {
            const questionId = 1;

            // Provider submissions
            await aggregatedOracle.connect(provider1).submitAnswer(questionId, 100, 90);
            await aggregatedOracle.connect(provider2).submitAnswer(questionId, 120, 85);
            await aggregatedOracle.connect(provider3).submitAnswer(questionId, 110, 80);

            await aggregatedOracle.aggregateAnswer(questionId);

            const answer = await aggregatedOracle.getAnswer(questionId);
            // Weighted average: (100*5000 + 120*3000 + 110*2000) / 10000 = 108
            expect(answer.numericAnswer).to.equal(108);
            expect(answer.finalized).to.be.true;
            expect(answer.providerCount).to.equal(3);
        });

        it("Should require minimum providers", async function () {
            await aggregatedOracle.connect(provider1).submitAnswer(1, 100, 90);
            
            await expect(
                aggregatedOracle.aggregateAnswer(1)
            ).to.be.revertedWith("Insufficient submissions");
        });

        it("Should update provider success counts", async function () {
            const questionId = 1;

            await aggregatedOracle.connect(provider1).submitAnswer(questionId, 100, 90);
            await aggregatedOracle.connect(provider2).submitAnswer(questionId, 120, 85);
            await aggregatedOracle.connect(provider3).submitAnswer(questionId, 110, 80);

            await aggregatedOracle.aggregateAnswer(questionId);

            const stats1 = await aggregatedOracle.getProviderStats(provider1.address);
            expect(stats1.successfulAnswers).to.equal(1);
        });
    });

    describe("Configuration", function () {
        it("Should update minimum providers", async function () {
            await aggregatedOracle.setMinimumProviders(5);
            expect(await aggregatedOracle.minimumProviders()).to.equal(5);
        });

        it("Should update consensus threshold", async function () {
            await aggregatedOracle.setConsensusThreshold(80);
            expect(await aggregatedOracle.consensusThreshold()).to.equal(80);
        });
    });
});
