const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];

async function main() {
  if (!ORACLE_ADDRESS) {
    console.log("Usage: node scripts/withdraw.js <ORACLE_CONTRACT_ADDRESS>");
    process.exit(1);
  }

  console.log("Withdrawing funds from oracle...\n");

  const [provider] = await hre.ethers.getSigners();
  console.log("Using account:", provider.address);

  const ImprovedOracle = await hre.ethers.getContractFactory("ImprovedOracle");
  const oracle = ImprovedOracle.attach(ORACLE_ADDRESS);

  const oracleProviderAddress = await oracle.oracleProvider();
  
  if (provider.address.toLowerCase() !== oracleProviderAddress.toLowerCase()) {
    console.log("❌ Error: Your address does not match the oracle provider address!");
    console.log("Your address:", provider.address);
    console.log("Oracle provider:", oracleProviderAddress);
    process.exit(1);
  }

  const providerBalance = await oracle.providerBalance();
  console.log("Oracle provider balance:", hre.ethers.formatEther(providerBalance), "BNB");

  if (providerBalance === 0n) {
    console.log("\n⚠️  No balance to withdraw.");
    process.exit(0);
  }

  const balanceBefore = await hre.ethers.provider.getBalance(provider.address);
  console.log("Wallet balance before:", hre.ethers.formatEther(balanceBefore), "BNB\n");

  console.log("Withdrawing...");
  const tx = await oracle.withdraw();
  console.log("Transaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  const balanceAfter = await hre.ethers.provider.getBalance(provider.address);
  console.log("\n✅ Withdrawal successful!");
  console.log("Wallet balance after:", hre.ethers.formatEther(balanceAfter), "BNB");
  console.log("Received:", hre.ethers.formatEther(providerBalance), "BNB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
