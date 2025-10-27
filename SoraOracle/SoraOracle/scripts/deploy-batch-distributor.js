const hre = require("hardhat");

/**
 * Deploy BatchPayoutDistributor and approve it in SimplePredictionMarket
 * 
 * Usage:
 *   BSC Testnet: npx hardhat run scripts/deploy-batch-distributor.js --network bscTestnet
 *   BSC Mainnet: npx hardhat run scripts/deploy-batch-distributor.js --network bsc
 * 
 * Prerequisites:
 *   - SimplePredictionMarket must be deployed
 *   - Set PREDICTION_MARKET_ADDRESS in .env or pass as argument
 */

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("\n================================================");
  console.log("Deploying BatchPayoutDistributor");
  console.log("================================================");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB\n");

  // Get SimplePredictionMarket address
  const predictionMarketAddress = process.env.PREDICTION_MARKET_ADDRESS || process.argv[2];
  if (!predictionMarketAddress) {
    throw new Error("SimplePredictionMarket address not provided. Set PREDICTION_MARKET_ADDRESS in .env or pass as argument.");
  }

  console.log("SimplePredictionMarket:", predictionMarketAddress);

  // Verify the market contract exists
  const marketCode = await hre.ethers.provider.getCode(predictionMarketAddress);
  if (marketCode === '0x') {
    throw new Error(`No contract found at ${predictionMarketAddress}`);
  }

  // Deploy BatchPayoutDistributor
  console.log("\n📦 Deploying BatchPayoutDistributor...");
  const BatchPayoutDistributor = await hre.ethers.getContractFactory("BatchPayoutDistributor");
  const distributor = await BatchPayoutDistributor.deploy(predictionMarketAddress);
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();

  console.log("✅ BatchPayoutDistributor deployed:", distributorAddress);

  // Approve the distributor in SimplePredictionMarket
  console.log("\n🔐 Approving distributor in SimplePredictionMarket...");
  const SimplePredictionMarket = await hre.ethers.getContractFactory("SimplePredictionMarket");
  const market = SimplePredictionMarket.attach(predictionMarketAddress);

  const approveTx = await market.setDistributorApproval(distributorAddress, true);
  await approveTx.wait();

  console.log("✅ Distributor approved");

  // Verify approval
  const isApproved = await market.approvedDistributors(distributorAddress);
  console.log("Verification - Is Approved:", isApproved);

  // Display deployment summary
  console.log("\n================================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("================================================");
  console.log("Network:", network);
  console.log("BatchPayoutDistributor:", distributorAddress);
  console.log("SimplePredictionMarket:", predictionMarketAddress);
  console.log("Approved:", isApproved);
  console.log("================================================\n");

  // Save addresses
  console.log("💾 Saving deployment addresses...");
  const fs = require('fs');
  const deploymentData = {
    network,
    timestamp: new Date().toISOString(),
    contracts: {
      batchPayoutDistributor: distributorAddress,
      simplePredictionMarket: predictionMarketAddress,
    },
    deployer: deployer.address
  };

  const filename = `deployment-batch-distributor-${network}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  console.log(`✅ Saved to ${filename}`);

  // Update .env reminder
  console.log("\n📝 Add to your .env file:");
  console.log(`BATCH_DISTRIBUTOR_ADDRESS=${distributorAddress}`);

  // Gas usage estimate
  console.log("\n⛽ Estimated Gas Costs:");
  console.log("Deployment: ~1,000,000 gas");
  console.log("Approval: ~50,000 gas");
  console.log("Total: ~1,050,000 gas");
  
  const gasPrice = (await hre.ethers.provider.getFeeData()).gasPrice;
  const estimatedCost = 1050000n * gasPrice;
  console.log(`At current gas price: ${hre.ethers.formatEther(estimatedCost)} BNB`);

  console.log("\n✅ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
