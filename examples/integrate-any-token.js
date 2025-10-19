/**
 * Example: Query ANY PancakeSwap pair (Permissionless)
 * 
 * This example shows how to use Sora Oracle with ANY token pair.
 * No whitelist. No approval needed. Just plug and play.
 */

const { ethers } = require("hardhat");

async function main() {
    // Connect to deployed Sora Oracle
    const ORACLE_ADDRESS = process.env.SORA_ORACLE_ADDRESS;
    const oracle = await ethers.getContractAt("SoraOracle", ORACLE_ADDRESS);
    
    console.log("\n🌐 PERMISSIONLESS ORACLE - Use ANY Token!\n");
    
    // ============================================
    // Example 1: Query popular pair (already exists)
    // ============================================
    const WBNB_BUSD_PAIR = "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16";
    const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    
    console.log("📊 Example 1: Query existing pair (WBNB/BUSD)");
    const wbnbPrice = await oracle.getTWAPPrice(WBNB_BUSD_PAIR, WBNB, ethers.parseEther("1"));
    console.log(`   TWAP Price: 1 WBNB = ${ethers.formatEther(wbnbPrice)} BUSD`);
    console.log("   ✅ Oracle already exists - cheap query!\n");
    
    // ============================================
    // Example 2: Add YOUR custom token (permissionless!)
    // ============================================
    console.log("📊 Example 2: Add your own token (Permissionless!)");
    
    // Step 1: Find your token's PancakeSwap pair
    const PANCAKE_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
    const factory = await ethers.getContractAt(
        ["function getPair(address,address) view returns (address)"],
        PANCAKE_FACTORY
    );
    
    // Replace with YOUR token address
    const YOUR_TOKEN = "0xYourTokenAddress"; // <-- Put your token here
    const YOUR_PAIR = await factory.getPair(YOUR_TOKEN, WBNB);
    
    console.log(`   Your Token: ${YOUR_TOKEN}`);
    console.log(`   Pair Address: ${YOUR_PAIR}`);
    
    if (YOUR_PAIR === ethers.ZeroAddress) {
        console.log("   ⚠️  No PancakeSwap pair found for this token");
        console.log("   💡 Create liquidity on PancakeSwap first!");
    } else {
        // Step 2: Query the price - auto-creates TWAP oracle!
        console.log("\n   Querying price (auto-creates TWAP if needed)...");
        const tx = await oracle.getTWAPPrice(YOUR_PAIR, YOUR_TOKEN, ethers.parseEther("1"));
        console.log(`   ✅ Price: ${ethers.formatEther(tx)} per token`);
        console.log("   🎉 TWAP oracle auto-created on first query!");
    }
    
    // ============================================
    // Example 3: Pre-create oracle (optional)
    // ============================================
    console.log("\n📊 Example 3: Explicitly create oracle (optional)");
    
    const CAKE_WBNB_PAIR = "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0";
    
    // Check if oracle exists
    const oracleAddr = await oracle.twapOracles(CAKE_WBNB_PAIR);
    
    if (oracleAddr === ethers.ZeroAddress) {
        console.log("   Creating TWAP oracle for CAKE/WBNB...");
        await oracle.addTWAPOracle(CAKE_WBNB_PAIR);
        console.log("   ✅ Oracle created!");
    } else {
        console.log("   ✅ Oracle already exists");
    }
    
    // ============================================
    // Example 4: Build on top of the SDK
    // ============================================
    console.log("\n📊 Example 4: Build your own prediction market");
    console.log(`
    // Your contract can use ANY pair:
    contract MyPredictionMarket {
        SoraOracle public oracle;
        
        function createMarket(address pair, address token) external {
            // Get current price (auto-creates TWAP if needed)
            uint256 currentPrice = oracle.getTWAPPrice(pair, token, 1e18);
            
            // Create prediction: Will price 2x?
            // ... your logic here
        }
    }
    `);
    
    // ============================================
    // Key Points
    // ============================================
    console.log("\n🔑 Key Points:");
    console.log("   ✅ No whitelist - works with ANY PancakeSwap pair");
    console.log("   ✅ No approval needed - just query and go");
    console.log("   ✅ Auto-creates oracle on first use (lazy creation)");
    console.log("   ✅ Open source - fork, modify, use commercially");
    console.log("   ✅ MIT License - build whatever you want");
    
    console.log("\n🚀 Start building permissionless DeFi apps!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
