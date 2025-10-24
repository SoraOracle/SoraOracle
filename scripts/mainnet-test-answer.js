const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("\n🧪 MAINNET TEST: Answering Question\n");

  const oracleAddress = process.env.SORA_ORACLE_ADDRESS || "0x5058AC254e560E54BfcabBe1bde4375E7C914d35";
  const [signer] = await hre.ethers.getSigners();

  console.log("Oracle Address:", oracleAddress);
  console.log("Provider:", signer.address);

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(oracleAddress);

  // Question ID from the previous step
  const questionId = 0;
  const textAnswer = "4"; // Answer to "What is 2+2?"
  const numericAnswer = 4;
  const confidenceScore = 100; // 100% confident!
  const dataSource = "Mathematical certainty";

  console.log("\n📝 Answering Question ID:", questionId);
  console.log("Answer:", textAnswer);
  console.log("Confidence:", confidenceScore + "%");

  // Check question exists
  const question = await oracle.questions(questionId);
  console.log("\n📋 Question Details:");
  console.log("   Requester:", question.requester);
  console.log("   Bounty:", hre.ethers.formatEther(question.bounty), "BNB");
  console.log("   Status:", question.status === 0n ? "PENDING" : "OTHER");

  if (question.status !== 0n) {
    console.log("⚠️  Question already answered or in non-pending state");
    return;
  }

  try {
    console.log("\n⏳ Submitting answer...");
    const tx = await oracle.provideAnswer(
      questionId,
      textAnswer,
      numericAnswer,
      false, // boolAnswer (not a yes/no question)
      confidenceScore,
      dataSource
    );

    console.log("Transaction:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Transaction Fee:", hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "BNB");

    // Verify answer was stored
    const answer = await oracle.answers(questionId);
    const updatedQuestion = await oracle.questions(questionId);
    
    console.log("\n✅ Answer Stored Successfully!");
    console.log("   Provider:", answer.provider);
    console.log("   Confidence Score:", answer.confidenceScore.toString() + "%");
    console.log("   Numeric Answer:", answer.numericAnswer.toString());
    console.log("   Question Status:", updatedQuestion.status === 1n ? "ANSWERED" : "OTHER");

    // Check provider balance
    const providerBalance = await oracle.providerBalance();
    console.log("\n💰 Provider Earnings:");
    console.log("   Accumulated Rewards:", hre.ethers.formatEther(providerBalance), "BNB");

    console.log("\n🎯 Next Step: Withdraw provider rewards");
    console.log("   Run: npm run mainnet:withdraw");

  } catch (error) {
    console.error("\n❌ Error answering question:");
    console.error(error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Test answer submitted successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
