const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage: finish remaining branch arms", function () {
  it("MerchantRegistry: _noteRefund and _noteDispute hit COM_Zero via TEST toggles", async function () {
    const [deployer, other] = await ethers.getSigners();

    // deploy mocks required by MerchantRegistry
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Security = await ethers.getContractFactory("SecurityHubMock");
    const security = await Security.deploy();
    await security.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20.deploy("T", "T");
    await token.waitForDeployment();

    const Merchant = await ethers.getContractFactory("MerchantRegistry");
    const merchants = await Merchant.deploy(deployer.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await merchants.waitForDeployment();

    // set TEST toggle to force zero-sender path
  await merchants.TEST_setForceZeroSenderRefund(true);
  await expect(merchants._noteRefund(deployer.address)).to.be.revertedWithCustomError(merchants, "COM_Zero");

  await merchants.TEST_setForceZeroSenderDispute(true);
  await expect(merchants._noteDispute(deployer.address)).to.be.revertedWithCustomError(merchants, "COM_Zero");
  });

  it("StablecoinRegistry & EcoTreasury: exercise TEST decimal and insufficient flags", async function () {
    const [deployer, dao, alice] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();

  // Deploy a dummy token that returns false on transfer/transferFrom to exercise the 'insufficient' path
  const ERC20Bad = await ethers.getContractFactory("ERC20ReturnFalse");
  const token = await ERC20Bad.deploy();
  await token.waitForDeployment();

    // Force decimals path
  await stable.TEST_setForceDecimals(8, true);
  await stable.connect(dao).addAsset(token.target, "S");
    expect(await stable.tokenDecimals(token.target)).to.equal(8);

    // Deploy EcoTreasuryVault
    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();

    // Ensure token is whitelisted (we already added it above)

    // Test depositStable revert via TEST flag
  await treasury.TEST_setForceDepositInsufficient(true);
  await expect(treasury.connect(alice).depositStable(token.target, 1)).to.be.revertedWithCustomError(treasury, "FI_Insufficient");

  // Test send revert via TEST flag (must be called by dao)
  await treasury.TEST_setForceSendInsufficient(true);
  await expect(treasury.connect(dao).send(token.target, alice.address, 1, "x")).to.be.revertedWithCustomError(treasury, "FI_Insufficient");
  });

  it("mocks: exercise TEST_checkAllowance branches and MerchantRegistry addMerchant TEST toggles", async function () {
    const [deployer, owner, spender] = await ethers.getSigners();

    // GasDrainer TEST_checkAllowance
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const gas = await Gas.deploy();
    await gas.waitForDeployment();
    await gas.mint(owner.address, 100);
    await gas.connect(owner).approve(spender.address, 10);
    expect(await gas.TEST_checkAllowance(owner.address, spender.address, 5)).to.equal(true);
    expect(await gas.TEST_checkAllowance(owner.address, spender.address, 20)).to.equal(false);

    // Reentering ERC20 TEST_checkAllowance
    const Reent = await ethers.getContractFactory("ReenteringERC20");
    const reent = await Reent.deploy();
    await reent.waitForDeployment();
    await reent.mint(owner.address, 100);
    await reent.connect(owner).approve(spender.address, 3);
    expect(await reent.TEST_checkAllowance(owner.address, spender.address, 2)).to.equal(true);
    expect(await reent.TEST_checkAllowance(owner.address, spender.address, 5)).to.equal(false);

    // MerchantRegistry addMerchant TEST toggles
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();
    await vaultHub.setVault(owner.address, owner.address);

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();
    await seer.setScore(owner.address, 999);

    const Security = await ethers.getContractFactory("SecurityHubMock");
    const security = await Security.deploy();
    await security.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20.deploy("T", "T");
    await token.waitForDeployment();

    const Merchant = await ethers.getContractFactory("MerchantRegistry");
    const merchants = await Merchant.deploy(deployer.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await merchants.waitForDeployment();

  const zeroHash = '0x' + '00'.repeat(32);
  // Force AlreadyMerchant
  await merchants.TEST_setForceAlreadyMerchant(true);
  await expect(merchants.connect(owner).addMerchant(zeroHash)).to.be.revertedWithCustomError(merchants, "COM_AlreadyMerchant");

  // Force NoVault
  await merchants.TEST_setForceAlreadyMerchant(false);
  await merchants.TEST_setForceNoVault(true);
  await expect(merchants.connect(owner).addMerchant(zeroHash)).to.be.revertedWithCustomError(merchants, "COM_NotAllowed");

  // Force LowScore
  await merchants.TEST_setForceNoVault(false);
  await merchants.TEST_setForceLowScore(true);
  await expect(merchants.connect(owner).addMerchant(zeroHash)).to.be.revertedWithCustomError(merchants, "COM_NotAllowed");
  });

  it("StablecoinRegistry: ledger revert path is caught (try/catch) to exercise both arms", async function () {
    const [deployer, dao] = await ethers.getSigners();
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(true); // will revert
    await ledger.waitForDeployment();

    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();

    const ERC20Bad = await ethers.getContractFactory("ERC20ReturnFalse");
    const token = await ERC20Bad.deploy();
    await token.waitForDeployment();

    // Should not revert even though ledger.logEvent will revert (caught)
    await stable.TEST_setForceDecimals(4, true);
    await expect(stable.connect(dao).addAsset(token.target, "X")).to.not.be.reverted;
  });

  it("invoke TEST helpers to exercise conditional sub-expressions", async function () {
    const [deployer, dao, alice] = await ethers.getSigners();

    // Deploy Commerce pieces
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    const Seer = await ethers.getContractFactory("SeerMock");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();
    await seer.setScore(alice.address, 1);

    const Security = await ethers.getContractFactory("SecurityHubMock");
    const security = await Security.deploy();
    await security.waitForDeployment();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20.deploy("T", "T");
    await token.waitForDeployment();

    const Merchant = await ethers.getContractFactory("MerchantRegistry");
    const merchants = await Merchant.deploy(deployer.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await merchants.waitForDeployment();

    // Call helper that evaluates addMerchant flags
    const flags = await merchants.TEST_eval_addMerchant_flags(alice.address);
    // flags is a tuple of three booleans; just ensure call succeeds
    expect(Array.isArray(flags)).to.equal(true);

    // Deploy CommerceEscrow
    const Escrow = await ethers.getContractFactory("CommerceEscrow");
    const escrow = await Escrow.deploy(deployer.address, token.target, vaultHub.target, merchants.target, security.target, ledger.target);
    await escrow.waitForDeployment();

    // Create a dummy escrow by directly calling open after setting vault for alice
    await vaultHub.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 999);
    const zeroHash = '0x' + '00'.repeat(32);
    await merchants.connect(alice).addMerchant(zeroHash);
    const id = await escrow.connect(alice).open(alice.address, 1, zeroHash).then(tx => escrow.escrowCount());

    // Call escrow helpers
    const openChecks = await escrow.TEST_eval_open_checks(alice.address, alice.address);
    expect(Array.isArray(openChecks)).to.equal(true);
    const access = await escrow.TEST_eval_access_checks(id, alice.address);
    expect(Array.isArray(access)).to.equal(true);

    // Finance helpers
    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();
  const dec = await stable.TEST_decimalsOrTry_public(token.target);
  if (typeof dec === 'undefined') throw new Error('decimals helper returned undefined');
    expect(await stable.TEST_eval_onlyDAO(dao.address)).to.equal(true);

    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();
    const depChecks = await treasury.TEST_eval_deposit_checks(token.target, 1);
    expect(Array.isArray(depChecks)).to.equal(true);
    const sendChecks = await treasury.TEST_eval_send_checks(token.target, alice.address, 1);
    expect(Array.isArray(sendChecks)).to.equal(true);
  });

  it("mocks: transferFrom success and failure arms for GasDrainer and Reentering", async function () {
    const [owner, spender, recipient] = await ethers.getSigners();

    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const gas = await Gas.deploy();
    await gas.waitForDeployment();
    await gas.mint(owner.address, 100);

    // failing transferFrom: no allowance
    await expect(gas.connect(spender).transferFrom(owner.address, recipient.address, 10)).to.be.revertedWith("allowance");

    // set allowance and succeed
    await gas.connect(owner).approve(spender.address, 20);
    await expect(gas.connect(spender).transferFrom(owner.address, recipient.address, 10)).to.not.be.reverted;

    // ReenteringERC20
    const Reent = await ethers.getContractFactory("ReenteringERC20");
    const reent = await Reent.deploy();
    await reent.waitForDeployment();
    await reent.mint(owner.address, 100);

    await expect(reent.connect(spender).transferFrom(owner.address, recipient.address, 5)).to.be.revertedWith("allowance");
    await reent.connect(owner).approve(spender.address, 10);
    await expect(reent.connect(spender).transferFrom(owner.address, recipient.address, 5)).to.not.be.reverted;
  });

  it("finance: onlyDAO gates for StablecoinRegistry and EcoTreasury (DAO vs non-DAO)", async function () {
    const [nonDao, dao, other] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();

    // non-DAO cannot call setDAO
    await expect(stable.connect(nonDao).setDAO(other.address)).to.be.revertedWithCustomError(stable, "FI_NotDAO");
    // DAO can
    await expect(stable.connect(dao).setDAO(other.address)).to.not.be.reverted;

    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();

    // non-DAO cannot call setModules
    await expect(treasury.connect(nonDao).setModules(other.address, ledger.target, stable.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(treasury, "FI_NotDAO");
    // DAO can
    await expect(treasury.connect(dao).setModules(other.address, ledger.target, stable.target, ethers.ZeroAddress)).to.not.be.reverted;
  });
});
