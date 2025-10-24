/**
 * Sora Oracle V3.0 - BSC Mainnet Deployment Script
 * 
 * PRODUCTION DEPLOYMENT - USE WITH CAUTION
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// PancakeSwap V2 Factory on BSC Mainnet
const PANCAKE_FACTORY_MAINNET = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

// Safety check
async function confirmDeployment() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log("⚠️  WARNING: You are about to deploy to BSC MAINNET");
    console.log("⚠️  This will cost real BNB and cannot be undone!");
    console.log("");
    rl.question("Type 'DEPLOY TO MAINNET' to confirm: ", (answer) => {
      rl.close();
      resolve(answer === 'DEPLOY TO MAINNET');
    });
  });
}

async function main() {
  const confirmed = await confirmDeployment();
  if (!confirmed) {
    console.log("❌ Deployment cancelled");
    process.exit(0);
  }

  console.log("\n🚀 Deploying Sora Oracle V3.0 to BSC Mainnet...\n");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB");
  
  if (balance < hre.ethers.parseEther("0.5")) {
    console.log("❌ Insufficient balance! Need at least 0.5 BNB for deployment");
    process.exit(1);
  }

  const deployments = {};
  const startTime = Date.now();

  // 1. Deploy SoraOracle
  console.log("\n📝 1/12 Deploying SoraOracle...");
  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const soraOracle = await SoraOracle.deploy(deployer.address); // Oracle provider = deployer
  await soraOracle.waitForDeployment();
  deployments.SoraOracle = await soraOracle.getAddress();
  console.log("✅ SoraOracle deployed to:", deployments.SoraOracle);

  // 2. Skip PancakeTWAPOracle (requires specific trading pair, not critical)
  console.log("\n⏭️  2/12 Skipping PancakeTWAPOracle (requires trading pair, not critical for core markets)");
  deployments.PancakeTWAPOracle = hre.ethers.ZeroAddress;

  // 3. Deploy SimplePredictionMarket
  console.log("\n📝 3/12 Deploying SimplePredictionMarket...");
  const SimplePredictionMarket = await hre.ethers.getContractFactory("SimplePredictionMarket");
  const predictionMarket = await SimplePredictionMarket.deploy(deployments.SoraOracle);
  await predictionMarket.waitForDeployment();
  deployments.SimplePredictionMarket = await predictionMarket.getAddress();
  console.log("✅ SimplePredictionMarket deployed to:", deployments.SimplePredictionMarket);

  // 4. Deploy BatchOracleOperations
  console.log("\n📝 4/12 Deploying BatchOracleOperations...");
  const BatchOracleOperations = await hre.ethers.getContractFactory("BatchOracleOperations");
  const batchOps = await BatchOracleOperations.deploy(deployments.SoraOracle);
  await batchOps.waitForDeployment();
  deployments.BatchOracleOperations = await batchOps.getAddress();
  console.log("✅ BatchOracleOperations deployed to:", deployments.BatchOracleOperations);

  // 5. Deploy OracleReputationTracker
  console.log("\n📝 5/12 Deploying OracleReputationTracker...");
  const OracleReputationTracker = await hre.ethers.getContractFactory("OracleReputationTracker");
  const reputationTracker = await OracleReputationTracker.deploy(); // No constructor params
  await reputationTracker.waitForDeployment();
  deployments.OracleReputationTracker = await reputationTracker.getAddress();
  console.log("✅ OracleReputationTracker deployed to:", deployments.OracleReputationTracker);

  // 6. Deploy DisputeResolution
  console.log("\n📝 6/12 Deploying DisputeResolution...");
  const DisputeResolution = await hre.ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(deployments.SoraOracle);
  await disputeResolution.waitForDeployment();
  deployments.DisputeResolution = await disputeResolution.getAddress();
  console.log("✅ DisputeResolution deployed to:", deployments.DisputeResolution);

  // 7. Deploy AutomatedMarketResolver
  console.log("\n📝 7/12 Deploying AutomatedMarketResolver...");
  const AutomatedMarketResolver = await hre.ethers.getContractFactory("AutomatedMarketResolver");
  const marketResolver = await AutomatedMarketResolver.deploy(
    deployments.SoraOracle,
    deployments.SimplePredictionMarket
  );
  await marketResolver.waitForDeployment();
  deployments.AutomatedMarketResolver = await marketResolver.getAddress();
  console.log("✅ AutomatedMarketResolver deployed to:", deployments.AutomatedMarketResolver);

  // 8. Deploy BatchPayoutDistributor
  console.log("\n📝 8/12 Deploying BatchPayoutDistributor...");
  const BatchPayoutDistributor = await hre.ethers.getContractFactory("BatchPayoutDistributor");
  const payoutDistributor = await BatchPayoutDistributor.deploy(deployments.SimplePredictionMarket);
  await payoutDistributor.waitForDeployment();
  deployments.BatchPayoutDistributor = await payoutDistributor.getAddress();
  console.log("✅ BatchPayoutDistributor deployed to:", deployments.BatchPayoutDistributor);

  // 9. Deploy MultiOutcomeMarket
  console.log("\n📝 9/12 Deploying MultiOutcomeMarket...");
  const MultiOutcomeMarket = await hre.ethers.getContractFactory("MultiOutcomeMarket");
  const multiOutcomeMarket = await MultiOutcomeMarket.deploy(deployments.SoraOracle);
  await multiOutcomeMarket.waitForDeployment();
  deployments.MultiOutcomeMarket = await multiOutcomeMarket.getAddress();
  console.log("✅ MultiOutcomeMarket deployed to:", deployments.MultiOutcomeMarket);

  // 10. Deploy ReferralRewards
  console.log("\n📝 10/12 Deploying ReferralRewards...");
  const ReferralRewards = await hre.ethers.getContractFactory("ReferralRewards");
  const referralRewards = await ReferralRewards.deploy();
  await referralRewards.waitForDeployment();
  deployments.ReferralRewards = await referralRewards.getAddress();
  console.log("✅ ReferralRewards deployed to:", deployments.ReferralRewards);

  // 11. Deploy MarketFactory
  console.log("\n📝 11/12 Deploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    deployments.SimplePredictionMarket,
    deployments.MultiOutcomeMarket
  );
  await marketFactory.waitForDeployment();
  deployments.MarketFactory = await marketFactory.getAddress();
  console.log("✅ MarketFactory deployed to:", deployments.MarketFactory);

  // 12. Deploy LiquidityIncentives
  console.log("\n📝 12/12 Deploying LiquidityIncentives...");
  const LiquidityIncentives = await hre.ethers.getContractFactory("LiquidityIncentives");
  const liquidityIncentives = await LiquidityIncentives.deploy();
  await liquidityIncentives.waitForDeployment();
  deployments.LiquidityIncentives = await liquidityIncentives.getAddress();
  console.log("✅ LiquidityIncentives deployed to:", deployments.LiquidityIncentives);

  // Setup integrations
  console.log("\n🔗 Setting up contract integrations...");
  
  // Set integrations on SimplePredictionMarket
  console.log("  - Configuring SimplePredictionMarket integrations...");
  const tx1 = await predictionMarket.setIntegrations(
    deployments.ReferralRewards,
    deployments.MarketFactory,
    deployments.LiquidityIncentives
  );
  await tx1.wait();
  console.log("  ✅ SimplePredictionMarket integrations set");

  // Set integrations on MultiOutcomeMarket
  console.log("  - Configuring MultiOutcomeMarket integrations...");
  const tx2 = await multiOutcomeMarket.setIntegrations(
    deployments.ReferralRewards,
    deployments.MarketFactory,
    deployments.LiquidityIncentives
  );
  await tx2.wait();
  console.log("  ✅ MultiOutcomeMarket integrations set");

  // Authorize markets in ReferralRewards
  console.log("  - Authorizing markets in ReferralRewards...");
  const tx3 = await referralRewards.setMarketAuthorization(deployments.SimplePredictionMarket, true);
  await tx3.wait();
  const tx4 = await referralRewards.setMarketAuthorization(deployments.MultiOutcomeMarket, true);
  await tx4.wait();
  console.log("  ✅ Markets authorized in ReferralRewards");

  // Authorize markets in LiquidityIncentives
  console.log("  - Authorizing markets in LiquidityIncentives...");
  const tx5 = await liquidityIncentives.setMarketAuthorization(deployments.SimplePredictionMarket, true);
  await tx5.wait();
  const tx6 = await liquidityIncentives.setMarketAuthorization(deployments.MultiOutcomeMarket, true);
  await tx6.wait();
  console.log("  ✅ Markets authorized in LiquidityIncentives");

  // MarketFactory already authorized both markets in constructor
  console.log("  ✅ MarketFactory auto-authorized both markets in constructor");

  console.log("\n✨ All integrations configured successfully!\n");

  // Save deployment addresses
  const deploymentsPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsPath)) {
    fs.mkdirSync(deploymentsPath);
  }

  const deploymentData = {
    network: "bscMainnet",
    chainId: 56,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployments,
    pancakeFactory: PANCAKE_FACTORY_MAINNET
  };

  fs.writeFileSync(
    path.join(deploymentsPath, "mainnet-v3.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  const deployTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("🎉 Sora Oracle V3.0 Successfully Deployed to BSC MAINNET!");
  console.log("=".repeat(80));
  console.log("\n📋 Contract Addresses:");
  Object.entries(deployments).forEach(([name, address]) => {
    console.log(`   ${name.padEnd(30)} ${address}`);
  });
  console.log("\n⏱️  Total deployment time:", deployTime, "seconds");
  console.log("\n💾 Deployment data saved to: deployments/mainnet-v3.json");
  console.log("\n🔍 Verify contracts on BSCScan:");
  console.log("   npx hardhat verify --network bscMainnet <address>");
  console.log("\n⚠️  IMPORTANT NEXT STEPS:");
  console.log("   1. Verify all contracts on BSCScan");
  console.log("   2. Transfer ownership if needed");
  console.log("   3. Update frontend config with mainnet addresses");
  console.log("   4. Test thoroughly before announcing");
  console.log("\n" + "=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
