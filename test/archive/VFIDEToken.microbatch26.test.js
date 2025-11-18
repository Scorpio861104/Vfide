const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken microbatch-26 — transferFrom and allowance flows", function () {
  let deployer, alice, bob;
  let VestingVault, vaultHub, VFIDETokenF, token, vest;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
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

  it("reverts when allowance is insufficient for transferFrom", async () => {
    await expect(token.connect(deployer).transferFrom(alice.address, bob.address, ethers.parseUnits("1", 18))).to.be.revertedWith("allow");
  });

  it("succeeds and decreases allowance when allowance is sufficient", async () => {
    const amount = ethers.parseUnits("3", 18);
    await token.connect(alice).approve(deployer.address, amount);
    const allowanceBefore = await token.allowance(alice.address, deployer.address);
    expect(allowanceBefore).to.equal(amount);

    await token.connect(deployer).transferFrom(alice.address, bob.address, amount);

    const allowanceAfter = await token.allowance(alice.address, deployer.address);
    expect(allowanceAfter).to.equal(0);
    const bobBal = await token.balanceOf(bob.address);
    expect(bobBal).to.equal(amount);
  });
});
