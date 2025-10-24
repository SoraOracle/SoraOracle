/**
 * Comprehensive compilation script for Sora Oracle V3
 * 
 * Compiles contracts and SDK to ensure everything is ready for deployment
 */

const { execSync } = require('child_process');
const path = require('path');

console.log("🔨 Compiling Sora Oracle V3.0\n");

const steps = [
  {
    name: "Smart Contracts",
    command: "npx hardhat compile",
    cwd: process.cwd()
  },
  {
    name: "TypeScript SDK",
    command: "npm run build",
    cwd: path.join(process.cwd(), "sdk")
  },
  {
    name: "Frontend",
    command: "npm run build",
    cwd: path.join(process.cwd(), "frontend")
  }
];

let allPassed = true;

for (const step of steps) {
  console.log(`📝 Compiling ${step.name}...`);
  try {
    const output = execSync(step.command, { 
      cwd: step.cwd,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(`✅ ${step.name} compiled successfully`);
    if (output && output.trim()) {
      console.log(`   ${output.trim()}`);
    }
  } catch (error) {
    console.log(`❌ ${step.name} compilation failed:`);
    console.log(error.stdout || error.message);
    allPassed = false;
  }
  console.log("");
}

if (allPassed) {
  console.log("🎉 All components compiled successfully!");
  console.log("\n✅ Ready for deployment!");
} else {
  console.log("⚠️  Some compilations failed. Please fix errors before deploying.");
  process.exit(1);
}
