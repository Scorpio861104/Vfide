const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken negative owner & policy tests", function () {
  let owner, alice, bob, sink;
  let vest, token, VaultHub, vaultHub, SecurityHub, security, BurnRouter, router;

  beforeEach(async function () {
    [owner, alice, bob, sink] = await ethers.getSigners();

    const Vesting = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await Vesting.deploy();
    await vest.waitForDeployment();

    const Token = await ethers.getContractFactory("VFIDEToken");
    token = await Token.deploy(vest.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    SecurityHub = await ethers.getContractFactory("SecurityHubMock");
    security = await SecurityHub.deploy();
    await security.waitForDeployment();

    BurnRouter = await ethers.getContractFactory("BurnRouterMock");
    router = await BurnRouter.deploy();
    await router.waitForDeployment();

    // wire modules as owner for normal flows
    await token.connect(owner).setVaultHub(vaultHub.target);
    await token.connect(owner).setSecurityHub(security.target);
    await token.connect(owner).setBurnRouter(router.target);
    await token.connect(owner).setTreasurySink(sink.address);
  });

  it("onlyOwner modifier rejects non-owner calls", async function () {
    // non-owner cannot call setVaultHub
    await expect(token.connect(alice).setVaultHub(vaultHub.target)).to.be.revertedWith("OWN: not owner");
    await expect(token.connect(alice).setSecurityHub(security.target)).to.be.revertedWith("OWN: not owner");
    await expect(token.connect(alice).setLedger(ethers.ZeroAddress)).to.be.revertedWith("OWN: not owner");
    await expect(token.connect(alice).setBurnRouter(router.target)).to.be.revertedWith("OWN: not owner");
    await expect(token.connect(alice).setTreasurySink(sink.address)).to.be.revertedWith("OWN: not owner");
    await expect(token.connect(alice).setSystemExempt(alice.address, true)).to.be.revertedWith("OWN: not owner");
  });

  it("transferOwnership rejects zero address and non-owner attempts", async function () {
    // non-owner cannot transfer
    await expect(token.connect(alice).transferOwnership(bob.address)).to.be.revertedWith("OWN: not owner");
    // owner cannot transfer to zero
    await expect(token.connect(owner).transferOwnership(ethers.ZeroAddress)).to.be.revertedWith("OWN: zero");
    // valid transfer works
    await token.connect(owner).transferOwnership(bob.address);
    expect(await token.owner()).to.equal(bob.address);
  });

  it("policy lock prevents removing router/treasury and setVaultOnly disabling", async function () {
    // lock policy
    await token.connect(owner).lockPolicy();
    // owner trying to setBurnRouter(0) should revert with VF_POLICY_LOCKED
    await expect(token.connect(owner).setBurnRouter(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, "VF_POLICY_LOCKED");
    // owner trying to setTreasurySink(0) should revert
    await expect(token.connect(owner).setTreasurySink(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, "VF_POLICY_LOCKED");
    // owner trying to disable vaultOnly should revert
    await expect(token.connect(owner).setVaultOnly(false)).to.be.revertedWithCustomError(token, "VF_POLICY_LOCKED");
  });
});
