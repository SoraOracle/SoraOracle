const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("\n🔍 Checking Mainnet Configuration...\n");

  // Check network
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log("📍 Network:", network);
  console.log("📍 Chain ID:", chainId.toString());
  
  if (chainId !== 56n) {
    console.log("❌ ERROR: Not connected to BSC Mainnet!");
    console.log("   Expected Chain ID: 56");
    console.log("   Got Chain ID:", chainId.toString());
    process.exit(1);
  }
  console.log("✅ Connected to BSC Mainnet\n");

  // Check deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer Address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBnb = hre.ethers.formatEther(balance);
  console.log("💰 Balance:", balanceInBnb, "BNB");
  
  if (parseFloat(balanceInBnb) < 0.3) {
    console.log("⚠️  WARNING: Balance is low! Recommended: 0.5 BNB minimum");
    console.log("   Deployment may fail due to insufficient funds");
  } else {
    console.log("✅ Sufficient balance for deployment\n");
  }

  // Check oracle provider
  const oracleProvider = process.env.ORACLE_PROVIDER_ADDRESS || deployer.address;
  console.log("🔮 Oracle Provider:", oracleProvider);
  
  if (!hre.ethers.isAddress(oracleProvider)) {
    console.log("❌ ERROR: Invalid oracle provider address!");
    process.exit(1);
  }
  console.log("✅ Valid oracle provider address\n");

  // Check BSCScan API key
  const bscscanKey = process.env.BSCSCAN_API_KEY;
  if (!bscscanKey || bscscanKey === "") {
    console.log("⚠️  WARNING: BSCSCAN_API_KEY not set");
    console.log("   Contract verification will require manual submission");
  } else {
    console.log("✅ BSCScan API key configured\n");
  }

  // Check gas price
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPriceGwei = hre.ethers.formatUnits(feeData.gasPrice, "gwei");
  console.log("⛽ Current Gas Price:", gasPriceGwei, "Gwei");
  
  if (parseFloat(gasPriceGwei) > 10) {
    console.log("⚠️  WARNING: Gas price is high! Consider waiting");
  } else {
    console.log("✅ Gas price is reasonable\n");
  }

  // Estimate costs
  console.log("💰 ESTIMATED DEPLOYMENT COSTS");
  console.log("-".repeat(50));
  
  const estimatedGas = 5000000n; // Conservative estimate
  const estimatedCost = feeData.gasPrice * estimatedGas;
  const estimatedCostBnb = hre.ethers.formatEther(estimatedCost);
  
  console.log("SoraOracle Contract:", estimatedCostBnb, "BNB");
  console.log("TWAP Oracle (3x):", hre.ethers.formatEther(BigInt("60000000000000000")), "BNB (0.02 each)");
  console.log("Total Estimated:", (parseFloat(estimatedCostBnb) + 0.06).toFixed(4), "BNB");
  console.log("Safety Buffer (20%):", ((parseFloat(estimatedCostBnb) + 0.06) * 0.2).toFixed(4), "BNB");
  console.log("Recommended Total:", ((parseFloat(estimatedCostBnb) + 0.06) * 1.2).toFixed(4), "BNB\n");

  // Final summary
  console.log("=".repeat(50));
  console.log("✅ CONFIGURATION CHECK COMPLETE");
  console.log("=".repeat(50));
  console.log("\nYou are ready to deploy to mainnet!");
  console.log("\nRun: npx hardhat run scripts/deploy-mainnet.js --network bscMainnet\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Configuration check failed!");
    console.error(error);
    process.exit(1);
  });
