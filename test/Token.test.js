const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEToken basic flows", function () {
  let owner, alice, bob;
  let VestingVault, vestingVault;
  let VFIDEToken, token;
  let presaleMock;

  const MAX_SUPPLY = ethers.parseUnits("200000000", 18);
  const DEV_RESERVE = ethers.parseUnits("50000000", 18);
  const PRESALE_CAP = ethers.parseUnits("50000000", 18);
  const TREASURY_ALLOC = ethers.parseUnits("100000000", 18);

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy a minimal vesting vault contract (must be a contract so extcodesize>0)
    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();
    
    // Deploy a mock presale contract (must be a contract)
    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    presaleMock = await PresaleMock.deploy();
    await presaleMock.waitForDeployment();

    // Deploy token with vesting vault set
    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(
      vestingVault.target,    // devReserveVestingVault (receives 50M)
      presaleMock.target,     // presaleContract (receives 50M)
      owner.address,          // treasury (receives 100M)
      ethers.ZeroAddress,     // vaultHub
      ethers.ZeroAddress,     // ledger
      ethers.ZeroAddress      // treasurySink
    );
    await token.waitForDeployment();
  });

  it("pre-mints full supply correctly distributed", async function () {
    const totalSupply = await token.totalSupply();
    expect(totalSupply).to.equal(MAX_SUPPLY);
    
    // Check distribution
    const vestingBal = await token.balanceOf(vestingVault.target);
    expect(vestingBal).to.equal(DEV_RESERVE);
    
    const presaleBal = await token.balanceOf(presaleMock.target);
    expect(presaleBal).to.equal(PRESALE_CAP);
    
    const treasuryBal = await token.balanceOf(owner.address);
    expect(treasuryBal).to.equal(TREASURY_ALLOC);
  });

  it("transfers update balances with vaultOnly disabled", async function () {
    // Owner (treasury) holds tokens
    await token.connect(owner).setVaultOnly(false);
    
    const amt = ethers.parseUnits("1000", 18);
    await token.connect(owner).transfer(alice.address, amt);
    
    const aliceBal = await token.balanceOf(alice.address);
    expect(aliceBal).to.equal(amt);
  });

  it("allows transfers when vaultHub not set (vaultOnly skipped)", async function () {
    // When vaultHub is not set, vaultOnly enforcement is skipped
    // This is expected behavior for deployment without hub
    const amt = ethers.parseUnits("1000", 18);
    
    // Owner can transfer even with vaultOnly=true because no hub
    await token.connect(owner).transfer(alice.address, amt);
    
    const aliceBal = await token.balanceOf(alice.address);
    expect(aliceBal).to.equal(amt);
  });
});
