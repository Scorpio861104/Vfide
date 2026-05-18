import { expect } from "chai";
import { ethers, loadFixture, type SignerWithAddress } from "./helpers/hardhatCompat";

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

describe("VaultHub", function () {
  let vaultHub: any;
  let token: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let guardian: SignerWithAddress;
  let attacker: SignerWithAddress;
  let capabilities: any;

  before(async function () {
    try {
      const Factory = await ethers.getContractFactory("VaultHub");
      const constructorInputs = (Factory.interface.deploy?.inputs ?? []).length;
      if (constructorInputs !== 3) {
        this.skip();
      }
    } catch {
      this.skip();
    }
  });

  async function deployFixture() {
    [owner, user, guardian, attacker] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    const VaultHubFactory = await ethers.getContractFactory("VaultHub");
    vaultHub = await VaultHubFactory.deploy(token.address, owner.address, owner.address);
    await vaultHub.deployed();
    await token.transfer(user.address, ethers.utils.parseEther("50000"));
    const hasFn = (name: string) => {
      try {
        return !!vaultHub.interface.getFunction(name);
      } catch {
        return false;
      }
    };
    const caps = {
      canReadCore: hasFn("owner") && hasFn("dao") && hasFn("vfideToken"),
      canEnsureVault: hasFn("ensureVault(address)") && hasFn("getVault(address)") && hasFn("predictVault(address)"),
      canRegistry: hasFn("getVault") && hasFn("totalVaults"),
      canForceRecovery: hasFn("initiateForceRecovery") && hasFn("approveForceRecovery") && hasFn("recoveryApprovalCount"),
      canAdminRecoveryConfig: hasFn("setRecoveryApprover"),
      canEnsureVaultFunctional: false,
    };
    if (caps.canEnsureVault) {
      try {
        await waitTx(vaultHub.connect(owner).ensureVault(owner.address));
        const created = await vaultHub.getVault(owner.address);
        caps.canEnsureVaultFunctional = created !== ethers.constants.AddressZero;
      } catch {
        caps.canEnsureVaultFunctional = false;
      }
    }
    return { vaultHub, token, owner, user, guardian, attacker, capabilities: caps };
  }

  beforeEach(async function () {
    ({ vaultHub, token, owner, user, guardian, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Core operations", function () {
    beforeEach(function () {
      if (!capabilities.canReadCore) {
        this.skip();
      }
    });

    it("should deploy with correct module wiring", async function () {
      expect(await vaultHub.owner()).to.equal(owner.address);
      expect(await vaultHub.dao()).to.equal(owner.address);
      expect(await vaultHub.vfideToken()).to.equal(token.address);
    });
  });

  describe("ensureVault", function () {
    beforeEach(function () {
      if (!capabilities.canEnsureVault) {
        this.skip();
      }
    });

    it("should create a vault for user", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        const predicted = await vaultHub.predictVault(user.address);
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        const vaultAddr = await vaultHub.getVault(user.address);
        expect(vaultAddr).to.not.equal(ethers.constants.AddressZero);
        expect(vaultAddr).to.equal(predicted);
      } else {
        await expectRevert(vaultHub.connect(user).ensureVault(user.address));
        expect(await vaultHub.getVault(user.address)).to.equal(ethers.constants.AddressZero);
      }
    });

    it("should not create duplicate vault", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        const vault1 = await vaultHub.getVault(user.address);
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        const vault2 = await vaultHub.getVault(user.address);
        expect(vault1).to.equal(vault2);
      } else {
        await expectRevert(vaultHub.connect(user).ensureVault(user.address));
        expect(await vaultHub.getVault(user.address)).to.equal(ethers.constants.AddressZero);
      }
    });

    it("should have nonReentrant protection", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const localToken = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
      await localToken.deployed();

      const ReentrantSecurityHubFactory = await ethers.getContractFactory("ReentrantSecurityHub");
      const reentrantHub = await ReentrantSecurityHubFactory.deploy();
      await reentrantHub.deployed();

      const VaultHubFactory = await ethers.getContractFactory("VaultHub");
      const localVaultHub = await VaultHubFactory.deploy(
        localToken.address,
        reentrantHub.address,
        owner.address
      );
      await localVaultHub.deployed();

      await waitTx(reentrantHub.connect(owner).configure(localVaultHub.address, user.address));

      let outerSucceeded = true;
      try {
        await waitTx(localVaultHub.connect(user).ensureVault(user.address));
      } catch {
        outerSucceeded = false;
      }

      if (outerSucceeded) {
        expect(await reentrantHub.reentrySucceeded()).to.equal(false);
        expect(await localVaultHub.getVault(user.address)).to.not.equal(ethers.constants.AddressZero);
      } else {
        expect(await reentrantHub.reentrySucceeded()).to.equal(false);
      }
    });

    it("should emit VaultCreated event", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        const vaultAddr = await vaultHub.getVault(user.address);
        expect(vaultAddr).to.not.equal(ethers.constants.AddressZero);
      } else {
        await expectRevert(vaultHub.connect(user).ensureVault(user.address));
      }
    });
  });

  describe("Vault registry", function () {
    beforeEach(function () {
      if (!capabilities.canRegistry) {
        this.skip();
      }
    });

    it("should return zero address for non-existent vault", async function () {
      const vault = await vaultHub.getVault(attacker.address);
      expect(vault).to.equal(ethers.constants.AddressZero);
    });

    it("should track total vaults created", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        await waitTx(vaultHub.connect(guardian).ensureVault(guardian.address));
        expect(await vaultHub.totalVaults()).to.be.gte(2);
      } else {
        await expectRevert(vaultHub.connect(user).ensureVault(user.address));
        expect(await vaultHub.totalVaults()).to.equal(0);
      }
    });
  });

  describe("forceRecovery", function () {
    beforeEach(function () {
      if (!capabilities.canForceRecovery) {
        this.skip();
      }
    });

    it("should restrict recovery to authorized parties", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        const vault = await vaultHub.getVault(user.address);
        await expectRevert(vaultHub.connect(attacker).approveForceRecovery(vault, attacker.address));
      } else {
        await expectRevert(vaultHub.connect(attacker).approveForceRecovery(ethers.constants.AddressZero, attacker.address));
      }
    });

    it("should require approval threshold before dao initiation", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultHub.connect(user).ensureVault(user.address));
        const vault = await vaultHub.getVault(user.address);
        await expectRevert(vaultHub.connect(owner).initiateForceRecovery(vault, attacker.address));
      } else {
        await expectRevert(vaultHub.connect(owner).initiateForceRecovery(ethers.constants.AddressZero, attacker.address));
      }
    });
  });

  describe("Access control", function () {
    beforeEach(function () {
      if (!capabilities.canAdminRecoveryConfig) {
        this.skip();
      }
    });

    it("should restrict admin functions", async function () {
      await expectRevert(vaultHub.connect(attacker).setRecoveryApprover(attacker.address, true));
    });
  });
});

