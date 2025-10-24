const hre = require("hardhat");
require("dotenv").config();

const BATCH_OPERATIONS_ADDRESS = process.argv[2];
const QUESTION_IDS = process.argv[3];

async function main() {
  if (!BATCH_OPERATIONS_ADDRESS || !QUESTION_IDS) {
    console.log("Usage: node scripts/check-batch-status.js <BATCH_OPS_ADDRESS> <QUESTION_IDS>");
    console.log("Example: node scripts/check-batch-status.js 0x... 0,1,2,3,4");
    process.exit(1);
  }

  console.log("🔍 Checking Batch Question Status\n");

  const questionIds = QUESTION_IDS.split(",").map(id => parseInt(id.trim()));
  console.log("Checking", questionIds.length, "questions:", questionIds.join(", "), "\n");

  const BatchOps = await hre.ethers.getContractFactory("BatchOracleOperations");
  const batchOps = BatchOps.attach(BATCH_OPERATIONS_ADDRESS);

  const oracleAddress = await batchOps.oracle();
  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(oracleAddress);

  // Check batch status
  const statusResult = await batchOps.checkBatchStatus(questionIds);
  const allAnswered = statusResult[0];
  const answeredCount = statusResult[1];

  console.log("═".repeat(70));
  console.log(" BATCH STATUS");
  console.log("═".repeat(70));
  console.log("Total Questions:", questionIds.length);
  console.log("Answered:", answeredCount.toString());
  console.log("Pending:", questionIds.length - Number(answeredCount));
  console.log("All Answered:", allAnswered ? "✅ Yes" : "❌ No");

  // Show details for each question
  console.log("\n" + "═".repeat(70));
  console.log(" INDIVIDUAL QUESTION STATUS");
  console.log("═".repeat(70));

  for (const questionId of questionIds) {
    try {
      const result = await oracle.getQuestionWithAnswer(questionId);
      const question = result[0];
      const answer = result[1];

      console.log(`\nQuestion #${questionId}`);
      console.log("─".repeat(70));
      console.log("Type:", ["GENERAL", "PRICE", "YESNO", "NUMERIC"][question.questionType]);
      console.log("Question:", question.question);
      console.log("Requester:", question.requester);
      console.log("Bounty:", hre.ethers.formatEther(question.bounty), "BNB");
      console.log("Asked:", new Date(Number(question.timestamp) * 1000).toLocaleString());
      console.log("Deadline:", new Date(Number(question.deadline) * 1000).toLocaleString());
      console.log("Status:", ["PENDING", "ANSWERED", "DISPUTED", "FINALIZED"][question.status]);

      if (answer.provider !== hre.ethers.ZeroAddress) {
        console.log("\n✅ ANSWERED");
        console.log("Provider:", answer.provider);
        console.log("Text Answer:", answer.textAnswer);
        console.log("Numeric Answer:", answer.numericAnswer.toString());
        console.log("Boolean Answer:", answer.boolAnswer);
        console.log("Confidence Score:", answer.confidenceScore + "%");
        console.log("Data Source:", answer.dataSource);
        console.log("Answered At:", new Date(Number(answer.timestamp) * 1000).toLocaleString());
        
        const responseTime = Number(answer.timestamp) - Number(question.timestamp);
        const hours = Math.floor(responseTime / 3600);
        const minutes = Math.floor((responseTime % 3600) / 60);
        console.log("Response Time:", `${hours}h ${minutes}m`);
      } else {
        console.log("\n⏳ PENDING");
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = Number(question.deadline) - now;
        
        if (timeLeft > 0) {
          const daysLeft = Math.floor(timeLeft / 86400);
          const hoursLeft = Math.floor((timeLeft % 86400) / 3600);
          console.log("Time Until Deadline:", `${daysLeft}d ${hoursLeft}h`);
        } else {
          console.log("Status: ⚠️  Past deadline - refund available");
        }
      }
    } catch (error) {
      console.log(`\nQuestion #${questionId}: ❌ Error -`, error.message);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("✅ Batch status check complete");
  console.log("═".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
