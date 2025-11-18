const { expect } = require("chai");
const { ethers } = require("hardhat");

const mk32 = (n) => {
  const v = BigInt(n).toString(16);
  return '0x' + v.padStart(64, '0');
};

describe("TEST-ONLY forced-branch coverage helpers", function () {
  let owner, dao, merchant, buyer, other;
  beforeEach(async function () {
    [owner, dao, merchant, buyer, other] = await ethers.getSigners();
  });

  it("MerchantRegistry: force AlreadyMerchant and zero-sender branches", async function () {
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("M","M");
    await token.waitForDeployment();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    const vault = await VaultHubMock.deploy();
    await vault.waitForDeployment();

    const SeerMock = await ethers.getContractFactory("SeerMock");
    const seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    const MR = await ethers.getContractFactory("MerchantRegistry");
    const mr = await MR.deploy(owner.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // force AlreadyMerchant
    await mr.TEST_setForceAlreadyMerchant(true);
    await expect(mr.connect(merchant).addMerchant(mk32(1))).to.be.revertedWithCustomError(mr, "COM_AlreadyMerchant");
    await mr.TEST_setForceAlreadyMerchant(false);

    // force zero-sender on refund
    await mr.TEST_setForceZeroSenderRefund(true);
    await expect(mr.connect(other)._noteRefund(merchant.address)).to.be.revertedWithCustomError(mr, "COM_Zero");
    await mr.TEST_setForceZeroSenderRefund(false);

    // force zero-sender on dispute
    await mr.TEST_setForceZeroSenderDispute(true);
    await expect(mr.connect(other)._noteDispute(merchant.address)).to.be.revertedWithCustomError(mr, "COM_Zero");
  });

  it("StablecoinRegistry: force decimals fallback/override path", async function () {
    const StableF = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await StableF.deploy(owner.address, ethers.ZeroAddress);
    await stable.waitForDeployment();

    // force decimals to 8
    await stable.TEST_setForceDecimals(8, true);

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const t = await ERC20Mock.deploy("Tok","T");
    await t.waitForDeployment();

    // addAsset should use our forced decimals value
    await expect(stable.connect(owner).addAsset(t.target, "TKN")).to.emit(stable, "AssetAdded").withArgs(t.target, 8, "TKN");
  });

  it("EcoTreasuryVault: force deposit/send insufficient errors", async function () {
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const t = await ERC20Mock.deploy("Tok","T");
    await t.waitForDeployment();

    const StableF = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await StableF.deploy(owner.address, ethers.ZeroAddress);
    await stable.waitForDeployment();

    await stable.connect(owner).addAsset(t.target, "T");

    const Vault = await ethers.getContractFactory("EcoTreasuryVault");
    const v = await Vault.deploy(owner.address, ethers.ZeroAddress, stable.target, ethers.ZeroAddress);
    await v.waitForDeployment();

  // prepare balance/allowance so transferFrom does not revert itself
  const amt = ethers.parseUnits("1", 18);
  await t.connect(owner).mint(other.address, amt);
  await t.connect(other).approve(v.target, amt);
  // set test flag to force deposit insufficient
  await v.TEST_setForceDepositInsufficient(true);
  await expect(v.connect(other).depositStable(t.target, amt)).to.be.revertedWithCustomError(v, "FI_Insufficient");
    await v.TEST_setForceDepositInsufficient(false);

    // set test flag for send insufficient
  await v.TEST_setForceSendInsufficient(true);
  // mint to treasury so transfer won't revert itself
  await t.connect(owner).mint(v.target, ethers.parseUnits("1", 18));
  await expect(v.connect(owner).send(t.target, other.address, ethers.parseUnits("1", 18), "x")).to.be.revertedWithCustomError(v, "FI_Insufficient");
  });

  it("VFIDEToken: check forced vault/staticcall/router branches", async function () {
    const Vesting = await ethers.getContractFactory("contracts-min/mocks/VestingVault.sol:VestingVault");
    const vest = await Vesting.deploy();
    await vest.waitForDeployment();

    const TokenF = await ethers.getContractFactory("VFIDEToken");
    const token = await TokenF.deploy(vest.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // force vaultHub zero path
    await token.TEST_setForceVaultHubZero(true);
    expect(await token.TEST_check_isVault(other.address)).to.equal(false);
    await token.TEST_setForceVaultHubZero(false);

    // force security staticcall failure
    await token.TEST_setForceSecurityStaticcallFail(true);
    expect(await token.TEST_check_locked(other.address)).to.equal(true);
    await token.TEST_setForceSecurityStaticcallFail(false);

    // force router requirement to revert
    await token.TEST_setForcePolicyLockedRequireRouter(true);
    await expect(token.TEST_force_router_requirement()).to.be.revertedWith("router required");
  });

  it("mocks: exercise ERC20Mock failure branches and LedgerMock paths", async function () {
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const t = await ERC20Mock.deploy("X","X");
    await t.waitForDeployment();

    // transfer should revert when balance insufficient
    await expect(t.connect(other).transfer(owner.address, 1)).to.be.revertedWith("balance");

    // transferFrom: insufficient balance
    await expect(t.connect(other).transferFrom(other.address, owner.address, 1)).to.be.revertedWith("balance");

    // transferFrom: insufficient allowance path (mint some to 'other' but don't set allowance)
    await t.connect(owner).mint(other.address, ethers.parseUnits("1", 18));
    await expect(t.connect(other).transferFrom(other.address, owner.address, ethers.parseUnits("1", 18))).to.be.revertedWith("allowance");

    // LedgerMock: both success and revert paths
    const LedgerF = await ethers.getContractFactory("LedgerMock");
    const ledger = await LedgerF.deploy(false);
    await ledger.waitForDeployment();
    await ledger.logSystemEvent(owner.address, "x", owner.address);
    await ledger.logEvent(owner.address, "y", 1, "note");
    await ledger.setRevert(true);
    await expect(ledger.logSystemEvent(owner.address, "x", owner.address)).to.be.revertedWith("ledger revert");
    await expect(ledger.logEvent(owner.address, "y", 1, "note")).to.be.revertedWith("ledger revert");
  });
});
