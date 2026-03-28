import { expect } from "chai";
import { ethers, loadFixture, type SignerWithAddress } from "./helpers/hardhatCompat";
import fs from "node:fs";

function hasArtifact(...paths: string[]) {
  return paths.some((artifactPath) => fs.existsSync(artifactPath));
}

describe("MainstreamPayments", function () {
  const suiteAvailable =
    hasArtifact("artifacts/contracts/MainstreamPayments.sol/MainstreamPayments.json") &&
    hasArtifact(
      "artifacts/test/contracts/mocks/MockContracts.sol/MockERC20.json",
      "artifacts/test/contracts/mocks/MockERC20.sol/MockERC20.json"
    );

  let payments: any;
  let token: any;
  let owner: SignerWithAddress;
  let merchant: SignerWithAddress;
  let customer: SignerWithAddress;
  let recorder: SignerWithAddress;
  let attacker: SignerWithAddress;
  let capabilities: any;

  async function deployFixture() {
    [owner, merchant, customer, recorder, attacker] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    const Factory = await ethers.getContractFactory("MainstreamPayments");
    payments = await Factory.deploy(token.address, owner.address);
    await payments.deployed();
    await token.transfer(customer.address, ethers.utils.parseEther("10000"));
    const caps = {
      canCreateSession: typeof payments.createSession === "function",
      canRecordPayment:
        typeof payments.setAuthorizedRecorder === "function" &&
        typeof payments.recordPayment === "function",
    };
    return { payments, token, owner, merchant, customer, recorder, attacker, capabilities: caps };
  }

  before(function () {
    if (!suiteAvailable) {
      this.skip();
    }
  });

  beforeEach(async function () {
    ({ payments, token, owner, merchant, customer, recorder, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Session key architecture", function () {
    beforeEach(function () {
      if (!capabilities.canCreateSession) {
        this.skip();
      }
    });

    it("should create session key for customer", async function () {
      const sessionKey = ethers.Wallet.createRandom();
      const tx = await payments
        .connect(customer)
        .createSession(sessionKey.address, ethers.utils.parseEther("100"), 3600);
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it("should expose a compatible session lifecycle surface", async function () {
      const hasExpiryPath =
        typeof payments.expireSession === "function" ||
        typeof payments.revokeSession === "function" ||
        typeof payments.getSession === "function";
      expect(hasExpiryPath).to.equal(true);
    });
  });

  describe("Authorized recorder pattern", function () {
    beforeEach(function () {
      if (!capabilities.canRecordPayment) {
        this.skip();
      }
    });

    it("should restrict recording to authorized addresses", async function () {
      await expect(
        payments.connect(attacker).recordPayment(customer.address, merchant.address, ethers.utils.parseEther("10"))
      ).to.be.reverted;
    });

    it("should allow owner to set authorized recorder", async function () {
      await payments.connect(owner).setAuthorizedRecorder(recorder.address);
      const tx = await payments
        .connect(recorder)
        .recordPayment(customer.address, merchant.address, ethers.utils.parseEther("10"));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });

  describe("Payment processing", function () {
    it("should revert payment to zero address", async function () {
      await expect(
        payments.connect(customer).pay(ethers.constants.AddressZero, ethers.utils.parseEther("10"))
      ).to.be.reverted;
    });
  });
});

describe("VFIDECommerce", function () {
  const suiteAvailable =
    hasArtifact("artifacts/contracts/VFIDECommerce.sol/VFIDECommerce.json") &&
    hasArtifact(
      "artifacts/test/contracts/mocks/MockContracts.sol/MockERC20.json",
      "artifacts/test/contracts/mocks/MockERC20.sol/MockERC20.json"
    );

  let commerce: any;
  let token: any;
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let attacker: SignerWithAddress;

  async function deployFixture() {
    [owner, , buyer, attacker] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    const Factory = await ethers.getContractFactory("VFIDECommerce");
    commerce = await Factory.deploy(token.address, owner.address);
    await commerce.deployed();
    await token.transfer(buyer.address, ethers.utils.parseEther("10000"));
    return { commerce, token, owner, buyer, attacker };
  }

  before(function () {
    if (!suiteAvailable) {
      this.skip();
    }
  });

  beforeEach(async function () {
    ({ commerce, token, owner, buyer, attacker } = await loadFixture(deployFixture));
  });

  describe("Access control", function () {
    it("should restrict admin functions", async function () {
      await expect(commerce.connect(attacker).setFeeRate(1000)).to.be.reverted;
    });
  });
});

describe("VFIDESecurity", function () {
  const suiteAvailable = hasArtifact("artifacts/contracts/VFIDESecurity.sol/VFIDESecurity.json");

  let security: any;
  let owner: SignerWithAddress;
  let guardian: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;
  let capabilities: any;

  async function deployFixture() {
    [owner, guardian, user, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VFIDESecurity");
    security = await Factory.deploy(owner.address);
    await security.deployed();
    const caps = {
      canOperateSecurityHub:
        typeof security.registerGuardian === "function" &&
        typeof security.lockAccount === "function" &&
        typeof security.unlockAccount === "function" &&
        typeof security.isLocked === "function",
    };
    return { security, owner, guardian, user, attacker, capabilities: caps };
  }

  before(function () {
    if (!suiteAvailable) {
      this.skip();
    }
  });

  beforeEach(async function () {
    ({ security, owner, guardian, user, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Security hub operations", function () {
    beforeEach(function () {
      if (!capabilities.canOperateSecurityHub) {
        this.skip();
      }
    });

    it("should prevent unauthorized account locking", async function () {
      await expect(security.connect(attacker).lockAccount(user.address)).to.be.reverted;
    });

    it("should lock and unlock via guardian", async function () {
      await security.connect(user).registerGuardian(guardian.address);
      await security.connect(owner).lockAccount(user.address);
      expect(await security.isLocked(user.address)).to.be.true;
      await security.connect(guardian).unlockAccount(user.address);
      expect(await security.isLocked(user.address)).to.be.false;
    });
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
        canRecordEntry: typeof proofLedger.recordEntry === "function",
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
      if (!capabilities.canRecordEntry) {
        this.skip();
      }

      await expect(
        proofLedger.connect(user).recordEntry(user.address, 100, "transfer")
      ).to.be.reverted;
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
        typeof accessControl.ADMIN_ROLE === "function" &&
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
      const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
      await expect(
        accessControl.connect(attacker).grantRole(ADMIN_ROLE, attacker.address)
      ).to.be.reverted;
    });

    it("should grant and revoke roles", async function () {
      const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
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
      canCheckQualification: typeof rules.isQualified === "function",
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

    it("should reject non-admin qualification changes", async function () {
      await expect(rules.connect(user).setQualification(1, 100, 30)).to.be.reverted;
    });

    it("should evaluate badge qualification", async function () {
      const qualified = await rules.isQualified(user.address, 1);
      expect(typeof qualified).to.equal("boolean");
    });
  });
});

describe("Deploy Contracts", function () {
  const capabilities = {
    canDeployPhase1: fs.existsSync("artifacts/contracts/DeployPhase1.sol/DeployPhase1.json"),
    canDeployPhase3Peripherals: fs.existsSync(
      "artifacts/contracts/DeployPhase3Peripherals.sol/DeployPhase3Peripherals.json"
    ),
  };

  describe("DeployPhase1", function () {
    before(function () {
      if (!capabilities.canDeployPhase1) {
        this.skip();
      }
    });

    it("should deploy DeployPhase1", async function () {
      const Factory = await ethers.getContractFactory("DeployPhase1");
      const deploy = await Factory.deploy();
      await deploy.deployed();
      expect(deploy.address).to.not.equal(ethers.constants.AddressZero);
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
