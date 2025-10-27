const hre = require("hardhat");
require("dotenv").config();

const ORACLE_ADDRESS = process.argv[2];
const PAIR_ADDRESS = process.argv[3];

async function main() {
  if (!ORACLE_ADDRESS || !PAIR_ADDRESS) {
    console.log("Usage: node scripts/update-twap.js <ORACLE_ADDRESS> <PAIR_ADDRESS>");
    console.log("\nExample pair addresses (BSC Mainnet):");
    console.log("WBNB/BUSD: 0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16");
    console.log("WBNB/USDT: 0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE");
    console.log("CAKE/WBNB: 0x0eD7e52944161450477ee417DE9Cd3a859b14fD0");
    process.exit(1);
  }

  console.log("📊 Updating TWAP Oracle\n");
  console.log("Oracle Address:", ORACLE_ADDRESS);
  console.log("Pair Address:", PAIR_ADDRESS, "\n");

  const [user] = await hre.ethers.getSigners();
  console.log("Using account:", user.address);

  const SoraOracle = await hre.ethers.getContractFactory("SoraOracle");
  const oracle = SoraOracle.attach(ORACLE_ADDRESS);

  // Get TWAP oracle address
  const twapOracleAddress = await oracle.twapOracles(PAIR_ADDRESS);
  
  if (twapOracleAddress === hre.ethers.ZeroAddress) {
    console.log("❌ TWAP oracle not set for this pair!");
    console.log("Add it first: npm run sora:add-twap", ORACLE_ADDRESS, PAIR_ADDRESS);
    process.exit(1);
  }

  console.log("TWAP Oracle:", twapOracleAddress);

  // Get TWAP oracle contract
  const PancakeTWAPOracle = await hre.ethers.getContractFactory("PancakeTWAPOracle");
  const twap = PancakeTWAPOracle.attach(twapOracleAddress);

  // Check if update is needed
  const canUpdate = await twap.canUpdate();
  
  if (!canUpdate) {
    console.log("\n⚠️  Update not needed yet (30 min period not elapsed)");
    
    const observationNew = await twap.observationNew();
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - Number(observationNew.timestamp);
    const remaining = (30 * 60) - elapsed;
    
    console.log(`Wait ${Math.ceil(remaining / 60)} more minutes`);
    process.exit(0);
  }

  console.log("\n✅ Updating TWAP oracle...");
  const tx = await twap.update();
  console.log("Transaction:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ TWAP updated in block:", receipt.blockNumber);

  // Show new observation
  const observationNew = await twap.observationNew();
  console.log("\n📈 New Observation:");
  console.log("Timestamp:", new Date(Number(observationNew.timestamp) * 1000).toLocaleString());
  console.log("Price0 Cumulative:", observationNew.price0Cumulative.toString());
  console.log("Price1 Cumulative:", observationNew.price1Cumulative.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
