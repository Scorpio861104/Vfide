const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-27 — small edge cases (zero-transfer, allowance underflow, approve zero)", function () {
  let deployer, alice, bob;
  let VestingVault, vaultHub, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vest = await VestingVault.deploy();
    await vest.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    VFIDETokenF = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDETokenF.deploy(vest.target, vaultHub.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // register vaults and presale
    await token.setVaultHub(vaultHub.target);
    await vaultHub.setVault(deployer.address, deployer.address);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);

    await token.setPresale(deployer.address);
    await token.mintPresale(alice.address, ethers.parseUnits("10", 18));
  });

  it("emits Transfer and returns early for zero-amount transfer", async () => {
    await expect(token.connect(alice).transfer(bob.address, 0n)).to.emit(token, 'Transfer').withArgs(alice.address, bob.address, 0n);
  });

  it("decreaseAllowance reverts on underflow", async () => {
    await expect(token.connect(alice).decreaseAllowance(deployer.address, 1n)).to.be.revertedWith("allow underflow");
  });

  it("approve reverts when spender is the zero address", async () => {
    await expect(token.connect(alice).approve(ethers.ZeroAddress, ethers.parseUnits("1", 18))).to.be.revertedWith("approve 0");
  });
});
