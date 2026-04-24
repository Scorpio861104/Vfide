import { expect } from "chai";
import { ethers, loadFixture, time, type SignerWithAddress } from "./helpers/hardhatCompat";

async function expectRevert(action: Promise<unknown>) {
  let reverted = false;
  try {
    await action;
  } catch {
    reverted = true;
  }
  expect(reverted).to.equal(true);
}

describe("VFIDEBridge", function () {
  let bridge: any;
  let token: any;
  let endpoint: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;

  const REMOTE_CHAIN_ID = 10121;

  async function deployFixture() {
    [owner, user, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("VFIDE", "VFD", ethers.utils.parseEther("1000000"));
    await token.deployed();

    const MockEndpoint = await ethers.getContractFactory("MockLzEndpointForBridge");
    endpoint = await MockEndpoint.deploy();
    await endpoint.deployed();

    const BridgeFactory = await ethers.getContractFactory("VFIDEBridge");
    bridge = await BridgeFactory.deploy(token.address, endpoint.address, owner.address);
    await bridge.deployed();

    await token.transfer(user.address, ethers.utils.parseEther("1000"));
    await token.connect(user).approve(bridge.address, ethers.constants.MaxUint256);

    return { bridge, token, endpoint, owner, user, attacker };
  }

  beforeEach(async function () {
    ({ bridge, token, endpoint, owner, user, attacker } = await loadFixture(deployFixture));
  });

  describe("Deployment", function () {
    it("sets constructor dependencies", async function () {
      expect(await bridge.vfideToken()).to.equal(token.address);
      expect(await bridge.owner()).to.equal(owner.address);
      expect(await bridge.feeCollector()).to.equal(owner.address);
    });

    it("rejects zero constructor addresses", async function () {
      const BridgeFactory = await ethers.getContractFactory("VFIDEBridge");
      await expectRevert(BridgeFactory.deploy(ethers.constants.AddressZero, endpoint.address, owner.address));
      await expectRevert(BridgeFactory.deploy(token.address, ethers.constants.AddressZero, owner.address));
      await expectRevert(BridgeFactory.deploy(token.address, endpoint.address, ethers.constants.AddressZero));
    });
  });

  describe("Bridge guardrails", function () {
    it("reverts on invalid amount", async function () {
      await expectRevert(
        bridge.connect(user).bridge(REMOTE_CHAIN_ID, user.address, 0, "0x")
      );
    });

    it("reverts on zero destination", async function () {
      await expectRevert(
        bridge.connect(user).bridge(REMOTE_CHAIN_ID, ethers.constants.AddressZero, ethers.utils.parseEther("1"), "0x")
      );
    });

    it("reverts when remote is not trusted", async function () {
      await expectRevert(
        bridge.connect(user).bridge(REMOTE_CHAIN_ID, user.address, ethers.utils.parseEther("1"), "0x")
      );
    });

    it("schedules and applies trusted remote after timelock", async function () {
      const remote = (`0x${"33".repeat(32)}`) as `0x${string}`;
      await bridge.connect(owner).setTrustedRemote(REMOTE_CHAIN_ID, remote);
      await expectRevert(bridge.connect(owner).applyTrustedRemote(REMOTE_CHAIN_ID));

      await time.increase(48 * 60 * 60 + 1);
      await bridge.connect(owner).applyTrustedRemote(REMOTE_CHAIN_ID);

      expect(await bridge.trustedRemotes(REMOTE_CHAIN_ID)).to.equal(remote);
    });

    it("enforces max bridge amount", async function () {
      // MIN_BRIDGE_AMOUNT = 100e18; set max to 200 ETH, then try to bridge 201 ETH
      await bridge.connect(owner).setMaxBridgeAmount(ethers.utils.parseEther("200"));
      await time.increase(48 * 60 * 60 + 1);
      await bridge.connect(owner).applyMaxBridgeAmount();

      const remote = (`0x${"44".repeat(32)}`) as `0x${string}`;
      await bridge.connect(owner).setTrustedRemote(REMOTE_CHAIN_ID, remote);
      await time.increase(48 * 60 * 60 + 1);
      await bridge.connect(owner).applyTrustedRemote(REMOTE_CHAIN_ID);

      await bridge.connect(owner).setExemptCheckBypass(true, 3600);

      await expectRevert(
        bridge.connect(user).bridge(REMOTE_CHAIN_ID, user.address, ethers.utils.parseEther("201"), "0x")
      );
    });

    it("enforces the daily aggregate bridge limit", async function () {
      const remote = (`0x${"55".repeat(32)}`) as `0x${string}`;
      await bridge.connect(owner).setTrustedRemote(REMOTE_CHAIN_ID, remote);
      await time.increase(48 * 60 * 60 + 1);
      await bridge.connect(owner).applyTrustedRemote(REMOTE_CHAIN_ID);

      await bridge.connect(owner).setDailyBridgeLimit(ethers.utils.parseEther("150"));
      await time.increase(48 * 60 * 60 + 1);
      await bridge.connect(owner).applyDailyBridgeLimit();

      await bridge.connect(owner).setExemptCheckBypass(true, 3600);
      await time.increase(24 * 60 * 60 + 1);
      await bridge.connect(owner).applyExemptCheckBypass();

      await bridge.connect(user).bridge(REMOTE_CHAIN_ID, user.address, ethers.utils.parseEther("100"), "0x");
      await expectRevert(
        bridge.connect(user).bridge(REMOTE_CHAIN_ID, user.address, ethers.utils.parseEther("100"), "0x")
      );

      await time.increase(24 * 60 * 60 + 1);
      await bridge.connect(owner).setExemptCheckBypass(true, 3600);
      await time.increase(24 * 60 * 60 + 1);
      await bridge.connect(owner).applyExemptCheckBypass();
      await bridge.connect(user).bridge(REMOTE_CHAIN_ID, user.address, ethers.utils.parseEther("100"), "0x");
    });
  });

  describe("Admin controls", function () {
    it("restricts pause/unpause to owner", async function () {
      await expectRevert(bridge.connect(attacker).pause());
      await bridge.connect(owner).pause();
      expect(await bridge.paused()).to.equal(true);
      await bridge.connect(owner).unpause();
      expect(await bridge.paused()).to.equal(false);
    });

    it("schedules and applies bridge fee update", async function () {
      const oldFee = await bridge.bridgeFee();
      await bridge.connect(owner).setBridgeFee(25);
      await expectRevert(bridge.connect(owner).applyBridgeFee());
      await time.increase(48 * 60 * 60 + 1);
      await bridge.connect(owner).applyBridgeFee();
      const newFee = await bridge.bridgeFee();
      expect(newFee).to.equal(25);
      expect(newFee).to.not.equal(oldFee);
    });

    it("rejects bridge fee above cap", async function () {
      await expectRevert(bridge.connect(owner).setBridgeFee(101));
    });
  });

  describe("Exempt bypass and refunds", function () {
    it("sets temporary bypass with expiry", async function () {
      await bridge.connect(owner).setExemptCheckBypass(true, 3600);
      expect(await bridge.isExemptCheckBypassActive()).to.equal(false);

      await time.increase(24 * 60 * 60 + 1);
      await bridge.connect(owner).applyExemptCheckBypass();
      expect(await bridge.isExemptCheckBypassActive()).to.equal(true);

      await time.increase(3600 + 1);
      expect(await bridge.isExemptCheckBypassActive()).to.equal(false);
    });

    it("rejects invalid bypass duration", async function () {
      await expectRevert(bridge.connect(owner).setExemptCheckBypass(true, 0));
    });

    it("rejects refund claim for unknown tx", async function () {
      const unknownTxId = (`0x${"55".repeat(32)}`) as `0x${string}`;
      await expectRevert(bridge.connect(user).claimBridgeRefund(unknownTxId));
    });
  });

  describe("Event ABI", function () {
    it("exposes BridgeSent and BridgeReceived events", async function () {
      const sent = bridge.interface.getEvent("BridgeSent");
      const received = bridge.interface.getEvent("BridgeReceived");
      expect(!!sent).to.equal(true);
      expect(!!received).to.equal(true);
    });
  });
});
