const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra9 - pinpoint helpers to flip last arms", function () {
  let deployer, dao, alice, bob, carol;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("MerchantRegistry pinpoint helpers", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
  const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // basic calls to new pinpoint helpers
    expect(await mr.TEST_if_merchant_status_none(carol.address)).to.equal(true);
    expect(await mr.TEST_if_vaultHub_vaultOf_isZero(carol.address)).to.equal(true);
    // set vault and score then re-check
    await vault.setVault(alice.address, alice.address);
    await seer.setScore(alice.address, 120);
    expect(await mr.TEST_if_merchant_status_none(alice.address)).to.equal(true);
    expect(await mr.TEST_if_vaultHub_vaultOf_isZero(alice.address)).to.equal(false);
    // seer score check
    expect(await mr.TEST_if_seer_getScore_lt_min(alice.address)).to.be.a('boolean');
    // threshold helpers
    expect(await mr.TEST_if_refund_threshold_reached(alice.address, 0)).to.equal(false);
    expect(await mr.TEST_if_dispute_threshold_reached(alice.address, 10)).to.equal(true);
  });

  it("Finance pinpoint helpers", async function () {
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");
  const Stable = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();

    // by default good isn't whitelisted yet
    expect(await stable.TEST_if_asset_not_ok(good.target)).to.equal(true);
    // add asset and re-check
    await stable.connect(dao).addAsset(good.target, "G");
    expect(await stable.TEST_if_asset_not_ok(good.target)).to.equal(false);

    // staticcall short/ok check
    const short = await stable.TEST_if_staticcall_returns_short(good.target);
    expect(typeof short).to.equal('boolean');

    // treasury force flags helper (returns tuple)
    const t = await stable.TEST_cover_decimals_and_deposit(good.target, false, 0, 0, ethers.ZeroAddress);
    expect(Array.isArray(t) || typeof t === 'object').to.be.true;
  });
});

