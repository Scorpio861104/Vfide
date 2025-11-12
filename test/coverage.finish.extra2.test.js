const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra2 - targeted branch hits", function () {
  let deployer, dao, alice, bob;

  beforeEach(async () => {
    [deployer, dao, alice, bob] = await ethers.getSigners();
  });

  it("MerchantRegistry: exercise addMerchant subexprs and force flags", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");

    const vault = await VaultHub.deploy();
    await vault.waitForDeployment();
    const seer = await Seer.deploy();
    await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T");
    await token.waitForDeployment();

  // deploy MerchantRegistry with dao=dao.address
  const MR = await ethers.getContractFactory("MerchantRegistry");
  const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // initially no flags
    let [left, right] = await mr.TEST_eval_addMerchant_subexpr(alice.address);
    expect(left).to.equal(false);
    expect(right).to.equal(false);

    // set TEST_forceAlreadyMerchant and re-check
    await mr.TEST_setForceAlreadyMerchant(true);
    [left, right] = await mr.TEST_eval_addMerchant_subexpr(alice.address);
    expect(left).to.equal(false);
    expect(right).to.equal(true);

    // test noVault / low score via TEST_eval_addMerchant_flags
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(false);
    let flags = await mr.TEST_eval_addMerchant_flags(alice.address);
    expect(flags.noVault).to.equal(true);

    // test noteRefund force-flag causes revert
    await mr.TEST_setForceZeroSenderRefund(true);
    await expect(mr._noteRefund(alice.address)).to.be.revertedWithCustomError(mr, "COM_Zero");

    // create a valid merchant then call _noteRefund successfully
    // clear earlier test-force flags so addMerchant can succeed
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);
    await mr.TEST_setForceZeroSenderRefund(false);
    // give vault and score
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 100);
    // call addMerchant from alice
  const someHash = '0x' + '00'.repeat(32);
  await expect(mr.connect(alice).addMerchant(someHash)).to.not.be.reverted;
    // now call _noteRefund as deployer (any caller allowed for increment)
    await expect(mr._noteRefund(alice.address)).to.not.be.reverted;
  });

  it("Finance: decimals helper and deposit/send insufficient paths", async function () {
    const ERC20ReturnFalse = await ethers.getContractFactory("ERC20ReturnFalse");
    const ERC20Fail = await ethers.getContractFactory("ERC20FailTransfer");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
  const Ledger = await ethers.getContractFactory("LedgerMock");

  const ledger = await Ledger.deploy(false);
  await ledger.waitForDeployment();

    // deploy StablecoinRegistry with dao = dao.address
    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();

    // force decimals path
    await stable.TEST_setForceDecimals(6, true);
    expect(await stable.TEST_decimalsOrTry_public(ethers.ZeroAddress)).to.equal(6);
    await stable.TEST_setForceDecimals(0, false);

    // deploy EcoTreasuryVault
    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();

    // depositStable with return-false token should revert FI_Insufficient
    const bad = await ERC20ReturnFalse.deploy();
    await bad.waitForDeployment();
    // whitelist the token (dao only)
  await stable.connect(dao).addAsset(bad.target, "BAD");
  await expect(treasury.connect(alice).depositStable(bad.target, 100)).to.be.reverted;

    // depositStable forced-insufficient flag
    const good = await ERC20.deploy("G","G");
    await good.waitForDeployment();
    // whitelist good and mint/approve so transferFrom would succeed
    await stable.connect(dao).addAsset(good.target, "G");
    await good.mint(alice.address, 1000);
    await good.connect(alice).approve(treasury.target, 1000);
  await treasury.TEST_setForceDepositInsufficient(true);
  await expect(treasury.connect(alice).depositStable(good.target, 100)).to.be.reverted;
    await treasury.TEST_setForceDepositInsufficient(false);

    // send: whitelisted token but transfer returns false
    const fail = await ERC20Fail.deploy();
    await fail.waitForDeployment();
    // whitelist and attempt send
  await stable.connect(dao).addAsset(fail.target, "F");
  await expect(treasury.connect(dao).send(fail.target, bob.address, 1, "x")).to.be.reverted;

    // send forced-insufficient
  await treasury.TEST_setForceSendInsufficient(true);
    // use a whitelisted token (good) that would otherwise succeed
  await expect(treasury.connect(dao).send(good.target, bob.address, 1, "r")).to.be.reverted;
  });
});
