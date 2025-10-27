const hre = require("hardhat");

/**
 * Batch distribute winnings to all market participants
 * 
 * Usage:
 *   npx hardhat run scripts/batch-distribute-winnings.js --network bscTestnet
 * 
 * Prerequisites:
 *   - BatchPayoutDistributor must be deployed and approved
 *   - Market must be resolved
 *   - Set BATCH_DISTRIBUTOR_ADDRESS and PREDICTION_MARKET_ADDRESS in .env
 */

async function main() {
  const [distributor] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("\n================================================");
  console.log("Batch Distribute Market Winnings");
  console.log("================================================");
  console.log("Network:", network);
  console.log("Distributor:", distributor.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(distributor.address)), "BNB\n");

  // Get contract addresses
  const distributorAddress = process.env.BATCH_DISTRIBUTOR_ADDRESS || process.argv[2];
  const predictionMarketAddress = process.env.PREDICTION_MARKET_ADDRESS || process.argv[3];
  
  if (!distributorAddress || !predictionMarketAddress) {
    throw new Error("Missing contract addresses. Set BATCH_DISTRIBUTOR_ADDRESS and PREDICTION_MARKET_ADDRESS in .env");
  }

  // Get market ID from user
  const marketId = process.argv[4] || 0;
  console.log("Market ID:", marketId);

  // Connect to contracts
  const BatchPayoutDistributor = await hre.ethers.getContractFactory("BatchPayoutDistributor");
  const batchDistributor = BatchPayoutDistributor.attach(distributorAddress);

  const SimplePredictionMarket = await hre.ethers.getContractFactory("SimplePredictionMarket");
  const market = SimplePredictionMarket.attach(predictionMarketAddress);

  // Get market details
  console.log("\n📊 Fetching market details...");
  const marketData = await market.getMarket(marketId);
  console.log("Question:", marketData.question);
  console.log("Status:", ["OPEN", "CLOSED", "RESOLVED", "CANCELED"][marketData.status]);
  console.log("Outcome:", ["UNRESOLVED", "YES", "NO"][marketData.outcome]);
  console.log("Total Pool:", hre.ethers.formatEther(marketData.yesPool + marketData.noPool), "BNB");

  if (marketData.status !== 2) { // 2 = RESOLVED
    throw new Error("Market is not resolved yet. Current status: " + ["OPEN", "CLOSED", "RESOLVED", "CANCELED"][marketData.status]);
  }

  // Get participants list
  // Note: In production, you'd track this off-chain via events
  // For now, provide manually or fetch from events
  console.log("\n👥 Enter participant addresses (comma-separated):");
  console.log("Example: 0x123...,0x456...,0x789...");
  console.log("Or leave empty to use sample addresses");
  
  // For demo purposes, you can hardcode or fetch from events
  const participantsInput = process.argv[5] || "";
  let participants = [];
  
  if (participantsInput) {
    participants = participantsInput.split(',').map(addr => addr.trim());
  } else {
    console.log("\n⚠️  No participants provided. Use actual addresses for real distribution.");
    console.log("You can fetch participants from PositionTaken events:");
    console.log("const filter = market.filters.PositionTaken(marketId);");
    console.log("const events = await market.queryFilter(filter);");
    console.log("const participants = [...new Set(events.map(e => e.args.user))];");
    return;
  }

  console.log("\nParticipants:", participants.length);

  // Get unclaimed stats before distribution
  console.log("\n📈 Checking unclaimed winnings...");
  const [unclaimedCount, totalUnclaimed] = await batchDistributor.getUnclaimedStats(marketId, participants);
  console.log("Unclaimed Winners:", unclaimedCount.toString());
  console.log("Total Unclaimed:", hre.ethers.formatEther(totalUnclaimed), "BNB");

  if (unclaimedCount === 0n) {
    console.log("\n✅ All winnings already claimed. Nothing to distribute.");
    return;
  }

  // Get detailed winner list
  const [winners, amounts] = await batchDistributor.getUnclaimedWinners(marketId, participants);
  console.log("\n🏆 Winners to distribute:");
  for (let i = 0; i < winners.length; i++) {
    console.log(`  ${winners[i]}: ${hre.ethers.formatEther(amounts[i])} BNB`);
  }

  // Estimate gas
  console.log("\n⛽ Estimating gas...");
  const gasEstimate = await batchDistributor.distributeWinnings.estimateGas(marketId, participants);
  console.log("Estimated gas:", gasEstimate.toString());
  
  const gasPrice = (await hre.ethers.provider.getFeeData()).gasPrice;
  const estimatedCost = gasEstimate * gasPrice;
  console.log(`Estimated cost: ${hre.ethers.formatEther(estimatedCost)} BNB`);

  // Confirm before proceeding
  console.log("\n⚠️  Ready to distribute winnings to", unclaimedCount.toString(), "winners");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Execute distribution
  console.log("\n💸 Distributing winnings...");
  const tx = await batchDistributor.distributeWinnings(marketId, participants);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

  // Parse events
  const distributedEvents = receipt.logs
    .filter(log => {
      try {
        return batchDistributor.interface.parseLog(log).name === 'WinningsDistributed';
      } catch { return false; }
    })
    .map(log => batchDistributor.interface.parseLog(log));

  const failedEvents = receipt.logs
    .filter(log => {
      try {
        return batchDistributor.interface.parseLog(log).name === 'DistributionFailed';
      } catch { return false; }
    })
    .map(log => batchDistributor.interface.parseLog(log));

  console.log("\n📊 Distribution Results:");
  console.log("✅ Successful:", distributedEvents.length);
  console.log("❌ Failed:", failedEvents.length);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("Gas Cost:", hre.ethers.formatEther(receipt.gasUsed * receipt.gasPrice), "BNB");

  if (distributedEvents.length > 0) {
    console.log("\n✅ Successfully distributed to:");
    distributedEvents.forEach(event => {
      const { marketId, winner, amount } = event.args;
      console.log(`  ${winner}: ${hre.ethers.formatEther(amount)} BNB`);
    });
  }

  if (failedEvents.length > 0) {
    console.log("\n❌ Failed distributions:");
    failedEvents.forEach(event => {
      const { participant, reason } = event.args;
      console.log(`  ${participant}: ${reason}`);
    });
  }

  console.log("\n✅ Batch distribution complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Distribution failed:");
    console.error(error);
    process.exit(1);
  });
