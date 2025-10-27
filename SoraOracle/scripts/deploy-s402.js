/**
 * Deploy S402Facilitator to BNB Testnet
 */

const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Deploying S402Facilitator to BNB Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Deploying from: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} BNB\n`);

  // BNB Testnet USDC (Binance Bridged)
  const USDC_TESTNET = "0x64544969ed7EBf5f083679233325356EbE738930";
  
  console.log(`🪙  USDC Contract: ${USDC_TESTNET}\n`);

  // Deploy S402Facilitator
  console.log("📦 Deploying S402Facilitator...");
  const S402Facilitator = await hre.ethers.getContractFactory("S402Facilitator");
  const facilitator = await S402Facilitator.deploy(USDC_TESTNET);
  
  await facilitator.waitForDeployment();
  const facilitatorAddress = await facilitator.getAddress();
  
  console.log(`✅ S402Facilitator deployed to: ${facilitatorAddress}\n`);

  // Wait for a few block confirmations before verifying
  console.log("⏳ Waiting for block confirmations...");
  await facilitator.deploymentTransaction().wait(5);
  
  console.log("\n📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`S402Facilitator: ${facilitatorAddress}`);
  console.log(`USDC:            ${USDC_TESTNET}`);
  console.log(`Network:         BNB Testnet (97)`);
  console.log(`Platform Fee:    1% (100 bps)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verify on BSCScan
  console.log("🔍 Verifying contract on BSCScan...");
  try {
    await hre.run("verify:verify", {
      address: facilitatorAddress,
      constructorArguments: [USDC_TESTNET],
    });
    console.log("✅ Contract verified on BSCScan!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!\n");
    } else {
      console.log("⚠️  Verification failed (manual verification may be needed)");
      console.log(`Error: ${error.message}\n`);
    }
  }

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "bscTestnet",
    chainId: 97,
    facilitator: facilitatorAddress,
    usdc: USDC_TESTNET,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  fs.writeFileSync(
    'deployment-s402.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to deployment-s402.json\n");
  
  console.log("🎉 Deployment complete!");
  console.log("\n📚 Next steps:");
  console.log("1. Update .env with:");
  console.log(`   S402_FACILITATOR_ADDRESS=${facilitatorAddress}`);
  console.log("2. Fund your wallet with testnet USDC");
  console.log("3. Test payment flow with s402 SDK\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
