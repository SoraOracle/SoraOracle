const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBNB = hre.ethers.formatEther(balance);
  
  console.log("\n" + "=".repeat(60));
  console.log("💰 Wallet Balance Check");
  console.log("=".repeat(60));
  console.log("\nWallet Address:", deployer.address);
  console.log("Balance:", balanceInBNB, "BNB");
  console.log("\nRequired for deployment: ~0.5 BNB");
  
  if (parseFloat(balanceInBNB) >= 0.5) {
    console.log("✅ Balance sufficient for deployment!");
  } else {
    console.log("❌ Insufficient balance!");
    console.log("\n🚰 Get testnet BNB from:");
    console.log("   https://testnet.bnbchain.org/faucet-smart");
    console.log("\n   Enter address:", deployer.address);
  }
  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
