const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying all contracts on BSCScan...\n");

  const deploymentsPath = path.join(__dirname, "../deployments/mainnet-v3.json");
  const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const contracts = deploymentData.contracts;

  const deployer = "0x290f6cB6457A87d64cb309Fe66F9d64a4df0addE";

  const verifications = [
    {
      name: "SoraOracle",
      address: contracts.SoraOracle,
      constructorArgs: [deployer]
    },
    {
      name: "SimplePredictionMarket",
      address: contracts.SimplePredictionMarket,
      constructorArgs: [contracts.SoraOracle]
    },
    {
      name: "MultiOutcomeMarket",
      address: contracts.MultiOutcomeMarket,
      constructorArgs: [contracts.SoraOracle]
    },
    {
      name: "BatchOracleOperations",
      address: contracts.BatchOracleOperations,
      constructorArgs: [contracts.SoraOracle]
    },
    {
      name: "OracleReputationTracker",
      address: contracts.OracleReputationTracker,
      constructorArgs: []
    },
    {
      name: "DisputeResolution",
      address: contracts.DisputeResolution,
      constructorArgs: [contracts.SoraOracle]
    },
    {
      name: "AutomatedMarketResolver",
      address: contracts.AutomatedMarketResolver,
      constructorArgs: [contracts.SoraOracle, contracts.SimplePredictionMarket]
    },
    {
      name: "BatchPayoutDistributor",
      address: contracts.BatchPayoutDistributor,
      constructorArgs: [contracts.SimplePredictionMarket]
    },
    {
      name: "ReferralRewards",
      address: contracts.ReferralRewards,
      constructorArgs: []
    },
    {
      name: "MarketFactory",
      address: contracts.MarketFactory,
      constructorArgs: [contracts.SimplePredictionMarket, contracts.MultiOutcomeMarket]
    },
    {
      name: "LiquidityIncentives",
      address: contracts.LiquidityIncentives,
      constructorArgs: []
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const contract of verifications) {
    console.log(`\n📝 Verifying ${contract.name} at ${contract.address}...`);
    
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
      });
      console.log(`✅ ${contract.name} verified successfully!`);
      successCount++;
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contract.name} already verified!`);
        successCount++;
      } else {
        console.log(`❌ ${contract.name} verification failed: ${error.message}`);
        failCount++;
      }
    }
    
    // Wait a bit between verifications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 Verification Summary");
  console.log("=".repeat(70));
  console.log(`✅ Successfully verified: ${successCount}/11 contracts`);
  console.log(`❌ Failed: ${failCount}/11 contracts`);
  console.log("\n🔍 View verified contracts on BSCScan:");
  console.log("   https://bscscan.com/address/" + contracts.SoraOracle);
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
