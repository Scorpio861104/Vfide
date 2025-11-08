const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken edge cases and fee routing", function () {
  let owner, presale, alice, bob, treasuryAdmin;
  let VestingVault, vestingVault;
  let VFIDEToken, token;
  let EcoTreasuryVault, treasury;
  let BurnRouterMock, router;
  let VaultHubMock;

  beforeEach(async function () {
    [owner, presale, alice, bob, treasuryAdmin] = await ethers.getSigners();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // deploy treasury
    EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await EcoTreasuryVault.deploy(treasuryAdmin.address, ethers.ZeroAddress, ethers.ZeroAddress, token.target);
    await treasury.waitForDeployment();

    // deploy burn router mock
    BurnRouterMock = await ethers.getContractFactory("BurnRouterMock");
    router = await BurnRouterMock.deploy();
    await router.waitForDeployment();

    // vault hub mock for vaultOnly checks
    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();
  });

  it("presale cap is enforced", async function () {
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(presale.address);
    const one = ethers.parseUnits("1", 18);
    // Try to mint > cap in one call
  const cap = await token.PRESALE_SUPPLY_CAP();
  await expect(token.connect(presale).mintPresale(alice.address, cap + one)).to.be.reverted;
  });

  it("fee routing: burn + sanctum to treasury sink", async function () {
    // set treasury as sanctum sink and router
    await token.connect(owner).setTreasurySink(treasury.target);
    await token.connect(owner).setBurnRouter(router.target);
    // give alice some tokens via presale path by toggling vaultOnly off and setting presale
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    const amt = ethers.parseUnits("100", 18);
    await token.connect(owner).mintPresale(alice.address, amt);

    // set router to take 10 tokens as burn and 5 to sanctum
    await router.set(ethers.parseUnits("10", 18), ethers.parseUnits("5", 18), ethers.ZeroAddress, ethers.ZeroAddress);

    // alice transfers 100 tokens to bob (not systemExempt) and router will apply fees
    await token.connect(alice).transfer(bob.address, amt);

    // Bob should receive 85
    const bobBal = await token.balanceOf(bob.address);
    expect(bobBal).to.equal(ethers.parseUnits("85", 18));

    // totalSupply reduced by burnAmount (10)
    const total = await token.totalSupply();
    // initial total included DEV reserve 40M + minted 100
    // soft check: total < 40M + 100
    expect(total).to.be.lt(ethers.parseUnits("40000100", 18));

    // sanctum amount should have been routed to treasury (treasury.balanceOf uses ERC20 interface; our treasury is not an ERC20 but token.transfer to treasury increased token.balanceOf(treasury)
    const treasuryBal = await token.balanceOf(treasury.target);
    expect(treasuryBal).to.equal(ethers.parseUnits("5", 18));
  });

  it("policy lock prevents disabling critical modules", async function () {
    // lock policy and ensure router cannot be removed and treasury sink cannot be zeroed
    await token.connect(owner).setBurnRouter(router.target);
    await token.connect(owner).setTreasurySink(treasury.target);
    await token.connect(owner).lockPolicy();
    await expect(token.connect(owner).setBurnRouter(ethers.ZeroAddress)).to.be.reverted;
    await expect(token.connect(owner).setTreasurySink(ethers.ZeroAddress)).to.be.reverted;
  });

  it("vaultOnly enforces transfers when enabled", async function () {
    // set vault hub and map alice to a vault but bob not
    await token.connect(owner).setVaultHub(vaultHub.target);
    // map alice and bob vaults: use their EOAs as vault addresses
    await vaultHub.setVault(alice.address, alice.address);
    // don't set bob vault

    // owner sets vaultOnly true
    await token.connect(owner).setVaultOnly(true);

    // mint some tokens to alice via presale route
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    const amt = ethers.parseUnits("10", 18);
    await token.connect(owner).mintPresale(alice.address, amt);

    // re-enable vaultOnly
    await token.connect(owner).setVaultOnly(true);

    // alice -> bob should revert because bob is not a vault
    await expect(token.connect(alice).transfer(bob.address, ethers.parseUnits("1",18))).to.be.reverted;

    // alice -> alice.vault (herself) should succeed
    await token.connect(alice).transfer(alice.address, ethers.parseUnits("1",18));
  });
});