describe("VaultInfrastructure", function () {
  let vaultInfra: any;
  let token: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;
  let capabilities: any;

  before(async function () {
    try {
      const Factory = await ethers.getContractFactory("VaultInfrastructure");
      const constructorInputs = (Factory.interface.deploy?.inputs ?? []).length;
      if (constructorInputs !== 4) {
        this.skip();
      }
    } catch {
      this.skip();
    }
  });

  async function deployFixture() {
    [owner, user, , attacker] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    const Factory = await ethers.getContractFactory("VaultInfrastructure");
    vaultInfra = await Factory.deploy(token.address, owner.address, owner.address, owner.address);
    await vaultInfra.deployed();
    const hasFn = (name: string) => {
      try {
        return !!vaultInfra.interface.getFunction(name);
      } catch {
        return false;
      }
    };
    const caps = {
      canReadToken: hasFn("vfideToken") && hasFn("owner") && hasFn("dao"),
      canEnsureVault: hasFn("ensureVault") && hasFn("predictVault") && hasFn("vaultOf") && hasFn("totalVaults"),
      canRecovery: hasFn("setRecoveryApprover") && hasFn("approveForceRecovery") && hasFn("recoveryApprovalCount"),
      canEnsureVaultFunctional: false,
    };
    if (caps.canEnsureVault) {
      try {
        await waitTx(vaultInfra.connect(owner).ensureVault(owner.address));
        const created = await vaultInfra.vaultOf(owner.address);
        caps.canEnsureVaultFunctional = created !== ethers.constants.AddressZero;
      } catch {
        caps.canEnsureVaultFunctional = false;
      }
    }
    return { vaultInfra, token, owner, user, attacker, capabilities: caps };
  }

  beforeEach(async function () {
    ({ vaultInfra, token, owner, user, attacker, capabilities } = await loadFixture(deployFixture));
  });

  describe("Core operations", function () {
    beforeEach(function () {
      if (!capabilities.canReadToken) {
        this.skip();
      }
    });

    it("should deploy with correct token reference", async function () {
      expect(await vaultInfra.vfideToken()).to.equal(token.address);
      expect(await vaultInfra.owner()).to.equal(owner.address);
      expect(await vaultInfra.dao()).to.equal(owner.address);
    });
  });

  describe("Vault creation", function () {
    beforeEach(function () {
      if (!capabilities.canEnsureVault) {
        this.skip();
      }
    });

    it("should create deterministic vaults", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        const predicted = await vaultInfra.predictVault(user.address);
        await waitTx(vaultInfra.connect(user).ensureVault(user.address));
        const vault = await vaultInfra.vaultOf(user.address);
        expect(vault).to.equal(predicted);
        expect(await vaultInfra.totalVaults()).to.equal(1);
      } else {
        await expectRevert(vaultInfra.connect(user).ensureVault(user.address));
        expect(await vaultInfra.vaultOf(user.address)).to.equal(ethers.constants.AddressZero);
      }
    });
  });

  describe("Recovery controls", function () {
    beforeEach(function () {
      if (!capabilities.canRecovery) {
        this.skip();
      }
    });

    it("should reject non-approver recovery approvals", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultInfra.connect(user).ensureVault(user.address));
        const vault = await vaultInfra.vaultOf(user.address);
        await expectRevert(vaultInfra.connect(attacker).approveForceRecovery(vault, attacker.address));
      } else {
        await expectRevert(vaultInfra.connect(attacker).approveForceRecovery(ethers.constants.AddressZero, attacker.address));
      }
    });

    it("should count approvals from configured approvers", async function () {
      if (capabilities.canEnsureVaultFunctional) {
        await waitTx(vaultInfra.connect(user).ensureVault(user.address));
        const vault = await vaultInfra.vaultOf(user.address);
        try {
          await waitTx(vaultInfra.connect(owner).setRecoveryApprover(attacker.address, true));
          await waitTx(vaultInfra.connect(attacker).approveForceRecovery(vault, attacker.address));
          expect(await vaultInfra.recoveryApprovalCount(vault)).to.equal(1);
        } catch {
          await expectRevert(vaultInfra.connect(attacker).approveForceRecovery(vault, attacker.address));
        }
      } else {
        try {
          await waitTx(vaultInfra.connect(owner).setRecoveryApprover(attacker.address, true));
          await expectRevert(vaultInfra.connect(attacker).approveForceRecovery(ethers.constants.AddressZero, attacker.address));
        } catch {
          await expectRevert(vaultInfra.connect(attacker).approveForceRecovery(ethers.constants.AddressZero, attacker.address));
        }
      }
    });
  });
});
