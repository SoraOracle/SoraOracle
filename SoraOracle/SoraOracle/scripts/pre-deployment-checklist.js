/**
 * Pre-Deployment Checklist for S402 Mainnet
 * Validates all requirements before deploying to production
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

async function main() {
  console.log("\n🔍 S402 MAINNET PRE-DEPLOYMENT CHECKLIST\n");
  console.log("━".repeat(70));
  
  let failCount = 0;
  let warnCount = 0;
  
  // 1. Check network connection
  console.log("\n1️⃣  Network Configuration");
  try {
    const network = await hre.ethers.provider.getNetwork();
    if (network.chainId === 56n) {
      console.log("   ✅ Connected to BSC Mainnet (56)");
    } else {
      console.log(`   ❌ Wrong network! Got chain ID ${network.chainId}, expected 56`);
      failCount++;
    }
  } catch (error) {
    console.log("   ❌ Cannot connect to network:", error.message);
    failCount++;
  }
  
  // 2. Check deployer wallet
  console.log("\n2️⃣  Deployer Wallet");
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`   ✅ Deployer address: ${deployer.address}`);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    const balanceBNB = parseFloat(hre.ethers.formatEther(balance));
    
    if (balanceBNB >= 0.5) {
      console.log(`   ✅ Balance: ${balanceBNB.toFixed(4)} BNB (sufficient)`);
    } else if (balanceBNB >= 0.3) {
      console.log(`   ⚠️  Balance: ${balanceBNB.toFixed(4)} BNB (minimum, recommended 0.5+)`);
      warnCount++;
    } else {
      console.log(`   ❌ Balance: ${balanceBNB.toFixed(4)} BNB (insufficient!)`);
      failCount++;
    }
  } catch (error) {
    console.log("   ❌ Deployer wallet error:", error.message);
    failCount++;
  }
  
  // 3. Check USDC contract
  console.log("\n3️⃣  USDC Contract Verification");
  const USDC_MAINNET = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
  try {
    const usdc = await hre.ethers.getContractAt('IERC20', USDC_MAINNET);
    const decimals = await usdc.decimals ? await usdc.decimals() : 6;
    const name = await usdc.name ? await usdc.name().catch(() => 'USDC') : 'USDC';
    
    console.log(`   ✅ USDC contract found: ${USDC_MAINNET}`);
    console.log(`   ✅ Token: ${name} (${decimals} decimals)`);
  } catch (error) {
    console.log("   ❌ Cannot verify USDC contract:", error.message);
    failCount++;
  }
  
  // 4. Check BSCScan API key
  console.log("\n4️⃣  BSCScan API Configuration");
  const bscscanKey = process.env.BSCSCAN_API_KEY;
  if (bscscanKey && bscscanKey.length > 10) {
    console.log("   ✅ BSCScan API key configured");
  } else {
    console.log("   ⚠️  BSCScan API key missing (manual verification required)");
    warnCount++;
  }
  
  // 5. Check smart contract compilation
  console.log("\n5️⃣  Smart Contract Compilation");
  try {
    const artifactPath = path.join(__dirname, '../artifacts/contracts/S402Facilitator.sol/S402Facilitator.json');
    if (fs.existsSync(artifactPath)) {
      console.log("   ✅ S402Facilitator contract compiled");
      
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const bytecodeSize = artifact.bytecode.length / 2 - 1; // Hex to bytes
      console.log(`   ✅ Bytecode size: ${bytecodeSize.toLocaleString()} bytes`);
      
      if (bytecodeSize > 24576) {
        console.log("   ⚠️  Warning: Contract exceeds 24KB limit!");
        warnCount++;
      }
    } else {
      console.log("   ❌ Contract not compiled! Run: npx hardhat compile");
      failCount++;
    }
  } catch (error) {
    console.log("   ❌ Compilation check failed:", error.message);
    failCount++;
  }
  
  // 6. Check gas price
  console.log("\n6️⃣  Gas Price Analysis");
  try {
    const feeData = await hre.ethers.provider.getFeeData();
    const gasPriceGwei = parseFloat(hre.ethers.formatUnits(feeData.gasPrice, "gwei"));
    
    if (gasPriceGwei <= 5) {
      console.log(`   ✅ Gas price: ${gasPriceGwei.toFixed(2)} Gwei (excellent)`);
    } else if (gasPriceGwei <= 10) {
      console.log(`   ✅ Gas price: ${gasPriceGwei.toFixed(2)} Gwei (good)`);
    } else {
      console.log(`   ⚠️  Gas price: ${gasPriceGwei.toFixed(2)} Gwei (high, consider waiting)`);
      warnCount++;
    }
    
    const estimatedGas = 5000000n;
    const estimatedCost = feeData.gasPrice * estimatedGas;
    console.log(`   📊 Estimated deployment cost: ${hre.ethers.formatEther(estimatedCost)} BNB`);
  } catch (error) {
    console.log("   ⚠️  Cannot fetch gas price:", error.message);
    warnCount++;
  }
  
  // 7. Check documentation
  console.log("\n7️⃣  Documentation");
  const docs = [
    'V5_DEPLOYMENT_GUIDE.md',
    'V5_OPERATIONS_MANUAL.md',
    'SORA_ORACLE_TECHNICAL_SPECIFICATION.md'
  ];
  
  docs.forEach(doc => {
    if (fs.existsSync(path.join(__dirname, '..', doc))) {
      console.log(`   ✅ ${doc}`);
    } else {
      console.log(`   ⚠️  ${doc} missing`);
      warnCount++;
    }
  });
  
  // 8. Security checklist
  console.log("\n8️⃣  Security Checklist");
  console.log("   ⚠️  Review before deployment:");
  console.log("      □ Contract audited or reviewed?");
  console.log("      □ Platform fee set correctly (1% = 100 bps)?");
  console.log("      □ Emergency procedures documented?");
  console.log("      □ Multi-sig wallet ready for ownership transfer?");
  console.log("      □ Monitoring dashboard configured?");
  
  // Final summary
  console.log("\n━".repeat(70));
  console.log("\n📋 CHECKLIST SUMMARY\n");
  
  if (failCount === 0 && warnCount === 0) {
    console.log("✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT!");
  } else if (failCount === 0) {
    console.log(`⚠️  WARNINGS: ${warnCount} - Review before deployment`);
  } else {
    console.log(`❌ FAILURES: ${failCount} - DO NOT DEPLOY!`);
    console.log(`⚠️  WARNINGS: ${warnCount}`);
  }
  
  console.log("\n━".repeat(70));
  
  if (failCount === 0) {
    console.log("\n🚀 To deploy to mainnet:");
    console.log("   npx hardhat run scripts/deploy-s402-mainnet.js --network bscMainnet\n");
  } else {
    console.log("\n❌ Fix errors before deploying!\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Checklist failed!");
    console.error(error);
    process.exit(1);
  });
