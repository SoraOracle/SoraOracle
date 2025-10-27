const hre = require("hardhat");
const fs = require("fs");

/**
 * Deploy V4 Expansion: 10 New Contracts
 * - Oracle Enhancements (3)
 * - Market Innovations (4)
 * - Governance & Staking (3)
 */
async function main() {
    console.log("\n🚀 Sora Oracle V4 Expansion Deployment");
    console.log("=====================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB\n");

    const deployment = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {}
    };

    // Get existing V3 contracts
    const v3Deployment = JSON.parse(fs.readFileSync("./deployments/mainnet-v3.json", "utf8"));
    const soraOracleAddress = v3Deployment.contracts.SoraOracle;
    const stakingAddress = v3Deployment.contracts.OracleStaking || null;

    console.log("📋 ORACLE ENHANCEMENTS");
    console.log("======================\n");

    // 1. AggregatedOracle
    console.log("1. Deploying AggregatedOracle...");
    const AggregatedOracle = await hre.ethers.getContractFactory("AggregatedOracle");
    const aggregatedOracle = await AggregatedOracle.deploy();
    await aggregatedOracle.waitForDeployment();
    deployment.contracts.AggregatedOracle = await aggregatedOracle.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.AggregatedOracle, "\n");

    // 2. ScheduledOracle
    console.log("2. Deploying ScheduledOracle...");
    const ScheduledOracle = await hre.ethers.getContractFactory("ScheduledOracle");
    const scheduledOracle = await ScheduledOracle.deploy();
    await scheduledOracle.waitForDeployment();
    deployment.contracts.ScheduledOracle = await scheduledOracle.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.ScheduledOracle, "\n");

    // 3. CrossChainBridge
    console.log("3. Deploying CrossChainBridge...");
    const CrossChainBridge = await hre.ethers.getContractFactory("CrossChainBridge");
    const crossChainBridge = await CrossChainBridge.deploy();
    await crossChainBridge.waitForDeployment();
    deployment.contracts.CrossChainBridge = await crossChainBridge.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.CrossChainBridge, "\n");

    console.log("📊 MARKET INNOVATIONS");
    console.log("=====================\n");

    // 4. ConditionalMarket
    console.log("4. Deploying ConditionalMarket...");
    const ConditionalMarket = await hre.ethers.getContractFactory("ConditionalMarket");
    const conditionalMarket = await ConditionalMarket.deploy();
    await conditionalMarket.waitForDeployment();
    deployment.contracts.ConditionalMarket = await conditionalMarket.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.ConditionalMarket, "\n");

    // 5. AMMMarket
    console.log("5. Deploying AMMMarket...");
    const AMMMarket = await hre.ethers.getContractFactory("AMMMarket");
    const ammMarket = await AMMMarket.deploy();
    await ammMarket.waitForDeployment();
    deployment.contracts.AMMMarket = await ammMarket.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.AMMMarket, "\n");

    // 6. RangeMarket
    console.log("6. Deploying RangeMarket...");
    const RangeMarket = await hre.ethers.getContractFactory("RangeMarket");
    const rangeMarket = await RangeMarket.deploy(soraOracleAddress);
    await rangeMarket.waitForDeployment();
    deployment.contracts.RangeMarket = await rangeMarket.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.RangeMarket, "\n");

    // 7. TimeSeriesMarket
    console.log("7. Deploying TimeSeriesMarket...");
    const TimeSeriesMarket = await hre.ethers.getContractFactory("TimeSeriesMarket");
    const timeSeriesMarket = await TimeSeriesMarket.deploy(soraOracleAddress);
    await timeSeriesMarket.waitForDeployment();
    deployment.contracts.TimeSeriesMarket = await timeSeriesMarket.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.TimeSeriesMarket, "\n");

    console.log("🏛️  GOVERNANCE & STAKING");
    console.log("=======================\n");

    // 8. OracleStaking
    console.log("8. Deploying OracleStaking...");
    const OracleStaking = await hre.ethers.getContractFactory("OracleStaking");
    const oracleStaking = await OracleStaking.deploy();
    await oracleStaking.waitForDeployment();
    deployment.contracts.OracleStaking = await oracleStaking.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.OracleStaking, "\n");

    // 9. DAOGovernance
    console.log("9. Deploying DAOGovernance...");
    const DAOGovernance = await hre.ethers.getContractFactory("DAOGovernance");
    const daoGovernance = await DAOGovernance.deploy();
    await daoGovernance.waitForDeployment();
    deployment.contracts.DAOGovernance = await daoGovernance.getAddress();
    console.log("   ✅ Deployed at:", deployment.contracts.DAOGovernance, "\n");

    // 10. SlashingMechanism
    console.log("10. Deploying SlashingMechanism...");
    const SlashingMechanism = await hre.ethers.getContractFactory("SlashingMechanism");
    const slashingMechanism = await SlashingMechanism.deploy(deployment.contracts.OracleStaking);
    await slashingMechanism.waitForDeployment();
    deployment.contracts.SlashingMechanism = await slashingMechanism.getAddress();
    console.log("    ✅ Deployed at:", deployment.contracts.SlashingMechanism, "\n");

    // Save deployment
    const filename = `./deployments/${hre.network.name}-v4-expansion.json`;
    fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));

    console.log("✅ All 10 contracts deployed successfully!");
    console.log(`📋 Deployment saved to: ${filename}`);
    console.log("\n📊 DEPLOYMENT SUMMARY");
    console.log("====================");
    console.log("Network:", deployment.network);
    console.log("Chain ID:", deployment.chainId);
    console.log("Deployer:", deployment.deployer);
    console.log("\nOracle Enhancements (3):");
    console.log("  - AggregatedOracle:", deployment.contracts.AggregatedOracle);
    console.log("  - ScheduledOracle:", deployment.contracts.ScheduledOracle);
    console.log("  - CrossChainBridge:", deployment.contracts.CrossChainBridge);
    console.log("\nMarket Innovations (4):");
    console.log("  - ConditionalMarket:", deployment.contracts.ConditionalMarket);
    console.log("  - AMMMarket:", deployment.contracts.AMMMarket);
    console.log("  - RangeMarket:", deployment.contracts.RangeMarket);
    console.log("  - TimeSeriesMarket:", deployment.contracts.TimeSeriesMarket);
    console.log("\nGovernance & Staking (3):");
    console.log("  - OracleStaking:", deployment.contracts.OracleStaking);
    console.log("  - DAOGovernance:", deployment.contracts.DAOGovernance);
    console.log("  - SlashingMechanism:", deployment.contracts.SlashingMechanism);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
