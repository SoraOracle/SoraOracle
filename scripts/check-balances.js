const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const oracleAddress = "0x5058AC254e560E54BfcabBe1bde4375E7C914d35";
  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(oracleAddress);
  
  const providerBalance = await oracle.providerBalance();
  const contractBalance = await hre.ethers.provider.getBalance(oracleAddress);
  const provider = await oracle.oracleProvider();
  const walletBalance = await hre.ethers.provider.getBalance(provider);
  
  console.log("\n📊 Current Balances:");
  console.log("Provider Balance (in contract):", hre.ethers.formatEther(providerBalance), "BNB");
  console.log("Contract Total Balance:", hre.ethers.formatEther(contractBalance), "BNB");
  console.log("Provider Wallet Balance:", hre.ethers.formatEther(walletBalance), "BNB\n");
}

main();
