const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying ImprovedOracle to BSC Testnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "BNB\n");

  const oracleProviderAddress = process.env.ORACLE_PROVIDER_ADDRESS || deployer.address;
  console.log("Oracle Provider Address:", oracleProviderAddress);

  const ImprovedOracle = await hre.ethers.getContractFactory("ImprovedOracle");
  const oracle = await ImprovedOracle.deploy(oracleProviderAddress);

  await oracle.waitForDeployment();
  const address = await oracle.getAddress();

  console.log("\n✅ ImprovedOracle deployed to:", address);
  console.log("\n📝 Next steps:");
  console.log("1. Get free testnet BNB from: https://testnet.bnbchain.org/faucet-smart");
  console.log("2. View your contract on BscScan: https://testnet.bscscan.com/address/" + address);
  console.log("3. Verify your contract with: npx hardhat verify --network bscTestnet", address, oracleProviderAddress);
  console.log("\n💡 Save this contract address for interacting with the oracle!");

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
