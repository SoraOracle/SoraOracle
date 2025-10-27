const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2] || process.env.SORA_ORACLE_ADDRESS;
const PAIR_ADDRESS = process.argv[3];

// Common pairs
const PAIRS = {
  WBNB_BUSD: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
  WBNB_USDT: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE",
  CAKE_WBNB: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0"
};

async function displayPrices(oracleAddress, pairAddress, pairName) {
  try {
    const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
    const oracle = SoraOracle.attach(oracleAddress);

    // Get TWAP oracle
    const twapOracleAddress = await oracle.twapOracles(pairAddress);
    
    if (twapOracleAddress === hre.ethers.ZeroAddress) {
      console.log(`\n❌ [${pairName}] TWAP oracle not configured`);
      return;
    }

    const PancakeTWAPOracle = await hre.ethers.getContractFactory("PancakeTWAPOracle");
    const twap = PancakeTWAPOracle.attach(twapOracleAddress);

    const token0 = await twap.token0();
    const token1 = await twap.token1();
    const amount = hre.ethers.parseEther("1");

    console.log(`\n${"=".repeat(70)}`);
    console.log(`📊 ${pairName} Price Feed`);
    console.log("=".repeat(70));

    // Get SPOT price (for display only)
    try {
      const spotPrice0 = await twap.getCurrentPrice(token0, amount);
      const spotPrice1 = await twap.getCurrentPrice(token1, amount);
      
      console.log("\n💹 SPOT PRICE (Display Only - Can be manipulated):");
      console.log(`   1 Token0 = ${hre.ethers.formatEther(spotPrice0)} Token1`);
      console.log(`   1 Token1 = ${hre.ethers.formatEther(spotPrice1)} Token0`);
    } catch (e) {
      console.log("\n⚠️  Spot price unavailable");
    }

    // Get TWAP price (for settlements)
    try {
      const twapPrice0 = await twap.consult(token0, amount);
      const twapPrice1 = await twap.consult(token1, amount);
      
      console.log("\n⏱️  TWAP PRICE (For Settlements - Manipulation-resistant):");
      console.log(`   1 Token0 = ${hre.ethers.formatEther(twapPrice0)} Token1`);
      console.log(`   1 Token1 = ${hre.ethers.formatEther(twapPrice1)} Token0`);
      
      // Show observation data
      const observationNew = await twap.observationNew();
      const observationOld = await twap.observationOld();
      
      const timeElapsed = Number(observationNew.timestamp) - Number(observationOld.timestamp);
      const canUpdate = await twap.canUpdate();
      
      console.log("\n📈 TWAP Window:");
      console.log(`   Period: ${timeElapsed / 60} minutes`);
      console.log(`   Last Update: ${new Date(Number(observationNew.timestamp) * 1000).toLocaleString()}`);
      console.log(`   Can Update: ${canUpdate ? "✅ Yes" : "⏳ Not yet (wait 5 min)"}`);
      
    } catch (e) {
      console.log("\n⚠️  TWAP not ready (needs at least one 5-min update)");
      console.log(`   Error: ${e.message}`);
    }

    console.log("\n" + "=".repeat(70) + "\n");

  } catch (error) {
    console.error(`\n❌ Error fetching prices for ${pairName}:`, error.message);
  }
}

async function main() {
  if (!ORACLE_ADDRESS) {
    console.log("Usage: node scripts/get-prices.js <ORACLE_ADDRESS> [PAIR_ADDRESS]");
    console.log("\nOr set SORA_ORACLE_ADDRESS in .env\n");
    console.log("Available pairs:");
    Object.entries(PAIRS).forEach(([name, addr]) => {
      console.log(`  ${name}: ${addr}`);
    });
    process.exit(1);
  }

  console.log("\n🔮 Sora Oracle - Price Feed Display\n");
  console.log(`Oracle Address: ${ORACLE_ADDRESS}`);
  console.log(`Network: ${hre.network.name}\n`);

  if (PAIR_ADDRESS) {
    // Display specific pair
    await displayPrices(ORACLE_ADDRESS, PAIR_ADDRESS, "Custom Pair");
  } else {
    // Display all common pairs
    for (const [pairName, pairAddress] of Object.entries(PAIRS)) {
      await displayPrices(ORACLE_ADDRESS, pairAddress, pairName);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
