const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Sora Oracle MVP", function () {
  let oracle, owner, provider, user1, user2;
  const ORACLE_FEE = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, provider, user1, user2] = await ethers.getSigners();

    const SoraOracle = await ethers.getContractFactory("SoraOracle");
    oracle = await SoraOracle.deploy(provider.address);
    await oracle.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct oracle provider", async function () {
      expect(await oracle.oracleProvider()).to.equal(provider.address);
    });

    it("Should set the correct oracle fee", async function () {
      expect(await oracle.oracleFee()).to.equal(ORACLE_FEE);
    });

    it("Should start with zero questions", async function () {
      expect(await oracle.questionCounter()).to.equal(0);
    });
  });

  describe("Asking Questions", function () {
    it("Should allow users to ask general questions", async function () {
      const question = "What is the market sentiment?";
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        oracle.connect(user1).askOracle(question, deadline, {
          value: ORACLE_FEE
        })
      ).to.emit(oracle, "QuestionAsked");

      // Verify question hash is stored correctly
      const questionHash = await oracle.questionHashes(0);
      const expectedHash = ethers.keccak256(ethers.toUtf8Bytes(question));
      expect(questionHash).to.equal(expectedHash);
    });

    it("Should allow users to ask price questions", async function () {
      const question = "What is BNB price?";
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await oracle.connect(user1).askPriceQuestion(question, deadline, {
        value: ORACLE_FEE
      });

      const { questionType } = await oracle.questions(0);
      expect(questionType).to.equal(1); // PRICE type
    });

    it("Should allow users to ask yes/no questions", async function () {
      const question = "Will BNB hit $1000?";
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await oracle.connect(user1).askYesNoQuestion(question, deadline, {
        value: ORACLE_FEE
      });

      const { questionType } = await oracle.questions(0);
      expect(questionType).to.equal(2); // YESNO type
    });

    it("Should reject questions with insufficient fee", async function () {
      const question = "Test question";
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        oracle.connect(user1).askOracle(question, deadline, {
          value: ethers.parseEther("0.005")
        })
      ).to.be.revertedWith("Insufficient fee");
    });

    it("Should reject questions with invalid deadline", async function () {
      const question = "Test question";
      const deadline = Math.floor(Date.now() / 1000) - 1000; // Past

      await expect(
        oracle.connect(user1).askOracle(question, deadline, {
          value: ORACLE_FEE
        })
      ).to.be.revertedWith("Invalid deadline");
    });
  });

  describe("Providing Answers", function () {
    beforeEach(async function () {
      const question = "Will BNB hit $1000?";
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await oracle.connect(user1).askYesNoQuestion(question, deadline, {
        value: ORACLE_FEE
      });
    });

    it("Should allow oracle provider to answer questions", async function () {
      await expect(
        oracle.connect(provider).provideAnswer(
          0,
          "No, unlikely in short term",
          0,
          false,
          85,
          "Market-Analysis"
        )
      ).to.emit(oracle, "AnswerProvided");

      const answer = await oracle.answers(0);
      expect(answer.confidenceScore).to.equal(85);
      expect(answer.boolAnswer).to.equal(false);
      // dataSource is emitted in event only (not stored on-chain for gas savings)
    });

    it("Should not allow non-provider to answer", async function () {
      await expect(
        oracle.connect(user1).provideAnswer(
          0,
          "Answer",
          0,
          false,
          85,
          "Source"
        )
      ).to.be.revertedWith("Only oracle provider");
    });

    it("Should update provider balance after answering", async function () {
      await oracle.connect(provider).provideAnswer(
        0,
        "Answer",
        0,
        false,
        85,
        "Source"
      );

      const balance = await oracle.providerBalance();
      expect(balance).to.equal(ORACLE_FEE);
    });

    it("Should reject invalid confidence scores", async function () {
      await expect(
        oracle.connect(provider).provideAnswer(
          0,
          "Answer",
          0,
          false,
          101, // > 100
          "Source"
        )
      ).to.be.revertedWith("Invalid confidence");
    });
  });

  describe("Refunds", function () {
    it("Should allow refunds after 7 days for unanswered questions", async function () {
      const question = "Test question";
      const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

      await oracle.connect(user1).askOracle(question, deadline, {
        value: ORACLE_FEE
      });

      // Fast forward 7 days
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      await oracle.connect(user1).refundUnansweredQuestion(0);
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not allow refunds before 7 days", async function () {
      const question = "Test question";
      const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

      await oracle.connect(user1).askOracle(question, deadline, {
        value: ORACLE_FEE
      });

      await expect(
        oracle.connect(user1).refundUnansweredQuestion(0)
      ).to.be.revertedWith("Too early");
    });

    it("Should not allow refunds for answered questions", async function () {
      const question = "Test question";
      const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

      await oracle.connect(user1).askOracle(question, deadline, {
        value: ORACLE_FEE
      });

      await oracle.connect(provider).provideAnswer(
        0,
        "Answer",
        0,
        false,
        85,
        "Source"
      );

      // Fast forward 7 days
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      await expect(
        oracle.connect(user1).refundUnansweredQuestion(0)
      ).to.be.revertedWith("Already answered");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      const question = "Test question";
      const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

      await oracle.connect(user1).askOracle(question, deadline, {
        value: ORACLE_FEE
      });

      await oracle.connect(provider).provideAnswer(
        0,
        "Answer",
        0,
        false,
        85,
        "Source"
      );
    });

    it("Should allow provider to withdraw earnings", async function () {
      const balanceBefore = await ethers.provider.getBalance(provider.address);
      
      await oracle.connect(provider).withdraw();
      
      const balanceAfter = await ethers.provider.getBalance(provider.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should not allow non-provider to withdraw", async function () {
      await expect(
        oracle.connect(user1).withdraw()
      ).to.be.revertedWith("Only oracle provider");
    });

    it("Should reset provider balance after withdrawal", async function () {
      await oracle.connect(provider).withdraw();
      const balance = await oracle.providerBalance();
      expect(balance).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update oracle fee", async function () {
      const newFee = ethers.parseEther("0.02");
      await oracle.connect(owner).setOracleFee(newFee);
      expect(await oracle.oracleFee()).to.equal(newFee);
    });

    it("Should allow owner to pause contract", async function () {
      await oracle.connect(owner).pause();
      
      const question = "Test";
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        oracle.connect(user1).askOracle(question, deadline, {
          value: ORACLE_FEE
        })
      ).to.be.reverted;
    });

    it("Should allow owner to unpause contract", async function () {
      await oracle.connect(owner).pause();
      await oracle.connect(owner).unpause();
      
      const question = "Test";
      const deadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

      await oracle.connect(user1).askOracle(question, deadline, {
        value: ORACLE_FEE
      });

      expect(await oracle.questionCounter()).to.equal(1);
    });
  });
});
