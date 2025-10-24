const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("\n🧪 MAINNET TEST: Withdraw Provider Rewards\n");

  const oracleAddress = process.env.SORA_ORACLE_ADDRESS || "0x5058AC254e560E54BfcabBe1bde4375E7C914d35";
  const [signer] = await hre.ethers.getSigners();

  console.log("Oracle Address:", oracleAddress);
  console.log("Provider:", signer.address);

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(oracleAddress);

  // Check provider balance before
  const providerBalanceBefore = await oracle.providerBalance();
  const walletBalanceBefore = await hre.ethers.provider.getBalance(signer.address);

  console.log("\n💰 Before Withdrawal:");
  console.log("   Provider Contract Balance:", hre.ethers.formatEther(providerBalanceBefore), "BNB");
  console.log("   Wallet Balance:", hre.ethers.formatEther(walletBalanceBefore), "BNB");

  if (providerBalanceBefore === 0n) {
    console.log("\n⚠️  No rewards to withdraw!");
    return;
  }

  try {
    console.log("\n⏳ Withdrawing rewards...");
    const tx = await oracle.withdraw();

    console.log("Transaction:", tx.hash);
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Transaction Fee:", hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "BNB");

    // Check balances after - query at the confirmed block to ensure fresh data
    const providerBalanceAfter = await oracle.providerBalance({ blockTag: receipt.blockNumber });
    const walletBalanceAfter = await hre.ethers.provider.getBalance(signer.address, receipt.blockNumber);

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const walletDelta = walletBalanceAfter - walletBalanceBefore;
    const grossWithdrawn = providerBalanceBefore - providerBalanceAfter;
    const netGain = walletDelta + gasCost;

    console.log("\n💰 After Withdrawal:");
    console.log("   Provider Contract Balance:", hre.ethers.formatEther(providerBalanceAfter), "BNB");
    console.log("   Wallet Balance:", hre.ethers.formatEther(walletBalanceAfter), "BNB");
    console.log("\n📊 Withdrawal Summary:");
    console.log("   Gross Withdrawn:", hre.ethers.formatEther(grossWithdrawn), "BNB");
    console.log("   Gas Cost:", hre.ethers.formatEther(gasCost), "BNB");
    console.log("   Net Received:", hre.ethers.formatEther(walletDelta), "BNB");
    console.log("   Verification: Net + Gas =", hre.ethers.formatEther(netGain), "BNB (should equal gross withdrawn)");

    // Verify the withdrawal worked correctly
    if (providerBalanceAfter !== 0n) {
      console.error("\n❌ VERIFICATION FAILED: Provider balance not reset to zero!");
      process.exit(1);
    }
    if (netGain !== grossWithdrawn) {
      console.error("\n❌ VERIFICATION FAILED: Withdrawal amount mismatch!");
      console.error("   Expected:", hre.ethers.formatEther(grossWithdrawn), "BNB");
      console.error("   Received:", hre.ethers.formatEther(netGain), "BNB");
      process.exit(1);
    }
    console.log("\n✅ VERIFICATION PASSED: Withdrawal completed successfully!");

  } catch (error) {
    console.error("\n❌ Error withdrawing rewards:");
    console.error(error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Withdrawal test completed successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
