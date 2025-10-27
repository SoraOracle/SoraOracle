/**
 * Deploy S402Facilitator to BNB MAINNET
 * 
 * ⚠️ WARNING: This deploys to MAINNET with REAL funds
 * Ensure you have:
 * 1. PRIVATE_KEY set in environment
 * 2. At least 0.5 BNB for gas
 * 3. BSCSCAN_API_KEY for contract verification
 */

const hre = require("hardhat");

async function main() {
  console.log("\n🚨 DEPLOYING TO BNB CHAIN MAINNET 🚨\n");
  console.log("⚠️  This deployment uses REAL funds on mainnet!");
  console.log("⚠️  Double-check all configuration before proceeding!\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Deployer: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} BNB\n`);

  if (balance < hre.ethers.parseEther("0.3")) {
    throw new Error("❌ Insufficient BNB balance! Need at least 0.3 BNB for deployment");
  }

  // BNB Chain Mainnet USDC (Binance Bridged)
  const USDC_MAINNET = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
  
  console.log(`🪙  USDC Contract (Mainnet): ${USDC_MAINNET}`);
  console.log(`    (Binance-Bridged USDC, EIP-2612 compatible)\n`);

  // Verify we're on mainnet
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 56n) {
    throw new Error(`❌ Wrong network! Expected BSC Mainnet (56), got ${network.chainId}`);
  }
  console.log("✅ Confirmed: Connected to BSC Mainnet (56)\n");

  // Get gas price
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPriceGwei = hre.ethers.formatUnits(feeData.gasPrice, "gwei");
  console.log(`⛽ Current Gas Price: ${gasPriceGwei} Gwei\n`);

  // Deploy S402Facilitator
  console.log("📦 Deploying S402Facilitator to MAINNET...");
  const S402Facilitator = await hre.ethers.getContractFactory("S402Facilitator");
  const facilitator = await S402Facilitator.deploy(USDC_MAINNET);
  
  await facilitator.waitForDeployment();
  const facilitatorAddress = await facilitator.getAddress();
  
  console.log(`✅ S402Facilitator deployed to: ${facilitatorAddress}\n`);

  // Wait for confirmations
  console.log("⏳ Waiting for 6 block confirmations (security best practice)...");
  await facilitator.deploymentTransaction().wait(6);
  console.log("✅ Transaction confirmed!\n");
  
  // Get deployment info
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  const deployTx = await facilitator.deploymentTransaction();
  const receipt = await deployTx.wait();
  const gasUsed = receipt.gasUsed;
  const deploymentCost = gasUsed * feeData.gasPrice;
  
  console.log("\n📋 MAINNET DEPLOYMENT SUMMARY");
  console.log("━".repeat(60));
  console.log(`Network:          BNB Chain Mainnet (56)`);
  console.log(`S402Facilitator:  ${facilitatorAddress}`);
  console.log(`USDC:             ${USDC_MAINNET}`);
  console.log(`Deployer:         ${deployer.address}`);
  console.log(`Block Number:     ${blockNumber}`);
  console.log(`Transaction:      ${deployTx.hash}`);
  console.log(`Gas Used:         ${gasUsed.toString()}`);
  console.log(`Deployment Cost:  ${hre.ethers.formatEther(deploymentCost)} BNB`);
  console.log(`Platform Fee:     1% (100 bps)`);
  console.log(`Owner:            ${deployer.address}`);
  console.log("━".repeat(60) + "\n");

  // Verify on BSCScan
  console.log("🔍 Verifying contract on BSCScan...");
  try {
    await hre.run("verify:verify", {
      address: facilitatorAddress,
      constructorArguments: [USDC_MAINNET],
    });
    console.log("✅ Contract verified on BSCScan!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified!\n");
    } else {
      console.log("⚠️  Verification failed (you can verify manually on BSCScan)");
      console.log(`Error: ${error.message}\n`);
    }
  }

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "bscMainnet",
    chainId: 56,
    facilitator: facilitatorAddress,
    usdc: USDC_MAINNET,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: blockNumber,
    transactionHash: deployTx.hash,
    gasUsed: gasUsed.toString(),
    deploymentCostBNB: hre.ethers.formatEther(deploymentCost),
    platformFeeBps: 100,
    bscscanUrl: `https://bscscan.com/address/${facilitatorAddress}`,
    verified: true
  };

  fs.writeFileSync(
    'deployment-s402-mainnet.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to deployment-s402-mainnet.json\n");
  
  console.log("🎉 MAINNET DEPLOYMENT COMPLETE!");
  console.log("\n📚 NEXT STEPS:");
  console.log("━".repeat(60));
  console.log("1. Update environment variables:");
  console.log(`   S402_FACILITATOR_ADDRESS=${facilitatorAddress}`);
  console.log(`   S402_NETWORK=mainnet`);
  console.log("");
  console.log("2. Update frontend config:");
  console.log(`   - Edit frontend/src/config.ts`);
  console.log(`   - Set s402FacilitatorAddress: "${facilitatorAddress}"`);
  console.log("");
  console.log("3. Update SDK configuration:");
  console.log(`   - Update src/sdk/s402-config.ts with mainnet settings`);
  console.log("");
  console.log("4. Monitor contract on BSCScan:");
  console.log(`   https://bscscan.com/address/${facilitatorAddress}`);
  console.log("");
  console.log("5. Test payment flow with REAL USDC (start small!)");
  console.log("");
  console.log("6. Set up monitoring & alerts for:");
  console.log("   - PaymentSettled events");
  console.log("   - Accumulated fees");
  console.log("   - Platform fee balance");
  console.log("━".repeat(60) + "\n");
  
  console.log("⚠️  SECURITY REMINDERS:");
  console.log("- Only you (deployer) can update platform fees");
  console.log("- Only you can withdraw accumulated fees");
  console.log("- Consider transferring ownership to multi-sig wallet");
  console.log("- Monitor contract for unusual activity\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED!");
    console.error(error);
    process.exit(1);
  });
