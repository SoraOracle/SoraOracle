const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];

async function main() {
  if (!ORACLE_ADDRESS) {
    console.log("Usage: node scripts/interact.js <ORACLE_CONTRACT_ADDRESS>");
    process.exit(1);
  }

  console.log("Interacting with ImprovedOracle at:", ORACLE_ADDRESS, "\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Using account:", user.address);

  const balance = await hre.ethers.provider.getBalance(user.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  const ImprovedOracle = await hre.ethers.getContractFactory("ImprovedOracle");
  const oracle = ImprovedOracle.attach(ORACLE_ADDRESS);

  console.log("Getting contract info...");
  const minimumBounty = await oracle.minimumBounty();
  const totalQuestions = await oracle.getTotalQuestions();
  const oracleProvider = await oracle.oracleProvider();

  console.log("Minimum Bounty:", hre.ethers.formatEther(minimumBounty), "BNB");
  console.log("Total Questions:", totalQuestions.toString());
  console.log("Oracle Provider:", oracleProvider);

  console.log("\n=== Example: Asking a Question ===");
  console.log("Submitting question with 0.01 BNB bounty...");
  
  const question = "What is the current price of BNB in USD?";
  const tx = await oracle.askOracle(question, {
    value: hre.ethers.parseEther("0.01")
  });

  console.log("Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  const newQuestionId = totalQuestions;
  console.log("\n✅ Question submitted! Question ID:", newQuestionId.toString());

  const questionData = await oracle.getQuestion(newQuestionId);
  console.log("\nQuestion Details:");
  console.log("- Requester:", questionData.requester);
  console.log("- Question:", questionData.question);
  console.log("- Bounty:", hre.ethers.formatEther(questionData.bounty), "BNB");
  console.log("- Timestamp:", new Date(Number(questionData.timestamp) * 1000).toLocaleString());
  console.log("- Answered:", questionData.answered);

  console.log("\n💡 To provide an answer (as oracle provider), use:");
  console.log("   await oracle.provideAnswer(" + newQuestionId + ", 'Your answer here')");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
