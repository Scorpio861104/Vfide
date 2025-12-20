const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce micro-batch 3 (mocks & reentrancy)", function () {
  let owner, buyer, merchant;
  let VaultHub, vaultHub;
  let Seer, seer;
  let Security, security;
  let Ledger, ledger;
  let Gas, gasToken;
  let Reent, reentToken;
  let Registry, registry;
  let Commerce, commerce;

  beforeEach(async function () {
    [owner, buyer, merchant] = await ethers.getSigners();

    VaultHub = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHub.deploy();
    await vaultHub.waitForDeployment();

    Seer = await ethers.getContractFactory("SeerMock");
    seer = await Seer.deploy();
    await seer.waitForDeployment();
    await seer.setMin(1);

    Security = await ethers.getContractFactory("SecurityHubMock");
    security = await Security.deploy();
    await security.waitForDeployment();

    Ledger = await ethers.getContractFactory("LedgerMock");
    ledger = await Ledger.deploy(false);
    await ledger.waitForDeployment();

    Gas = await ethers.getContractFactory("GasDrainerERC20");
    gasToken = await Gas.deploy();
    await gasToken.waitForDeployment();

    Reent = await ethers.getContractFactory("ReenteringERC20");
    reentToken = await Reent.deploy();
    await reentToken.waitForDeployment();

    Registry = await ethers.getContractFactory("MerchantRegistry");
    registry = await Registry.deploy(owner.address, gasToken.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry.waitForDeployment();

    Commerce = await ethers.getContractFactory("CommerceEscrowTestable");
    commerce = await Commerce.deploy(owner.address, gasToken.target, vaultHub.target, registry.target, security.target, ledger.target);
    await commerce.waitForDeployment();

    // setup vaults and merchant
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry.connect(merchant).addMerchant(ethers.id("mm"));
  });

  it("release succeeds with GasDrainer token (covers gas-heavy transfer path)", async function () {
    // create escrow using gasToken as token
    // deploy a commerce instance that uses gasToken already done
    const idTx = await commerce.connect(buyer).open(merchant.address, 1, ethers.id("g1"));
    // mint gas tokens into contract and mark funded
    await gasToken.mint(commerce.target, 1);
    await commerce.markFunded(1);
    // release by buyer should succeed despite heavy gas
    await commerce.connect(buyer).release(1);
    const e = await commerce.escrows(1);
    expect(e.state).to.equal(3); // RELEASED
  });

  it("Reentering token: transfer triggers reentrant release and original tx reverts leaving state unchanged", async function () {
    // Deploy a fresh commerce instance that uses reentToken
    const Registry2 = await ethers.getContractFactory("MerchantRegistry");
    const registry2 = await Registry2.deploy(owner.address, reentToken.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry2.waitForDeployment();
    const Commerce2 = await ethers.getContractFactory("CommerceEscrowTestable");
    const commerce2 = await Commerce2.deploy(owner.address, reentToken.target, vaultHub.target, registry2.target, security.target, ledger.target);
    await commerce2.waitForDeployment();
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry2.connect(merchant).addMerchant(ethers.id("r1"));

    // open escrow
    await commerce2.connect(buyer).open(merchant.address, 1, ethers.id("r1"));
    // mint tokens
    await reentToken.mint(commerce2.target, 1);
    // set reenter target to commerce2 and id 1 so transfer tries to reenter
    await reentToken.setReenter(commerce2.target, 1);
    // mark funded
    await commerce2.markFunded(1);
    // now attempt release -> will set state to RELEASED then transfer will call release again which will revert; entire tx should revert and state remain FUNDED
    await expect(commerce2.release(1)).to.be.reverted;
    const e = await commerce2.escrows(1);
    expect(e.state).to.equal(2); // still FUNDED after revert
  });

  it("Reentering token: normal transfer (no reenter target) succeeds", async function () {
    const Registry3 = await ethers.getContractFactory("MerchantRegistry");
    const registry3 = await Registry3.deploy(owner.address, reentToken.target, vaultHub.target, seer.target, security.target, ledger.target);
    await registry3.waitForDeployment();
    const Commerce3 = await ethers.getContractFactory("CommerceEscrowTestable");
    const commerce3 = await Commerce3.deploy(owner.address, reentToken.target, vaultHub.target, registry3.target, security.target, ledger.target);
    await commerce3.waitForDeployment();
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 100);
    await registry3.connect(merchant).addMerchant(ethers.id("r2"));
    await commerce3.connect(buyer).open(merchant.address, 1, ethers.id("r2"));
    await reentToken.mint(commerce3.target, 1);
    await commerce3.markFunded(1);
    // do not set reenter target; transfer should succeed
    await commerce3.connect(buyer).release(1);
    const e = await commerce3.escrows(1);
    expect(e.state).to.equal(3); // RELEASED
  });
});
