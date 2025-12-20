const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VFIDECommerce Ecosystem Test", function () {
  let owner, dao, buyer, merchant;
  const META = '0x' + '00'.repeat(32);
  
  // Mocks
  let DAOMock, daoMock;
  let VaultHubMock, vaultHub;
  let SeerMock, seer;
  let SecurityHubMock, sec;
  let LedgerMock, ledgerMock;

  // Main Contracts
  let VFIDEToken, token;
  let MerchantRegistry, registry;
  let CommerceEscrow, escrow;

  beforeEach(async function () {
    [owner, dao, buyer, merchant] = await ethers.getSigners();

    // 1. Deploy All Mocks
    DAOMock = await ethers.getContractFactory("DAOMock");
    daoMock = await DAOMock.deploy();
    await daoMock.waitForDeployment();

    VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    vaultHub = await VaultHubMock.deploy();
    await vaultHub.waitForDeployment();

    SeerMock = await ethers.getContractFactory("SeerMock");
    seer = await SeerMock.deploy();
    await seer.waitForDeployment();

    SecurityHubMock = await ethers.getContractFactory("SecurityHubMock");
    sec = await SecurityHubMock.deploy();
    await sec.waitForDeployment();

    // LedgerMock constructor requires a boolean argument
    LedgerMock = await ethers.getContractFactory("LedgerMock");
    ledgerMock = await LedgerMock.deploy(false);
    await ledgerMock.waitForDeployment();

    // 2. Configure Mocks (CRITICAL: Do this BEFORE deploying contracts that depend on them)
    await seer.connect(owner).setMin(0); // Set min score to 0 for registration to pass
    await seer.connect(owner).setScore(merchant.address, 1000); // Give merchant a high score
    await vaultHub.connect(owner).setVault(merchant.address, merchant.address);
    await vaultHub.connect(owner).setVault(buyer.address, buyer.address);

    // 3. Deploy DevVault and PresaleMock (required for VFIDEToken constructor)
    const DevVault = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVault = await DevVault.deploy();
    await devVault.waitForDeployment();

    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    const presaleMock = await PresaleMock.deploy();
    await presaleMock.waitForDeployment();

    // 4. Deploy VFIDEToken with 6-arg constructor
    VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
    token = await VFIDEToken.deploy(
        devVault.target,           // devReserveVestingVault (must be contract)
        presaleMock.target,        // presale contract (must be deployed contract!)
        owner.address,             // treasury
        ethers.ZeroAddress,        // vaultHub (can be zero)
        ethers.ZeroAddress,        // ledger (can be zero)
        owner.address              // treasurySink
    );
    await token.waitForDeployment();
    
    // 4. Deploy MerchantRegistry from VFIDECommerce.sol
    // Its constructor reads `minScore` from `seer` upon deployment.
    MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    registry = await MerchantRegistry.deploy(
        dao.address,
        token.target,
        vaultHub.target,
        seer.target,
        sec.target,
        ledgerMock.target
    );
    await registry.waitForDeployment();

    // 5. Deploy CommerceEscrow from VFIDECommerce.sol
    CommerceEscrow = await ethers.getContractFactory("CommerceEscrowTestable");
    escrow = await CommerceEscrow.deploy(
        dao.address,
        token.target,
        vaultHub.target,
        registry.target,
        sec.target,
        ledgerMock.target
    );
    await escrow.waitForDeployment();
    await token.connect(owner).setSystemExempt(escrow.target, true);
  });

  it("should allow a merchant to register successfully", async function () {
    // This test validates that the `beforeEach` setup is correct.
    // The `addMerchant` call will succeed because the `seer` mock was configured with minScore=0
    // before the `registry` contract was deployed.
    await expect(registry.connect(merchant).addMerchant(META))
      .to.emit(registry, "MerchantAdded")
      .withArgs(merchant.address, merchant.address, META);

    const merchantInfo = await registry.merchants(merchant.address);
    expect(merchantInfo.status).to.equal(1); // 1 = ACTIVE
  });

  describe("with registered merchant", function () {
    beforeEach(async function () {
      // Register the merchant
      await registry.connect(merchant).addMerchant(META);

      // Transfer tokens to the buyer for the test (token is pre-minted at construction)
      // Treasury (owner) has 100M tokens
      const amount = ethers.parseUnits("1000", 18);
      await token.setVaultOnly(false); // Allow direct transfers for testing
      await token.connect(owner).transfer(buyer.address, amount);
    });

    it("should allow a buyer to open, fund, and release an escrow", async function () {
      const escrowAmount = ethers.parseUnits("100", 18);
      const initialMerchantBalance = await token.balanceOf(merchant.address);

      // 1. Buyer opens an escrow
      await escrow.connect(buyer).open(merchant.address, escrowAmount, META);
      const escrowCount = await escrow.escrowCount();
      expect(escrowCount).to.equal(1);
      let escrowInfo = await escrow.escrows(1);
      expect(escrowInfo.state).to.equal(1); // OPEN

      // 2. Buyer funds the escrow
      await token.connect(buyer).transfer(escrow.target, escrowAmount);
      await escrow.connect(buyer).markFunded(1);
      escrowInfo = await escrow.escrows(1);
      expect(escrowInfo.state).to.equal(2); // FUNDED

      // 3. Buyer releases the funds
      await escrow.connect(buyer).release(1);
      escrowInfo = await escrow.escrows(1);
      expect(escrowInfo.state).to.equal(3); // RELEASED

      // 4. Verify merchant received the funds
      const finalMerchantBalance = await token.balanceOf(merchant.address);
      expect(finalMerchantBalance).to.equal(initialMerchantBalance + escrowAmount);
    });
  });
});
