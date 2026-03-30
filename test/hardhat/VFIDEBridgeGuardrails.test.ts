import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("VFIDEBridge (delivery confirmation)", () => {
  const SOURCE_EID = 30101;
  const DEST_EID = 30102;

  async function deployBridgePair() {
    const { ethers } = (await network.connect()) as any;
    const [owner, user, receiver] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("test/contracts/mocks/MockContracts.sol:MockERC20");
    const token = await MockERC20.deploy("VFIDE", "VFD", ethers.parseEther("200000000"));
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

    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.transfer(await destinationBridge.getAddress(), ethers.parseEther("5000"));
    await token.connect(user).approve(await sourceBridge.getAddress(), ethers.MaxUint256);

    return { ethers, token, endpoint, sourceBridge, destinationBridge, owner, user, receiver };
  }

  it("syncs LayerZero peers when a trusted remote is applied", async () => {
    const { ethers, sourceBridge, destinationBridge } = await deployBridgePair();

    assert.equal(await sourceBridge.peers(DEST_EID), ethers.zeroPadValue(await destinationBridge.getAddress(), 32));
  });

  it("closes the refund window after destination delivery confirmation", async () => {
    const { ethers, endpoint, sourceBridge, token, user, receiver } = await deployBridgePair();

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

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await sourceBridge.connect(user).claimBridgeRefund(txId);

    assert.equal(await sourceBridge.bridgeRefundableAfter(txId), 0n);
    assert.equal((await sourceBridge.bridgeTransactions(txId)).executed, true);
    assert.equal(await token.balanceOf(user.address), balanceBeforeRefund + refundedAmount);
  });
});