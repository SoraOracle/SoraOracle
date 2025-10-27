const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];
const QUESTION_ID = process.argv[3];

async function main() {
  if (!ORACLE_ADDRESS || !QUESTION_ID) {
    console.log("Usage: node scripts/sora-answer.js <ORACLE_ADDRESS> <QUESTION_ID>");
    console.log("\nExample answers:");
    console.log("  General: node scripts/sora-answer.js 0x... 0 general");
    console.log("  Price:   node scripts/sora-answer.js 0x... 1 price");
    console.log("  Yes/No:  node scripts/sora-answer.js 0x... 2 yesno");
    process.exit(1);
  }

  const answerType = process.argv[4] || "general";

  console.log("🤖 Sora Oracle - Provide Answers\n");

  const [provider] = await hre.ethers.getSigners();
  console.log("Using account:", provider.address);

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(ORACLE_ADDRESS);

  const oracleProvider = await oracle.oracleProvider();
  if (provider.address.toLowerCase() !== oracleProvider.toLowerCase()) {
    console.log("\n⚠️  WARNING: You are not the oracle provider!");
    console.log("Your address:", provider.address);
    console.log("Oracle provider:", oracleProvider);
    console.log("This transaction will fail.\n");
  }

  // Get question details
  const {question, answer} = await oracle.getQuestionWithAnswer(QUESTION_ID);
  
  console.log("\n📋 Question Details:");
  console.log("Type:", ["GENERAL", "PRICE", "YESNO", "NUMERIC"][question.questionType]);
  console.log("Question:", question.question);
  console.log("Bounty:", hre.ethers.formatEther(question.bounty), "BNB");
  console.log("Status:", ["PENDING", "ANSWERED", "DISPUTED", "FINALIZED"][question.status]);
  console.log("Deadline:", new Date(Number(question.deadline) * 1000).toLocaleString());

  if (question.status !== 0) {
    console.log("\n❌ Question already answered or not pending");
    console.log("Current answer:", answer.textAnswer);
    process.exit(1);
  }

  console.log("\n🔍 Providing answer...");

  let textAnswer = "";
  let numericAnswer = 0;
  let boolAnswer = false;
  let confidenceScore = 85;
  let dataSource = "";

  // Different answer examples based on type
  if (answerType === "price") {
    textAnswer = "BNB is currently trading at $650.50 BUSD";
    numericAnswer = 650_500_000; // Price in wei-like format (with 6 decimals)
    dataSource = "TWAP-PancakeSwap";
    confidenceScore = 95;
  } else if (answerType === "yesno") {
    textAnswer = "No - BNB is unlikely to exceed $700 in the next 24 hours based on current market conditions";
    boolAnswer = false;
    dataSource = "Market-Analysis";
    confidenceScore = 80;
  } else {
    textAnswer = "Market sentiment for BNB is cautiously bullish with strong support at $600";
    dataSource = "Manual-Research";
    confidenceScore = 75;
  }

  console.log("Answer:", textAnswer);
  console.log("Numeric:", numericAnswer);
  console.log("Bool:", boolAnswer);
  console.log("Confidence:", confidenceScore + "%");
  console.log("Source:", dataSource);

  const tx = await oracle.provideAnswer(
    QUESTION_ID,
    textAnswer,
    numericAnswer,
    boolAnswer,
    confidenceScore,
    dataSource
  );

  console.log("\nTransaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Answer provided in block:", receipt.blockNumber);

  // Check provider balance
  const providerBalance = await oracle.providerBalance();
  console.log("\n💰 Oracle Provider Balance:", hre.ethers.formatEther(providerBalance), "BNB");
  console.log("💡 To withdraw: node scripts/sora-withdraw.js", ORACLE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
