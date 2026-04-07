import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("SessionKeyManager coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [dao, customer, recorder, attacker] = await ethers.getSigners();

    const VaultHubStub = await ethers.getContractFactory("VaultHubStub");
    const vaultHub = await VaultHubStub.deploy();
    await vaultHub.waitForDeployment();
    await vaultHub.setVault(customer.address, customer.address);

    const SessionKeyManager = await ethers.getContractFactory("SessionKeyManager");
    const skm = await SessionKeyManager.deploy(dao.address, await vaultHub.getAddress());
    await skm.waitForDeployment();

    return { ethers, dao, customer, recorder, attacker, skm };
  }

  it("rejects recordSpend from unauthorized recorders", async () => {
    const { ethers, customer, recorder, skm } = await deployFixture();
    const sessionKey = ethers.Wallet.createRandom().address;

    await skm.connect(customer).createSession(sessionKey, ethers.parseEther("100"), 3600, ethers.parseEther("10"));

    await assert.rejects(
      () => skm.connect(recorder).recordSpend(sessionKey, ethers.parseEther("5")),
      /SKM: not authorized recorder/
    );
  });

  it("marks sessions expired via canSpend after time elapses", async () => {
    const { ethers, customer, skm } = await deployFixture();
    const sessionKey = ethers.Wallet.createRandom().address;

    await skm.connect(customer).createSession(sessionKey, ethers.parseEther("100"), 3600, ethers.parseEther("10"));
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    const result = await skm.canSpend(sessionKey, ethers.parseEther("1"));
    assert.equal(result[0], false);
    assert.equal(result[1], "session expired");
  });

  it("records spend only after DAO authorization and session-owner approval", async () => {
    const { ethers, dao, customer, recorder, skm } = await deployFixture();
    const sessionKey = ethers.Wallet.createRandom().address;

    await skm.connect(customer).createSession(sessionKey, ethers.parseEther("100"), 3600, ethers.parseEther("10"));
    await skm.connect(dao).setAuthorizedRecorder(recorder.address, true);
    await skm.connect(customer).setSessionRecorderPermission(sessionKey, recorder.address, true);

    await skm.connect(recorder).recordSpend(sessionKey, ethers.parseEther("5"));

    const status = await skm.getSessionStatus(sessionKey);
    assert.equal(status[0], customer.address);
    assert.equal(status[1], ethers.parseEther("95"));
    assert.equal(status[2], ethers.parseEther("10"));
    assert.equal(status[4], true);
  });
});

describe("CircuitBreaker coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [admin, configManager, pauser, oracle, attacker] = await ethers.getSigners();

    const EmergencyControllerStub = await ethers.getContractFactory("EmergencyControllerStub");
    const controller = await EmergencyControllerStub.deploy();
    await controller.waitForDeployment();

    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    const breaker = await CircuitBreaker.deploy(admin.address, oracle.address, await controller.getAddress());
    await breaker.waitForDeployment();

    const configRole = await breaker.CONFIG_MANAGER_ROLE();
    const pauserRole = await breaker.EMERGENCY_PAUSER_ROLE();
    const recorderRole = await breaker.RECORDER_ROLE();
    await breaker.connect(admin).grantRole(configRole, configManager.address);
    await breaker.connect(admin).grantRole(pauserRole, pauser.address);
    await breaker.connect(admin).grantRole(recorderRole, attacker.address);

    return { ethers, admin, configManager, pauser, oracle, attacker, breaker, controller };
  }

  it("restricts TVL updates to config managers", async () => {
    const { attacker, breaker } = await deployFixture();

    await assert.rejects(
      () => breaker.connect(attacker).updateTVL(1_000),
      /AccessControl/
    );
  });

  it("triggers once recorded volume exceeds configured TVL threshold", async () => {
    const { configManager, attacker, breaker } = await deployFixture();

    await breaker.connect(configManager).updateTVL(1_000);
    await breaker.connect(attacker).recordVolume(400);
    assert.equal(await breaker.circuitBreakerTriggered(), false);

    await breaker.connect(attacker).recordVolume(200);
    assert.equal(await breaker.circuitBreakerTriggered(), true);

    const status = await breaker.getMonitoringStatus();
    assert.equal(status[1], 600n);
    assert.equal(status[5], true);
  });

  it("allows only emergency pausers to manually trigger and admin to reset", async () => {
    const { admin, pauser, attacker, breaker } = await deployFixture();

    await assert.rejects(
      () => breaker.connect(attacker).manualTrigger("panic"),
      /AccessControl/
    );

    await breaker.connect(pauser).manualTrigger("panic");
    assert.equal(await breaker.circuitBreakerTriggered(), true);

    await breaker.connect(admin).reset();
    assert.equal(await breaker.circuitBreakerTriggered(), false);
  });
});

