const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];
const QUESTION_ID = process.argv[3];
const ANSWER = process.argv[4];

async function main() {
  if (!ORACLE_ADDRESS || !QUESTION_ID || !ANSWER) {
    console.log("Usage: node scripts/answer.js <ORACLE_CONTRACT_ADDRESS> <QUESTION_ID> <ANSWER>");
    process.exit(1);
  }

  console.log("Providing answer to question #" + QUESTION_ID + "...\n");

  const [provider] = await hre.ethers.getSigners();
  console.log("Using account:", provider.address);

  const ImprovedOracle = await hre.ethers.getContractFactory("ImprovedOracle");
  const oracle = ImprovedOracle.attach(ORACLE_ADDRESS);

  const oracleProviderAddress = await oracle.oracleProvider();
  
  if (provider.address.toLowerCase() !== oracleProviderAddress.toLowerCase()) {
    console.log("⚠️  Warning: Your address does not match the oracle provider address!");
    console.log("Your address:", provider.address);
    console.log("Oracle provider:", oracleProviderAddress);
    console.log("This transaction will fail.\n");
  }

  const questionData = await oracle.getQuestion(QUESTION_ID);
  console.log("Question:", questionData.question);
  console.log("Bounty:", hre.ethers.formatEther(questionData.bounty), "BNB");
  console.log("Already answered:", questionData.answered, "\n");

  if (questionData.answered) {
    console.log("❌ This question has already been answered:", questionData.answer);
    process.exit(1);
  }

  console.log("Submitting answer:", ANSWER);
  const tx = await oracle.provideAnswer(QUESTION_ID, ANSWER);
  console.log("Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  const updatedQuestion = await oracle.getQuestion(QUESTION_ID);
  console.log("\n✅ Answer provided successfully!");
  console.log("Answer:", updatedQuestion.answer);

  const providerBalance = await oracle.providerBalance();
  console.log("\nOracle provider balance:", hre.ethers.formatEther(providerBalance), "BNB");
  console.log("💡 To withdraw, run: node scripts/withdraw.js", ORACLE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
