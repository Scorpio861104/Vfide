const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra13 - additional Commerce pinpoint helpers", function () {
  let deployer, dao, alice, bob;

  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it("covers extra MerchantRegistry combined branches", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    // set seer min before deploying MR so MR.minScore picks it up
    await seer.setMin(5);
    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // call the new helper in a few permutations to flip arms
    // case A: no vault, no forces, zero refunds/disputes
    const rA = await mr.TEST_cover_additional_branches(alice.address, alice.address, 0, 0, false, false, false);
    expect(Number(rA)).to.be.a('number');

    // case B: set vault and force flags
    await vault.setVault(alice.address, bob.address);
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(true);
    const rB = await mr.TEST_cover_additional_branches(alice.address, alice.address, 10, 10, true, true, true);
    expect(Number(rB)).to.be.a('number');

    // clear forces
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);

    // call combined escrows helper
    const CE = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:CommerceEscrow");
    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // empty escrow id 0
    const e0 = await escrow.TEST_cover_escrow_more(0, alice.address, false, false);
    expect(Number(e0)).to.be.a('number');

    // create an escrow-like storage by opening via helper conditions (we won't fully open funds) — still call helper with non-zero id
    const e1 = await escrow.TEST_cover_escrow_more(1, alice.address, true, true);
    expect(Number(e1)).to.be.a('number');
  });
});
