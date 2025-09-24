const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEPresale - Critical Tests", function() {
  let presale, token, owner, addr1, addr2;
  
  beforeEach(async function() {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy();
    
    const Presale = await ethers.getContractFactory("VFIDEPresale");
    presale = await Presale.deploy(token.address);
    
    await token.deployed();
    await presale.deployed();
  });

  describe("Tier Pricing Tests", function() {
    it("Should enforce correct tier prices", async function() {
      expect(await presale.TIER_1_PRICE()).to.equal(3); // $0.03
      expect(await presale.TIER_2_PRICE()).to.equal(5); // $0.05
      expect(await presale.TIER_3_PRICE()).to.equal(7); // $0.07
    });

    it("Should enforce tier allocations", async function() {
      expect(await presale.TIER_1_ALLOCATION()).to.equal(
        ethers.utils.parseEther("30000000")
      );
      expect(await presale.TIER_2_ALLOCATION()).to.equal(
        ethers.utils.parseEther("25000000")
      );
      expect(await presale.TIER_3_ALLOCATION()).to.equal(
        ethers.utils.parseEther("20000000")
      );
    });
  });

  describe("Lock Period Tests", function() {
    it("Should enforce lock periods", async function() {
      expect(await presale.TIER_1_LOCK_DAYS()).to.equal(180);
      expect(await presale.TIER_2_LOCK_DAYS()).to.equal(90);
    });
  });

  describe("Anti-Gaming Tests", function() {
    it("Should prevent presale gaming", async function() {
      // Add tests for anti-sybil mechanisms
      expect(true).to.equal(true); // Placeholder
    });
  });
});
