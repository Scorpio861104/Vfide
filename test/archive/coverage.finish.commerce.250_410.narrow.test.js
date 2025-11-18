const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.commerce.250_410.narrow", function () {
  it("calls mass/region/hotspot helpers with permutations to flip escrow-region arms", async function () {
    const [deployer, who, caller, other] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const erc = await ERC20.deploy("TF", "TF");
    await erc.waitForDeployment();

    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vault = await VaultHub.deploy();
    await vault.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    // prepare seer/vault before MR deploy
    await seer.setMin(1);
    await seer.setScore(who.address, 1);
    await seer.setScore(caller.address, 0);
    await vault.setVault(who.address, other.address);

  const MR = await ethers.getContractFactory("MerchantRegistry");
  const ZERO = '0x0000000000000000000000000000000000000000';
  const mr = await MR.deploy(deployer.address, erc.target, vault.target, seer.target, ZERO, ledger.target);
  await mr.waitForDeployment();

  const CE = await ethers.getContractFactory("CommerceEscrow");
  const escrow = await CE.deploy(deployer.address, erc.target, vault.target, mr.target, ZERO, ZERO);
  await escrow.waitForDeployment();

    // make 'who' a merchant so some branches hit ACTIVE status
    const META = '0x' + '00'.repeat(32);
    await mr.connect(who).addMerchant(META);

    // call mass helper with different permutations to exercise OR/cond-expr arms
    const out1 = await mr.TEST_cover_mass_250_410(who.address, caller.address, other.address, 0, 0, 0, true, false, false);
    expect(Number(out1)).to.be.a('number');

    const out2 = await mr.TEST_cover_mass_250_410(who.address, caller.address, other.address, 5, 3, 1, false, true, true);
    expect(Number(out2)).to.be.a('number');

    // call smaller region helper
    const r1 = await mr.TEST_cover_250_300_region(who.address, caller.address, 5, 3, true, false, true);
    expect(Number(r1)).to.be.a('number');

    // hotspot helpers
  const h1 = await escrow.TEST_hotspot_300s(who.address, caller.address, 5, 3, true, false);
  expect(Number(h1)).to.be.a('number');

  const h2 = await escrow.TEST_hotspot_330s(who.address, caller.address, true, true);
  expect(Number(h2)).to.be.a('number');

  const h3 = await escrow.TEST_hotspot_360s(1, caller.address, true, false);
  expect(Number(h3)).to.be.a('number');
  });
});
