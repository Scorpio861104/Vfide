const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage.finish.extra11 - escrow & treasury pinpoint helpers", function () {
  let deployer, dao, alice, bob, carol;

  beforeEach(async () => {
    [deployer, dao, alice, bob, carol] = await ethers.getSigners();
  });

  it("Escrow helpers and securityCheck", async function () {
    const VaultHub = await ethers.getContractFactory("VaultHubMock");
    const Seer = await ethers.getContractFactory("SeerMock");
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const MR = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:MerchantRegistry");
    const CE = await ethers.getContractFactory("contracts-min/VFIDECommerce.sol:CommerceEscrow");

    const vault = await VaultHub.deploy(); await vault.waitForDeployment();
    const seer = await Seer.deploy(); await seer.waitForDeployment();
    const token = await ERC20.deploy("T","T"); await token.waitForDeployment();

    const mr = await MR.deploy(dao.address, token.target, vault.target, seer.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await mr.waitForDeployment();
    const escrow = await CE.deploy(dao.address, token.target, vault.target, mr.target, ethers.ZeroAddress, ethers.ZeroAddress);
    await escrow.waitForDeployment();

    // securityCheck on zero vault should be false (no security set)
    expect(await escrow.TEST_if_securityCheck_addr(ethers.ZeroAddress)).to.equal(false);

    // escrow id 0 has empty storage; state eq should be false for any non-zero
    expect(await escrow.TEST_if_escrow_state_eq(0, 1)).to.equal(false);
    expect(await escrow.TEST_if_escrow_buyerVault_zero(0)).to.equal(true);
  });

  it("Treasury helpers", async function () {
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const Ledger = await ethers.getContractFactory("LedgerMock");
    const Stable = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:StablecoinRegistry");
    const Treasury = await ethers.getContractFactory("contracts-min/VFIDEFinance.sol:EcoTreasuryVault");

    const ledger = await Ledger.deploy(false); await ledger.waitForDeployment();
    const stable = await Stable.deploy(dao.address, ledger.target); await stable.waitForDeployment();
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress); await treasury.waitForDeployment();

    const good = await ERC20.deploy("G","G"); await good.waitForDeployment();

    expect(await treasury.TEST_if_to_or_amount_zero(good.target, ethers.ZeroAddress, 0)).to.equal(true);
    expect(await treasury.TEST_if_token_is_vfide_or_whitelisted(good.target)).to.equal(false);
    expect(await treasury.TEST_if_TEST_force_flags_either()).to.equal(false);
  });
});
