const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("\n🧪 MAINNET TEST: Asking a Question (costs 0.01 BNB)\n");

  const oracleAddress = process.env.SORA_ORACLE_ADDRESS || "0x5058AC254e560E54BfcabBe1bde4375E7C914d35";
  const [signer] = await hre.ethers.getSigners();

  console.log("Oracle Address:", oracleAddress);
  console.log("Requester:", signer.address);

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(oracleAddress);

  // Get current state
  const questionCounter = await oracle.questionCounter();
  const oracleFee = await oracle.oracleFee();
  
  console.log("Current Question Counter:", questionCounter.toString());
  console.log("Oracle Fee:", hre.ethers.formatEther(oracleFee), "BNB");

  // Ask a simple test question
  const testQuestion = "Mainnet deployment test - What is 2+2?";
  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  console.log("\n📝 Asking question:", testQuestion);
  console.log("Deadline:", new Date(deadline * 1000).toISOString());
  console.log("Fee:", hre.ethers.formatEther(oracleFee), "BNB");

  try {
    const tx = await oracle.askOracle(testQuestion, deadline, {
      value: oracleFee
    });

    console.log("\n⏳ Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Get the question ID from event
    const questionEvent = receipt.logs.find(
      log => {
        try {
          const parsed = oracle.interface.parseLog(log);
          return parsed && parsed.name === 'QuestionAsked';
        } catch {
          return false;
        }
      }
    );

    if (questionEvent) {
      const parsed = oracle.interface.parseLog(questionEvent);
      const questionId = parsed.args.questionId;
      
      console.log("\n✅ Question Asked Successfully!");
      console.log("Question ID:", questionId.toString());
      console.log("Gas Used:", receipt.gasUsed.toString());
      console.log("Transaction Fee:", hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "BNB");

      // Verify question was stored
      const question = await oracle.questions(questionId);
      console.log("\n📋 Stored Question Details:");
      console.log("   Requester:", question.requester);
      console.log("   Bounty:", hre.ethers.formatEther(question.bounty), "BNB");
      console.log("   Status:", question.status); // 0 = PENDING
      console.log("   Refunded:", question.refunded);

      console.log("\n🎯 Next Step: Answer this question");
      console.log(`   Edit scripts/sora-answer.js and set questionId to ${questionId}`);
      console.log("   Then run: npm run mainnet:answer");
      
      return questionId;
    } else {
      console.log("⚠️  Question asked but couldn't find event");
    }

  } catch (error) {
    console.error("\n❌ Error asking question:");
    console.error(error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then((questionId) => {
    console.log("\n✅ Test question submitted successfully!");
    console.log(`Question ID: ${questionId ? questionId.toString() : 'unknown'}\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
