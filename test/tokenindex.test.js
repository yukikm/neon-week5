const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenIndex", function () {
  let tokenIndex;
  let raydiumProgram;
  let owner;
  let user1;
  let user2;
  let mockUSDC;
  let mockUSDT;
  let mockSOL;
  let mockBONK;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy CallRaydiumProgram
    const CallRaydiumProgram = await ethers.getContractFactory(
      "CallRaydiumProgram"
    );
    raydiumProgram = await CallRaydiumProgram.deploy();
    await raydiumProgram.waitForDeployment();

    // Mock token addresses
    mockUSDC = "0x1111111111111111111111111111111111111111";
    mockUSDT = "0x2222222222222222222222222222222222222222";
    mockSOL = "0x3333333333333333333333333333333333333333";
    mockBONK = "0x4444444444444444444444444444444444444444";

    // Deploy TokenIndex
    const TokenIndex = await ethers.getContractFactory("TokenIndex");
    tokenIndex = await TokenIndex.deploy(
      mockUSDC,
      await raydiumProgram.getAddress(),
      "TokenIndex LP",
      "TILP"
    );
    await tokenIndex.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct deposit token", async function () {
      expect(await tokenIndex.depositToken()).to.equal(mockUSDC);
    });

    it("Should set the correct raydium program", async function () {
      expect(await tokenIndex.raydiumProgram()).to.equal(
        await raydiumProgram.getAddress()
      );
    });

    it("Should set the correct name and symbol", async function () {
      expect(await tokenIndex.name()).to.equal("TokenIndex LP");
      expect(await tokenIndex.symbol()).to.equal("TILP");
    });

    it("Should set the owner correctly", async function () {
      expect(await tokenIndex.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero total weight", async function () {
      expect(await tokenIndex.totalWeight()).to.equal(0);
    });

    it("Should initialize with zero next pool ID", async function () {
      expect(await tokenIndex.nextPoolId()).to.equal(0);
    });

    it("Should revert with zero addresses", async function () {
      const TokenIndex = await ethers.getContractFactory("TokenIndex");

      await expect(
        TokenIndex.deploy(
          ethers.ZeroAddress,
          await raydiumProgram.getAddress(),
          "TokenIndex LP",
          "TILP"
        )
      ).to.be.revertedWithCustomError(tokenIndex, "ZeroAddress");

      await expect(
        TokenIndex.deploy(mockUSDC, ethers.ZeroAddress, "TokenIndex LP", "TILP")
      ).to.be.revertedWithCustomError(tokenIndex, "ZeroAddress");
    });
  });

  describe("Pool Management", function () {
    describe("Adding Pool Allocations", function () {
      it("Should add a pool allocation correctly", async function () {
        await expect(tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 5000))
          .to.emit(tokenIndex, "PoolAdded")
          .withArgs(0, mockUSDC, mockUSDT, 5000);

        const allocation = await tokenIndex.getPoolAllocation(0);
        expect(allocation.tokenA).to.equal(mockUSDC);
        expect(allocation.tokenB).to.equal(mockUSDT);
        expect(allocation.configIndex).to.equal(0);
        expect(allocation.weight).to.equal(5000);
        expect(allocation.active).to.equal(true);
        // raydiumPoolId should be set (we'll check it's not zero)
        expect(allocation.raydiumPoolId).to.not.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );

        expect(await tokenIndex.totalWeight()).to.equal(5000);
        expect(await tokenIndex.getActivePoolCount()).to.equal(1);
      });

      it("Should revert when adding pool with zero addresses", async function () {
        await expect(
          tokenIndex.addPoolAllocation(ethers.ZeroAddress, mockUSDT, 0, 5000)
        ).to.be.revertedWithCustomError(tokenIndex, "ZeroAddress");

        await expect(
          tokenIndex.addPoolAllocation(mockUSDC, ethers.ZeroAddress, 0, 5000)
        ).to.be.revertedWithCustomError(tokenIndex, "ZeroAddress");
      });

      it("Should revert when adding pool with invalid weight", async function () {
        await expect(
          tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 0)
        ).to.be.revertedWithCustomError(tokenIndex, "InvalidWeight");

        await expect(
          tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 10001)
        ).to.be.revertedWithCustomError(tokenIndex, "InvalidWeight");
      });

      it("Should revert when total weight exceeds maximum", async function () {
        await tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 6000);

        await expect(
          tokenIndex.addPoolAllocation(mockSOL, mockUSDC, 1, 5000)
        ).to.be.revertedWithCustomError(tokenIndex, "WeightExceedsMaximum");
      });

      it("Should revert when adding duplicate pool", async function () {
        await tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 5000);

        await expect(
          tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 3000)
        ).to.be.revertedWithCustomError(tokenIndex, "PoolAlreadyExists");

        // Should also detect reverse order
        await expect(
          tokenIndex.addPoolAllocation(mockUSDT, mockUSDC, 0, 3000)
        ).to.be.revertedWithCustomError(tokenIndex, "PoolAlreadyExists");
      });

      it("Should only allow owner to add pools", async function () {
        await expect(
          tokenIndex
            .connect(user1)
            .addPoolAllocation(mockUSDC, mockUSDT, 0, 5000)
        ).to.be.revertedWithCustomError(
          tokenIndex,
          "OwnableUnauthorizedAccount"
        );
      });
    });

    describe("Updating Pool Allocations", function () {
      beforeEach(async function () {
        await tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 5000);
      });

      it("Should update pool allocation correctly", async function () {
        await expect(tokenIndex.updatePoolAllocation(0, 3000, true))
          .to.emit(tokenIndex, "PoolUpdated")
          .withArgs(0, 3000, true);

        const allocation = await tokenIndex.getPoolAllocation(0);
        expect(allocation.weight).to.equal(3000);
        expect(allocation.active).to.equal(true);
        expect(await tokenIndex.totalWeight()).to.equal(3000);
      });

      it("Should deactivate pool", async function () {
        await tokenIndex.updatePoolAllocation(0, 0, false);

        const allocation = await tokenIndex.getPoolAllocation(0);
        expect(allocation.active).to.equal(false);
        expect(await tokenIndex.totalWeight()).to.equal(0);
      });

      it("Should revert when updating non-existent pool", async function () {
        await expect(
          tokenIndex.updatePoolAllocation(999, 3000, true)
        ).to.be.revertedWithCustomError(tokenIndex, "PoolNotFound");
      });

      it("Should revert when setting active pool with zero weight", async function () {
        await expect(
          tokenIndex.updatePoolAllocation(0, 0, true)
        ).to.be.revertedWithCustomError(tokenIndex, "InvalidWeight");
      });

      it("Should only allow owner to update pools", async function () {
        await expect(
          tokenIndex.connect(user1).updatePoolAllocation(0, 3000, true)
        ).to.be.revertedWithCustomError(
          tokenIndex,
          "OwnableUnauthorizedAccount"
        );
      });
    });
  });

  describe("Deposit and Redeem", function () {
    beforeEach(async function () {
      // Add some pool allocations
      await tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 5000); // 50%
      await tokenIndex.addPoolAllocation(mockSOL, mockUSDC, 1, 3000); // 30%
      await tokenIndex.addPoolAllocation(mockBONK, mockUSDC, 2, 2000); // 20%
    });

    describe("Deposit", function () {
      it("Should revert with amount less than minimum deposit", async function () {
        const smallAmount = ethers.parseUnits("0.5", 6); // 0.5 USDC
        await expect(
          tokenIndex.connect(user1).deposit(smallAmount)
        ).to.be.revertedWithCustomError(tokenIndex, "InvalidDepositAmount");
      });

      it("Should revert when no pools are configured", async function () {
        // Deploy a new TokenIndex without pool allocations
        const TokenIndex = await ethers.getContractFactory("TokenIndex");
        const emptyTokenIndex = await TokenIndex.deploy(
          mockUSDC,
          await raydiumProgram.getAddress(),
          "Empty Index",
          "EMPTY"
        );

        const depositAmount = ethers.parseUnits("1000", 6);
        await expect(
          emptyTokenIndex.connect(user1).deposit(depositAmount)
        ).to.be.revertedWithCustomError(emptyTokenIndex, "InvalidWeight");
      });

      // Note: Actual deposit testing would require mock ERC20 tokens
      // For now, we test the validation logic
    });

    describe("Redeem", function () {
      it("Should revert when user has insufficient balance", async function () {
        const redeemAmount = ethers.parseUnits("100", 18);
        await expect(
          tokenIndex.connect(user1).redeem(redeemAmount)
        ).to.be.revertedWithCustomError(tokenIndex, "InsufficientBalance");
      });
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 5000);
      await tokenIndex.addPoolAllocation(mockSOL, mockUSDC, 1, 3000);
    });

    it("Should return correct user position", async function () {
      const position = await tokenIndex.getUserPosition(user1.address);
      expect(position.indexLPBalance).to.equal(0);
      expect(position.depositTimestamp).to.equal(0);
    });

    it("Should return correct active pool count", async function () {
      expect(await tokenIndex.getActivePoolCount()).to.equal(2);
    });

    it("Should return correct pool allocation details", async function () {
      const allocation = await tokenIndex.getPoolAllocation(0);
      expect(allocation.tokenA).to.equal(mockUSDC);
      expect(allocation.tokenB).to.equal(mockUSDT);
      expect(allocation.configIndex).to.equal(0);
      expect(allocation.weight).to.equal(5000);
      expect(allocation.active).to.equal(true);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to rebalance", async function () {
      await expect(tokenIndex.rebalance()).to.emit(tokenIndex, "Rebalanced");
    });

    it("Should only allow owner to rebalance", async function () {
      await expect(
        tokenIndex.connect(user1).rebalance()
      ).to.be.revertedWithCustomError(tokenIndex, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to emergency withdraw", async function () {
      // Emergency withdraw should complete without reverting, even with no balance
      // The function internally checks balance and only transfers if > 0
      await expect(tokenIndex.emergencyWithdraw()).to.not.be.reverted;
    });

    it("Should only allow owner to emergency withdraw", async function () {
      await expect(
        tokenIndex.connect(user1).emergencyWithdraw()
      ).to.be.revertedWithCustomError(tokenIndex, "OwnableUnauthorizedAccount");
    });
  });

  describe("Constants", function () {
    it("Should have correct constants", async function () {
      expect(await tokenIndex.MAX_WEIGHT()).to.equal(10000);
      expect(await tokenIndex.MIN_DEPOSIT()).to.equal(1000000); // 1e6
    });
  });

  describe("ERC20 Functionality", function () {
    it("Should have correct ERC20 properties", async function () {
      expect(await tokenIndex.name()).to.equal("TokenIndex LP");
      expect(await tokenIndex.symbol()).to.equal("TILP");
      expect(await tokenIndex.decimals()).to.equal(18);
      expect(await tokenIndex.totalSupply()).to.equal(0);
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle multiple pool operations", async function () {
      // Add multiple pools
      await tokenIndex.addPoolAllocation(mockUSDC, mockUSDT, 0, 4000);
      await tokenIndex.addPoolAllocation(mockSOL, mockUSDC, 1, 3000);
      await tokenIndex.addPoolAllocation(mockBONK, mockUSDC, 2, 2000);

      expect(await tokenIndex.totalWeight()).to.equal(9000);
      expect(await tokenIndex.getActivePoolCount()).to.equal(3);

      // Update a pool
      await tokenIndex.updatePoolAllocation(0, 5000, true);
      expect(await tokenIndex.totalWeight()).to.equal(10000);

      // Deactivate a pool
      await tokenIndex.updatePoolAllocation(2, 0, false);
      expect(await tokenIndex.totalWeight()).to.equal(8000);

      // Verify pool states
      const pool0 = await tokenIndex.getPoolAllocation(0);
      const pool1 = await tokenIndex.getPoolAllocation(1);
      const pool2 = await tokenIndex.getPoolAllocation(2);

      expect(pool0.weight).to.equal(5000);
      expect(pool0.active).to.equal(true);
      expect(pool1.weight).to.equal(3000);
      expect(pool1.active).to.equal(true);
      expect(pool2.weight).to.equal(0);
      expect(pool2.active).to.equal(false);
    });
  });
});
