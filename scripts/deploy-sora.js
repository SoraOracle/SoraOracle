const hre = require("hardhat");
require("dotenv").config();

// Common BSC trading pairs
const PAIRS = {
  WBNB_BUSD: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16", // Main pair
  WBNB_USDT: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE",
  CAKE_WBNB: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0"
};

async function main() {
  console.log("🚀 Deploying Sora Oracle MVP to BSC...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  const oracleProviderAddress = process.env.ORACLE_PROVIDER_ADDRESS || deployer.address;
  console.log("Oracle Provider:", oracleProviderAddress);

  // Deploy Main Oracle
  console.log("📝 Deploying SoraOracle...");
  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = await SoraOracle.deploy(oracleProviderAddress);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ SoraOracle deployed to:", oracleAddress);

  // Add TWAP oracles for common pairs
  console.log("\n📊 Setting up TWAP oracles for trading pairs...");
  
  try {
    console.log("Adding WBNB/BUSD TWAP oracle...");
    const tx1 = await oracle.addTWAPOracle(PAIRS.WBNB_BUSD);
    await tx1.wait();
    console.log("✅ WBNB/BUSD TWAP oracle added");

    console.log("Adding WBNB/USDT TWAP oracle...");
    const tx2 = await oracle.addTWAPOracle(PAIRS.WBNB_USDT);
    await tx2.wait();
    console.log("✅ WBNB/USDT TWAP oracle added");

    console.log("Adding CAKE/WBNB TWAP oracle...");
    const tx3 = await oracle.addTWAPOracle(PAIRS.CAKE_WBNB);
    await tx3.wait();
    console.log("✅ CAKE/WBNB TWAP oracle added");
  } catch (error) {
    console.log("⚠️  TWAP oracle setup error:", error.message);
    console.log("You can add them manually later with addTWAPOracle()");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Sora Oracle MVP Deployment Complete!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("SoraOracle:", oracleAddress);
  console.log("\n🔧 Trading Pairs:");
  console.log("WBNB/BUSD:", PAIRS.WBNB_BUSD);
  console.log("WBNB/USDT:", PAIRS.WBNB_USDT);
  console.log("CAKE/WBNB:", PAIRS.CAKE_WBNB);
  console.log("\n📝 Next Steps:");
  console.log("1. View on BscScan:", `https://testnet.bscscan.com/address/${oracleAddress}`);
  console.log("2. Ask a question: npx hardhat run scripts/sora-ask.js", oracleAddress, "--network bscTestnet");
  console.log("3. Verify contract: npx hardhat verify --network bscTestnet", oracleAddress, oracleProviderAddress);
  console.log("\n💡 Oracle Fee: 0.01 BNB per question");
  console.log("💡 Refund Period: 7 days for unanswered questions\n");

  return oracleAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
