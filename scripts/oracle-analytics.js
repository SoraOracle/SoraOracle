const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];

async function main() {
  if (!ORACLE_ADDRESS) {
    console.log("Usage: node scripts/oracle-analytics.js <ORACLE_ADDRESS>");
    process.exit(1);
  }

  console.log("📊 Sora Oracle Analytics Dashboard\n");
  console.log("Oracle Address:", ORACLE_ADDRESS, "\n");

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(ORACLE_ADDRESS);

  // Get contract configuration
  const oracleFee = await oracle.oracleFee();
  const oracleProvider = await oracle.oracleProvider();
  const providerBalance = await oracle.providerBalance();
  const questionCounter = await oracle.questionCounter();
  const refundPeriod = await oracle.REFUND_PERIOD();
  const isPaused = await oracle.paused();

  console.log("═".repeat(70));
  console.log(" CONTRACT CONFIGURATION");
  console.log("═".repeat(70));
  console.log("Oracle Fee:", hre.ethers.formatEther(oracleFee), "BNB");
  console.log("Oracle Provider:", oracleProvider);
  console.log("Provider Balance:", hre.ethers.formatEther(providerBalance), "BNB");
  console.log("Total Questions:", questionCounter.toString());
  console.log("Refund Period:", (Number(refundPeriod) / 86400).toFixed(0), "days");
  console.log("Contract Paused:", isPaused);

  // Analyze all questions
  const totalQuestions = Number(questionCounter);
  let pending = 0;
  let answered = 0;
  let refunded = 0;
  let totalBounties = BigInt(0);
  let totalEarnings = BigInt(0);
  const questionTypes = { GENERAL: 0, PRICE: 0, YESNO: 0, NUMERIC: 0 };
  
  console.log("\n" + "═".repeat(70));
  console.log(" QUESTION STATISTICS");
  console.log("═".repeat(70));
  console.log("Analyzing", totalQuestions, "questions...\n");

  for (let i = 0; i < totalQuestions; i++) {
    try {
      const question = await oracle.questions(i);
      const answer = await oracle.answers(i);

      totalBounties += question.bounty;

      // Count by type
      const typeNames = ["GENERAL", "PRICE", "YESNO", "NUMERIC"];
      questionTypes[typeNames[question.questionType]]++;

      // Count by status
      if (answer.provider !== hre.ethers.ZeroAddress) {
        answered++;
        totalEarnings += question.bounty;
      } else if (question.refunded) {
        refunded++;
      } else {
        pending++;
      }

      // Show progress every 10 questions
      if ((i + 1) % 10 === 0 || i === totalQuestions - 1) {
        process.stdout.write(`\rProcessed: ${i + 1}/${totalQuestions}`);
      }
    } catch (error) {
      console.error(`\nError processing question ${i}:`, error.message);
    }
  }

  console.log("\n");
  console.log("Question Types:");
  console.log("  General:", questionTypes.GENERAL);
  console.log("  Price:", questionTypes.PRICE);
  console.log("  Yes/No:", questionTypes.YESNO);
  console.log("  Numeric:", questionTypes.NUMERIC);

  console.log("\nQuestion Status:");
  console.log("  Pending:", pending);
  console.log("  Answered:", answered);
  console.log("  Refunded:", refunded);

  console.log("\nFinancial Summary:");
  console.log("  Total Bounties:", hre.ethers.formatEther(totalBounties), "BNB");
  console.log("  Total Earnings:", hre.ethers.formatEther(totalEarnings), "BNB");
  console.log("  Unclaimed (in contract):", hre.ethers.formatEther(providerBalance), "BNB");

  // Calculate metrics
  const answerRate = totalQuestions > 0 ? ((answered / totalQuestions) * 100).toFixed(2) : "0.00";
  const avgBounty = totalQuestions > 0 
    ? hre.ethers.formatEther(totalBounties / BigInt(totalQuestions)) 
    : "0.00";

  console.log("\nPerformance Metrics:");
  console.log("  Answer Rate:", answerRate + "%");
  console.log("  Average Bounty:", avgBounty, "BNB");
  console.log("  Questions per Day:", totalQuestions > 0 ? "N/A (need historical data)" : "0");

  // Get recent questions with details
  console.log("\n" + "═".repeat(70));
  console.log(" RECENT QUESTIONS (Last 5)");
  console.log("═".repeat(70));

  const recentCount = Math.min(5, totalQuestions);
  for (let i = totalQuestions - recentCount; i < totalQuestions; i++) {
    const question = await oracle.questions(i);
    const answer = await oracle.answers(i);
    const questionHash = await oracle.questionHashes(i);

    console.log(`\nQuestion #${i}`);
    console.log("  Type:", ["GENERAL", "PRICE", "YESNO", "NUMERIC"][question.questionType]);
    console.log("  Requester:", question.requester);
    console.log("  Bounty:", hre.ethers.formatEther(question.bounty), "BNB");
    console.log("  Timestamp:", new Date(Number(question.timestamp) * 1000).toLocaleString());
    console.log("  Deadline:", new Date(Number(question.deadline) * 1000).toLocaleString());
    console.log("  Status:", ["PENDING", "ANSWERED", "DISPUTED", "FINALIZED"][question.status]);
    
    if (answer.provider !== hre.ethers.ZeroAddress) {
      console.log("  Answer Provider:", answer.provider);
      console.log("  Confidence Score:", answer.confidenceScore + "%");
      console.log("  Boolean Answer:", answer.boolAnswer);
      console.log("  Numeric Answer:", answer.numericAnswer.toString());
    } else {
      console.log("  Answer: Pending");
    }
  }

  // Get TWAP oracle info
  console.log("\n" + "═".repeat(70));
  console.log(" TWAP ORACLES");
  console.log("═".repeat(70));

  const commonPairs = [
    { name: "WBNB/BUSD", address: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16" },
    { name: "WBNB/USDT", address: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE" },
    { name: "CAKE/WBNB", address: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0" }
  ];

  for (const pair of commonPairs) {
    const twapAddress = await oracle.twapOracles(pair.address);
    console.log(`\n${pair.name}:`);
    if (twapAddress !== hre.ethers.ZeroAddress) {
      console.log("  TWAP Oracle:", twapAddress);
      console.log("  Status: ✅ Active");
    } else {
      console.log("  Status: ❌ Not Deployed");
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("📊 Analytics Report Complete");
  console.log("═".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
