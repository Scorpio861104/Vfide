import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let defaultConnectionPromise: Promise<any> | null = null;

async function getDefaultConnection() {
  defaultConnectionPromise ??= network.connect();
  return defaultConnectionPromise;
}

async function seerWorkAttestationFixture() {
  const { ethers } = await getDefaultConnection();
  const [admin, dao, merchant, bridge, social, panic, workPayment, outsider, altDao, altMerchant] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("SeerWorkAttestation");
  const contract = await Factory.deploy(admin.address);
  await contract.waitForDeployment();

  return {
    contract,
    ethers,
    admin,
    dao,
    merchant,
    bridge,
    social,
    panic,
    workPayment,
    outsider,
    altDao,
    altMerchant,
  };
}

async function deploySeerWorkAttestationFixture() {
  const { networkHelpers } = await getDefaultConnection();
  return networkHelpers.loadFixture(seerWorkAttestationFixture);
}

describe("SeerWorkAttestation: Timelocked Protocol Contract Updates", { concurrency: 1 }, () => {
  it("allows admin to propose protocol contracts update with 48h timelock", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment, ethers } = await deploySeerWorkAttestationFixture();

    await (
      await contract.setProtocolContracts(
        dao.address,
        merchant.address,
        bridge.address,
        social.address,
        panic.address,
        workPayment.address
      )
    ).wait();

    const pending = await contract.pendingProtocolContracts();
    assert.equal(pending.dao, dao.address);
    assert.equal(pending.merchant, merchant.address);
    assert.equal(pending.bridge, bridge.address);
    assert.equal(pending.social, social.address);
    assert.equal(pending.panic, panic.address);
    assert.equal(pending.workPayment, workPayment.address);
    assert.equal(
      pending.effectiveAt - BigInt((await ethers.provider.getBlock("latest"))!.timestamp),
      48n * 60n * 60n
    );
  });

  it("prevents protocol contracts update before 48h timelock elapses", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment } = await deploySeerWorkAttestationFixture();

    await contract.setProtocolContracts(
      dao.address,
      merchant.address,
      bridge.address,
      social.address,
      panic.address,
      workPayment.address
    );

    await assert.rejects(async () => contract.applyProtocolContracts(), /ChangeNotReady|revert/);
  });

  it("applies protocol contracts update after 48h timelock completes", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment, ethers } = await deploySeerWorkAttestationFixture();

    await contract.setProtocolContracts(
      dao.address,
      merchant.address,
      bridge.address,
      social.address,
      panic.address,
      workPayment.address
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await (await contract.applyProtocolContracts()).wait();

    assert.equal(await contract.daoContract(), dao.address);
    assert.equal(await contract.merchantPortal(), merchant.address);
    assert.equal(await contract.bridgeModule(), bridge.address);
    assert.equal(await contract.seerSocial(), social.address);
    assert.equal(await contract.panicGuard(), panic.address);
    assert.equal(await contract.workPaymentManager(), workPayment.address);
    assert.equal((await contract.pendingProtocolContracts()).effectiveAt, 0n);
  });

  it("allows admin to cancel a pending protocol contracts change", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment } = await deploySeerWorkAttestationFixture();

    await contract.setProtocolContracts(
      dao.address,
      merchant.address,
      bridge.address,
      social.address,
      panic.address,
      workPayment.address
    );

    await (await contract.cancelProtocolContractsChange()).wait();
    assert.equal((await contract.pendingProtocolContracts()).effectiveAt, 0n);
  });

  it("prevents concurrent protocol contract changes while one is pending", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment, altDao, altMerchant, ethers } = await deploySeerWorkAttestationFixture();

    await contract.setProtocolContracts(
      dao.address,
      merchant.address,
      bridge.address,
      social.address,
      panic.address,
      workPayment.address
    );

    await assert.rejects(
      async () =>
        contract.setProtocolContracts(
          altDao.address,
          altMerchant.address,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress
        ),
      /PendingChangeExists|revert/
    );
  });

  it("supports selective non-zero updates when applying", async () => {
    const { contract, merchant, ethers } = await deploySeerWorkAttestationFixture();

    await contract.setProtocolContracts(
      ethers.ZeroAddress,
      merchant.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await contract.applyProtocolContracts();

    assert.equal(await contract.merchantPortal(), merchant.address);
    assert.equal(await contract.daoContract(), ethers.ZeroAddress);
  });

  it("prevents non-admin proposal, apply, and cancel actions", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment, outsider, ethers } = await deploySeerWorkAttestationFixture();

    await assert.rejects(
      async () =>
        contract.connect(outsider).setProtocolContracts(
          dao.address,
          merchant.address,
          bridge.address,
          social.address,
          panic.address,
          workPayment.address
        ),
      /AccessControl|revert/
    );

    await contract.setProtocolContracts(
      dao.address,
      merchant.address,
      bridge.address,
      social.address,
      panic.address,
      workPayment.address
    );

    await assert.rejects(async () => contract.connect(outsider).cancelProtocolContractsChange(), /AccessControl|revert/);

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(async () => contract.connect(outsider).applyProtocolContracts(), /AccessControl|revert/);
  });

  it("rejects apply and cancel when no change is pending", async () => {
    const { contract } = await deploySeerWorkAttestationFixture();

    await assert.rejects(async () => contract.applyProtocolContracts(), /NoPendingChange|revert/);
    await assert.rejects(async () => contract.cancelProtocolContractsChange(), /NoPendingChange|revert/);
  });

  it("allows canceling and replacing a pending proposal", async () => {
    const { contract, dao, merchant, bridge, social, panic, workPayment, altDao, ethers } = await deploySeerWorkAttestationFixture();

    await contract.setProtocolContracts(
      dao.address,
      merchant.address,
      bridge.address,
      social.address,
      panic.address,
      workPayment.address
    );
    assert.equal((await contract.pendingProtocolContracts()).dao, dao.address);

    await contract.cancelProtocolContractsChange();
    await contract.setProtocolContracts(
      altDao.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    assert.equal((await contract.pendingProtocolContracts()).dao, altDao.address);
  });

  it("rejects attempt to apply when no change is pending", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SeerWorkAttestation");
    const contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();

    await assert.rejects(
      () => contract.connect(admin).applyProtocolContracts(),
      /NoPendingChange|revert/
    );
  });

  it("rejects attempt to cancel when no change is pending", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SeerWorkAttestation");
    const contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();

    await assert.rejects(
      () => contract.connect(admin).cancelProtocolContractsChange(),
      /NoPendingChange|revert/
    );
  });

  it("correctly stores all pending protocol contract addresses", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SeerWorkAttestation");
    const contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();

    // Create unique addresses for each protocol contract
    const uniqueAddresses = [
      ethers.getAddress(ethers.zeroPadValue("0x1111", 20)),
      ethers.getAddress(ethers.zeroPadValue("0x2222", 20)),
      ethers.getAddress(ethers.zeroPadValue("0x3333", 20)),
      ethers.getAddress(ethers.zeroPadValue("0x4444", 20)),
      ethers.getAddress(ethers.zeroPadValue("0x5555", 20)),
      ethers.getAddress(ethers.zeroPadValue("0x6666", 20)),
    ];

    await contract.connect(admin).setProtocolContracts(
      uniqueAddresses[0],
      uniqueAddresses[1],
      uniqueAddresses[2],
      uniqueAddresses[3],
      uniqueAddresses[4],
      uniqueAddresses[5]
    );

    const pending = await contract.pendingProtocolContracts();
    assert.equal(pending.dao, uniqueAddresses[0]);
    assert.equal(pending.merchant, uniqueAddresses[1]);
    assert.equal(pending.bridge, uniqueAddresses[2]);
    assert.equal(pending.social, uniqueAddresses[3]);
    assert.equal(pending.panic, uniqueAddresses[4]);
    assert.equal(pending.workPayment, uniqueAddresses[5]);
  });

  it("enforces exactly 48 hours (172800 seconds) delay", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin, dao, merchant, bridge, social, panic, workPayment] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SeerWorkAttestation");
    const contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();

    const setTx = await contract
      .connect(admin)
      .setProtocolContracts(
        dao.address,
        merchant.address,
        bridge.address,
        social.address,
        panic.address,
        workPayment.address
      );
    await setTx.wait();

    const pending = await contract.pendingProtocolContracts();
    const effectiveAt = Number(pending.effectiveAt);
    const currentTime = (await ethers.provider.getBlock("latest"))?.timestamp;

    const delayInSeconds = effectiveAt - currentTime!;
    assert.equal(delayInSeconds, 48 * 60 * 60);
  });

  it("allows replacement of pending change via cancel + new proposal", async () => {
    const { ethers } = (await network.connect()) as any;
    const [admin, dao1, merchant1, bridge1, social1, panic1, workPayment1, dao2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("SeerWorkAttestation");
    const contract = await Factory.deploy(admin.address);
    await contract.waitForDeployment();

    // First proposal
    await contract
      .connect(admin)
      .setProtocolContracts(
        dao1.address,
        merchant1.address,
        bridge1.address,
        social1.address,
        panic1.address,
        workPayment1.address
      );

    let pending = await contract.pendingProtocolContracts();
    assert.equal(pending.dao, dao1.address);

    // Cancel and propose different change
    await contract.connect(admin).cancelProtocolContractsChange();
    await contract.connect(admin).setProtocolContracts(
      dao2.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );

    pending = await contract.pendingProtocolContracts();
    assert.equal(pending.dao, dao2.address);
  });
});
