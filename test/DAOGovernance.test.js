const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DAOGovernance", function () {
    let daoGovernance;
    let owner, voter1, voter2, voter3, proposer;

    beforeEach(async function () {
        [owner, voter1, voter2, voter3, proposer] = await ethers.getSigners();

        const DAOGovernance = await ethers.getContractFactory("DAOGovernance");
        daoGovernance = await DAOGovernance.deploy();
        await daoGovernance.waitForDeployment();

        // Give voting power to voters
        await daoGovernance.updateVotingPower(proposer.address, ethers.parseEther("150"));
        await daoGovernance.updateVotingPower(voter1.address, ethers.parseEther("500"));
        await daoGovernance.updateVotingPower(voter2.address, ethers.parseEther("400"));
        await daoGovernance.updateVotingPower(voter3.address, ethers.parseEther("300"));
    });

    describe("Proposal Creation", function () {
        it("Should create proposal with sufficient voting power", async function () {
            const proposalId = await daoGovernance.connect(proposer).createProposal.staticCall(
                0, // FEE_CHANGE
                "Reduce oracle fee to 0.005 BNB",
                "Lower barrier to entry for oracle usage",
                "0x"
            );

            await daoGovernance.connect(proposer).createProposal(
                0,
                "Reduce oracle fee to 0.005 BNB",
                "Lower barrier to entry for oracle usage",
                "0x"
            );

            const proposal = await daoGovernance.getProposal(proposalId);
            expect(proposal.title).to.equal("Reduce oracle fee to 0.005 BNB");
            expect(proposal.proposer).to.equal(proposer.address);
            expect(proposal.status).to.equal(1); // ACTIVE
        });

        it("Should reject proposal with insufficient voting power", async function () {
            const [, , , , , , nopower] = await ethers.getSigners();
            
            await expect(
                daoGovernance.connect(nopower).createProposal(
                    0,
                    "Test",
                    "Test proposal",
                    "0x"
                )
            ).to.be.revertedWith("Insufficient voting power");
        });
    });

    describe("Voting", function () {
        let proposalId;

        beforeEach(async function () {
            proposalId = await daoGovernance.connect(proposer).createProposal.staticCall(
                1, // PARAMETER_CHANGE
                "Increase minimum stake",
                "Increase minimum stake to 1 BNB",
                "0x"
            );

            await daoGovernance.connect(proposer).createProposal(
                1,
                "Increase minimum stake",
                "Increase minimum stake to 1 BNB",
                "0x"
            );
        });

        it("Should allow voting on active proposal", async function () {
            await daoGovernance.connect(voter1).castVote(proposalId, true);

            const vote = await daoGovernance.getVote(proposalId, voter1.address);
            expect(vote.hasVoted).to.be.true;
            expect(vote.support).to.be.true;
            expect(vote.votePower).to.equal(ethers.parseEther("500"));
        });

        it("Should count votes correctly", async function () {
            await daoGovernance.connect(voter1).castVote(proposalId, true); // 500 for
            await daoGovernance.connect(voter2).castVote(proposalId, true); // 400 for
            await daoGovernance.connect(voter3).castVote(proposalId, false); // 300 against

            const proposal = await daoGovernance.getProposal(proposalId);
            expect(proposal.forVotes).to.equal(ethers.parseEther("900"));
            expect(proposal.againstVotes).to.equal(ethers.parseEther("300"));
        });

        it("Should reject duplicate voting", async function () {
            await daoGovernance.connect(voter1).castVote(proposalId, true);

            await expect(
                daoGovernance.connect(voter1).castVote(proposalId, false)
            ).to.be.revertedWith("Already voted");
        });

        it("Should reject voting with no power", async function () {
            const [, , , , , nopower] = await ethers.getSigners();

            await expect(
                daoGovernance.connect(nopower).castVote(proposalId, true)
            ).to.be.revertedWith("No voting power");
        });
    });

    describe("Proposal Finalization", function () {
        let proposalId;

        beforeEach(async function () {
            proposalId = await daoGovernance.connect(proposer).createProposal.staticCall(
                0,
                "Test Proposal",
                "Test",
                "0x"
            );

            await daoGovernance.connect(proposer).createProposal(
                0,
                "Test Proposal",
                "Test",
                "0x"
            );
        });

        it("Should pass proposal with majority support", async function () {
            // 900 for, 300 against = 75% support (exceeds 60% threshold)
            await daoGovernance.connect(voter1).castVote(proposalId, true);
            await daoGovernance.connect(voter2).castVote(proposalId, true);
            await daoGovernance.connect(voter3).castVote(proposalId, false);

            await time.increase(3 * 24 * 3600 + 1); // Advance past voting period

            await daoGovernance.finalizeProposal(proposalId);

            const proposal = await daoGovernance.getProposal(proposalId);
            expect(proposal.status).to.equal(2); // PASSED
        });

        it("Should fail proposal without majority", async function () {
            // 500 for, 700 against = 41.7% support (below 60% threshold)
            await daoGovernance.connect(voter1).castVote(proposalId, true);
            await daoGovernance.connect(voter2).castVote(proposalId, false);
            await daoGovernance.connect(voter3).castVote(proposalId, false);

            await time.increase(3 * 24 * 3600 + 1);

            await daoGovernance.finalizeProposal(proposalId);

            const proposal = await daoGovernance.getProposal(proposalId);
            expect(proposal.status).to.equal(3); // FAILED
        });

        it("Should fail proposal without quorum", async function () {
            // Only 500 votes (below 1000 BNB quorum)
            await daoGovernance.connect(voter1).castVote(proposalId, true);

            await time.increase(3 * 24 * 3600 + 1);

            await daoGovernance.finalizeProposal(proposalId);

            const proposal = await daoGovernance.getProposal(proposalId);
            expect(proposal.status).to.equal(3); // FAILED
        });

        it("Should reject early finalization", async function () {
            await daoGovernance.connect(voter1).castVote(proposalId, true);

            await expect(
                daoGovernance.finalizeProposal(proposalId)
            ).to.be.revertedWith("Voting not ended");
        });
    });

    describe("Proposal Execution", function () {
        it("Should execute passed proposal", async function () {
            const proposalId = await daoGovernance.connect(proposer).createProposal.staticCall(
                0,
                "Test",
                "Test",
                "0x"
            );

            await daoGovernance.connect(proposer).createProposal(0, "Test", "Test", "0x");

            await daoGovernance.connect(voter1).castVote(proposalId, true); // 500
            await daoGovernance.connect(voter2).castVote(proposalId, true); // 400
            await daoGovernance.connect(voter3).castVote(proposalId, true); // 300 = 1200 total (meets quorum)

            await time.increase(3 * 24 * 3600 + 1);
            await daoGovernance.finalizeProposal(proposalId);

            await daoGovernance.executeProposal(proposalId);

            const proposal = await daoGovernance.getProposal(proposalId);
            expect(proposal.status).to.equal(4); // EXECUTED
        });
    });

    describe("Active Proposals", function () {
        it("Should return active proposals", async function () {
            await daoGovernance.connect(proposer).createProposal(0, "Proposal 1", "Test 1", "0x");
            await daoGovernance.connect(proposer).createProposal(0, "Proposal 2", "Test 2", "0x");

            const active = await daoGovernance.getActiveProposals();
            expect(active.length).to.equal(2);
        });
    });
});