describe("ProofLedger coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [dao, logger, user] = await ethers.getSigners();

    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    const ledger = await ProofLedger.deploy(dao.address);
    await ledger.waitForDeployment();

    return { dao, logger, user, ledger };
  }

  it("rejects unauthorized loggers", async () => {
    const { user, ledger } = await deployFixture();

    await assert.rejects(
      () => ledger.connect(user).logEvent(user.address, "transfer", 100, "note"),
      /PL: not authorized/
    );
  });

  it("allows DAO-authorized loggers to write entries", async () => {
    const { dao, logger, user, ledger } = await deployFixture();

    await ledger.connect(dao).setLogger(logger.address, true);
    assert.equal(await ledger.authorizedLoggers(logger.address), true);

    await ledger.connect(logger).logEvent(user.address, "transfer", 100, "note");
    await ledger.connect(logger).logTransfer(user.address, logger.address, 55, "context");
  });

  it("emits a DAO change event when governance rotates", async () => {
    const { dao, logger, ledger } = await deployFixture();

    const tx = await ledger.connect(dao).setDAO(logger.address);
    const receipt = await tx.wait();
    const daoSetLog = receipt?.logs
      .map((log: any) => {
        try {
          return ledger.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "DAOSet");

    assert.equal(await ledger.dao(), logger.address);
    assert.equal(daoSetLog?.args.oldDAO, dao.address);
    assert.equal(daoSetLog?.args.newDAO, logger.address);
  });
});

describe("Seer configuration event coverage", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = await network.connect({
      override: {
        allowUnlimitedContractSize: true,
      },
    });
    const [dao] = await ethers.getSigners();

    const Seer = await ethers.getContractFactory("Seer");
    const seer = await Seer.deploy(dao.address, ethers.ZeroAddress, ethers.ZeroAddress);
    await seer.waitForDeployment();

    const Guard = await ethers.getContractFactory("SeerPolicyGuard");
    const guard = await Guard.deploy(dao.address, await seer.getAddress());
    await guard.waitForDeployment();

    await seer.connect(dao).setPolicyGuard(await guard.getAddress());

    return { ethers, dao, seer, guard };
  }

  it("emits ScoreCacheTTLUpdated when the cache TTL changes", async () => {
    const { dao, seer } = await deployFixture();

    const tx = await seer.connect(dao).setScoreCacheTTL(10n * 60n);
    const receipt = await tx.wait();
    const ttlLog = receipt?.logs
      .map((log: any) => {
        try {
          return seer.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "ScoreCacheTTLUpdated");

    assert.equal(await seer.scoreCacheTTL(), 600n);
    assert.equal(ttlLog?.args.ttl, 600n);
  });

  it("emits DecayConfigUpdated after the policy delay matures", async () => {
    const { ethers, dao, seer, guard } = await deployFixture();

    const selector = seer.interface.getFunction("setDecayConfig").selector;
    await guard.connect(dao).schedulePolicyChange(selector, 1);
    await ethers.provider.send("evm_increaseTime", [72 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    const tx = await seer.connect(dao).setDecayConfig(true, 120, 80);
    const receipt = await tx.wait();
    const decayLog = receipt?.logs
      .map((log: any) => {
        try {
          return seer.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "DecayConfigUpdated");

    assert.equal(await seer.decayEnabled(), true);
    assert.equal(await seer.decayStartDays(), 120n);
    assert.equal(await seer.decayPerMonth(), 80n);
    assert.equal(decayLog?.args.enabled, true);
    assert.equal(decayLog?.args.startDays, 120n);
    assert.equal(decayLog?.args.perMonth, 80n);
  });
});

describe("VFIDEAccessControl coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [admin, newAdmin, member] = await ethers.getSigners();

    const Access = await ethers.getContractFactory("VFIDEAccessControl");
    const access = await Access.deploy(admin.address);
    await access.waitForDeployment();

    return { admin, newAdmin, member, access };
  }

  it("transfers DEFAULT_ADMIN_ROLE atomically", async () => {
    const { admin, newAdmin, access } = await deployFixture();
    const defaultAdminRole = await access.DEFAULT_ADMIN_ROLE();

    assert.equal(await access.hasRole(defaultAdminRole, admin.address), true);
    await access.connect(admin).transferAdminRole(newAdmin.address);
    assert.equal(await access.hasRole(defaultAdminRole, admin.address), false);
    assert.equal(await access.hasRole(defaultAdminRole, newAdmin.address), true);
  });

  it("grants and revokes roles with reason strings", async () => {
    const { admin, member, access } = await deployFixture();
    const configRole = await access.CONFIG_MANAGER_ROLE();

    await access.connect(admin).grantRoleWithReason(configRole, member.address, "coverage backfill");
    assert.equal(await access.hasRole(configRole, member.address), true);

    await access.connect(admin).revokeRoleWithReason(configRole, member.address, "coverage cleanup");
    assert.equal(await access.hasRole(configRole, member.address), false);
  });
});

describe("EcoTreasuryVault coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [dao, recipient, attacker] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(dao.address, ethers.ZeroAddress, await token.getAddress());
    await treasury.waitForDeployment();

    await token.mint(await treasury.getAddress(), ethers.parseEther("1000"));

    return { ethers, dao, recipient, attacker, token, treasury };
  }

  it("restricts VFIDE disbursement to DAO", async () => {
    const { attacker, recipient, treasury, ethers } = await deployFixture();

    await assert.rejects(
      () => treasury.connect(attacker).sendVFIDE(recipient.address, ethers.parseEther("10"), "ops"),
      /FI_NotDAO|execution reverted/
    );
  });

  it("sends VFIDE and updates disbursed totals", async () => {
    const { dao, recipient, token, treasury, ethers } = await deployFixture();

    await treasury.connect(dao).sendVFIDE(recipient.address, ethers.parseEther("10"), "ops");

    assert.equal(await token.balanceOf(recipient.address), ethers.parseEther("10"));
    assert.equal(await treasury.totalDisbursed(), ethers.parseEther("10"));
  });
});

