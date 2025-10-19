const hre = require("hardhat");

async function main() {
  // Retrieve the withdrawal transaction details
  const txHash = "0x9f0815c031d9ef6e5051505ba132b299399a5ecd83903b5a62d8724afbbf0e74";
  
  console.log("\n🔍 Verifying Past Withdrawal Transaction\n");
  console.log("Transaction Hash:", txHash);
  
  const tx = await hre.ethers.provider.getTransaction(txHash);
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
  
  console.log("Block Number:", receipt.blockNumber);
  console.log("From:", tx.from);
  console.log("To:", tx.to);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Gas Price:", tx.gasPrice.toString());
  console.log("Transaction Fee:", hre.ethers.formatEther(receipt.gasUsed * tx.gasPrice), "BNB");
  
  // Get balances at that block
  const walletBalanceBefore = await hre.ethers.provider.getBalance(tx.from, receipt.blockNumber - 1);
  const walletBalanceAfter = await hre.ethers.provider.getBalance(tx.from, receipt.blockNumber);
  
  const gasCost = receipt.gasUsed * tx.gasPrice;
  const walletDelta = walletBalanceAfter - walletBalanceBefore;
  const grossReceived = walletDelta + gasCost;
  
  console.log("\n💰 Balance Changes:");
  console.log("   Wallet Before (block", receipt.blockNumber - 1 + "):", hre.ethers.formatEther(walletBalanceBefore), "BNB");
  console.log("   Wallet After  (block", receipt.blockNumber + "):", hre.ethers.formatEther(walletBalanceAfter), "BNB");
  console.log("\n📊 Calculation:");
  console.log("   Wallet Delta:", hre.ethers.formatEther(walletDelta), "BNB");
  console.log("   Gas Cost:", hre.ethers.formatEther(gasCost), "BNB");
  console.log("   Gross Withdrawn:", hre.ethers.formatEther(grossReceived), "BNB");
  console.log("\n✅ Withdrawal verified: Received", hre.ethers.formatEther(grossReceived), "BNB from contract\n");
}

main();
