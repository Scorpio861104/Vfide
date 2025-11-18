const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProofLedger", function () {
  let ledger;
  let deployer, dao, user1, user2;

  beforeEach(async function () {
    [deployer, dao, user1, user2] = await ethers.getSigners();

    const ProofLedger = await ethers.getContractFactory("contracts-min/ProofLedger.sol:ProofLedger");
    ledger = await ProofLedger.deploy(dao.address);
  });

  describe("Deployment", function () {
    it("should deploy with correct DAO", async function () {
      expect(await ledger.dao()).to.equal(dao.address);
    });

    it("should revert on zero address DAO", async function () {
      const ProofLedger = await ethers.getContractFactory("contracts-min/ProofLedger.sol:ProofLedger");
      await expect(ProofLedger.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(ledger, "PL_Zero");
    });
  });

  describe("setDAO", function () {
    it("should allow DAO to update DAO address", async function () {
      await ledger.connect(dao).setDAO(user1.address);
      expect(await ledger.dao()).to.equal(user1.address);
    });

    it("should emit DAOSet event", async function () {
      await expect(ledger.connect(dao).setDAO(user1.address))
        .to.emit(ledger, "DAOSet")
        .withArgs(user1.address);
    });

    it("should revert if non-DAO tries to update", async function () {
      await expect(ledger.connect(user1).setDAO(user2.address))
        .to.be.revertedWithCustomError(ledger, "PL_NotDAO");
    });

    it("should revert on zero address", async function () {
      await expect(ledger.connect(dao).setDAO(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(ledger, "PL_Zero");
    });

    it("should allow DAO to be set to itself", async function () {
      await ledger.connect(dao).setDAO(dao.address);
      expect(await ledger.dao()).to.equal(dao.address);
    });

    it("should allow chained DAO updates", async function () {
      await ledger.connect(dao).setDAO(user1.address);
      await ledger.connect(user1).setDAO(user2.address);
      await ledger.connect(user2).setDAO(dao.address);
      expect(await ledger.dao()).to.equal(dao.address);
    });
  });

  describe("logEvent", function () {
    it("should emit Log event with all parameters", async function () {
      const who = user1.address;
      const action = "deposit";
      const amount = 1000n;
      const note = "test deposit";

      const tx = await ledger.connect(user2).logEvent(who, action, amount, note);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(ledger, "Log")
        .withArgs(who, action, amount, note, user2.address, block.timestamp);
    });

    it("should allow anyone to log events", async function () {
      await expect(ledger.connect(user1).logEvent(user2.address, "action", 100, "note"))
        .to.not.be.reverted;
    });

    it("should handle zero amount", async function () {
      await expect(ledger.logEvent(user1.address, "zero_tx", 0, "zero amount"))
        .to.emit(ledger, "Log");
    });

    it("should handle empty strings", async function () {
      await expect(ledger.logEvent(user1.address, "", 0, ""))
        .to.emit(ledger, "Log");
    });

    it("should handle very large amounts", async function () {
      const largeAmount = ethers.MaxUint256;
      await expect(ledger.logEvent(user1.address, "large", largeAmount, "huge"))
        .to.emit(ledger, "Log")
        .withArgs(user1.address, "large", largeAmount, "huge", deployer.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

    it("should handle long action strings", async function () {
      const longAction = "a".repeat(1000);
      await expect(ledger.logEvent(user1.address, longAction, 100, "note"))
        .to.emit(ledger, "Log");
    });

    it("should handle long note strings", async function () {
      const longNote = "x".repeat(1000);
      await expect(ledger.logEvent(user1.address, "action", 100, longNote))
        .to.emit(ledger, "Log");
    });

    it("should log multiple events in sequence", async function () {
      await ledger.logEvent(user1.address, "action1", 100, "note1");
      await ledger.logEvent(user2.address, "action2", 200, "note2");
      await ledger.logEvent(user1.address, "action3", 300, "note3");
    });

    it("should preserve msg.sender in 'by' field", async function () {
      const tx = await ledger.connect(user1).logEvent(user2.address, "test", 100, "note");
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return ledger.interface.parseLog(log)?.name === "Log";
        } catch {
          return false;
        }
      });
      const parsedEvent = ledger.interface.parseLog(event);
      expect(parsedEvent.args.by).to.equal(user1.address);
    });

    it("should use current block timestamp", async function () {
      const tx = await ledger.logEvent(user1.address, "action", 100, "note");
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      const event = receipt.logs.find(log => {
        try {
          return ledger.interface.parseLog(log)?.name === "Log";
        } catch {
          return false;
        }
      });
      const parsedEvent = ledger.interface.parseLog(event);
      expect(parsedEvent.args.time).to.equal(block.timestamp);
    });
  });

  describe("logSystemEvent", function () {
    it("should emit LogSystem event with all parameters", async function () {
      const who = user1.address;
      const action = "system_update";
      const by = user2.address;

      const tx = await ledger.logSystemEvent(who, action, by);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(ledger, "LogSystem")
        .withArgs(who, action, by, block.timestamp);
    });

    it("should allow anyone to log system events", async function () {
      await expect(ledger.connect(user1).logSystemEvent(user2.address, "system", user1.address))
        .to.not.be.reverted;
    });

    it("should handle empty action string", async function () {
      await expect(ledger.logSystemEvent(user1.address, "", user2.address))
        .to.emit(ledger, "LogSystem");
    });

    it("should handle zero addresses", async function () {
      await expect(ledger.logSystemEvent(ethers.ZeroAddress, "action", ethers.ZeroAddress))
        .to.emit(ledger, "LogSystem");
    });

    it("should handle long action strings", async function () {
      const longAction = "system_".repeat(100);
      await expect(ledger.logSystemEvent(user1.address, longAction, user2.address))
        .to.emit(ledger, "LogSystem");
    });

    it("should log multiple system events", async function () {
      await ledger.logSystemEvent(user1.address, "event1", deployer.address);
      await ledger.logSystemEvent(user2.address, "event2", user1.address);
      await ledger.logSystemEvent(dao.address, "event3", user2.address);
    });

    it("should use current block timestamp", async function () {
      const tx = await ledger.logSystemEvent(user1.address, "action", user2.address);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      const event = receipt.logs.find(log => {
        try {
          return ledger.interface.parseLog(log)?.name === "LogSystem";
        } catch {
          return false;
        }
      });
      const parsedEvent = ledger.interface.parseLog(event);
      expect(parsedEvent.args.time).to.equal(block.timestamp);
    });
  });

  describe("Mixed Logging", function () {
    it("should support both log types simultaneously", async function () {
      await ledger.logEvent(user1.address, "user_action", 100, "note");
      await ledger.logSystemEvent(user2.address, "system_action", deployer.address);
      await ledger.logEvent(user2.address, "another_user", 200, "note2");
    });

    it("should handle high-frequency logging", async function () {
      for (let i = 0; i < 10; i++) {
        await ledger.logEvent(user1.address, `action${i}`, i * 100, `note${i}`);
        await ledger.logSystemEvent(user2.address, `sys${i}`, deployer.address);
      }
    });

    it("should maintain independent event streams", async function () {
      const tx1 = await ledger.logEvent(user1.address, "event", 100, "note");
      const tx2 = await ledger.logSystemEvent(user2.address, "system", user1.address);
      
      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();
      
      const log1 = receipt1.logs.find(log => {
        try {
          return ledger.interface.parseLog(log)?.name === "Log";
        } catch {
          return false;
        }
      });
      const log2 = receipt2.logs.find(log => {
        try {
          return ledger.interface.parseLog(log)?.name === "LogSystem";
        } catch {
          return false;
        }
      });
      
      expect(log1).to.not.be.undefined;
      expect(log2).to.not.be.undefined;
    });
  });

  describe("Access Control", function () {
    it("should allow only DAO to change DAO", async function () {
      await expect(ledger.connect(user1).setDAO(user2.address))
        .to.be.revertedWithCustomError(ledger, "PL_NotDAO");
      
      await ledger.connect(dao).setDAO(user1.address);
      expect(await ledger.dao()).to.equal(user1.address);
    });

    it("should allow anyone to log events", async function () {
      await ledger.connect(deployer).logEvent(user1.address, "a", 1, "n");
      await ledger.connect(dao).logEvent(user1.address, "b", 2, "m");
      await ledger.connect(user1).logEvent(user2.address, "c", 3, "o");
      await ledger.connect(user2).logEvent(user1.address, "d", 4, "p");
    });

    it("should allow anyone to log system events", async function () {
      await ledger.connect(deployer).logSystemEvent(user1.address, "a", user2.address);
      await ledger.connect(dao).logSystemEvent(user2.address, "b", user1.address);
      await ledger.connect(user1).logSystemEvent(dao.address, "c", deployer.address);
      await ledger.connect(user2).logSystemEvent(deployer.address, "d", dao.address);
    });
  });

  describe("Edge Cases", function () {
    it("should handle DAO transferring to self", async function () {
      await ledger.connect(dao).setDAO(dao.address);
      expect(await ledger.dao()).to.equal(dao.address);
    });

    it("should handle rapid DAO transfers", async function () {
      await ledger.connect(dao).setDAO(user1.address);
      await ledger.connect(user1).setDAO(user2.address);
      await ledger.connect(user2).setDAO(deployer.address);
      await ledger.connect(deployer).setDAO(dao.address);
      expect(await ledger.dao()).to.equal(dao.address);
    });

    it("should handle maximum uint256 amount in logs", async function () {
      await expect(ledger.logEvent(user1.address, "max", ethers.MaxUint256, "max amount"))
        .to.emit(ledger, "Log")
        .withArgs(user1.address, "max", ethers.MaxUint256, "max amount", deployer.address, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

    it("should handle special characters in strings", async function () {
      const specialAction = "action_!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const specialNote = "note_with_emojis_🚀🎉✅";
      await expect(ledger.logEvent(user1.address, specialAction, 100, specialNote))
        .to.emit(ledger, "Log");
    });

    it("should not revert on consecutive identical logs", async function () {
      await ledger.logEvent(user1.address, "same", 100, "note");
      await ledger.logEvent(user1.address, "same", 100, "note");
      await ledger.logEvent(user1.address, "same", 100, "note");
    });
  });
});
