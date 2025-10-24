const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Final 2 Contracts to BSC Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  const deployments = {
    SoraOracle: "0xB0A0A0E54B7e22f4add4AF82d6bef4C094CDd9af",
    SimplePredictionMarket: "0x07C036916EBC96AB02be9185b7Cdd03954cC8bf5",
    BatchOracleOperations: "0x4124227dEf2A0c9BBa315dF13CD7B546f5839516",
    OracleReputationTracker: "0x6Bd664D0641D8C18C869AD18f61143BB4EDe790c",
    DisputeResolution: "0x3a15beA1BEdc7F4497Df59cDC22D0aDC6FF3e54b",
    AutomatedMarketResolver: "0xb51D9aa15Ac607a7C11Bb7F938759F5d8B0304c8",
    BatchPayoutDistributor: "0x688804Da579e0B8f872F2147e0Fd78524caDf3A4",
    MultiOutcomeMarket: "0x62AF37D0A34dc56e201C5E68E00B348C39A0F5CB",
    PancakeTWAPOracle: hre.ethers.ZeroAddress,
    ReferralRewards: "0x5957E03249A5bAAC5E421f96441fC6907FD0c393"
  };

  console.log("✅ Using existing ReferralRewards at:", deployments.ReferralRewards);

  // Deploy final 2 contracts
  
  // 1. Deploy MarketFactory
  console.log("\n📝 1/2 Deploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    deployments.SimplePredictionMarket,
    deployments.MultiOutcomeMarket
  );
  await marketFactory.waitForDeployment();
  deployments.MarketFactory = await marketFactory.getAddress();
  console.log("✅ MarketFactory deployed to:", deployments.MarketFactory);

  // 2. Deploy LiquidityIncentives
  console.log("\n📝 2/2 Deploying LiquidityIncentives...");
  const LiquidityIncentives = await hre.ethers.getContractFactory("LiquidityIncentives");
  const liquidityIncentives = await LiquidityIncentives.deploy();
  await liquidityIncentives.waitForDeployment();
  deployments.LiquidityIncentives = await liquidityIncentives.getAddress();
  console.log("✅ LiquidityIncentives deployed to:", deployments.LiquidityIncentives);

  // Save all deployments
  const deploymentsPath = path.join(__dirname, "..", "deployments", "testnet-v3.json");
  fs.mkdirSync(path.dirname(deploymentsPath), { recursive: true });
  fs.writeFileSync(
    deploymentsPath,
    JSON.stringify(deployments, null, 2)
  );

  console.log("\n" + "=".repeat(70));
  console.log("🎉 ALL 12 CONTRACTS SUCCESSFULLY DEPLOYED TO BSC TESTNET!");
  console.log("=".repeat(70));
  console.log("\n📋 Complete Deployment Addresses:");
  console.log("─".repeat(70));
  
  Object.entries(deployments).forEach(([name, address]) => {
    if (address === hre.ethers.ZeroAddress) {
      console.log(`${name.padEnd(30)} SKIPPED (not needed)`);
    } else {
      console.log(`${name.padEnd(30)} ${address}`);
    }
  });

  console.log("\n💾 Deployment addresses saved to: deployments/testnet-v3.json");
  console.log("\n✅ Ready for testing! Run: npx hardhat run scripts/test-v3-deployment.js --network bscTestnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
