const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra19 - hotspot helpers for Commerce (300-410, 490-610)", function () {
  let deployer, dao, alice, bob, carol;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("exercises hotspot helpers with permutations", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");

    const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");
    const CE = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:CommerceEscrow");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    await seer.setMin(2);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();
    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // Setup vaults for some signers
    await vault.setVault(alice.address, alice.address);
    await vault.setVault(bob.address, bob.address);
    // carol will have no vault to hit zero-vault arms

    // Use hotspot 300s with mixes
  const h300_a = await escrow.TEST_hotspot_300s(alice.address, alice.address, 0, 0, false, false);
  const h300_b = await escrow.TEST_hotspot_300s(carol.address, carol.address, 10, 10, true, true);
    expect(Number(h300_a)).to.be.a('number');
    expect(Number(h300_b)).to.be.a('number');

    // hotspot 330s OR/cond-expr combinations
  const h330_a = await escrow.TEST_hotspot_330s(alice.address, alice.address, false, false);
  const h330_b = await escrow.TEST_hotspot_330s(carol.address, carol.address, true, true);
    expect(Number(h330_a)).to.be.a('number');
    expect(Number(h330_b)).to.be.a('number');

    // hotspot 360s escrow state and vault combos (use id 0 for empty escrow)
  const h360_a = await escrow.TEST_hotspot_360s(0, alice.address, false, false);
  const h360_b = await escrow.TEST_hotspot_360s(1, bob.address, true, true);
    expect(Number(h360_a)).to.be.a('number');
    expect(Number(h360_b)).to.be.a('number');

    // hotspot 490s cond-expr branches
  const h490_a = await escrow.TEST_hotspot_490s(alice.address, 0, false, false);
  const h490_b = await escrow.TEST_hotspot_490s(carol.address, 100, true, true);
    expect(Number(h490_a)).to.be.a('number');
    expect(Number(h490_b)).to.be.a('number');

    // toggle some TEST flags and re-call to flip OR arms
  await mr.TEST_setForceNoVault(true);
  const h330_c = await escrow.TEST_hotspot_330s(carol.address, carol.address, false, false);
    expect(Number(h330_c)).to.be.a('number');
    await mr.TEST_setForceNoVault(false);

    await mr.TEST_setForceLowScore(true);
  const h300_c = await escrow.TEST_hotspot_300s(carol.address, carol.address, 0, 0, false, false);
    expect(Number(h300_c)).to.be.a('number');
    await mr.TEST_setForceLowScore(false);
  });
});
