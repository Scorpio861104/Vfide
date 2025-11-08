const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Commerce: MerchantRegistry + CommerceEscrow", function () {
  let owner, buyer, merchant, other;
  const META = '0x' + '00'.repeat(32);
  let VaultHubMock, vaultHub;
  let SeerMock, seer;
  let SecurityHubMock, sec;
  let VestingVault, vestingVault;
  let VFIDEToken, token;
  let MerchantRegistry, registry;
  let CommerceEscrow, escrow;

  beforeEach(async function () {
    [owner, buyer, merchant, other] = await ethers.getSigners();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    sec = await SecurityHubMock.deploy();
    await sec.waitForDeployment();

    VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy();
    await vestingVault.waitForDeployment();

    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    token = await VFIDEToken.deploy(vestingVault.target, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress);
    await token.waitForDeployment();

    // Disable vaultOnly for simpler test flows (we're testing escrow logic, not vault-only enforcement here)
    await token.connect(owner).setVaultOnly(false);

    // Mint tokens to buyer and merchant via presale path
    await token.connect(owner).setPresale(owner.address);
    const amt = ethers.parseUnits("1000", 18);
    await token.connect(owner).mintPresale(buyer.address, amt);
    await token.connect(owner).mintPresale(merchant.address, amt);

    // Set up vaultHub: map buyer and merchant to vault addresses (we'll use the EOA as "vault")
    await vaultHub.setVault(buyer.address, buyer.address);
    await vaultHub.setVault(merchant.address, merchant.address);

    // Set seer: minForMerchant=0, merchant score high
    await seer.setMin(0);
    await seer.setScore(merchant.address, 1000);

    // Deploy MerchantRegistry and CommerceEscrow
    MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    registry = await MerchantRegistry.deploy(owner.address, token.target, vaultHub.target, seer.target, sec.target, ethers.ZeroAddress);
    await registry.waitForDeployment();

    CommerceEscrow = await ethers.getContractFactory("CommerceEscrow");
    escrow = await CommerceEscrow.deploy(owner.address, token.target, vaultHub.target, registry.target, sec.target, ethers.ZeroAddress);
    await escrow.waitForDeployment();
  });

  it("merchant can register and buyer can open/fund/release an escrow", async function () {
    // Merchant registers (metaHash placeholder)
  await registry.connect(merchant).addMerchant(META);
    let info = await registry.info(merchant.address);
    expect(info.status).to.equal(1); // ACTIVE

    // Buyer opens an escrow
    const amount = ethers.parseUnits("10", 18);
  const tx = await escrow.connect(buyer).open(merchant.address, amount, META);
    const receipt = await tx.wait();
    // read escrowCount
    const id = await escrow.escrowCount();
    expect(id).to.equal(1);

    // Buyer transfers tokens to escrow contract
    await token.connect(buyer).transfer(escrow.target, amount);

    // markFunded
    await escrow.connect(buyer).markFunded(1);
    let e = await escrow.escrows(1);
    expect(e.state).to.equal(2); // FUNDED

    // Buyer releases
    await escrow.connect(buyer).release(1);
    e = await escrow.escrows(1);
    expect(e.state).to.equal(3); // RELEASED

    // escrow should have transferred tokens to sellerVault (merchant.address)
    const sellerBal = await token.balanceOf(merchant.address);
    expect(sellerBal).to.be.gte(amount);
  });

  it("merchant can request refund and disputes/resolution work", async function () {
    // Register merchant
  await registry.connect(merchant).addMerchant(META);
    const amount = ethers.parseUnits("5", 18);
  await escrow.connect(buyer).open(merchant.address, amount, META);
    await token.connect(buyer).transfer(escrow.target, amount);
    await escrow.connect(buyer).markFunded(1);

    // Merchant requests refund (allowed)
    await escrow.connect(merchant).refund(1);
    let e = await escrow.escrows(1);
    expect(e.state).to.equal(4); // REFUNDED

    // Open another and dispute
  await escrow.connect(buyer).open(merchant.address, amount, META);
    await token.connect(buyer).transfer(escrow.target, amount);
    await escrow.connect(buyer).markFunded(2);
    await escrow.connect(buyer).dispute(2, "bad product");
    e = await escrow.escrows(2);
    expect(e.state).to.equal(5); // DISPUTED

    // DAO resolves in favor of buyer
    await escrow.connect(owner).resolve(2, true);
    e = await escrow.escrows(2);
    expect(e.state).to.equal(6); // RESOLVED
  });
});
