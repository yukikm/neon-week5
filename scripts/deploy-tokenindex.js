const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TokenIndex contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // First deploy CallRaydiumProgram
  console.log("\nDeploying CallRaydiumProgram...");
  const CallRaydiumProgram = await ethers.getContractFactory(
    "CallRaydiumProgram"
  );
  const raydiumProgram = await CallRaydiumProgram.deploy();
  await raydiumProgram.waitForDeployment();
  const raydiumProgramAddress = await raydiumProgram.getAddress();
  console.log("CallRaydiumProgram deployed to:", raydiumProgramAddress);

  // For this demo, we'll use a mock USDC token address
  // In a real deployment, you'd use the actual USDC token contract
  const depositTokenAddress = "0x1234567890123456789012345678901234567890"; // Mock USDC address

  // Deploy TokenIndex
  console.log("\nDeploying TokenIndex...");
  const TokenIndex = await ethers.getContractFactory("TokenIndex");
  const tokenIndex = await TokenIndex.deploy(
    depositTokenAddress,
    raydiumProgramAddress,
    "TokenIndex LP",
    "TILP"
  );
  await tokenIndex.waitForDeployment();
  const tokenIndexAddress = await tokenIndex.getAddress();
  console.log("TokenIndex deployed to:", tokenIndexAddress);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const deployedDepositToken = await tokenIndex.depositToken();
  const deployedRaydiumProgram = await tokenIndex.raydiumProgram();
  const name = await tokenIndex.name();
  const symbol = await tokenIndex.symbol();

  console.log("Deposit Token:", deployedDepositToken);
  console.log("Raydium Program:", deployedRaydiumProgram);
  console.log("Token Name:", name);
  console.log("Token Symbol:", symbol);

  // Example: Add some pool allocations
  console.log("\nAdding example pool allocations...");

  // Mock token addresses for demonstration
  const usdcAddress = "0x1111111111111111111111111111111111111111";
  const usdtAddress = "0x2222222222222222222222222222222222222222";
  const solAddress = "0x3333333333333333333333333333333333333333";
  const bonkAddress = "0x4444444444444444444444444444444444444444";

  try {
    // Add USDC-USDT pool (50% weight)
    await tokenIndex.addPoolAllocation(usdcAddress, usdtAddress, 0, 5000);
    console.log("Added USDC-USDT pool allocation (50%)");

    // Add SOL-USDC pool (30% weight)
    await tokenIndex.addPoolAllocation(solAddress, usdcAddress, 1, 3000);
    console.log("Added SOL-USDC pool allocation (30%)");

    // Add BONK-USDC pool (20% weight)
    await tokenIndex.addPoolAllocation(bonkAddress, usdcAddress, 2, 2000);
    console.log("Added BONK-USDC pool allocation (20%)");

    console.log("Total weight:", await tokenIndex.totalWeight());
    console.log("Active pools:", await tokenIndex.getActivePoolCount());
  } catch (error) {
    console.log("Note: Pool allocations can only be added by owner");
  }

  console.log("\nDeployment completed successfully!");
  console.log("==========================================");
  console.log("Contract Addresses:");
  console.log("CallRaydiumProgram:", raydiumProgramAddress);
  console.log("TokenIndex:", tokenIndexAddress);
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
