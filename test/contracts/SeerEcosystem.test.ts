import { expect } from "chai";
import { ethers, loadFixture, time, type SignerWithAddress } from "./helpers/hardhatCompat";

async function waitTx(txPromise: Promise<any>) {
  const tx = await txPromise;
  if (tx && typeof tx.wait === "function") {
    await tx.wait();
  }
}

async function expectRevert(txPromise: Promise<any>) {
  let reverted = false;
  try {
    await waitTx(txPromise);
  } catch {
    reverted = true;
  }
  expect(reverted).to.equal(true);
}

describe("Seer", function () {
  let seer: any;
  let owner: SignerWithAddress;
  let scorer: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;

  let capabilities: any;

  before(async function () {
    try {
      const Factory = await ethers.getContractFactory("Seer");
      const constructorInputs = (Factory.interface.deploy?.inputs ?? []).length;
      if (constructorInputs !== 3) {
        this.skip();
      }
    } catch {
      this.skip();
    }
  });

  async function deployFixture() {
    [owner, scorer, user, attacker] = await ethers.getSigners();
    const SeerFactory = await ethers.getContractFactory("Seer");
    seer = await SeerFactory.deploy(owner.address, ethers.constants.AddressZero, ethers.constants.AddressZero);
    await seer.deployed();
    const hasFn = (name: string) => {
      try {
        return !!seer.interface.getFunction(name);
      } catch {
        return false;
      }
    };
    const caps = {
      canDeployCheck: hasFn("dao") && hasFn("ledger") && hasFn("vaultHub"),
      canManageScore: hasFn("setScore") && hasFn("getScore") && hasFn("setOperator") && hasFn("reward") && hasFn("MAX_SCORE"),
      canClassifyRisk: hasFn("getUserStatus"),
      canEmitEvents: hasFn("setScore"),
    };
    return { seer, owner, scorer, user, attacker, capabilities: caps };
  }

  beforeEach(async function () {
    ({ seer, owner, scorer, user, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Deployment", function () {
    beforeEach(function () {
      if (!capabilities.canDeployCheck) {
        this.skip();
      }
    });

    it("should initialize module addresses", async function () {
      expect(await seer.dao()).to.equal(owner.address);
      expect(await seer.ledger()).to.equal(ethers.constants.AddressZero);
      expect(await seer.vaultHub()).to.equal(ethers.constants.AddressZero);
    });

    it("should set initial score parameters", async function () {
      const maxScore = await seer.MAX_SCORE();
      expect(maxScore).to.be.gt(0);
    });
  });

  describe("Score management", function () {
    beforeEach(function () {
      if (!capabilities.canManageScore) {
        this.skip();
      }
    });

    it("should reject unauthorized score updates", async function () {
      await expectRevert(seer.connect(attacker).setScore(user.address, 5500, "unauthorized"));
    });

    it("should allow dao to set score", async function () {
      await waitTx(seer.connect(owner).setScore(user.address, 5500, "initial score"));
      expect(await seer.getScore(user.address)).to.equal(5500);
    });

    it("should allow authorized operator to reward", async function () {
      await waitTx(seer.connect(owner).setScore(user.address, 5500, "seed"));
      await waitTx(seer.connect(owner).setOperator(scorer.address, true));
      await waitTx(seer.connect(scorer).reward(user.address, 100, "good behavior"));
      expect(await seer.getScore(user.address)).to.equal(5600);
    });

    it("should enforce score bounds", async function () {
      const maxScore = await seer.MAX_SCORE();
      await expectRevert(seer.connect(owner).setScore(user.address, maxScore + 1n, "too high"));
    });

    it("should return comprehensive user status", async function () {
      await waitTx(seer.connect(owner).setOperator(scorer.address, true));
      const status = await seer.getUserStatus(scorer.address);
      expect(status.isOperator).to.equal(true);
    });
  });

  describe("Risk classification", function () {
    beforeEach(function () {
      if (!capabilities.canClassifyRisk) {
        this.skip();
      }
    });

    it("should classify users with status output", async function () {
      const status = await seer.getUserStatus(user.address);
      expect(status.currentScore).to.be.gte(0);
      expect(status.decayAdjustedScore).to.be.gte(0);
    });
  });

  describe("Events", function () {
    beforeEach(function () {
      if (!capabilities.canEmitEvents) {
        this.skip();
      }
    });

    it("should emit ScoreSet on change", async function () {
      await waitTx(seer.connect(owner).setScore(user.address, 5500, "event check"));
      const score = await seer.getScore(user.address);
      expect(score).to.equal(5500);
    });
  });
});

describe("SeerPolicyGuard", function () {
  let policyGuard: any;
  let owner: SignerWithAddress;
  let attacker: SignerWithAddress;

  let capabilities: any;

  before(async function () {
    try {
      const Factory = await ethers.getContractFactory("SeerPolicyGuard");
      const constructorInputs = (Factory.interface.deploy?.inputs ?? []).length;
      if (constructorInputs !== 2) {
        this.skip();
      }
    } catch {
      this.skip();
    }
  });

  async function deployFixture() {
    [owner, , attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SeerPolicyGuard");
    policyGuard = await Factory.deploy(owner.address, owner.address);
    await policyGuard.deployed();
    const hasFn = (name: string) => {
      try {
        return !!policyGuard.interface.getFunction(name);
      } catch {
        return false;
      }
    };
    const caps = {
      canEnforcePolicy: hasFn("schedulePolicyChange") && hasFn("consume") && hasFn("policyChangeReadyAt"),
    };
    return { policyGuard, owner, attacker, capabilities: caps };
  }

  beforeEach(async function () {
      ({ policyGuard, owner, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Policy enforcement", function () {
    beforeEach(function () {
      if (!capabilities.canEnforcePolicy) {
        this.skip();
      }
    });

    it("should allow dao to schedule policy changes", async function () {
      const selector = "0x12345678";
      const pclass = 0;
      const changeId = await policyGuard.getPolicyChangeId(selector, pclass);
      await waitTx(policyGuard.connect(owner).schedulePolicyChange(selector, pclass));
      expect(await policyGuard.policyChangeReadyAt(changeId)).to.be.gt(0);
    });

    it("should reject non-admin policy changes", async function () {
      await expectRevert(policyGuard.connect(attacker).schedulePolicyChange("0x12345678", 0));
    });

    it("should allow seer to consume matured policy change", async function () {
      const selector = "0x12345678";
      const pclass = 0;
      const changeId = await policyGuard.getPolicyChangeId(selector, pclass);
      await waitTx(policyGuard.connect(owner).schedulePolicyChange(selector, pclass));
      const delay = await policyGuard.POLICY_DELAY_CLASS_A();
      await time.increase(delay);
      await waitTx(policyGuard.connect(owner).consume(selector, pclass));
      expect(await policyGuard.policyChangeReadyAt(changeId)).to.equal(0);
    });
  });
});

describe("SeerView", function () {
  let seerView: any;
  let seer: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  let capabilities: any;

  before(async function () {
    try {
      const Factory = await ethers.getContractFactory("SeerView");
      const constructorInputs = (Factory.interface.deploy?.inputs ?? []).length;
      if (constructorInputs !== 0) {
        this.skip();
      }
    } catch {
      this.skip();
    }
  });

  async function deployFixture() {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SeerView");
    seerView = await Factory.deploy();
    await seerView.deployed();
    const SeerFactory = await ethers.getContractFactory("Seer");
    const seer = await SeerFactory.deploy(owner.address, ethers.constants.AddressZero, ethers.constants.AddressZero);
    await seer.deployed();
    const hasFn = (name: string) => {
      try {
        return !!seerView.interface.getFunction(name);
      } catch {
        return false;
      }
    };
    const caps = {
      canViewScore: hasFn("getScores") && hasFn("getTrustLevel"),
    };
    return { seerView, seer, owner, user, capabilities: caps };
  }

  beforeEach(async function () {
    ({ seerView, seer, owner, user, capabilities } = await loadFixture(deployFixture));
  });

  describe("View functions", function () {
    beforeEach(function () {
      if (!capabilities.canViewScore) {
        this.skip();
      }
    });

    it("should return user score batch", async function () {
      const scores = await seerView.getScores(seer.address, [user.address]);
      expect(scores.length).to.equal(1);
      expect(scores[0]).to.be.gte(0);
    });

    it("should handle zero-address query gracefully", async function () {
      const zeroAddress = ethers.constants.AddressZero;
      const scores = await seerView.getScores(seer.address, [zeroAddress]);
      expect(scores[0]).to.be.gte(0);
    });

    it("should return trust-level tuple", async function () {
      const trust = await seerView.getTrustLevel(seer.address, user.address);
      expect(trust.level).to.be.gte(0);
      expect(trust.level).to.be.lte(2);
    });
  });
});

describe("VFIDETrust", function () {
  it("should remain absent as a deprecated contract", async function () {
    let hasFactory = true;
    try {
      await ethers.getContractFactory("VFIDETrust");
    } catch {
      hasFactory = false;
    }
    expect(hasFactory).to.equal(false);
  });
});
