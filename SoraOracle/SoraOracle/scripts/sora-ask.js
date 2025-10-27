const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];

async function main() {
  if (!ORACLE_ADDRESS) {
    console.log("Usage: node scripts/sora-ask.js <ORACLE_CONTRACT_ADDRESS>");
    process.exit(1);
  }

  console.log("🔮 Sora Oracle - Ask Questions\n");
  console.log("Oracle Address:", ORACLE_ADDRESS, "\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Using account:", user.address);

  const balance = await hre.ethers.provider.getBalance(user.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(ORACLE_ADDRESS);

  // Get contract info
  const oracleFee = await oracle.oracleFee();
  const totalQuestions = await oracle.questionCounter();
  
  console.log("Oracle Fee:", hre.ethers.formatEther(oracleFee), "BNB");
  console.log("Total Questions:", totalQuestions.toString(), "\n");

  console.log("=".repeat(60));
  console.log("📝 Example Questions:");
  console.log("=".repeat(60));

  // Example 1: General Question
  console.log("\n1️⃣  General Question");
  const q1 = "What is the current market sentiment for BNB?";
  console.log("Question:", q1);
  const deadline1 = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  
  const tx1 = await oracle.askOracle(q1, deadline1, {
    value: oracleFee
  });
  console.log("Transaction:", tx1.hash);
  await tx1.wait();
  console.log("✅ Question ID:", totalQuestions.toString());

  // Example 2: Price Question
  console.log("\n2️⃣  Price Question (Can use TWAP)");
  const q2 = "What is the current BNB price in BUSD?";
  console.log("Question:", q2);
  const deadline2 = Math.floor(Date.now() / 1000) + (6 * 60 * 60); // 6 hours
  
  const tx2 = await oracle.askPriceQuestion(q2, deadline2, {
    value: oracleFee
  });
  console.log("Transaction:", tx2.hash);
  await tx2.wait();
  const questionId = totalQuestions + 1n;
  console.log("✅ Question ID:", questionId.toString());

  // Example 3: Yes/No Question
  console.log("\n3️⃣  Yes/No Question");
  const q3 = "Will BNB price exceed $700 in the next 24 hours?";
  console.log("Question:", q3);
  const deadline3 = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
  
  const tx3 = await oracle.askYesNoQuestion(q3, deadline3, {
    value: oracleFee
  });
  console.log("Transaction:", tx3.hash);
  await tx3.wait();
  console.log("✅ Question ID:", (totalQuestions + 2n).toString());

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Questions submitted successfully!");
  console.log("=".repeat(60));
  console.log("\n💡 Oracle provider will answer within the deadline");
  console.log("💡 Use scripts/sora-answer.js to provide answers");
  console.log("💡 View questions on BscScan:", `https://testnet.bscscan.com/address/${ORACLE_ADDRESS}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
