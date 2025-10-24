/**
 * Test Sora Oracle V3.0 Deployment
 * 
 * Verifies all contracts are working correctly after deployment
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Sora Oracle V3.0 Deployment on BSC Testnet\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/testnet-v3.json");
  if (!fs.existsSync(deploymentPath)) {
    console.log("❌ No deployment found! Run deploy-v3-testnet.js first");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const { contracts } = deployment;

  const [tester] = await hre.ethers.getSigners();
  console.log("Testing with account:", tester.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(tester.address)), "BNB\n");

  let passed = 0;
  let failed = 0;

  // Test 1: SoraOracle - Ask a question
  console.log("📝 Test 1: SoraOracle - Ask Question");
  try {
    const SoraOracle = await hre.ethers.getContractAt("SoraOracle", contracts.SoraOracle);
    const questionFee = await SoraOracle.questionFee();
    console.log("   Question fee:", hre.ethers.formatEther(questionFee), "BNB");
    
    const tx = await SoraOracle.askYesNoQuestion("Will this test pass?", { value: questionFee });
    const receipt = await tx.wait();
    console.log("   ✅ Question asked! Gas used:", receipt.gasUsed.toString());
    passed++;
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 2: SimplePredictionMarket - Create Market
  console.log("\n📝 Test 2: SimplePredictionMarket - Create Market");
  try {
    const SoraOracle = await hre.ethers.getContractAt("SoraOracle", contracts.SoraOracle);
    const PredictionMarket = await hre.ethers.getContractAt("SimplePredictionMarket", contracts.SimplePredictionMarket);
    
    // First ask a question
    const questionFee = await SoraOracle.questionFee();
    const tx1 = await SoraOracle.askYesNoQuestion("Will BNB hit $1000?", { value: questionFee });
    const receipt1 = await tx1.wait();
    
    const event = receipt1.logs.find(log => {
      try {
        const parsed = SoraOracle.interface.parseLog(log);
        return parsed && parsed.name === "QuestionAsked";
      } catch (e) {
        return false;
      }
    });
    
    const questionId = event ? SoraOracle.interface.parseLog(event).args.questionId : null;
    
    if (questionId) {
      const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
      const tx2 = await PredictionMarket.createMarket(questionId, "Will BNB hit $1000?", deadline);
      const receipt2 = await tx2.wait();
      console.log("   ✅ Market created! Gas used:", receipt2.gasUsed.toString());
      passed++;
    } else {
      throw new Error("Could not get questionId");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 3: BatchOracleOperations - Check batch limit
  console.log("\n📝 Test 3: BatchOracleOperations - Check Config");
  try {
    const BatchOps = await hre.ethers.getContractAt("BatchOracleOperations", contracts.BatchOracleOperations);
    const maxBatch = await BatchOps.MAX_BATCH_SIZE();
    console.log("   Max batch size:", maxBatch.toString());
    
    if (maxBatch == 20n) {
      console.log("   ✅ Batch operations configured correctly");
      passed++;
    } else {
      throw new Error("Unexpected batch size");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 4: OracleReputationTracker - Check integration
  console.log("\n📝 Test 4: OracleReputationTracker - Check Integration");
  try {
    const ReputationTracker = await hre.ethers.getContractAt("OracleReputationTracker", contracts.OracleReputationTracker);
    const oracleAddress = await ReputationTracker.oracleContract();
    
    if (oracleAddress.toLowerCase() === contracts.SoraOracle.toLowerCase()) {
      console.log("   ✅ Reputation tracker correctly linked to oracle");
      passed++;
    } else {
      throw new Error("Reputation tracker not linked correctly");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 5: DisputeResolution - Check stake amount
  console.log("\n📝 Test 5: DisputeResolution - Check Config");
  try {
    const DisputeResolution = await hre.ethers.getContractAt("DisputeResolution", contracts.DisputeResolution);
    const stakeAmount = await DisputeResolution.DISPUTE_STAKE();
    console.log("   Dispute stake:", hre.ethers.formatEther(stakeAmount), "BNB");
    
    if (stakeAmount > 0n) {
      console.log("   ✅ Dispute resolution configured");
      passed++;
    } else {
      throw new Error("Invalid stake amount");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 6: AutomatedMarketResolver - Check threshold
  console.log("\n📝 Test 6: AutomatedMarketResolver - Check Config");
  try {
    const MarketResolver = await hre.ethers.getContractAt("AutomatedMarketResolver", contracts.AutomatedMarketResolver);
    const threshold = await MarketResolver.confidenceThreshold();
    console.log("   Confidence threshold:", threshold.toString(), "%");
    
    if (threshold >= 80n && threshold <= 95n) {
      console.log("   ✅ Market resolver configured correctly");
      passed++;
    } else {
      throw new Error("Unexpected confidence threshold");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 7: BatchPayoutDistributor - Check integration
  console.log("\n📝 Test 7: BatchPayoutDistributor - Check Integration");
  try {
    const PayoutDistributor = await hre.ethers.getContractAt("BatchPayoutDistributor", contracts.BatchPayoutDistributor);
    const marketAddress = await PayoutDistributor.predictionMarket();
    
    if (marketAddress.toLowerCase() === contracts.SimplePredictionMarket.toLowerCase()) {
      console.log("   ✅ Payout distributor correctly linked");
      passed++;
    } else {
      throw new Error("Payout distributor not linked correctly");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Test 8: PancakeTWAPOracle - Check factory
  console.log("\n📝 Test 8: PancakeTWAPOracle - Check Factory");
  try {
    const TWAPOracle = await hre.ethers.getContractAt("PancakeTWAPOracle", contracts.PancakeTWAPOracle);
    const factory = await TWAPOracle.factory();
    console.log("   PancakeSwap Factory:", factory);
    
    if (factory.toLowerCase() === deployment.pancakeFactory.toLowerCase()) {
      console.log("   ✅ TWAP oracle correctly configured");
      passed++;
    } else {
      throw new Error("Wrong factory address");
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Results:");
  console.log("=".repeat(60));
  console.log(`   ✅ Passed: ${passed}/8`);
  console.log(`   ❌ Failed: ${failed}/8`);
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log("\n🎉 All tests passed! V3 deployment is working correctly!\n");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the deployment.\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
