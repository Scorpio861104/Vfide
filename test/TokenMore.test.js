const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken additional behaviors", function () {
  let owner, alice, bob, sink;
  let VestingVault, vestingVault;
  let VFIDEToken, token;
  let VaultHubMock, vaultHub;
  let SecurityHubMock, sec;
  let BurnRouterMock, router;

  beforeEach(async function () {
    [owner, alice, bob, sink] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    sec = await SecurityHubMock.deploy();
    await sec.waitForDeployment();

    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    router = await BurnRouterMock.deploy();
    await router.waitForDeployment();

    // Prepare token: turn off vaultOnly for initial minting
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    // mint some tokens to alice
    await token.connect(owner).mintPresale(alice.address, ethers.parseUnits("100", 18));
  });

  it("approve/increase/decrease allowance and transferFrom", async function () {
    await token.connect(alice).approve(bob.address, ethers.parseUnits("20", 18));
    expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseUnits("20", 18));

    await token.connect(alice).increaseAllowance(bob.address, ethers.parseUnits("5", 18));
    expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseUnits("25", 18));

    await token.connect(alice).decreaseAllowance(bob.address, ethers.parseUnits("10", 18));
    expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseUnits("15", 18));

    // bob uses transferFrom
    await token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseUnits("15", 18));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("15", 18));
  });

  it("systemExempt bypasses vaultOnly and fees", async function () {
    // set vault hub and enable vaultOnly
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.setVault(alice.address, alice.address);
    await token.connect(owner).setVaultOnly(true);

    // set presale mint to alice's non-vault address by temporarily disabling vaultOnly
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).mintPresale(bob.address, ethers.parseUnits("10", 18));
    await token.connect(owner).setVaultOnly(true);

    // set system exempt for bob
  await token.connect(owner).setSystemExempt(bob.address, true);
  await token.connect(owner).setSystemExempt(sink.address, true);

    // bob transfers to non-vault (sink) even though vaultOnly is enabled
    await token.connect(bob).transfer(sink.address, ethers.parseUnits("5", 18));
    expect(await token.balanceOf(sink.address)).to.equal(ethers.parseUnits("5", 18));
  });

  it("securityHub lock prevents transfers involving locked vaults", async function () {
    await token.connect(owner).setVaultHub(vaultHub.target);
    await vaultHub.setVault(alice.address, alice.address);
    await vaultHub.setVault(bob.address, bob.address);
    await token.connect(owner).setVaultOnly(true);

    // mint to alice
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).mintPresale(alice.address, ethers.parseUnits("10", 18));
    await token.connect(owner).setVaultOnly(true);

    // set security hub and lock alice vault
    await token.connect(owner).setSecurityHub(sec.target);
    await sec.setLocked(alice.address, true);

    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1",18))).to.be.reverted;
  });

  it("burn sink receives burn amount instead of hard burn", async function () {
    // set treasury sink as zero (not used) and set router that returns a burnSink
    await token.connect(owner).setBurnRouter(router.target);
    // configure router to burn 4 and sanctum 0 and burnSink = sink.address
    await router.set(ethers.parseUnits("4",18), 0, ethers.ZeroAddress, sink.address);

    // give alice more tokens
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).mintPresale(alice.address, ethers.parseUnits("50", 18));

    // transfer so router applies burn
    await token.connect(alice).transfer(bob.address, ethers.parseUnits("10",18));

    // sink should have received burn amount
    const sinkBal = await token.balanceOf(sink.address);
    expect(sinkBal).to.equal(ethers.parseUnits("4",18));

    // totalSupply should NOT have decreased by burn amount (soft burn)
    const total = await token.totalSupply();
    // total should be >= DEV_RESERVE_SUPPLY (40M)
    expect(total).to.be.gt(ethers.parseUnits("40000000", 18) - 1n);
  });
});
