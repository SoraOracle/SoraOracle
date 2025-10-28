// Deploy S402Facilitator v3 with settlePayment() function
const hre = require("hardhat");

const USD1_ADDRESS = "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d"; // World Liberty Financial USD on BSC

async function main() {
  console.log("🚀 Deploying S402Facilitator v3 to BSC Mainnet...");
  console.log("USD1 Token:", USD1_ADDRESS);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer BNB balance:", hre.ethers.formatEther(balance), "BNB");
  console.log("");

  if (balance < hre.ethers.parseEther("0.01")) {
    throw new Error("Insufficient BNB balance for deployment (need at least 0.01 BNB)");
  }

  // Deploy S402Facilitator
  console.log("Deploying S402Facilitator...");
  const S402Facilitator = await hre.ethers.getContractFactory("S402Facilitator");
  const facilitator = await S402Facilitator.deploy(USD1_ADDRESS);

  await facilitator.waitForDeployment();
  const address = await facilitator.getAddress();

  console.log("");
  console.log("✅ S402Facilitator v3 deployed!");
  console.log("📍 Contract address:", address);
  console.log("🔍 BSCScan:", `https://bscscan.com/address/${address}`);
  console.log("");
  
  // Get platform fee
  const platformFeeBps = await facilitator.platformFeeBps();
  console.log("Platform fee:", platformFeeBps.toString(), "bps (", (Number(platformFeeBps) / 100).toFixed(2), "%)");
  
  // Get domain separator
  const domainSeparator = await facilitator.DOMAIN_SEPARATOR();
  console.log("Domain separator:", domainSeparator);
  console.log("");

  console.log("⏳ Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Verify on BSCScan
  console.log("🔍 Verifying contract on BSCScan...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [USD1_ADDRESS],
    });
    console.log("✅ Contract verified on BSCScan!");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
    console.log("You can verify manually later with:");
    console.log(`npx hardhat verify --network bsc ${address} ${USD1_ADDRESS}`);
  }

  console.log("");
  console.log("📋 Deployment Summary:");
  console.log("=====================");
  console.log("Network: BSC Mainnet (56)");
  console.log("S402Facilitator:", address);
  console.log("USD1 Token:", USD1_ADDRESS);
  console.log("Platform Fee: 1%");
  console.log("");
  console.log("🔧 Next Steps:");
  console.log("1. Update frontend/src/pages/S402DemoPage.tsx with new address");
  console.log("2. Update src/sdk/s402-config.ts with new address");
  console.log("3. Approve USD1 for new contract");
  console.log("4. Test payment flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
