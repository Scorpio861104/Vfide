const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDEFinance coverage-focused tests", function () {
  let owner, dao, other, recipient;
  let StablecoinRegistry, stable;
  let EcoTreasuryVault, treasury;
  let ERC20Mock, stableToken;
  let VaultHubMock;

  beforeEach(async function () {
    [owner, dao, other, recipient] = await ethers.getSigners();

    ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    stableToken = await ERC20Mock.deploy("MockUSD", "MUSD");
    await stableToken.waitForDeployment();

    StablecoinRegistry = await ethers.getContractFactory("StablecoinRegistry");
    stable = await StablecoinRegistry.deploy(dao.address, ethers.ZeroAddress);
    await stable.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    const vh = await VaultHubMock.deploy();
    await vh.waitForDeployment();

    EcoTreasuryVault = await ethers.getContractFactory("EcoTreasuryVault");
    treasury = await EcoTreasuryVault.deploy(dao.address, ethers.ZeroAddress, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();
  });

  it("setDAO and setLedger by DAO and addAsset fallback decimals path", async function () {
    // setDAO to a new address
    await stable.connect(dao).setDAO(owner.address);
    expect(await stable.dao()).to.equal(owner.address);

  // set ledger to a contract mock to avoid calling a non-contract
  const LedgerMock = await ethers.getContractFactory("LedgerMock");
  const ledger = await LedgerMock.deploy(false);
  await ledger.waitForDeployment();
  await stable.connect(owner).setLedger(ledger.target);
  expect(await stable.ledger()).to.equal(ledger.target);

    // Add asset using a contract that does not implement decimals() (VaultHubMock) -> should fallback to 18
    const vh = await ethers.getContractFactory("VaultHubMock");
    const vaultHub = await vh.deploy();
    await vaultHub.waitForDeployment();

    // switch dao back to dao for next ops
    await stable.connect(owner).setDAO(dao.address);

    await stable.connect(dao).addAsset(vaultHub.target, "VH");
    const dec = await stable.tokenDecimals(vaultHub.target);
    expect(dec).to.equal(18);
  });

  it("removeAsset reverts when not whitelisted and depositStable edge cases", async function () {
    // removing non-whitelisted should revert
    await expect(stable.connect(dao).removeAsset(other.address)).to.be.revertedWithCustomError(stable, "FI_NotWhitelisted");

    // whitelist stableToken then test deposit reverts for zero and insufficient
    await stable.connect(dao).addAsset(stableToken.target, "MUSD");
    await expect(treasury.connect(other).depositStable(stableToken.target, 0n)).to.be.revertedWithCustomError(stable, "FI_Zero");

    const amt = ethers.parseUnits("100", 18);
    await stableToken.connect(other).mint(other.address, amt);
    // do not approve treasury -> transferFrom will fail
  // ERC20Mock reverts with "allowance" when transferFrom is not approved
  await expect(treasury.connect(other).depositStable(stableToken.target, amt)).to.be.revertedWith("allowance");
  });

  it("treasury send rejects zero token address and non-whitelisted tokens", async function () {
    // send with token == address(0) -> FI_NotAllowed
    await expect(treasury.connect(dao).send(ethers.ZeroAddress, recipient.address, 1n, "x")).to.be.revertedWithCustomError(treasury, "FI_NotAllowed");

    // send with non-whitelisted token -> FI_NotWhitelisted
    await expect(treasury.connect(dao).send(other.address, recipient.address, 1n, "x")).to.be.revertedWithCustomError(treasury, "FI_NotWhitelisted");
  });

  it("noteVFIDE emits ReceivedVFIDE", async function () {
    // noteVFIDE is callable and should emit
    await expect(treasury.connect(other).noteVFIDE(ethers.parseUnits("1", 18), other.address)).to.emit(treasury, "ReceivedVFIDE");
  });

  it("setModules, depositStable success and send success with logging", async function () {
    // deploy a ledger mock that does not revert
    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    const ledger = await LedgerMock.deploy(false);
    await ledger.waitForDeployment();

    // set modules via DAO and attach ledger to test _log path
    await treasury.connect(dao).setModules(dao.address, ledger.target, stable.target, other.address);
    expect(await treasury.dao()).to.equal(dao.address);

    // add stable token as whitelisted
    await stable.connect(dao).addAsset(stableToken.target, "MUSD");

    // mint and approve tokens to treasury, then deposit
    const amt = ethers.parseUnits("50", 18);
    await stableToken.connect(other).mint(other.address, amt);
    await stableToken.connect(other).approve(treasury.target, amt);
    await expect(treasury.connect(other).depositStable(stableToken.target, amt)).to.emit(treasury, "ReceivedStable");

    // send from treasury as DAO should succeed
    await expect(treasury.connect(dao).send(stableToken.target, recipient.address, amt, "payroll")).to.emit(treasury, "Sent");

    // setModules with zero dao should revert
    await expect(treasury.connect(dao).setModules(ethers.ZeroAddress, ledger.target, stable.target, other.address)).to.be.revertedWithCustomError(treasury, "FI_Zero");
  });

  it("depositStable and send detect FI_Insufficient when token returns false", async function () {
    // deploy token that returns false on transfer/transferFrom
    const BadToken = await ethers.getContractFactory("ERC20ReturnFalse");
    const bad = await BadToken.deploy();
    await bad.waitForDeployment();

    // whitelist bad token
    await stable.connect(dao).addAsset(bad.target, "BAD");

    // attempt depositStable should revert FI_Insufficient because transferFrom returns false
  await expect(treasury.connect(other).depositStable(bad.target, 1n)).to.be.revertedWithCustomError(treasury, "FI_Insufficient");

    // mint some real stable into treasury first to ensure send non-whitelisted would fail; use normal stableToken
    await stable.connect(dao).addAsset(stableToken.target, "MUSD");
    const amt = ethers.parseUnits("1", 18);
    await stableToken.connect(other).mint(other.address, amt);
    await stableToken.connect(other).approve(treasury.target, amt);
    await treasury.connect(other).depositStable(stableToken.target, amt);

  // test FI_Insufficient by attempting to send bad token (whitelisted) which returns false on transfer
    // make treasury hold some bad tokens: impossible via transferFrom (it returns false), so directly call send and expect FI_Insufficient
    await expect(treasury.connect(dao).send(bad.target, other.address, 1n, "x")).to.be.revertedWithCustomError(treasury, "FI_Insufficient");
  });
});
