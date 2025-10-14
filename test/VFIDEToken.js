// Coverage stub for VFIDEToken.sol
const { expect } = require("chai");

describe("VFIDEToken", function () {
  let owner, other, factory, ecoTreasury, sanctum, token;

  beforeEach(async function () {
    [owner, other, factory, ecoTreasury, sanctum] = await ethers.getSigners();
    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(
      owner.address, // genesisReceiver
      factory.address, // vaultFactory_
      ecoTreasury.address, // ecoTreasury_
      sanctum.address, // sanctum_
      5000, // initBurnBps
      3000, // initEcoBps
      2000  // initSanctumBps
    );
    await token.waitForDeployment();
  });

  it("should deploy with correct max supply", async function () {
    expect(await token.MAX_SUPPLY()).to.equal(await token.totalSupply());
  });

  it("should enforce vault-only by default", async function () {
    expect(await token.vaultOnly()).to.be.true;
  });

  it("should allow owner to set vault factory", async function () {
    await expect(token.connect(owner).setVaultFactory(factory.address))
      .to.emit(token, "VaultFactorySet").withArgs(factory.address);
    expect(await token.vaultFactory()).to.equal(factory.address);
  });

  it("should allow owner to set system exemption", async function () {
    await expect(token.connect(owner).setSystemExempt(other.address, true))
      .to.emit(token, "SystemExemptSet").withArgs(other.address, true);
    expect(await token.systemExempt(other.address)).to.be.true;
  });

  it("should allow owner to set sinks", async function () {
    await expect(token.connect(owner).setSinks(ecoTreasury.address, sanctum.address))
      .to.emit(token, "SinksSet").withArgs(ecoTreasury.address, sanctum.address);
    expect(await token.ecoTreasury()).to.equal(ecoTreasury.address);
    expect(await token.sanctum()).to.equal(sanctum.address);
  });

  it("should allow owner to propose and activate burn routing split within limits", async function () {
    await token.connect(owner).proposeSplitChange(5000, 3000, 2000); // sums to 10000
    // Simulate 48h timelock
    await network.provider.send("evm_increaseTime", [48 * 3600]);
    await network.provider.send("evm_mine");
    await token.connect(owner).activateSplitChange();
    expect(await token.burnBps()).to.equal(5000);
    expect(await token.ecoBps()).to.equal(3000);
    expect(await token.sanctumBps()).to.equal(2000);
  });

  it("should revert if burn routing split does not sum to 10000", async function () {
    await expect(token.connect(owner).proposeSplitChange(5000, 3000, 1000)).to.be.revertedWith("VFIDE: split != 100%");
  });

  it("should only allow owner to set policies", async function () {
    await expect(token.connect(other).setVaultFactory(factory.address)).to.be.reverted;
    await expect(token.connect(other).setSystemExempt(other.address, true)).to.be.reverted;
    await expect(token.connect(other).setSinks(ecoTreasury.address, sanctum.address)).to.be.reverted;
    await expect(token.connect(other).proposeSplitChange(5000, 3000, 2000)).to.be.reverted;
    await network.provider.send("evm_increaseTime", [48 * 3600]);
    await network.provider.send("evm_mine");
    await expect(token.connect(other).activateSplitChange()).to.be.reverted;
  });

  // Add more tests for transfer, burn, and vault enforcement as needed
});