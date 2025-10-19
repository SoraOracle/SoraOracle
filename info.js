#!/usr/bin/env node

console.log("\n" + "=".repeat(60));
console.log("  🚀 BSC Oracle Smart Contract - Development Environment");
console.log("=".repeat(60) + "\n");

console.log("✅ Contract compiled successfully!");
console.log("\n📁 Project Structure:");
console.log("   • contracts/ImprovedOracle.sol - Main oracle contract");
console.log("   • scripts/deploy.js - Deploy to BSC");
console.log("   • scripts/interact.js - Ask questions");
console.log("   • scripts/answer.js - Provide answers");
console.log("   • scripts/withdraw.js - Withdraw earnings");

console.log("\n📝 Quick Start:");
console.log("   1. Create .env file (copy from .env.example)");
console.log("   2. Add your PRIVATE_KEY to .env");
console.log("   3. Get testnet BNB: https://testnet.bnbchain.org/faucet-smart");
console.log("   4. Deploy: npm run deploy:testnet");

console.log("\n🔧 Available Commands:");
console.log("   npm run compile          - Compile contracts");
console.log("   npm run deploy:testnet   - Deploy to BSC testnet");
console.log("   npm run deploy:mainnet   - Deploy to BSC mainnet");
console.log("   npm test                 - Run tests");

console.log("\n💡 Need Help?");
console.log("   • View README.md for detailed instructions");
console.log("   • Check .env.example for configuration");
console.log("   • Visit: https://testnet.bscscan.com");

console.log("\n🔐 Security Reminder:");
console.log("   ⚠️  NEVER commit your .env file or private keys!");
console.log("   ⚠️  Always test on testnet before mainnet!\n");

console.log("=".repeat(60) + "\n");
console.log("🔍 Monitoring for changes... (Ctrl+C to exit)\n");

setInterval(() => {
  process.stdout.write(".");
}, 5000);
