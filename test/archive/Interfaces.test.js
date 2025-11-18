const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Interface Compliance Tests", function() {
  let owner, addr1, addr2, dao;
  
  beforeEach(async function() {
    [owner, addr1, addr2, dao] = await ethers.getSigners();
  });

  describe("IVFIDEToken Interface", function() {
    it("Should implement all IVFIDEToken interface functions", async function() {
      const Token = await ethers.getContractFactory("VFIDEToken");
      const token = await Token.deploy(owner.address);
      
      // Check interface functions exist
      expect(token.mint).to.exist;
      expect(token.burn).to.exist;
      expect(token.setMinter).to.exist;
      expect(token.transfer).to.exist;
      expect(token.approve).to.exist;
      expect(token.transferFrom).to.exist;
    });
  });

  describe("IDAO Interface", function() {
    it("Should verify DAO interface structure", async function() {
      // Mock DAO for interface testing
      const MockDAO = await ethers.getContractFactory("contracts-min/mocks/MockDAO.sol:MockDAO");
      const mockDao = await MockDAO.deploy();
      
      // Verify interface functions
      expect(mockDao.propose).to.exist;
      expect(mockDao.vote).to.exist;
      expect(mockDao.finalize).to.exist;
    });
  });

  describe("ISeer Interface", function() {
    it("Should verify Seer reputation interface", async function() {
      const MockSeer = await ethers.getContractFactory("contracts-min/mocks/MockSeer.sol:MockSeer");
      const seer = await MockSeer.deploy();
      
      expect(seer.getScore).to.exist;
      expect(seer.adjustScore).to.exist;
      expect(seer.canTransact).to.exist;
      expect(seer.canGovern).to.exist;
    });
  });

  describe("IProofLedger Interface", function() {
    it("Should verify ProofLedger interface functions", async function() {
      const MockLedger = await ethers.getContractFactory("contracts-min/mocks/MockProofLedger.sol:MockProofLedger");
      const ledger = await MockLedger.deploy();
      
      expect(ledger.getProofBalance).to.exist;
      expect(ledger.addProof).to.exist;
      expect(ledger.spendProof).to.exist;
    });
  });

  describe("IVaultHub Interface", function() {
    it("Should verify VaultHub interface compliance", async function() {
      const MockVaultHub = await ethers.getContractFactory("contracts-min/mocks/MockVaultHub.sol:MockVaultHub");
      const vaultHub = await MockVaultHub.deploy();
      
      expect(vaultHub.getUserVault).to.exist;
      expect(vaultHub.createVault).to.exist;
    });
  });

  describe("ISecurityHub Interface", function() {
    it("Should verify SecurityHub emergency interface", async function() {
      const MockSecurityHub = await ethers.getContractFactory("contracts-min/mocks/MockSecurityHub.sol:MockSecurityHub");
      const securityHub = await MockSecurityHub.deploy();
      
      expect(securityHub.isPaused).to.exist;
      expect(securityHub.halt).to.exist;
      expect(securityHub.unhalt).to.exist;
    });
  });

  describe("ICouncilElection Interface", function() {
    it("Should verify CouncilElection interface functions", async function() {
      const MockCouncil = await ethers.getContractFactory("contracts-min/mocks/MockCouncilElection.sol:MockCouncilElection");
      const council = await MockCouncil.deploy();
      
      expect(council.register).to.exist;
      expect(council.unregister).to.exist;
      expect(council.setCouncil).to.exist;
      expect(council.refreshCouncil).to.exist;
    });
  });

  describe("IEmergencyControl Interface", function() {
    it("Should verify EmergencyControl interface", async function() {
      const MockEmergency = await ethers.getContractFactory("contracts-min/mocks/MockEmergencyControl.sol:MockEmergencyControl");
      const emergency = await MockEmergency.deploy();
      
      expect(emergency.addMember).to.exist;
      expect(emergency.removeMember).to.exist;
      expect(emergency.committeeVote).to.exist;
      expect(emergency.daoToggle).to.exist;
    });
  });

  describe("IDAOTimelock Interface", function() {
    it("Should verify Timelock interface compliance", async function() {
      const MockTimelock = await ethers.getContractFactory("contracts-min/mocks/MockDAOTimelock.sol:MockDAOTimelock");
      const timelock = await MockTimelock.deploy();
      
      expect(timelock.queueTransaction).to.exist;
      expect(timelock.executeTransaction).to.exist;
      expect(timelock.cancelTransaction).to.exist;
    });
  });

  describe("ICommerceEscrow Interface", function() {
    it("Should verify Commerce escrow interface", async function() {
      // Commerce contract implements escrow
      const MockCommerce = await ethers.getContractFactory("contracts-min/mocks/MockCommerce.sol:MockCommerce");
      const commerce = await MockCommerce.deploy();
      
      expect(commerce.purchaseProduct).to.exist;
      expect(commerce.confirmDelivery).to.exist;
      expect(commerce.disputeOrder).to.exist;
    });
  });

  describe("IMerchantRegistry Interface", function() {
    it("Should verify MerchantRegistry interface", async function() {
      const MockCommerce = await ethers.getContractFactory("contracts-min/mocks/MockCommerce.sol:MockCommerce");
      const commerce = await MockCommerce.deploy();
      
      expect(commerce.addMerchant).to.exist;
      expect(commerce.removeMerchant).to.exist;
      expect(commerce.isMerchant).to.exist;
    });
  });

  describe("IReviewRegistry Interface", function() {
    it("Should verify ReviewRegistry interface compliance", async function() {
      const MockCommerce = await ethers.getContractFactory("contracts-min/mocks/MockCommerce.sol:MockCommerce");
      const commerce = await MockCommerce.deploy();
      
      expect(commerce.submitReview).to.exist;
    });
  });

  describe("IGovernanceHooks Interface", function() {
    it("Should verify GovernanceHooks callback interface", async function() {
      const MockHooks = await ethers.getContractFactory("contracts-min/mocks/MockGovernanceHooks.sol:MockGovernanceHooks");
      const hooks = await MockHooks.deploy();
      
      expect(hooks.onProposalCreated).to.exist;
      expect(hooks.onVoteCast).to.exist;
      expect(hooks.onProposalFinalized).to.exist;
    });
  });

  describe("IProofScoreBurnRouter Interface", function() {
    it("Should verify ProofScoreBurnRouter interface", async function() {
      const MockRouter = await ethers.getContractFactory("contracts-min/mocks/MockProofScoreBurnRouter.sol:MockProofScoreBurnRouter");
      const router = await MockRouter.deploy();
      
      expect(router.routeBurn).to.exist;
    });
  });

  describe("ISystemHandover Interface", function() {
    it("Should verify SystemHandover interface functions", async function() {
      const MockHandover = await ethers.getContractFactory("contracts-min/mocks/MockSystemHandover.sol:MockSystemHandover");
      const handover = await MockHandover.deploy();
      
      expect(handover.stage1_prepare).to.exist;
      expect(handover.stage2_commit).to.exist;
      expect(handover.stage3_finalize).to.exist;
    });
  });

  describe("IVFIDEPresale Interface", function() {
    it("Should verify Presale interface compliance", async function() {
      const MockPresale = await ethers.getContractFactory("contracts-min/mocks/MockPresale.sol:MockPresale");
      const presale = await MockPresale.deploy();
      
      expect(presale.contribute).to.exist;
      expect(presale.claim).to.exist;
      expect(presale.refund).to.exist;
    });
  });

  describe("IUserVault Interface", function() {
    it("Should verify UserVault interface functions", async function() {
      const MockVault = await ethers.getContractFactory("contracts-min/mocks/MockUserVault.sol:MockUserVault");
      const vault = await MockVault.deploy();
      
      expect(vault.deposit).to.exist;
      expect(vault.withdraw).to.exist;
      expect(vault.getBalance).to.exist;
    });
  });

  describe("IVaultFactory Interface", function() {
    it("Should verify VaultFactory creation interface", async function() {
      const MockFactory = await ethers.getContractFactory("contracts-min/mocks/MockVaultFactory.sol:MockVaultFactory");
      const factory = await MockFactory.deploy();
      
      expect(factory.createVault).to.exist;
    });
  });

  describe("IStablecoinRegistry Interface", function() {
    it("Should verify StablecoinRegistry interface", async function() {
      const MockRegistry = await ethers.getContractFactory("contracts-min/mocks/MockStablecoinRegistry.sol:MockStablecoinRegistry");
      const registry = await MockRegistry.deploy();
      
      expect(registry.isStablecoin).to.exist;
      expect(registry.addStablecoin).to.exist;
      expect(registry.removeStablecoin).to.exist;
    });
  });

  describe("IDevReserveVestingVault Interface", function() {
    it("Should verify DevReserveVestingVault interface", async function() {
      const MockVesting = await ethers.getContractFactory("contracts-min/mocks/MockDevReserveVestingVault.sol:MockDevReserveVestingVault");
      const vesting = await MockVesting.deploy();
      
      expect(vesting.release).to.exist;
      expect(vesting.getVestedAmount).to.exist;
    });
  });

  describe("IEcoTreasuryVault Interface", function() {
    it("Should verify EcoTreasuryVault interface compliance", async function() {
      const MockTreasury = await ethers.getContractFactory("contracts-min/mocks/MockEcoTreasuryVault.sol:MockEcoTreasuryVault");
      const treasury = await MockTreasury.deploy();
      
      expect(treasury.fundProject).to.exist;
      expect(treasury.getBalance).to.exist;
    });
  });

  describe("ISanctumFund Interface", function() {
    it("Should verify SanctumFund interface functions", async function() {
      const MockSanctum = await ethers.getContractFactory("contracts-min/mocks/MockSanctumFund.sol:MockSanctumFund");
      const sanctum = await MockSanctum.deploy();
      
      expect(sanctum.deposit).to.exist;
      expect(sanctum.withdraw).to.exist;
    });
  });

  describe("IGuardianLock Interface", function() {
    it("Should verify GuardianLock security interface", async function() {
      const MockGuardian = await ethers.getContractFactory("contracts-min/mocks/MockGuardianLock.sol:MockGuardianLock");
      const guardian = await MockGuardian.deploy();
      
      expect(guardian.lock).to.exist;
      expect(guardian.unlock).to.exist;
      expect(guardian.isLocked).to.exist;
    });
  });

  describe("IGuardianRegistry Interface", function() {
    it("Should verify GuardianRegistry interface", async function() {
      const MockRegistry = await ethers.getContractFactory("contracts-min/mocks/MockGuardianRegistry.sol:MockGuardianRegistry");
      const registry = await MockRegistry.deploy();
      
      expect(registry.addGuardian).to.exist;
      expect(registry.removeGuardian).to.exist;
      expect(registry.isGuardian).to.exist;
    });
  });

  describe("IPanicGuard Interface", function() {
    it("Should verify PanicGuard emergency interface", async function() {
      const MockPanic = await ethers.getContractFactory("contracts-min/mocks/MockPanicGuard.sol:MockPanicGuard");
      const panic = await MockPanic.deploy();
      
      expect(panic.panic).to.exist;
      expect(panic.isPanicked).to.exist;
    });
  });

  describe("IEmergencyBreaker Interface", function() {
    it("Should verify EmergencyBreaker circuit breaker interface", async function() {
      const MockBreaker = await ethers.getContractFactory("contracts-min/mocks/MockSecurityHub.sol:MockSecurityHub");
      const breaker = await MockBreaker.deploy();
      
      expect(breaker.halt).to.exist;
      expect(breaker.unhalt).to.exist;
      expect(breaker.isPaused).to.exist;
    });
  });

  describe("IERC20Minimal Interface", function() {
    it("Should verify ERC20 minimal interface compliance", async function() {
      const Token = await ethers.getContractFactory("VFIDEToken");
      const token = await Token.deploy(owner.address);
      
      // ERC20 standard functions
      expect(token.totalSupply).to.exist;
      expect(token.balanceOf).to.exist;
      expect(token.transfer).to.exist;
      expect(token.allowance).to.exist;
      expect(token.approve).to.exist;
      expect(token.transferFrom).to.exist;
    });
  });

  describe("Cross-Interface Integration", function() {
    it("Should verify interfaces work together", async function() {
      // Test that contracts implementing multiple interfaces work correctly
      const Token = await ethers.getContractFactory("VFIDEToken");
      const token = await Token.deploy(owner.address);
      
      // Implements both IVFIDEToken and IERC20Minimal
      expect(token.mint).to.exist; // IVFIDEToken
      expect(token.transfer).to.exist; // IERC20Minimal
      
      await token.mint(addr1.address, 1000);
      expect(await token.balanceOf(addr1.address)).to.equal(1000);
    });

    it("Should verify DAO and Timelock interface integration", async function() {
      // DAO uses Timelock interface
      const MockDAO = await ethers.getContractFactory("contracts-min/mocks/MockDAO.sol:MockDAO");
      const MockTimelock = await ethers.getContractFactory("contracts-min/mocks/MockDAOTimelock.sol:MockDAOTimelock");
      
      const dao = await MockDAO.deploy();
      const timelock = await MockTimelock.deploy();
      
      // Both should exist and be usable together
      expect(dao.propose).to.exist;
      expect(timelock.queueTransaction).to.exist;
    });

    it("Should verify Seer and Ledger interface integration", async function() {
      // Many contracts use both Seer and Ledger
      const MockSeer = await ethers.getContractFactory("contracts-min/mocks/MockSeer.sol:MockSeer");
      const MockLedger = await ethers.getContractFactory("contracts-min/mocks/MockProofLedger.sol:MockProofLedger");
      
      const seer = await MockSeer.deploy();
      const ledger = await MockLedger.deploy();
      
      expect(seer.getScore).to.exist;
      expect(ledger.getProofBalance).to.exist;
    });
  });
});
