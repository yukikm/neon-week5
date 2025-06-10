const { ethers } = require("hardhat");

async function main() {
  console.log("TokenIndex Usage Examples");
  console.log("========================");

  // Get signers
  const [owner, user1, user2] = await ethers.getSigners();
  console.log("Owner:", owner.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);

  // Deploy contracts (in real scenario, you'd connect to existing deployed contracts)
  const CallRaydiumProgram = await ethers.getContractFactory(
    "CallRaydiumProgram"
  );
  const raydiumProgram = await CallRaydiumProgram.deploy();
  await raydiumProgram.waitForDeployment();

  const mockUSDC = "0x1111111111111111111111111111111111111111";

  const TokenIndex = await ethers.getContractFactory("TokenIndex");
  const tokenIndex = await TokenIndex.deploy(
    mockUSDC,
    await raydiumProgram.getAddress(),
    "TokenIndex LP",
    "TILP"
  );
  await tokenIndex.waitForDeployment();

  console.log("\nTokenIndex deployed to:", await tokenIndex.getAddress());

  // Example 1: Add pool allocations (only owner can do this)
  console.log("\n1. Adding Pool Allocations");
  console.log("---------------------------");

  const usdcAddress = "0x1111111111111111111111111111111111111111";
  const usdtAddress = "0x2222222222222222222222222222222222222222";
  const solAddress = "0x3333333333333333333333333333333333333333";
  const bonkAddress = "0x4444444444444444444444444444444444444444";

  // Add USDC-USDT pool (50% weight)
  await tokenIndex.addPoolAllocation(usdcAddress, usdtAddress, 0, 5000);
  console.log("✓ Added USDC-USDT pool (50% weight)");

  // Add SOL-USDC pool (30% weight)
  await tokenIndex.addPoolAllocation(solAddress, usdcAddress, 1, 3000);
  console.log("✓ Added SOL-USDC pool (30% weight)");

  // Add BONK-USDC pool (20% weight)
  await tokenIndex.addPoolAllocation(bonkAddress, usdcAddress, 2, 2000);
  console.log("✓ Added BONK-USDC pool (20% weight)");

  console.log("Total weight:", (await tokenIndex.totalWeight()).toString());
  console.log(
    "Active pools:",
    (await tokenIndex.getActivePoolCount()).toString()
  );

  // Example 2: View pool allocations
  console.log("\n2. Viewing Pool Allocations");
  console.log("----------------------------");

  for (let i = 0; i < 3; i++) {
    const allocation = await tokenIndex.getPoolAllocation(i);
    console.log(`Pool ${i}:`);
    console.log(`  Token A: ${allocation.tokenA}`);
    console.log(`  Token B: ${allocation.tokenB}`);
    console.log(`  Config Index: ${allocation.configIndex}`);
    console.log(
      `  Weight: ${allocation.weight} (${Number(allocation.weight) / 100}%)`
    );
    console.log(`  Active: ${allocation.active}`);
  }

  // Example 3: Update pool allocation
  console.log("\n3. Updating Pool Allocation");
  console.log("-----------------------------");

  // Update the first pool's weight from 50% to 40%
  await tokenIndex.updatePoolAllocation(0, 4000, true);
  console.log("✓ Updated Pool 0 weight from 50% to 40%");

  const updatedAllocation = await tokenIndex.getPoolAllocation(0);
  console.log(
    `Updated weight: ${updatedAllocation.weight} (${
      Number(updatedAllocation.weight) / 100
    }%)`
  );
  console.log("New total weight:", (await tokenIndex.totalWeight()).toString());

  // Example 4: Simulate deposit (Note: This would fail in real scenario without proper token setup)
  console.log("\n4. Deposit Simulation");
  console.log("----------------------");

  try {
    // This would normally require:
    // 1. User to have USDC tokens
    // 2. User to approve TokenIndex contract to spend USDC
    // 3. Proper token contracts to be deployed

    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    console.log(
      `Attempting to deposit ${ethers.formatUnits(depositAmount, 6)} USDC...`
    );

    // This will fail because we don't have actual ERC20 tokens set up
    // await tokenIndex.connect(user1).deposit(depositAmount);

    console.log(
      "Note: Actual deposit would require proper ERC20ForSpl token setup"
    );
  } catch (error) {
    console.log("Expected error: Deposit requires proper token setup");
  }

  // Example 5: Check user position
  console.log("\n5. User Position Query");
  console.log("-----------------------");

  const userPosition = await tokenIndex.getUserPosition(user1.address);
  console.log(
    `User1 IndexLP Balance: ${userPosition.indexLPBalance.toString()}`
  );
  console.log(
    `User1 Deposit Timestamp: ${userPosition.depositTimestamp.toString()}`
  );

  // Example 6: Emergency scenarios
  console.log("\n6. Owner Functions");
  console.log("-------------------");

  console.log("Owner can:");
  console.log("- Add/update pool allocations");
  console.log("- Trigger rebalancing");
  console.log("- Emergency withdraw");
  console.log("- Transfer ownership");

  // Rebalance
  await tokenIndex.rebalance();
  console.log("✓ Rebalance triggered");

  console.log("\n7. Token Information");
  console.log("---------------------");
  console.log("Name:", await tokenIndex.name());
  console.log("Symbol:", await tokenIndex.symbol());
  console.log("Decimals:", await tokenIndex.decimals());
  console.log("Total Supply:", (await tokenIndex.totalSupply()).toString());

  console.log("\n8. Contract Constants");
  console.log("----------------------");
  console.log("MAX_WEIGHT:", (await tokenIndex.MAX_WEIGHT()).toString());
  console.log("MIN_DEPOSIT:", (await tokenIndex.MIN_DEPOSIT()).toString());

  console.log("\n9. Integration Points");
  console.log("----------------------");
  console.log("Deposit Token:", await tokenIndex.depositToken());
  console.log("Raydium Program:", await tokenIndex.raydiumProgram());

  console.log("\nExample execution completed!");
  console.log("============================");
  console.log("In a real deployment, you would:");
  console.log("1. Deploy with actual ERC20ForSpl tokens");
  console.log("2. Set up proper token approvals");
  console.log("3. Implement real Raydium pool interactions");
  console.log("4. Add price oracles for accurate valuations");
  console.log("5. Implement sophisticated rebalancing logic");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
