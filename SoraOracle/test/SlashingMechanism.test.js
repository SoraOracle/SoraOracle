const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SlashingMechanism", function () {
    let slashingMechanism, oracleStaking;
    let owner, provider, accuser, voter1, voter2, voter3;

    beforeEach(async function () {
        [owner, provider, accuser, voter1, voter2, voter3] = await ethers.getSigners();

        // Deploy OracleStaking
        const OracleStaking = await ethers.getContractFactory("OracleStaking");
        oracleStaking = await OracleStaking.deploy();
        await oracleStaking.waitForDeployment();

        // Deploy SlashingMechanism
        const SlashingMechanism = await ethers.getContractFactory("SlashingMechanism");
        slashingMechanism = await SlashingMechanism.deploy(await oracleStaking.getAddress());
        await slashingMechanism.waitForDeployment();

        // Stake as provider
        await oracleStaking.connect(provider).stake({ value: ethers.parseEther("10.0") });

        // Stake as voters (need 1 BNB to vote)
        await oracleStaking.connect(voter1).stake({ value: ethers.parseEther("1.0") });
        await oracleStaking.connect(voter2).stake({ value: ethers.parseEther("1.0") });
        await oracleStaking.connect(voter3).stake({ value: ethers.parseEther("1.0") });
    });

    describe("Dispute Raising", function () {
        it("Should raise dispute against provider", async function () {
            const disputeFee = ethers.parseEther("0.01");

            const disputeId = await slashingMechanism.connect(accuser).raiseDispute.staticCall(
                provider.address,
                0, // WRONG_ANSWER
                1,
                "Provider gave incorrect answer for question 1",
                { value: disputeFee }
            );

            await slashingMechanism.connect(accuser).raiseDispute(
                provider.address,
                0,
                1,
                "Provider gave incorrect answer for question 1",
                { value: disputeFee }
            );

            const dispute = await slashingMechanism.getDispute(disputeId);
            expect(dispute.accused).to.equal(provider.address);
            expect(dispute.accuser).to.equal(accuser.address);
            expect(dispute.status).to.equal(0); // PENDING
        });

        it("Should reject dispute without fee", async function () {
            await expect(
                slashingMechanism.connect(accuser).raiseDispute(
                    provider.address,
                    0,
                    1,
                    "Evidence",
                    { value: ethers.parseEther("0.001") }
                )
            ).to.be.revertedWith("Insufficient dispute fee");
        });

        it("Should reject dispute against non-staker", async function () {
            const [, , , , , , nonStaker] = await ethers.getSigners();

            await expect(
                slashingMechanism.connect(accuser).raiseDispute(
                    nonStaker.address,
                    0,
                    1,
                    "Evidence",
                    { value: ethers.parseEther("0.01") }
                )
            ).to.be.revertedWith("Not a staker");
        });
    });

    describe("Voting on Disputes", function () {
        let disputeId;

        beforeEach(async function () {
            disputeId = await slashingMechanism.connect(accuser).raiseDispute.staticCall(
                provider.address,
                0,
                1,
                "Wrong answer",
                { value: ethers.parseEther("0.01") }
            );

            await slashingMechanism.connect(accuser).raiseDispute(
                provider.address,
                0,
                1,
                "Wrong answer",
                { value: ethers.parseEther("0.01") }
            );
        });

        it("Should vote guilty", async function () {
            await slashingMechanism.connect(voter1).voteOnDispute(disputeId, true);

            const dispute = await slashingMechanism.getDispute(disputeId);
            expect(dispute.votes).to.equal(1);
            expect(dispute.status).to.equal(1); // INVESTIGATING
        });

        it("Should reject vote without stake", async function () {
            const [, , , , , , , noStake] = await ethers.getSigners();

            await expect(
                slashingMechanism.connect(noStake).voteOnDispute(disputeId, true)
            ).to.be.revertedWith("Insufficient stake to vote");
        });

        it("Should execute slash after required votes", async function () {
            await slashingMechanism.connect(voter1).voteOnDispute(disputeId, true);
            await slashingMechanism.connect(voter2).voteOnDispute(disputeId, true);
            await slashingMechanism.connect(voter3).voteOnDispute(disputeId, true);

            const dispute = await slashingMechanism.getDispute(disputeId);
            expect(dispute.status).to.equal(2); // PROVEN
        });
    });

    describe("Slashing Records", function () {
        it("Should track slashing history", async function () {
            const disputeId = await slashingMechanism.connect(accuser).raiseDispute.staticCall(
                provider.address,
                0,
                1,
                "Wrong answer",
                { value: ethers.parseEther("0.01") }
            );

            await slashingMechanism.connect(accuser).raiseDispute(
                provider.address,
                0,
                1,
                "Wrong answer",
                { value: ethers.parseEther("0.01") }
            );

            await slashingMechanism.connect(voter1).voteOnDispute(disputeId, true);
            await slashingMechanism.connect(voter2).voteOnDispute(disputeId, true);
            await slashingMechanism.connect(voter3).voteOnDispute(disputeId, true);

            const history = await slashingMechanism.getSlashingHistory(provider.address);
            expect(history.length).to.equal(1);
        });

        it("Should track total slashed", async function () {
            const disputeId = await slashingMechanism.connect(accuser).raiseDispute.staticCall(
                provider.address,
                2, // MANIPULATION
                1,
                "Manipulation detected",
                { value: ethers.parseEther("0.01") }
            );

            await slashingMechanism.connect(accuser).raiseDispute(
                provider.address,
                2,
                1,
                "Manipulation detected",
                { value: ethers.parseEther("0.01") }
            );

            await slashingMechanism.connect(voter1).voteOnDispute(disputeId, true);
            await slashingMechanism.connect(voter2).voteOnDispute(disputeId, true);
            await slashingMechanism.connect(voter3).voteOnDispute(disputeId, true);

            const totalSlashed = await slashingMechanism.totalSlashed(provider.address);
            expect(totalSlashed).to.be.gt(0);
        });
    });

    describe("Pending Disputes", function () {
        it("Should get pending disputes", async function () {
            await slashingMechanism.connect(accuser).raiseDispute(
                provider.address,
                0,
                1,
                "Evidence 1",
                { value: ethers.parseEther("0.01") }
            );

            await slashingMechanism.connect(accuser).raiseDispute(
                provider.address,
                1,
                2,
                "Evidence 2",
                { value: ethers.parseEther("0.01") }
            );

            const pending = await slashingMechanism.getPendingDisputes();
            expect(pending.length).to.equal(2);
        });
    });
});
