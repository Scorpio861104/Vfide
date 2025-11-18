const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-31 — policy branches, securityHub absence, VF_CAP via harness", function () {
  let deployer, alice, bob;
  let VestingVault, vaultHub, VFIDETokenF, harnessF, harness, vest;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    // deploy the harness which inherits VFIDEToken
    harnessF = await ethers.getContractFactory("TestVFIDEHarness");
    harness = await harnessF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await harness.waitForDeployment();

    // set vaults and presale on harness so it can mint to alice
    await harness.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);

    await harness.setPresale(deployer.address);
    await harness.mintPresale(alice.address, ethers.parseUnits("10", 18));
  });

  it("setVaultOnly(true) succeeds after policy locked (no revert path)", async () => {
    await harness.lockPolicy();
    // calling setVaultOnly(true) should not revert even when policyLocked
    await expect(harness.setVaultOnly(true)).to.not.be.reverted;
  });

  it("transfer proceeds when securityHub is not set (no lock check path)", async () => {
    // ensure securityHub is not set on harness
    // transfer from alice (vault) to deployer (vault) should succeed
    await expect(harness.connect(alice).transfer(deployer.address, ethers.parseUnits("1", 18))).to.emit(harness, 'Transfer');
  });

  it("VF_CAP revert can be triggered via harness exposed _mint", async () => {
    // compute amount to push over MAX_SUPPLY
    const total = await harness.totalSupply();
    const MAX = ethers.parseUnits("200000000", 18);
    const toMint = MAX - total + 1n;

    // calling exposed mint should revert with VF_CAP
    await expect(harness.TEST_exposed_mint(alice.address, toMint)).to.be.revertedWithCustomError(harness, 'VF_CAP');
  });
});
