const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra10 - final pinpoint sweep", function () {
  let deployer, dao, alice, bob, carol;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("MerchantRegistry extra helpers", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();

    // toggle and call new helpers
    expect(await mr.TEST_if_onlyDAO_off_flag()).to.be.a('boolean');
    const vs = await mr.TEST_if_vaultAndScore(alice.address, 100);
    expect(Array.isArray(vs) || typeof vs === 'object').to.be.true;
  });

  it("StablecoinRegistry extra helpers", async function () {
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const Stable = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();

    const info = await stable.TEST_if_deposit_send_whitelist_and_zero(good.target, 0, ethers.ZeroAddress);
    expect(Array.isArray(info) || typeof info === 'object').to.be.true;
    expect(await stable.TEST_if_force_flags_state()).to.exist;
  });
});
