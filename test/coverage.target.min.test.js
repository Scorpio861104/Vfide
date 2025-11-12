const { expect } = require("chai");
const { ethers } = require("hardhat");

// This test explicitly deploys the contracts from the contracts-min sources
// (fully-qualified names) so we exercise the exact lines/branches reported by
// the coverage listing script that points at contracts-min/*.sol.
describe("coverage.target.min - exercise contracts-min helpers", function () {
  let deployer, dao, alice, bob;
  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it("MerchantRegistry (contracts-min): flip subexpr arms via TEST_exercise_addMerchant_checks", async function () {
  const VaultHub = await ethers.getContractFactory("contracts-min/mocks/VaultHubMock.sol:VaultHubMock");
  const Seer = await ethers.getContractFactory("contracts-min/mocks/SeerMock.sol:SeerMock");
  const ERC20 = await ethers.getContractFactory("contracts-min/mocks/ERC20Mock.sol:ERC20Mock");
  const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // initial no-vault
    let chk = await mr.TEST_exercise_addMerchant_checks(alice.address);
    expect(chk.leftAlreadyMerchant).to.equal(false);
    expect(chk.noVault).to.equal(true);

    // give vault and score
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
    chk = await mr.TEST_exercise_addMerchant_checks(alice.address);
    expect(chk.noVault).to.equal(false);

    // exercise force flags
    await mr.TEST_setForceAlreadyMerchant(true);
    chk = await mr.TEST_exercise_addMerchant_checks(bob.address);
    expect(chk.rightForceAlready).to.equal(true);
    await mr.TEST_setForceAlreadyMerchant(false);

    await mr.TEST_setForceNoVault(true);
    chk = await mr.TEST_exercise_addMerchant_checks(bob.address);
    expect(chk.forceNoVault).to.equal(true);
    await mr.TEST_setForceNoVault(false);
  });

  it("StablecoinRegistry (contracts-min): exercise decimals and deposit/send checks", async function () {
  const Ledger = await ethers.getContractFactory("contracts-min/mocks/LedgerMock.sol:LedgerMock");
  const Stable = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");
  const Treasury = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:EcoTreasuryVault");
  const ERC20 = await ethers.getContractFactory("contracts-min/mocks/ERC20Mock.sol:ERC20Mock");
  const ERC20ReturnFalse = await ethers.getContractFactory("contracts-min/mocks/ERC20ReturnFalse.sol:ERC20ReturnFalse");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();
    const bad = await ERC20ReturnFalse.deploy(); await bad.waitForDeployment();

    // force decimals return path via TEST_setForceDecimals
    await stable.TEST_setForceDecimals(6, true);
    let dec = await stable.TEST_exercise_decimals_try(good.target);
    expect(dec.okReturn).to.equal(true);
    await stable.TEST_setForceDecimals(0, false);

    // deposit/send helper checks (notWhitelisted etc.)
    let chk = await stable.TEST_exercise_deposit_send_checks(bad.target, 0, ethers.ZeroAddress);
    expect(chk.notWhitelisted).to.equal(true);
    expect(chk.zeroAmount).to.equal(true);

    // whitelist and re-check
    await stable.connect(dao).addAsset(good.target, "G");
    chk = await stable.TEST_exercise_deposit_send_checks(good.target, 10, bob.address);
    expect(chk.notWhitelisted).to.equal(false);
  });
});
