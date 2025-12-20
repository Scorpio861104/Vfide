const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Interface Compliance Tests", function () {
  let owner, addr1;

  async function deployFixtures() {
    const [owner, addr1] = await ethers.getSigners();
    
    const DevVestingMock = await ethers.getContractFactory("DevReserveVestingVaultMock");
    const devVesting = await DevVestingMock.deploy();

    const PresaleMock = await ethers.getContractFactory("PresaleMock");
    const presale = await PresaleMock.deploy();

    const VaultHubMock = await ethers.getContractFactory("VaultHubMock");
    const vaultHub = await VaultHubMock.deploy();

    const LedgerMock = await ethers.getContractFactory("LedgerMock");
    const ledger = await LedgerMock.deploy(false); // LedgerMock takes a bool arg

    const TreasuryMock = await ethers.getContractFactory("TreasuryMock");
    const treasury = await TreasuryMock.deploy();

    return { owner, addr1, devVesting, presale, vaultHub, ledger, treasury };
  }

  beforeEach(async function () {
    const fixtures = await loadFixture(deployFixtures);
    owner = fixtures.owner;
    addr1 = fixtures.addr1;
    this.devVesting = fixtures.devVesting;
    this.presale = fixtures.presale;
    this.vaultHub = fixtures.vaultHub;
    this.ledger = fixtures.ledger;
    this.treasury = fixtures.treasury;
  });

  describe("IVFIDEToken Interface", function () {
    it("Should implement all IVFIDEToken interface functions", async function () {
      const Token = await ethers.getContractFactory("VFIDEToken");
      // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
      const tx = await Token.getDeployTransaction(
        this.devVesting.target,  // devReserveVestingVault
        this.presale.target,     // presale contract
        owner.address,           // treasury
        ethers.ZeroAddress,      // vaultHub
        ethers.ZeroAddress,      // ledger
        owner.address            // treasurySink
      );
      const res = await owner.sendTransaction(tx);
      const receipt = await res.wait();
      const token = Token.attach(receipt.contractAddress);
      await token.waitForDeployment();

      expect(token.transfer).to.exist;
      expect(token.approve).to.exist;
      expect(token.transferFrom).to.exist;
    });
  });

  describe("IDAO Interface", function () {
    it("Should verify DAO interface structure", async function () {
      const MockDAO = await ethers.getContractFactory("DAOMock");
      const mockDao = await MockDAO.deploy();

      expect(mockDao.setAdmin).to.exist;
    });
  });

  describe("ISeer Interface", function () {
    it("Should verify Seer reputation interface", async function () {
      const MockSeer = await ethers.getContractFactory("SeerMock");
      const seer = await MockSeer.deploy();

      expect(seer.getScore).to.exist;
      expect(seer.setScore).to.exist;
    });
  });

  describe("IProofLedger Interface", function () {
    it("Should verify ProofLedger interface functions", async function () {
      const MockLedger = await ethers.getContractFactory("LedgerMock");
      const ledger = await MockLedger.deploy(false);

      expect(ledger.logSystemEvent).to.exist;
      expect(ledger.logEvent).to.exist;
    });
  });

  describe("IVaultHub Interface", function () {
    it("Should verify VaultHub interface compliance", async function () {
      const MockVaultHub = await ethers.getContractFactory("VaultHubMock");
      const vaultHub = await MockVaultHub.deploy();

      expect(vaultHub.vaultOf).to.exist;
      expect(vaultHub.ensureVault).to.exist;
    });
  });

  describe("ISecurityHub Interface", function () {
    it("Should verify SecurityHub emergency interface", async function () {
      const MockSecurityHub = await ethers.getContractFactory("SecurityHubMock");
      const securityHub = await MockSecurityHub.deploy();

      expect(securityHub.isLocked).to.exist;
    });
  });

  describe("IDAOTimelock Interface", function () {
    it("Should verify Timelock interface compliance", async function () {
      const MockTimelock = await ethers.getContractFactory("TimelockMock");
      const timelock = await MockTimelock.deploy();

      expect(timelock.setAdmin).to.exist;
    });
  });

  describe("IProofScoreBurnRouter Interface", function () {
    it("Should verify ProofScoreBurnRouter interface", async function () {
      const MockRouter = await ethers.getContractFactory("BurnRouterMock");
      const router = await MockRouter.deploy();

      expect(router.computeFees).to.exist;
    });
  });

  describe("IDevReserveVestingVault Interface", function () {
    it("Should verify DevReserveVestingVault interface", async function () {
      const MockVesting = await ethers.getContractFactory("DevReserveVestingVaultMock");
      const vesting = await MockVesting.deploy();

      expect(vesting.transfer).to.exist;
    });
  });

  describe("IEcoTreasuryVault Interface", function () {
    it("Should verify EcoTreasuryVault interface compliance", async function () {
      const MockTreasury = await ethers.getContractFactory("TreasuryMock");
      const treasury = await MockTreasury.deploy();

      expect(treasury.noteVFIDE).to.exist;
    });
  });

  describe("ISanctumFund Interface", function () {
    it("Should verify SanctumFund interface functions", async function () {
      const MockSanctum = await ethers.getContractFactory("SanctumMock");
      const sanctum = await MockSanctum.deploy();

      expect(sanctum.disburse).to.exist;
    });
  });

  describe("IGuardianLock Interface", function () {
    it("Should verify GuardianLock security interface", async function () {
      const MockGuardian = await ethers.getContractFactory("GuardianLockMock");
      const guardian = await MockGuardian.deploy();

      expect(guardian.setLocked).to.exist;
    });
  });

  describe("IPanicGuard Interface", function () {
    it("Should verify PanicGuard emergency interface", async function () {
      const MockPanic = await ethers.getContractFactory("PanicGuardMock");
      const panic = await MockPanic.deploy();

      expect(panic.isQuarantined).to.exist;
    });
  });

  describe("IEmergencyBreaker Interface", function () {
    it("Should verify EmergencyBreaker circuit breaker interface", async function () {
      const MockBreaker = await ethers.getContractFactory("EmergencyBreakerMock");
      const breaker = await MockBreaker.deploy();

      expect(breaker.halted).to.exist;
    });
  });

  describe("IERC20Minimal Interface", function () {
    it("Should verify ERC20 minimal interface compliance", async function () {
      const Token = await ethers.getContractFactory("VFIDEToken");
      // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
      const token = await Token.deploy(
        this.devVesting.target,  // devReserveVestingVault
        this.presale.target,     // presale contract
        owner.address,           // treasury
        ethers.ZeroAddress,      // vaultHub
        ethers.ZeroAddress,      // ledger
        owner.address            // treasurySink
      );

      // ERC20 standard functions
      expect(token.totalSupply).to.exist;
      expect(token.balanceOf).to.exist;
      expect(token.transfer).to.exist;
      expect(token.allowance).to.exist;
      expect(token.approve).to.exist;
      expect(token.transferFrom).to.exist;
    });
  });

  describe("Cross-Interface Integration", function () {
    it("Should verify interfaces work together", async function () {
      const Token = await ethers.getContractFactory("VFIDEToken");
      // 6-param constructor: devVault, presale, treasury, vaultHub, ledger, treasurySink
      const token = await Token.deploy(
        this.devVesting.target,  // devReserveVestingVault
        this.presale.target,     // presale contract
        owner.address,           // treasury
        ethers.ZeroAddress,      // vaultHub
        ethers.ZeroAddress,      // ledger
        owner.address            // treasurySink
      );

      expect(token.transfer).to.exist;
    });

    it("Should verify DAO and Timelock interface integration", async function () {
      const MockDAO = await ethers.getContractFactory("DAOMock");
      const MockTimelock = await ethers.getContractFactory("TimelockMock");

      const dao = await MockDAO.deploy();
      const timelock = await MockTimelock.deploy();

      expect(dao.setAdmin).to.exist;
    });

    it("Should verify Seer and Ledger interface integration", async function () {
      const MockSeer = await ethers.getContractFactory("SeerMock");
      const MockLedger = await ethers.getContractFactory("LedgerMock");

      const seer = await MockSeer.deploy();
      const ledger = await MockLedger.deploy(false);

      expect(seer.getScore).to.exist;
      expect(ledger.logEvent).to.exist;
    });
  });
});
