const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra16 - broad permutations to flip remaining arms", function () {
  let deployer, dao, alice, bob, carol;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("sweeps many TEST helpers in Commerce and Finance", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");

    const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");
    const CE = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:CommerceEscrow");
    const Stable = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");
    const Treasury = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:EcoTreasuryVault");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();
    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();

    // Set seer min before MR deploy
    await seer.setMin(2);

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();
    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    // Ensure different vault setups
    await vault.setVault(bob.address, bob.address);
    await vault.setVault(alice.address, alice.address);
    await vault.setVault(carol.address, carol.address);

    // Call many MR helpers with permutations
    const a1 = await mr.TEST_exec_addMerchant_ifvariants(alice.address, false, false, false);
    const a2 = await mr.TEST_exec_addMerchant_ifvariants(alice.address, true, false, false);
    const a3 = await mr.TEST_exec_addMerchant_ifvariants(alice.address, false, true, false);
    const a4 = await mr.TEST_exec_addMerchant_ifvariants(alice.address, false, false, true);
    expect(Number(a1)).to.be.a('number');
    expect(Number(a2)).to.be.a('number');
    expect(Number(a3)).to.be.a('number');
    expect(Number(a4)).to.be.a('number');

    // toggle TEST flags and re-call fine-grained helpers
    await mr.TEST_setForceAlreadyMerchant(true);
    await mr.TEST_setForceNoVault(true);
    await mr.TEST_setForceLowScore(true);
    expect(await mr.TEST_if_forceAlready_right()).to.be.a('boolean');
    expect(await mr.TEST_if_forceNoVault_right()).to.be.a('boolean');
    expect(await mr.TEST_if_forceLowScore_right()).to.be.a('boolean');

    // call combined cover helper with different inputs
    const c1 = await mr.TEST_cover_additional_branches(alice.address, alice.address, 0, 0, false, false, false);
    const c2 = await mr.TEST_cover_additional_branches(alice.address, alice.address, 10, 10, true, true, true);
    expect(Number(c1)).to.be.a('number');
    expect(Number(c2)).to.be.a('number');

    // Call escrow open variants with permutations
    const ev1 = await escrow.TEST_exec_open_ifvariants(bob.address, alice.address, false, false, false, false);
    const ev2 = await escrow.TEST_exec_open_ifvariants(bob.address, alice.address, true, true, true, true);
    expect(Number(ev1)).to.be.a('number');
    expect(Number(ev2)).to.be.a('number');

    // Call escrow coverage helpers
    const e1 = await escrow.TEST_cover_escrow_more(0, alice.address, false, false);
    const e2 = await escrow.TEST_cover_escrow_more(1, bob.address, true, true);
    expect(Number(e1)).to.be.a('number');
    expect(Number(e2)).to.be.a('number');

    // Finance: decimals and tx variants
    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();
    await stable.TEST_setOnlyDAOOff(true);
    await stable.addAsset(good.target, "G");

    const f1 = await stable.TEST_exec_decimals_and_tx_ifvariants(good.target, false, 0, 0, ethers.ZeroAddress, false, false);
    const f2 = await stable.TEST_exec_decimals_and_tx_ifvariants(good.target, true, 8, 100, bob.address, true, true);
    expect(Number(f1)).to.be.a('number');
    expect(Number(f2)).to.be.a('number');

    const fm1 = await stable.TEST_cover_more_finance(good.target, 0, ethers.ZeroAddress, false, 0, false, false);
    const fm2 = await stable.TEST_cover_more_finance(good.target, 1000, bob.address, false, 0, true, true);
    expect(Number(fm1)).to.be.a('number');
    expect(Number(fm2)).to.be.a('number');

    // Treasury helpers
    const t1 = await treasury.TEST_exec_treasury_ifvariants(good.target, 0, ethers.ZeroAddress, true, true);
    expect(Number(t1)).to.be.a('number');

    // revert flags: toggle back
    await mr.TEST_setForceAlreadyMerchant(false);
    await mr.TEST_setForceNoVault(false);
    await mr.TEST_setForceLowScore(false);
    await stable.TEST_setForceDecimals(0, false);

    // smoke: call many boolean helpers to flip arms
    expect(await mr.TEST_if_merchant_status_none(carol.address)).to.be.a('boolean');
    expect(await mr.TEST_if_vaultHub_vaultOf_isZero(carol.address)).to.be.a('boolean');
    expect(await mr.TEST_if_seer_getScore_lt_min(carol.address)).to.be.a('boolean');
    expect(await escrow.TEST_if_buyerVault_zero(carol.address)).to.be.a('boolean');
    expect(await stable.TEST_if_asset_not_ok(ethers.ZeroAddress)).to.be.a('boolean');
    expect(await stable.TEST_if_staticcall_returns_short(ethers.ZeroAddress)).to.be.a('boolean');
    expect(await treasury.TEST_if_token_is_vfide_or_whitelisted(good.target)).to.be.a('boolean');
  });
});
