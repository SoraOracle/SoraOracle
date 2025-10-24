const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];

async function main() {
  if (!ORACLE_ADDRESS) {
    console.log("Usage: node scripts/sora-withdraw.js <ORACLE_ADDRESS>");
    process.exit(1);
  }

  console.log("💰 Sora Oracle - Withdraw Earnings\n");

  const [provider] = await hre.ethers.getSigners();
  console.log("Using account:", provider.address);

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(ORACLE_ADDRESS);

  const oracleProvider = await oracle.oracleProvider();
  
  if (provider.address.toLowerCase() !== oracleProvider.toLowerCase()) {
    console.log("\n❌ Error: You are not the oracle provider!");
    console.log("Your address:", provider.address);
    console.log("Oracle provider:", oracleProvider);
    process.exit(1);
  }

  const providerBalance = await oracle.providerBalance();
  console.log("Oracle balance:", hre.ethers.formatEther(providerBalance), "BNB");

  if (providerBalance === 0n) {
    console.log("\n⚠️  No balance to withdraw.");
    process.exit(0);
  }

  const walletBefore = await hre.ethers.provider.getBalance(provider.address);
  console.log("Wallet before:", hre.ethers.formatEther(walletBefore), "BNB\n");

  console.log("Withdrawing...");
  const tx = await oracle.withdraw();
  console.log("Transaction:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ Withdrawal confirmed in block:", receipt.blockNumber);

  const walletAfter = await hre.ethers.provider.getBalance(provider.address);
  console.log("\n💸 Wallet after:", hre.ethers.formatEther(walletAfter), "BNB");
  console.log("Received:", hre.ethers.formatEther(providerBalance), "BNB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
