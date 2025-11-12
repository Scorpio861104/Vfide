const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("coverage: targeted extra arms", function () {
  it("mocks: transferFrom allowance revert arms (GasDrainer & Reentering)", async function () {
    const [deployer, owner, spender, recipient] = await ethers.getSigners();

    // GasDrainer: insufficient allowance -> revert 'allowance'
    const Gas = await ethers.getContractFactory("GasDrainerERC20");
    const gas = await Gas.deploy();
    await gas.waitForDeployment();
    await gas.mint(owner.address, 100);
    // give allowance less than transfer amount
    await gas.connect(owner).approve(spender.address, 5);
    await expect(gas.connect(spender).transferFrom(owner.address, recipient.address, 10)).to.be.revertedWith("allowance");

    // ReenteringERC20: same pattern
    const Reent = await ethers.getContractFactory("ReenteringERC20");
    const reent = await Reent.deploy();
    await reent.waitForDeployment();
    await reent.mint(owner.address, 100);
    await reent.connect(owner).approve(spender.address, 2);
    await expect(reent.connect(spender).transferFrom(owner.address, recipient.address, 5)).to.be.revertedWith("allowance");
    
    // Also exercise the balance-revert arms by calling transferFrom when balance is insufficient
    const Gas2 = await ethers.getContractFactory("GasDrainerERC20");
    const gas2 = await Gas2.deploy();
    await gas2.waitForDeployment();
    // owner has no balance here -> should revert with 'balance'
    await gas2.connect(owner).approve(spender.address, 10);
    await expect(gas2.connect(spender).transferFrom(owner.address, recipient.address, 5)).to.be.revertedWith("balance");

    const Reent2 = await ethers.getContractFactory("ReenteringERC20");
    const reent2 = await Reent2.deploy();
    await reent2.waitForDeployment();
    await reent2.connect(owner).approve(spender.address, 10);
    await expect(reent2.connect(spender).transferFrom(owner.address, recipient.address, 5)).to.be.revertedWith("balance");
  });

  it("CommerceEscrow: refund/dispute caller permutations exercise NotAllowed and success paths", async function () {
    const [dao, buyer, merchant, other] = await ethers.getSigners();

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
    const merchants = await Merchant.deploy(dao.address, token.target, vaultHub.target, seer.target, security.target, ledger.target);
    await merchants.waitForDeployment();

    // Setup vaults and merchant
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 999);
    const zeroHash = '0x' + '00'.repeat(32);
    await merchants.connect(merchant).addMerchant(zeroHash);

    const Escrow = await ethers.getContractFactory("CommerceEscrow");
    const escrow = await Escrow.deploy(dao.address, token.target, vaultHub.target, merchants.target, security.target, ledger.target);
    await escrow.waitForDeployment();

    // Open escrow by buyer
    const tx = await escrow.connect(buyer).open(merchant.address, 10, zeroHash);
    // get id from escrowCount
  const id = Number(await escrow.escrowCount());

    // fund the escrow by minting tokens directly to escrow
    await token.mint(escrow.target, 10);
    await escrow.markFunded(id);

    // unauthorized caller cannot refund
    await expect(escrow.connect(other).refund(id)).to.be.revertedWithCustomError(escrow, "COM_NotAllowed");

    // authorized merchant can refund successfully
    await expect(escrow.connect(merchant).refund(id)).to.not.be.reverted;

    // open a new escrow to test dispute path
    const tx2 = await escrow.connect(buyer).open(merchant.address, 5, zeroHash);
  const id2 = Number(await escrow.escrowCount());
    await token.mint(escrow.target, 5);
    await escrow.markFunded(id2);

    // unauthorized cannot dispute
    await expect(escrow.connect(other).dispute(id2, "x")).to.be.revertedWithCustomError(escrow, "COM_NotAllowed");

    // buyer can dispute
    await expect(escrow.connect(buyer).dispute(id2, "reason")).to.not.be.reverted;
  });

  it("Finance: onlyDAO and NotWhitelisted arms", async function () {
    const [deployer, dao, alice] = await ethers.getSigners();

    const Ledger = await ethers.getContractFactory("LedgerMock");
    const ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    const Stable = await ethers.getContractFactory("StablecoinRegistry");
    const stable = await Stable.deploy(dao.address, ledger.target);
    await stable.waitForDeployment();

    // non-dao cannot call setDAO
    await expect(stable.connect(deployer).setDAO(alice.address)).to.be.revertedWithCustomError(stable, "FI_NotDAO");

    // Deploy EcoTreasury and attempt to send non-whitelisted token as dao
    const ERC20 = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20.deploy("S", "S");
    await token.waitForDeployment();

    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(dao.address, ledger.target, stable.target, ethers.ZeroAddress);
    await treasury.waitForDeployment();

    // dao attempting to send a non-whitelisted token should revert with FI_NotWhitelisted
    await expect(treasury.connect(dao).send(token.target, alice.address, 1, "r")).to.be.revertedWithCustomError(treasury, "FI_NotWhitelisted");
  });
});
