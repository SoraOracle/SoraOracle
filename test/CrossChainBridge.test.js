const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossChainBridge", function () {
    let crossChainBridge;
    let owner, relayer1, relayer2, user;

    beforeEach(async function () {
        [owner, relayer1, relayer2, user] = await ethers.getSigners();

        const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
        crossChainBridge = await CrossChainBridge.deploy();
        await crossChainBridge.waitForDeployment();
    });

    describe("Chain Configuration", function () {
        it("Should configure supported chain", async function () {
            const chainId = 1; // Ethereum
            const bridgeContract = "0x1234567890123456789012345678901234567890";
            const confirmations = 12;

            await crossChainBridge.configureChain(
                chainId,
                0, // ChainType.ETHEREUM
                bridgeContract,
                confirmations
            );

            const config = await crossChainBridge.chainConfigs(chainId);
            expect(config.active).to.be.true;
            expect(config.chainId).to.equal(chainId);
        });

        it("Should track supported chains", async function () {
            await crossChainBridge.configureChain(1, 0, "0x1234567890123456789012345678901234567890", 12);
            await crossChainBridge.configureChain(137, 1, "0x1234567890123456789012345678901234567891", 10);

            const supported = await crossChainBridge.getSupportedChains();
            expect(supported.length).to.equal(2);
        });
    });

    describe("Relayer Management", function () {
        it("Should add relayer", async function () {
            await crossChainBridge.addRelayer(relayer1.address);
            
            const isRelayer = await crossChainBridge.authorizedRelayers(relayer1.address);
            expect(isRelayer).to.be.true;
        });

        it("Should remove relayer", async function () {
            await crossChainBridge.addRelayer(relayer1.address);
            await crossChainBridge.removeRelayer(relayer1.address);

            const isRelayer = await crossChainBridge.authorizedRelayers(relayer1.address);
            expect(isRelayer).to.be.false;
        });
    });

    describe("Cross-Chain Messages", function () {
        beforeEach(async function () {
            await crossChainBridge.configureChain(1, 0, "0x1234567890123456789012345678901234567890", 12);
            await crossChainBridge.addRelayer(relayer1.address);
            await crossChainBridge.addRelayer(relayer2.address);
        });

        it("Should send cross-chain message", async function () {
            const targetChain = 1;
            const payload = ethers.id("test data");
            const relayFee = ethers.parseEther("0.005");

            const tx = await crossChainBridge.connect(user).sendCrossChainMessage(
                targetChain,
                payload,
                { value: relayFee }
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return crossChainBridge.interface.parseLog(log).name === 'MessageSent';
                } catch {
                    return false;
                }
            });
            const messageHash = crossChainBridge.interface.parseLog(event).args[0];

            const message = await crossChainBridge.getMessage(messageHash);
            expect(message[1]).to.equal(targetChain); // targetChainId is second element in tuple
            expect(message[4]).to.equal(0); // status is fifth element (PENDING)
        });

        it("Should verify message", async function () {
            const targetChain = 1;
            const payload = ethers.id("test data");
            const relayFee = ethers.parseEther("0.005");

            const messageHash = await crossChainBridge.connect(user).sendCrossChainMessage.staticCall(
                targetChain,
                payload,
                { value: relayFee }
            );

            await crossChainBridge.connect(user).sendCrossChainMessage(
                targetChain,
                payload,
                { value: relayFee }
            );

            await crossChainBridge.connect(relayer1).verifyMessage(messageHash);
            await crossChainBridge.connect(relayer2).verifyMessage(messageHash);

            const message = await crossChainBridge.getMessage(messageHash);
            expect(message.status).to.equal(1); // VERIFIED
        });

        it("Should get pending messages", async function () {
            const relayFee = ethers.parseEther("0.005");

            await crossChainBridge.connect(user).sendCrossChainMessage(
                1,
                ethers.id("test1"),
                { value: relayFee }
            );

            await crossChainBridge.connect(user).sendCrossChainMessage(
                1,
                ethers.id("test2"),
                { value: relayFee }
            );

            const pending = await crossChainBridge.getPendingMessages();
            expect(pending.length).to.equal(2);
        });
    });
});