describe("MerchantRegistry coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [dao, merchant, other] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const VaultHubStub = await ethers.getContractFactory("VaultHubStub");
    const vaultHub = await VaultHubStub.deploy();
    await vaultHub.waitForDeployment();

    const SeerStub = await ethers.getContractFactory("SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const ProofLedger = await ethers.getContractFactory("ProofLedger");
    const ledger = await ProofLedger.deploy(dao.address);
    await ledger.waitForDeployment();

    const MerchantRegistry = await ethers.getContractFactory("MerchantRegistry");
    const registry = await MerchantRegistry.deploy(
      dao.address,
      await token.getAddress(),
      await vaultHub.getAddress(),
      await seer.getAddress(),
      ethers.ZeroAddress,
      await ledger.getAddress(),
    );
    await registry.waitForDeployment();

    return { dao, merchant, other, vaultHub, seer, ledger, registry };
  }

  it("rejects merchant registration without a vault", async () => {
    const { merchant, registry } = await deployFixture();

    await assert.rejects(
      () => registry.connect(merchant).addMerchant("0x" + "00".repeat(32)),
      /COM_NotAllowed|execution reverted/
    );
  });

  it("registers a merchant when vault and score satisfy policy", async () => {
    const { merchant, vaultHub, seer, registry } = await deployFixture();

    await vaultHub.setVault(merchant.address, merchant.address);
    await seer.setScore(merchant.address, 7000);
    await registry.connect(merchant).addMerchant("0x" + "11".repeat(32));

    const info = await registry.info(merchant.address);
    assert.equal(info.owner, merchant.address);
    assert.equal(info.vault, merchant.address);
    assert.equal(info.status, 1n);
  });
});

describe("SecurityHub coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;
    const [dao] = await ethers.getSigners();

    const EmergencyBreaker = await ethers.getContractFactory("EmergencyBreaker");
    const breaker = await EmergencyBreaker.deploy(dao.address, ethers.ZeroAddress);
    await breaker.waitForDeployment();

    const SecurityHub = await ethers.getContractFactory("SecurityHub");
    const hub = await SecurityHub.deploy(
      dao.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      await breaker.getAddress(),
      ethers.ZeroAddress,
    );
    await hub.waitForDeployment();

    return { dao, breaker, hub };
  }

  it("reports vaults as locked when the emergency breaker is halted", async () => {
    const { dao, breaker, hub } = await deployFixture();

    assert.equal(await hub.isLocked(dao.address), false);
    await breaker.connect(dao).toggle(true, "incident");
    assert.equal(await hub.isLocked(dao.address), true);
  });
});

