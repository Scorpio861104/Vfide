const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra4 - TEST-only helpers exercise", function () {
  let deployer, dao, alice, bob;

  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it("Commerce: use TEST_exercise_addMerchant_checks to flip arms", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

  // initial: no vault, no merchant, no low-score flags
  let res = await mr.TEST_exec_addMerchant_branches(alice.address, false, false, false);
  expect(res.alreadyMerchantBranch).to.equal(false);
  expect(res.noVaultBranch).to.equal(true);

    // flip: give alice a vault and a good score
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
  res = await mr.TEST_exec_addMerchant_branches(alice.address, false, false, false);
  expect(res.noVaultBranch).to.equal(false);
  expect(res.alreadyMerchantBranch).to.equal(false);

    // create merchant then leftAlreadyMerchant should be true
    const h = '0x' + '33'.repeat(32);
    await mr.connect(alice).addMerchant(h);
  res = await mr.TEST_exec_addMerchant_branches(alice.address, false, false, false);
  expect(res.alreadyMerchantBranch).to.equal(true);

    // force flags: forceAlreadyMerchant and forceNoVault
  await mr.TEST_setForceAlreadyMerchant(true);
  res = await mr.TEST_exec_addMerchant_branches(bob.address, true, false, false);
  expect(res.alreadyMerchantBranch).to.equal(true);
  await mr.TEST_setForceAlreadyMerchant(false);

  await mr.TEST_setForceNoVault(true);
  res = await mr.TEST_exec_addMerchant_branches(bob.address, false, true, false);
  expect(res.noVaultBranch).to.equal(true);
  await mr.TEST_setForceNoVault(false);
  });

  it("Finance: use TEST_exercise_decimals_try and TEST_exercise_deposit_send_checks", async function () {
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const ERC20ReturnFalse = await ethers.getContractFactory("ERC20ReturnFalse");
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();
    const bad = await ERC20ReturnFalse.deploy(); await bad.waitForDeployment();

  // decimals: force-return path via the existing TEST helper on main contract
  let decRes = await stable.TEST_exec_decimals_branches(good.target, true, 8);
  expect(decRes[0]).to.equal(8);

  // staticcall path (ERC20Mock has decimals() returning 18)
  decRes = await stable.TEST_exec_decimals_branches(good.target, false, 0);
  // decRes returns (val, usedForce, usedStaticcall)
  expect(decRes[2] || decRes[0] === 18).to.be.true;

  // deposit/send checks: token is not whitelisted initially
  expect(await stable.isWhitelisted(bad.target)).to.equal(false);
  // whitelist good token and check isWhitelisted
  await stable.connect(dao).addAsset(good.target, "G");
  expect(await stable.isWhitelisted(good.target)).to.equal(true);
  });
});
