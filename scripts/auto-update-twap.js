const hre = require("hardhat");
require("dotenv").config();

// Configuration
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS;

// Common trading pairs on BSC
const PAIRS = {
  WBNB_BUSD: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
  WBNB_USDT: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE",
  CAKE_WBNB: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0"
};

let updateCount = 0;
let errorCount = 0;

async function updateTWAPOracle(oracleAddress, pairAddress, pairName) {
  try {
    const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
    const oracle = SoraOracle.attach(oracleAddress);

    // Get TWAP oracle address for this pair
    const twapOracleAddress = await oracle.twapOracles(pairAddress);
    
    if (twapOracleAddress === hre.ethers.ZeroAddress) {
      console.log(`⚠️  [${pairName}] TWAP oracle not set - skipping`);
      return false;
    }

    // Get TWAP oracle contract
    const PancakeTWAPOracle = await hre.ethers.getContractFactory("PancakeTWAPOracle");
    const twap = PancakeTWAPOracle.attach(twapOracleAddress);

    // Check if update is needed
    const canUpdate = await twap.canUpdate();
    
    if (!canUpdate) {
      console.log(`⏳ [${pairName}] Update not needed yet (5 min period not elapsed)`);
      return false;
    }

    // Get current spot price for display
    const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    try {
      const spotPrice = await twap.getCurrentPrice(WBNB, hre.ethers.parseEther("1"));
      console.log(`📊 [${pairName}] Current spot price: ${hre.ethers.formatEther(spotPrice)} per 1 WBNB`);
    } catch (e) {
      // Ignore spot price errors
    }

    // Update TWAP
    console.log(`🔄 [${pairName}] Updating TWAP oracle...`);
    const tx = await twap.update();
    const receipt = await tx.wait();
    
    console.log(`✅ [${pairName}] TWAP updated! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);
    updateCount++;
    return true;

  } catch (error) {
    if (error.message.includes("Period not elapsed")) {
      console.log(`⏳ [${pairName}] Period not elapsed - waiting...`);
    } else {
      console.error(`❌ [${pairName}] Update failed:`, error.message);
      errorCount++;
    }
    return false;
  }
}

async function runUpdater() {
  console.log("\n" + "=".repeat(70));
  console.log("🤖 TWAP Auto-Updater Starting");
  console.log("=".repeat(70));
  console.log(`⏰ Update Interval: ${UPDATE_INTERVAL / 1000 / 60} minutes`);
  console.log(`📍 Oracle Address: ${ORACLE_ADDRESS || 'Not set - use env SORA_ORACLE_ADDRESS'}`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log("=".repeat(70) + "\n");

  if (!ORACLE_ADDRESS) {
    console.error("❌ ERROR: SORA_ORACLE_ADDRESS not set in .env file!");
    console.log("\nPlease add to .env:");
    console.log("SORA_ORACLE_ADDRESS=0xYourOracleAddress\n");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  console.log(`👤 Updater Account: ${signer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log(`💰 Account Balance: ${hre.ethers.formatEther(balance)} BNB\n`);

  if (balance < hre.ethers.parseEther("0.01")) {
    console.warn("⚠️  WARNING: Low balance! You may run out of gas for updates.\n");
  }

  // Update function
  const performUpdate = async () => {
    const timestamp = new Date().toLocaleString();
    console.log(`\n⏰ [${timestamp}] Running scheduled update...`);
    console.log("-".repeat(70));

    // Update all configured pairs
    for (const [pairName, pairAddress] of Object.entries(PAIRS)) {
      await updateTWAPOracle(ORACLE_ADDRESS, pairAddress, pairName);
    }

    console.log("-".repeat(70));
    console.log(`📊 Stats: ${updateCount} updates, ${errorCount} errors`);
    console.log(`⏰ Next update in ${UPDATE_INTERVAL / 1000 / 60} minutes...\n`);
  };

  // Run immediately on start
  await performUpdate();

  // Then run on interval
  setInterval(performUpdate, UPDATE_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n\n" + "=".repeat(70));
  console.log("🛑 TWAP Auto-Updater Shutting Down");
  console.log("=".repeat(70));
  console.log(`📊 Final Stats: ${updateCount} total updates, ${errorCount} errors`);
  console.log("👋 Goodbye!\n");
  process.exit(0);
});

// Start the updater
runUpdater()
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
