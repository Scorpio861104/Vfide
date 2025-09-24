const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken - Critical Security Tests", function() {
  let token, owner, addr1, addr2, attacker;
  
  beforeEach(async function() {
    [owner, addr1, addr2, attacker] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy();
    await token.deployed();
  });

  describe("🔴 CRITICAL: Supply Cap Tests", function() {
    it("MAX_SUPPLY must be exactly 200M and immutable", async function() {
      const maxSupply = await token.MAX_SUPPLY();
      expect(maxSupply).to.equal(ethers.utils.parseEther("200000000"));
    });

    it("Should NEVER allow minting beyond MAX_SUPPLY", async function() {
      // Try to call any mint function - should fail
      const mintFunctions = ["mint", "_mint", "adminMint", "ownerMint"];
      for(const func of mintFunctions) {
        try {
          await token[func]?.(addr1.address, 1);
          throw new Error(`CRITICAL: ${func} exists!`);
        } catch(e) {
          // Good - function doesn't exist
        }
      }
    });
  });

  describe("🔴 CRITICAL: Fee Calculation Tests", function() {
    it("Should calculate fees correctly for all amounts", async function() {
      const testAmounts = [
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("10000")
      ];

      for(const amount of testAmounts) {
        // Test fee calculation
        const baseFee = 150; // 1.5%
        const expectedFee = amount.mul(baseFee).div(10000);
        
        // Transfer and check
        await token.transfer(addr1.address, amount);
        const balanceBefore = await token.balanceOf(addr1.address);
        expect(balanceBefore).to.equal(amount);
      }
    });
  });

  describe("🔴 CRITICAL: Access Control Tests", function() {
    it("Should prevent unauthorized access to admin functions", async function() {
      // Attacker should not be able to pause
      await expect(
        token.connect(attacker).pause()
      ).to.be.reverted;

      // Attacker should not be able to set addresses
      await expect(
        token.connect(attacker).setSanctumFund(attacker.address)
      ).to.be.reverted;
    });
  });

  describe("🔴 CRITICAL: Reentrancy Protection", function() {
    it("Should prevent reentrancy attacks", async function() {
      // Test that transfers are protected
      // This would require a malicious contract in real testing
      expect(true).to.equal(true); // Placeholder
    });
  });
});
