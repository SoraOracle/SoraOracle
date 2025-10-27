const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying Sora Oracle Advanced Features\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  // Get existing oracle address
  const ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS || process.argv[2];
  if (!ORACLE_ADDRESS) {
    console.log("❌ Error: SORA_ORACLE_ADDRESS not found in .env");
    console.log("Usage: node scripts/deploy-advanced-features.js <ORACLE_ADDRESS>");
    process.exit(1);
  }

  console.log("Sora Oracle Address:", ORACLE_ADDRESS, "\n");

  console.log("═".repeat(70));
  console.log(" DEPLOYING CONTRACTS");
  console.log("═".repeat(70));

  // 1. Deploy BatchOracleOperations
  console.log("\n📦 1. Deploying BatchOracleOperations...");
  const BatchOps = await hre.ethers.getContractFactory("BatchOracleOperations");
  const batchOps = await BatchOps.deploy(ORACLE_ADDRESS);
  await batchOps.waitForDeployment();
  const batchOpsAddress = await batchOps.getAddress();
  console.log("✅ BatchOracleOperations deployed to:", batchOpsAddress);

  // 2. Deploy OracleReputationTracker
  console.log("\n📊 2. Deploying OracleReputationTracker...");
  const ReputationTracker = await hre.ethers.getContractFactory("OracleReputationTracker");
  const reputationTracker = await ReputationTracker.deploy();
  await reputationTracker.waitForDeployment();
  const reputationTrackerAddress = await reputationTracker.getAddress();
  console.log("✅ OracleReputationTracker deployed to:", reputationTrackerAddress);

  // 3. Deploy DisputeResolution
  console.log("\n⚖️  3. Deploying DisputeResolution...");
  const DisputeResolution = await hre.ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(ORACLE_ADDRESS);
  await disputeResolution.waitForDeployment();
  const disputeResolutionAddress = await disputeResolution.getAddress();
  console.log("✅ DisputeResolution deployed to:", disputeResolutionAddress);

  // 4. Check if SimplePredictionMarket exists
  const MARKET_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS;
  let marketResolverAddress = "N/A - No market contract specified";

  if (MARKET_ADDRESS) {
    console.log("\n🤖 4. Deploying AutomatedMarketResolver...");
    const MarketResolver = await hre.ethers.getContractFactory("AutomatedMarketResolver");
    const marketResolver = await MarketResolver.deploy(ORACLE_ADDRESS, MARKET_ADDRESS);
    await marketResolver.waitForDeployment();
    marketResolverAddress = await marketResolver.getAddress();
    console.log("✅ AutomatedMarketResolver deployed to:", marketResolverAddress);
  } else {
    console.log("\n⏭️  4. Skipping AutomatedMarketResolver (no market contract)");
    console.log("   Set PREDICTION_MARKET_ADDRESS in .env to deploy");
  }

  console.log("\n" + "═".repeat(70));
  console.log(" DEPLOYMENT SUMMARY");
  console.log("═".repeat(70));
  console.log("\n📋 Contract Addresses:");
  console.log("SoraOracle:", ORACLE_ADDRESS);
  console.log("BatchOracleOperations:", batchOpsAddress);
  console.log("OracleReputationTracker:", reputationTrackerAddress);
  console.log("DisputeResolution:", disputeResolutionAddress);
  console.log("AutomatedMarketResolver:", marketResolverAddress);

  console.log("\n📝 Update your .env file:");
  console.log(`BATCH_OPERATIONS_ADDRESS=${batchOpsAddress}`);
  console.log(`REPUTATION_TRACKER_ADDRESS=${reputationTrackerAddress}`);
  console.log(`DISPUTE_RESOLUTION_ADDRESS=${disputeResolutionAddress}`);
  if (MARKET_ADDRESS) {
    console.log(`MARKET_RESOLVER_ADDRESS=${marketResolverAddress}`);
  }

  console.log("\n🔧 Feature Capabilities:");
  console.log("✅ Batch Operations: Ask/answer multiple questions with ~30% gas savings");
  console.log("✅ Reputation Tracking: Monitor provider performance and accuracy");
  console.log("✅ Dispute Resolution: Challenge answers with stake-based voting");
  if (MARKET_ADDRESS) {
    console.log("✅ Market Resolver: Auto-resolve prediction markets when answered");
  }

  console.log("\n📚 Next Steps:");
  console.log("1. Verify contracts on BSCScan");
  console.log("2. Test batch operations: npm run batch:ask");
  console.log("3. Monitor analytics: npm run oracle:analytics", ORACLE_ADDRESS);
  console.log("4. Review dispute docs: See DisputeResolution.sol");

  console.log("\n" + "═".repeat(70));
  console.log("🎉 Advanced Features Deployment Complete!");
  console.log("═".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
