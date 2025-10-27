const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("OracleStaking", function () {
    let oracleStaking;
    let owner, staker1, staker2, staker3;

    beforeEach(async function () {
        [owner, staker1, staker2, staker3] = await ethers.getSigners();

        const OracleStaking = await ethers.getContractFactory("OracleStaking");
        oracleStaking = await OracleStaking.deploy();
        await oracleStaking.waitForDeployment();
    });

    describe("Staking", function () {
        it("Should allow staking above minimum", async function () {
            const stakeAmount = ethers.parseEther("1.0");

            await oracleStaking.connect(staker1).stake({ value: stakeAmount });

            const stakerInfo = await oracleStaking.getStaker(staker1.address);
            expect(stakerInfo.stakedAmount).to.equal(stakeAmount);
            expect(stakerInfo.active).to.be.true;
        });

        it("Should reject staking below minimum", async function () {
            const stakeAmount = ethers.parseEther("0.05");

            await expect(
                oracleStaking.connect(staker1).stake({ value: stakeAmount })
            ).to.be.revertedWith("Below minimum stake");
        });

        it("Should allow additional staking", async function () {
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("1.0") });
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("0.5") });

            const stakerInfo = await oracleStaking.getStaker(staker1.address);
            expect(stakerInfo.stakedAmount).to.equal(ethers.parseEther("1.5"));
        });
    });

    describe("Unstaking", function () {
        beforeEach(async function () {
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("2.0") });
        });

        it("Should allow unstaking after lock period", async function () {
            await time.increase(7 * 24 * 3600 + 1); // 7 days + 1 second

            const unstakeAmount = ethers.parseEther("1.0");
            await oracleStaking.connect(staker1).unstake(unstakeAmount);

            const stakerInfo = await oracleStaking.getStaker(staker1.address);
            expect(stakerInfo.stakedAmount).to.equal(ethers.parseEther("1.0"));
        });

        it("Should reject unstaking during lock period", async function () {
            await expect(
                oracleStaking.connect(staker1).unstake(ethers.parseEther("1.0"))
            ).to.be.revertedWith("Stake locked");
        });

        it("Should mark inactive when fully unstaked", async function () {
            await time.increase(7 * 24 * 3600 + 1);

            await oracleStaking.connect(staker1).unstake(ethers.parseEther("2.0"));

            const stakerInfo = await oracleStaking.getStaker(staker1.address);
            expect(stakerInfo.stakedAmount).to.equal(0);
            expect(stakerInfo.active).to.be.false;
        });
    });

    describe("Rewards", function () {
        beforeEach(async function () {
            // Add rewards to pool
            await oracleStaking.addRewards({ value: ethers.parseEther("10.0") });
            
            // Stake
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("5.0") });
            await oracleStaking.connect(staker2).stake({ value: ethers.parseEther("3.0") });
        });

        it("Should accumulate rewards over time", async function () {
            await time.increase(3600); // 1 hour

            const pending = await oracleStaking.pendingRewards(staker1.address);
            expect(pending).to.be.gt(0);
        });

        it("Should allow claiming rewards", async function () {
            await time.increase(3600);

            const balanceBefore = await ethers.provider.getBalance(staker1.address);
            const tx = await oracleStaking.connect(staker1).claimRewards();
            const receipt = await tx.wait();
            const balanceAfter = await ethers.provider.getBalance(staker1.address);

            // Should have received rewards (minus gas)
            expect(balanceAfter).to.be.gt(balanceBefore - receipt.gasUsed * receipt.gasPrice);
        });

        it("Should distribute rewards proportionally", async function () {
            await time.increase(3600);

            const pending1 = await oracleStaking.pendingRewards(staker1.address);
            const pending2 = await oracleStaking.pendingRewards(staker2.address);

            // Staker1 has 5/8 of stake, staker2 has 3/8
            // Ratio should be approximately 5:3
            const ratio = Number(pending1) / Number(pending2);
            expect(ratio).to.be.closeTo(5/3, 0.1);
        });
    });

    describe("Reputation Tracking", function () {
        beforeEach(async function () {
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("1.0") });
        });

        it("Should record accurate answers", async function () {
            await oracleStaking.recordAnswer(staker1.address, true);
            await oracleStaking.recordAnswer(staker1.address, true);
            await oracleStaking.recordAnswer(staker1.address, false);

            const stakerInfo = await oracleStaking.getStaker(staker1.address);
            expect(stakerInfo.totalAnswers).to.equal(3);
            expect(stakerInfo.accurateAnswers).to.equal(2);
        });

        it("Should calculate reputation score", async function () {
            // Record 80% accurate answers
            for (let i = 0; i < 8; i++) {
                await oracleStaking.recordAnswer(staker1.address, true);
            }
            for (let i = 0; i < 2; i++) {
                await oracleStaking.recordAnswer(staker1.address, false);
            }

            const stakerInfo = await oracleStaking.getStaker(staker1.address);
            // 80% accuracy = 800 base score + 10 volume bonus = 810
            expect(stakerInfo.reputationScore).to.equal(810);
        });
    });

    describe("Stake Weight", function () {
        beforeEach(async function () {
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("10.0") });
            await oracleStaking.connect(staker2).stake({ value: ethers.parseEther("5.0") });

            // Give staker1 perfect reputation
            for (let i = 0; i < 10; i++) {
                await oracleStaking.recordAnswer(staker1.address, true);
            }
        });

        it("Should calculate weight from stake and reputation", async function () {
            const weight1 = await oracleStaking.getStakeWeight(staker1.address);
            const weight2 = await oracleStaking.getStakeWeight(staker2.address);

            // Staker1 should have higher weight (more stake + better reputation)
            expect(weight1).to.be.gt(weight2);
        });
    });

    describe("Active Stakers", function () {
        it("Should track active stakers", async function () {
            await oracleStaking.connect(staker1).stake({ value: ethers.parseEther("1.0") });
            await oracleStaking.connect(staker2).stake({ value: ethers.parseEther("1.0") });
            await oracleStaking.connect(staker3).stake({ value: ethers.parseEther("1.0") });

            const activeStakers = await oracleStaking.getActiveStakers();
            expect(activeStakers.length).to.equal(3);
            expect(activeStakers).to.include(staker1.address);
            expect(activeStakers).to.include(staker2.address);
            expect(activeStakers).to.include(staker3.address);
        });
    });
});
