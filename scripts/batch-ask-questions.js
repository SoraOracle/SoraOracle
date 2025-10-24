const hre = require("hardhat");
require("dotenv").config();

const BATCH_OPERATIONS_ADDRESS = process.argv[2];

async function main() {
  if (!BATCH_OPERATIONS_ADDRESS) {
    console.log("Usage: node scripts/batch-ask-questions.js <BATCH_OPERATIONS_ADDRESS>");
    process.exit(1);
  }

  console.log("📦 Batch Oracle Operations - Ask Multiple Questions\n");
  console.log("Batch Operations Contract:", BATCH_OPERATIONS_ADDRESS, "\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Using account:", user.address);

  const balance = await hre.ethers.provider.getBalance(user.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  const BatchOps = await hre.ethers.getContractFactory("BatchOracleOperations");
  const batchOps = BatchOps.attach(BATCH_OPERATIONS_ADDRESS);

  const oracleAddress = await batchOps.oracle();
  console.log("Oracle Address:", oracleAddress, "\n");

  // Example batch questions
  const questions = [
    "What is the current BNB price in USD?",
    "Will BTC hit $100k by end of year?",
    "What is the total TVL in BSC DeFi?",
    "Is Ethereum gas price below 50 gwei?",
    "What is the current inflation rate?"
  ];

  const deadlines = questions.map(() => 
    Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
  );

  console.log("═".repeat(60));
  console.log("Questions to ask:");
  console.log("═".repeat(60));
  questions.forEach((q, i) => {
    console.log(`${i + 1}. ${q}`);
  });

  // Get total cost
  const totalCost = await batchOps.getBatchQuestionCost(questions.length);
  console.log("\n💰 Total Cost:", hre.ethers.formatEther(totalCost), "BNB");
  console.log("   (", hre.ethers.formatEther(totalCost / BigInt(questions.length)), "BNB per question )\n");

  console.log("Submitting batch...");
  
  const tx = await batchOps.batchAskGeneralQuestions(questions, deadlines, {
    value: totalCost
  });

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Batch questions submitted in block:", receipt.blockNumber);

  // Parse events to get question IDs
  const batchEvent = receipt.logs.find(log => {
    try {
      const parsed = batchOps.interface.parseLog(log);
      return parsed.name === "BatchQuestionsAsked";
    } catch {
      return false;
    }
  });

  if (batchEvent) {
    const parsed = batchOps.interface.parseLog(batchEvent);
    const questionIds = parsed.args.questionIds;

    console.log("\n📋 Created Question IDs:");
    questionIds.forEach((id, i) => {
      console.log(`  Question ${i + 1}: ID ${id.toString()}`);
    });

    console.log("\n💡 Check status with:");
    console.log(`   node scripts/check-batch-status.js ${BATCH_OPERATIONS_ADDRESS} ${questionIds.join(",")}`);
  }

  console.log("\n✅ Batch operation complete!");
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Gas saved vs individual:", "~30% (estimated)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
