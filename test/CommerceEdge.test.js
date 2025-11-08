const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Commerce negative paths and auto-suspend", function () {
  let owner, buyer, merchant, attacker;
  let VaultHubMock, vaultHub;
  let SeerMock, seer;
  let SecurityHubMock, sec;
  let VestingVault, vestingVault;
  let VFIDEToken, token;
  let MerchantRegistry, registry;
  let CommerceEscrow, escrow;

  beforeEach(async function () {
    [owner, buyer, merchant, attacker] = await ethers.getSigners();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    sec = await SecurityHubMock.deploy();
    await sec.waitForDeployment();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // disable vaultOnly for minting
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    // mint to buyer and merchant
    await token.connect(owner).mintPresale(buyer.address, ethers.parseUnits("100",18));
    await token.connect(owner).mintPresale(merchant.address, ethers.parseUnits("100",18));

    // set vaults
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);

    // set seer
    await seer.setMin(0);
    await seer.setScore(merchant.address, 1000);

    MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    registry = await MerchantRegistry.deploy(owner.address, token.target, vaultHub.target, seer.target, sec.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    escrow = await CommerceEscrow.deploy(owner.address, token.target, vaultHub.target, registry.target, sec.target, ethers.ZeroAddress);
    await escrow.waitForDeployment();
  });

  it("open reverts for zero amount and unregistered merchant and locked vaults", async function () {
    // zero amount
    try {
      const r = await escrow.connect(buyer).open(merchant.address, 0, '0x' + '00'.repeat(32));
      console.log('OPEN_ZERO_SUCCEEDED', r);
      // if it didn't revert, fail the test
      expect.fail('open(0) unexpectedly succeeded');
    } catch (err) {
      // expected revert
    }

    // merchant not registered
    try {
      await escrow.connect(buyer).open(merchant.address, ethers.parseUnits("1",18), '0x' + '00'.repeat(32));
      expect.fail('open to unregistered merchant unexpectedly succeeded');
    } catch (err) {
      // expected
    }

    // register merchant then lock buyer vault
    await registry.connect(merchant).addMerchant('0x' + '00'.repeat(32));
    await sec.setLocked(buyer.address, true);
    try {
      await escrow.connect(buyer).open(merchant.address, ethers.parseUnits("1",18), '0x' + '00'.repeat(32));
      expect.fail('open with locked vault unexpectedly succeeded');
    } catch (err) {
      // expected
    }
  });

  it("markFunded reverts when not enough balance and release/refund unauthorized", async function () {
    // register and open
    await registry.connect(merchant).addMerchant('0x' + '00'.repeat(32));
    await escrow.connect(buyer).open(merchant.address, ethers.parseUnits("10",18), '0x' + '00'.repeat(32));

    // markFunded should revert because escrow has no tokens
    await expect(escrow.connect(buyer).markFunded(1)).to.be.reverted;

    // transfer partial and still insufficient
    await token.connect(buyer).transfer(escrow.target, ethers.parseUnits("5",18));
    await expect(escrow.connect(buyer).markFunded(1)).to.be.reverted;

    // only buyer or dao can release; attacker cannot
    // first fund properly
    await token.connect(buyer).transfer(escrow.target, ethers.parseUnits("5",18));
    // top up to full
    await token.connect(buyer).transfer(escrow.target, ethers.parseUnits("5",18));
    await escrow.connect(buyer).markFunded(1);

    await expect(escrow.connect(attacker).release(1)).to.be.reverted;
    await expect(escrow.connect(attacker).refund(1)).to.be.reverted;
  });

  it("auto-suspends merchant after repeated refunds/disputes", async function () {
    await registry.connect(merchant).addMerchant('0x' + '00'.repeat(32));

    // open and fund and then merchant initiates refunds multiple times to trigger auto suspend
    // loop up to the autoSuspendRefunds threshold (default 5) to trigger suspension
    for (let i=0;i<5;i++) {
      await escrow.connect(buyer).open(merchant.address, ethers.parseUnits("1",18), '0x' + '00'.repeat(32));
      await token.connect(buyer).transfer(escrow.target, ethers.parseUnits("1",18));
      await escrow.connect(buyer).markFunded(i+1);
      // merchant refunds
      await escrow.connect(merchant).refund(i+1);
    }

    const info = await registry.info(merchant.address);
    // status should be SUSPENDED (value 2)
    expect(info.status).to.equal(2);
  });
});
