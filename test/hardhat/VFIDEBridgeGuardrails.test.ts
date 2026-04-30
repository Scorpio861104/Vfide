import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VFIDEBridge (delivery confirmation)", { concurrency: 1, timeout: 120000 }, () => {
  const SOURCE_EID = 30101;
  const DEST_EID = 30102;

  async function bridgePairFixture() {
    const { ethers } = (await getConnection()) as any;
    const [owner, user, receiver] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ExemptableMintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Endpoint = await ethers.getContractFactory("contracts/mocks/BridgeGovernanceVerifierMocks.sol:MockLzEndpointForBridge");
    const endpoint = await Endpoint.deploy();
    await endpoint.waitForDeployment();

    const Bridge = await ethers.getContractFactory("VFIDEBridge");
    const sourceBridge = await Bridge.deploy(await token.getAddress(), await endpoint.getAddress(), owner.address);
    const destinationBridge = await Bridge.deploy(await token.getAddress(), await endpoint.getAddress(), owner.address);
    await sourceBridge.waitForDeployment();
    await destinationBridge.waitForDeployment();

    await endpoint.setEndpointId(await sourceBridge.getAddress(), SOURCE_EID);
    await endpoint.setEndpointId(await destinationBridge.getAddress(), DEST_EID);

    const sourcePeer = ethers.zeroPadValue(await sourceBridge.getAddress(), 32);
    const destinationPeer = ethers.zeroPadValue(await destinationBridge.getAddress(), 32);

    await sourceBridge.connect(owner).setTrustedRemote(DEST_EID, destinationPeer);
    await destinationBridge.connect(owner).setTrustedRemote(SOURCE_EID, sourcePeer);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await sourceBridge.connect(owner).applyTrustedRemote(DEST_EID);
    await destinationBridge.connect(owner).applyTrustedRemote(SOURCE_EID);

    await sourceBridge.connect(owner).setExemptCheckBypass(true, 3600);
    await token.setSystemExempt(await sourceBridge.getAddress(), true);
    await token.setSystemExempt(await destinationBridge.getAddress(), true);

    await token.mint(owner.address, ethers.parseEther("200000000"));
    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.transfer(await destinationBridge.getAddress(), ethers.parseEther("5000"));
    await token.connect(user).approve(await sourceBridge.getAddress(), ethers.MaxUint256);

    return { ethers, token, endpoint, sourceBridge, destinationBridge, owner, user, receiver };
  }

  async function deployBridgePair() {
    return bridgePairFixture();
  }

  it("syncs LayerZero peers when a trusted remote is applied", async () => {
    const { ethers, sourceBridge, destinationBridge } = await deployBridgePair();

    assert.equal(await sourceBridge.peers(DEST_EID), ethers.zeroPadValue(await destinationBridge.getAddress(), 32));
  });

  it("closes the refund window after destination delivery confirmation", async () => {
    const { ethers, endpoint, sourceBridge, token, owner, user, receiver } = await deployBridgePair();

    const amount = ethers.parseEther("100");
    const bridgedAmount = amount - ((amount * 10n) / 10000n);
    const tx = await sourceBridge.connect(user).bridge(DEST_EID, receiver.address, amount, "0x");
    const receipt = await tx.wait();
    const sentLog = receipt.logs
      .map((log: any) => {
        try {
          return sourceBridge.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "BridgeSent");

    const txId = sentLog?.args?.txId;
    assert.ok(txId);

    assert.equal(await sourceBridge.bridgeRefundableAfter(txId), 0n);
    await sourceBridge.connect(owner).openBridgeRefundWindow(txId);
    assert.ok((await sourceBridge.bridgeRefundableAfter(txId)) > 0n);
    assert.equal(await endpoint.pendingCount(), 1n);

    await endpoint.deliverNext();
    assert.equal(await endpoint.pendingCount(), 1n);
    assert.equal(await token.balanceOf(receiver.address), bridgedAmount);
    assert.ok((await sourceBridge.bridgeRefundableAfter(txId)) > 0n);

    await endpoint.deliverNext();
    assert.equal(await endpoint.pendingCount(), 0n);
    assert.equal(await sourceBridge.bridgeRefundableAfter(txId), 0n);
    assert.equal((await sourceBridge.bridgeTransactions(txId)).executed, true);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => sourceBridge.connect(user).claimBridgeRefund(txId),
      /already executed|not refundable|revert/
    );
  });

  it("still allows refunds for undelivered bridge messages after the delay", async () => {
    const { ethers, sourceBridge, token, owner, user, receiver } = await deployBridgePair();

    const amount = ethers.parseEther("100");
    const refundedAmount = amount - ((amount * 10n) / 10000n);
    const tx = await sourceBridge.connect(user).bridge(DEST_EID, receiver.address, amount, "0x");
    const receipt = await tx.wait();
    const sentLog = receipt.logs
      .map((log: any) => {
        try {
          return sourceBridge.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "BridgeSent");

    const txId = sentLog?.args?.txId;
    const balanceBeforeRefund = await token.balanceOf(user.address);

    assert.equal(await sourceBridge.bridgeRefundableAfter(txId), 0n);
    await assert.rejects(
      () => sourceBridge.connect(user).claimBridgeRefund(txId),
      /not refundable|revert/
    );

    await sourceBridge.connect(owner).openBridgeRefundWindow(txId);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await sourceBridge.connect(user).claimBridgeRefund(txId);

    assert.equal(await sourceBridge.bridgeRefundableAfter(txId), 0n);
    assert.equal((await sourceBridge.bridgeTransactions(txId)).executed, true);
    assert.equal(await token.balanceOf(user.address), balanceBeforeRefund + refundedAmount);
  });

  it("allows anyone to open and finalize stale refunds when confirmations never arrive", async () => {
    const { ethers, sourceBridge, token, user, receiver } = await deployBridgePair();

    const amount = ethers.parseEther("100");
    const refundedAmount = amount - ((amount * 10n) / 10000n);
    const tx = await sourceBridge.connect(user).bridge(DEST_EID, receiver.address, amount, "0x");
    const receipt = await tx.wait();
    const sentLog = receipt.logs
      .map((log: any) => {
        try {
          return sourceBridge.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "BridgeSent");

    const txId = sentLog?.args?.txId;
    const balanceBeforeRefund = await token.balanceOf(user.address);

    await assert.rejects(
      () => sourceBridge.connect(receiver).openStaleBridgeRefundWindow(txId),
      /tx not stale|revert/
    );

    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await sourceBridge.connect(receiver).openStaleBridgeRefundWindow(txId);
    assert.ok((await sourceBridge.bridgeRefundableAfter(txId)) > 0n);

    await assert.rejects(
      () => sourceBridge.connect(receiver).finalizeStaleBridgeRefund(txId),
      /sender claim grace active|revert/
    );

    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await sourceBridge.connect(receiver).finalizeStaleBridgeRefund(txId);

    assert.equal(await sourceBridge.bridgeRefundableAfter(txId), 0n);
    assert.equal((await sourceBridge.bridgeTransactions(txId)).executed, true);
    assert.equal(await token.balanceOf(user.address), balanceBeforeRefund + refundedAmount);
  });

  it("opens a refund window when inbound delivery fails from insufficient destination liquidity", async () => {
    const { ethers, token, endpoint, sourceBridge, destinationBridge, owner, user, receiver } = await deployBridgePair();

    // Seed source with baseline liquidity so the first inbound message succeeds.
    await token.transfer(await sourceBridge.getAddress(), ethers.parseEther("5000"));

    // Give user enough balance to create overlapping outbound flows on both chains.
    await token.transfer(user.address, ethers.parseEther("10000"));
    await token.connect(user).approve(await destinationBridge.getAddress(), ethers.MaxUint256);
    await sourceBridge.connect(owner).setExemptCheckBypass(true, 3600);
    await destinationBridge.connect(owner).setExemptCheckBypass(true, 3600);

    // Destination outbound creates pendingOutboundAmount there; baseline available stays 5000.
    await destinationBridge.connect(user).bridge(SOURCE_EID, receiver.address, ethers.parseEther("2000"), "0x");

    // Source outbound to destination exceeds destination baseline available liquidity (after fee ~5994 > 5000).
    const outboundTx = await sourceBridge.connect(user).bridge(DEST_EID, receiver.address, ethers.parseEther("6000"), "0x");
    const outboundReceipt = await outboundTx.wait();
    const outboundLog = outboundReceipt.logs
      .map((log: any) => {
        try {
          return sourceBridge.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "BridgeSent");
    const txId = outboundLog?.args?.txId;
    assert.ok(txId);

    // First queued delivery (destination -> source) should succeed.
    await endpoint.deliverNext();

    // Second queued delivery (source -> destination) no longer reverts; destination emits
    // a failure signal and source opens a refund window upon receiving it.
    await endpoint.deliverNext();

    // Process queued confirmation/failure callbacks.
    await endpoint.deliverNext();
    await endpoint.deliverNext();

    assert.equal((await sourceBridge.bridgeTransactions(txId)).executed, false);
    assert.ok((await sourceBridge.bridgeRefundableAfter(txId)) > 0n);
  });
});