describe("BadgeQualificationRules coverage backfill", { concurrency: 1 }, () => {
  async function deployFixture() {
    const { ethers } = (await network.connect()) as any;

    const BadgeRegistry = await ethers.getContractFactory("BadgeRegistry");
    const badgeRegistry = await BadgeRegistry.deploy();
    await badgeRegistry.waitForDeployment();

    const Rules = await ethers.getContractFactory("BadgeQualificationRules");
    const rules = await Rules.deploy();
    await rules.waitForDeployment();

    return { badgeRegistry, rules };
  }

  it("qualifies ACTIVE_TRADER at 50 commerce transactions", async () => {
    const { badgeRegistry, rules } = await deployFixture();
    const activeTrader = await badgeRegistry.ACTIVE_TRADER();

    const qualified = await rules.checkQualification(
      50,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      activeTrader,
      0,
    );

    assert.equal(qualified, true);
  });

  it("requires a full year above 700 for CLEAN_RECORD", async () => {
    const { badgeRegistry, rules } = await deployFixture();
    const cleanRecord = await badgeRegistry.CLEAN_RECORD();
    const oneYear = 365 * 24 * 60 * 60;

    const notQualified = await rules.checkQualification(
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      0,
      0,
      cleanRecord,
      oneYear,
    );
    assert.equal(notQualified, false);

    const qualified = await rules.checkQualification(
      0, 0, 0, 0, 0, 0, 0, 0, 0,
      1,
      0,
      cleanRecord,
      oneYear + 1,
    );
    assert.equal(qualified, true);
  });
});

describe("Deploy helper coverage backfill", { concurrency: 1 }, () => {
  it("DeployPhase3Peripherals deploys both BSM and oracle", async () => {
    const { ethers } = (await network.connect()) as any;
    const [owner, vfideToken, quoteToken] = await ethers.getSigners();

    const Deployer = await ethers.getContractFactory("DeployPhase3Peripherals");
    const deployer = await Deployer.deploy();
    await deployer.waitForDeployment();

    await deployer.deployPeripherals(
      vfideToken.address,
      quoteToken.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      owner.address,
    );

    assert.notEqual(await deployer.bsm(), ethers.ZeroAddress);
    assert.notEqual(await deployer.oracle(), ethers.ZeroAddress);
  });

  it("DeployPhase1 rejects zero governance deployer and orchestrates valid stubs", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin, council1, council2, council3, council4, council5, oracle] = await ethers.getSigners();

    const Phase1 = await ethers.getContractFactory("Phase1Deployer");
    const phase1 = await Phase1.deploy();
    await phase1.waitForDeployment();

    const council = [council1.address, council2.address, council3.address, council4.address, council5.address] as const;

    await assert.rejects(
      () => phase1.deployPhase1(
        ethers.ZeroAddress,
        admin.address,
        admin.address,
        admin.address,
        council,
        oracle.address,
        "VFIDE",
        "VFD",
        1n,
      ),
      /zero governance deployer/
    );

    const GovStub = await ethers.getContractFactory("Phase1GovernanceDeployerStub");
    const gov = await GovStub.deploy();
    await gov.waitForDeployment();

    const InfraStub = await ethers.getContractFactory("Phase1InfrastructureDeployerStub");
    const infra = await InfraStub.deploy();
    await infra.waitForDeployment();

    const TokenStub = await ethers.getContractFactory("Phase1TokenDeployerStub");
    const token = await TokenStub.deploy();
    await token.waitForDeployment();

    const result = await phase1.deployPhase1.staticCall(
      await gov.getAddress(),
      await infra.getAddress(),
      await token.getAddress(),
      admin.address,
      council,
      oracle.address,
      "VFIDE",
      "VFD",
      1n,
    );

    assert.notEqual(result.accessControl, ethers.ZeroAddress);
    assert.notEqual(result.circuitBreaker, ethers.ZeroAddress);
    assert.notEqual(result.tokenV2, ethers.ZeroAddress);
  });
});
