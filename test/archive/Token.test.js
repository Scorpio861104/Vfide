const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken basic flows", function () {
  let owner, presaleSigner, alice, bob;
  let VestingVault, vestingVault;
  let VFIDEToken, token;

  const DEV_RESERVE = ethers.parseUnits("40000000", 18);

  beforeEach(async function () {
    [owner, presaleSigner, alice, bob] = await ethers.getSigners();

    // Deploy a minimal vesting vault contract (must be a contract so extcodesize>0)
    VestingVault = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    // Deploy token with vesting vault set; other modules left zero
    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();
  });

  it("pre-mints dev reserve to vesting vault", async function () {
    const totalSupply = await token.totalSupply();
    expect(totalSupply).to.equal(DEV_RESERVE);
    const bal = await token.balanceOf(vestingVault.target);
    expect(bal).to.equal(DEV_RESERVE);
  });

  it("allows owner to disable vaultOnly and set presale, presale mints within cap", async function () {
    // Owner disables vaultOnly to allow mint target to be EOA in test
    await token.connect(owner).setVaultOnly(false);

    // Set presale to presaleSigner.address
    await token.connect(owner).setPresale(presaleSigner.address);

    // presaleSigner calls mintPresale
    const mintAmount = ethers.parseUnits("1000", 18);
    await token.connect(presaleSigner).mintPresale(alice.address, mintAmount);

    const aliceBal = await token.balanceOf(alice.address);
    expect(aliceBal).to.equal(mintAmount);

    const presaleMinted = await token.presaleMinted();
    expect(presaleMinted).to.equal(mintAmount);
  });

  it("transfers update balances", async function () {
    // owner transfers are not restricted since owner is deployer and systemExempt? owner is not systemExempt by default
    // We'll transfer tokens from vestingVault (which holds dev reserve). We can't call transfer from vestingVault since it's a contract without code to call token.transfer.
    // So test transferFrom workflow: approve and transferFrom by owner after minting some tokens to owner.

    // Owner mints via presale path by toggling vaultOnly off and setting presale to owner
    await token.connect(owner).setVaultOnly(false);
    await token.connect(owner).setPresale(owner.address);
    const amt = ethers.parseUnits("123", 18);
    await token.connect(owner).mintPresale(owner.address, amt);

    // Owner transfers to bob
    await token.connect(owner).transfer(bob.address, amt);
    const bobBal = await token.balanceOf(bob.address);
    expect(bobBal).to.equal(amt);
  });
});
