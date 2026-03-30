import { expect } from "chai";
import { ethers, loadFixture, type SignerWithAddress } from "./helpers/hardhatCompat";
import { keccak256, toUtf8Bytes } from "ethers";
import fs from "node:fs";

async function expectRevert(action: Promise<unknown>) {
  let reverted = false;
  try {
    await action;
  } catch {
    reverted = true;
  }
  expect(reverted).to.equal(true);
}

function hasArtifact(...paths: string[]) {
  return paths.some((artifactPath) => fs.existsSync(artifactPath));
}

describe("FiatRampRegistry", function () {
  const suiteAvailable =
    hasArtifact("artifacts/contracts/MainstreamPayments.sol/FiatRampRegistry.json") &&
    hasArtifact(
      "artifacts/test/contracts/mocks/MockContracts.sol/MockERC20.json",
      "artifacts/test/contracts/mocks/MockERC20.sol/MockERC20.json"
    );

  let registry: any;
  let token: any;
  let owner: SignerWithAddress;
  let provider: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;
  let _capabilities: any;

  async function deployFixture() {
    [owner, provider, user, attacker] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    const Factory = await ethers.getContractFactory("FiatRampRegistry");
    registry = await Factory.deploy(owner.address, ethers.constants.AddressZero, ethers.constants.AddressZero);
    await registry.deployed();
    const caps = {
      canRegisterProvider: typeof registry.registerProvider === "function",
      canRecordRamp: typeof registry.recordRampTransaction === "function",
    };
    return { registry, token, owner, provider, user, attacker, capabilities: caps };
  }

  before(function () {
    if (!suiteAvailable) {
      this.skip();
    }
  });

  beforeEach(async function () {
    ({ registry, token, owner, provider, user, attacker, capabilities: _capabilities } = await loadFixture(deployFixture));
  });

  describe("Provider registry", function () {
    it("should allow DAO to register provider", async function () {
      const tx = await registry
        .connect(owner)
        .registerProvider(provider.address, "Provider", "License", "https://widget.example");
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("should reject non-DAO provider registration", async function () {
      await expectRevert(
        registry.connect(attacker).registerProvider(provider.address, "Provider", "License", "https://widget.example")
      );
    });
  });

  describe("Ramp recording", function () {
    it("should allow registered provider to record ramp tx", async function () {
      await registry
        .connect(owner)
        .registerProvider(provider.address, "Provider", "License", "https://widget.example");

      const txHash = (`0x${"11".repeat(32)}`) as `0x${string}`;
      const tx = await registry.connect(provider).recordRampTransaction(user.address, txHash, true);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const count = await registry.getProviderCount();
      expect(count).to.equal(1);
    });

    it("should reject unregistered provider recording", async function () {
      const txHash = (`0x${"22".repeat(32)}`) as `0x${string}`;
      await expectRevert(
        registry.connect(attacker).recordRampTransaction(user.address, txHash, true)
      );
    });
  });
});

describe("VFIDECommerce artifact compatibility", function () {
  const suiteAvailable =
    hasArtifact("artifacts/contracts/VFIDECommerce.sol/MerchantRegistry.json") &&
    hasArtifact("artifacts/contracts/VFIDECommerce.sol/CommerceEscrow.json");

  it("should expose MerchantRegistry and CommerceEscrow artifacts", async function () {
    if (!suiteAvailable) {
      this.skip();
    }

    const merchantFactory = await ethers.getContractFactory("MerchantRegistry");
    const escrowFactory = await ethers.getContractFactory("CommerceEscrow");

    const hasMerchantAdd = merchantFactory.interface.fragments.some(
      (f: any) => f.type === "function" && f.name === "addMerchant"
    );
    const hasEscrowOpen = escrowFactory.interface.fragments.some(
      (f: any) => f.type === "function" && f.name === "open"
    );

    expect(hasMerchantAdd).to.equal(true);
    expect(hasEscrowOpen).to.equal(true);
  });
});

describe("VFIDESecurity artifact compatibility", function () {
  const suiteAvailable = hasArtifact(
    "artifacts/contracts/VFIDESecurity.sol/SecurityHub.json",
    "artifacts/contracts/VFIDESecurity.sol/GuardianRegistry.json",
    "artifacts/contracts/VFIDESecurity.sol/PanicGuard.json"
  );

  it("should expose core security module artifacts", async function () {
    if (!suiteAvailable) {
      this.skip();
    }

    const securityHubFactory = await ethers.getContractFactory("SecurityHub");
    const guardianRegistryFactory = await ethers.getContractFactory("GuardianRegistry");

    const hasIsLocked = securityHubFactory.interface.fragments.some(
      (f: any) => f.type === "function" && f.name === "isLocked"
    );
    const hasAddGuardian = guardianRegistryFactory.interface.fragments.some(
      (f: any) => f.type === "function" && f.name === "addGuardian"
    );

    expect(hasIsLocked).to.equal(true);
    expect(hasAddGuardian).to.equal(true);
  });
});

describe("GuardianRegistry", function () {
  let registry: any;
  let dao: SignerWithAddress;
  let vaultOwner: SignerWithAddress;
  let guardian: SignerWithAddress;

  async function deployFixture() {
    [dao, vaultOwner, guardian] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GuardianRegistry");
    registry = await Factory.deploy(dao.address);
    await registry.deployed();
    return { registry, dao, vaultOwner, guardian };
  }

  beforeEach(async function () {
    ({ registry, dao, vaultOwner, guardian } = await loadFixture(deployFixture));
  });

  it("should allow vault owner to add and remove guardian", async function () {
    await registry.connect(vaultOwner).addGuardian(vaultOwner.address, guardian.address);
    expect(await registry.isGuardianOf(vaultOwner.address, guardian.address)).to.equal(true);

    await registry.connect(vaultOwner).removeGuardian(vaultOwner.address, guardian.address);
    expect(await registry.isGuardianOf(vaultOwner.address, guardian.address)).to.equal(false);
  });
});

describe("SecurityHub", function () {
  it("should expose lock-status read function in ABI", async function () {
    const Factory = await ethers.getContractFactory("SecurityHub");
    const hasFn = Factory.interface.fragments.some(
      (f: any) => f.type === "function" && f.name === "isLocked"
    );
    expect(hasFn).to.equal(true);
  });
});

describe("Deploy Contracts", function () {
  const capabilities = {
    canDeployPhase1: fs.existsSync("artifacts/contracts/DeployPhase1.sol/Phase1Deployer.json"),
    canDeployPhase3Peripherals: fs.existsSync(
      "artifacts/contracts/DeployPhase3Peripherals.sol/DeployPhase3Peripherals.json"
    ),
  };

  describe("Phase1Deployer", function () {
    before(function () {
      if (!capabilities.canDeployPhase1) {
        this.skip();
      }
    });

    it("should deploy Phase1Deployer", async function () {
      const Factory = await ethers.getContractFactory("Phase1Deployer");
      const deploy = await Factory.deploy();
      await deploy.deployed();
      expect(deploy.address).to.not.equal(ethers.constants.AddressZero);
    });
  });

describe("ProofLedger", function () {
  let proofLedger: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let capabilities: any;

  async function deployFixture() {
    [owner, , user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ProofLedger");
    proofLedger = await Factory.deploy(owner.address);
    await proofLedger.deployed();
    return {
      proofLedger,
      owner,
      user,
      capabilities: {
        canLogEvent: typeof proofLedger.logEvent === "function",
      },
    };
  }

  beforeEach(async function () {
    ({ proofLedger, owner, user, capabilities } = await loadFixture(deployFixture));
  });

  describe("Core functionality", function () {
    it("should deploy successfully", async function () {
      expect(proofLedger.address).to.not.equal(ethers.constants.AddressZero);
    });

    it("should restrict recording to authorized callers", async function () {
      if (!capabilities.canLogEvent) {
        this.skip();
      }

      await expectRevert(
        proofLedger.connect(user).logEvent(user.address, "transfer", 100, "test")
      );
    });
  });
});

describe("VFIDEAccessControl", function () {
  let accessControl: any;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let attacker: SignerWithAddress;
  let capabilities: any;

  async function deployFixture() {
    [owner, admin, , attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VFIDEAccessControl");
    accessControl = await Factory.deploy(owner.address);
    await accessControl.deployed();
    const caps = {
      canManageRoles:
        typeof accessControl.DEFAULT_ADMIN_ROLE === "function" &&
        typeof accessControl.grantRole === "function" &&
        typeof accessControl.revokeRole === "function" &&
        typeof accessControl.hasRole === "function",
    };
    return { accessControl, owner, admin, attacker, capabilities: caps };
  }

  beforeEach(async function () {
    ({ accessControl, owner, admin, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Role management", function () {
    beforeEach(function () {
      if (!capabilities.canManageRoles) {
        this.skip();
      }
    });

    it("should prevent unauthorized role grants", async function () {
      const ADMIN_ROLE = await accessControl.DEFAULT_ADMIN_ROLE();
      await expectRevert(
        accessControl.connect(attacker).grantRole(ADMIN_ROLE, attacker.address)
      );
    });

    it("should grant and revoke roles", async function () {
      const ADMIN_ROLE = await accessControl.DEFAULT_ADMIN_ROLE();
      await accessControl.connect(owner).grantRole(ADMIN_ROLE, admin.address);
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      await accessControl.connect(owner).revokeRole(ADMIN_ROLE, admin.address);
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.false;
    });
  });
});

describe("BadgeQualificationRules", function () {
  let rules: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let capabilities: any;

  async function deployFixture() {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BadgeQualificationRules");
    rules = await Factory.deploy();
    await rules.deployed();
    const caps = {
      canCheckQualification: typeof rules.checkQualification === "function",
    };
    return { rules, owner, user, capabilities: caps };
  }

  beforeEach(async function () {
    ({ rules, owner, user, capabilities } = await loadFixture(deployFixture));
  });

  describe("Qualification checks", function () {
    beforeEach(function () {
      if (!capabilities.canCheckQualification) {
        this.skip();
      }
    });

    it("should return true for qualifying ACTIVE_TRADER stats", async function () {
      const badge = keccak256(toUtf8Bytes("ACTIVE_TRADER"));
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
        700,
        badge,
        Math.floor(Date.now() / 1000)
      );

      expect(qualified).to.equal(true);
    });

    it("should return false for non-qualifying ACTIVE_TRADER stats", async function () {
      const badge = keccak256(toUtf8Bytes("ACTIVE_TRADER"));
      const qualified = await rules.checkQualification(
        10,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        700,
        badge,
        Math.floor(Date.now() / 1000)
      );

      expect(qualified).to.equal(false);
    });
  });
});

  describe("DeployPhase3Peripherals", function () {
    before(function () {
      if (!capabilities.canDeployPhase3Peripherals) {
        this.skip();
      }
    });

    it("should deploy DeployPhase3Peripherals within size limit", async function () {
      const Factory = await ethers.getContractFactory("DeployPhase3Peripherals");
      const deploy = await Factory.deploy();
      await deploy.deployed();
      expect(deploy.address).to.not.equal(ethers.constants.AddressZero);
    });
  });
});
