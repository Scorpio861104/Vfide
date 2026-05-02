import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("ServicePool (N-M37 attestation gate)", () => {
  it("requires attested work when seerAttestation is configured", async () => {
    const { ethers } = await getConnection();
    const [admin, recorder, worker, worker2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("test/contracts/mocks/MockContracts.sol:MockERC20");
    const token = await MockERC20.deploy("VFIDE", "VFD", ethers.parseEther("200000000"));
    await token.waitForDeployment();

    const Pool = await ethers.getContractFactory("DAOPayrollPool");
    const pool = await Pool.deploy(
      await token.getAddress(),
      admin.address,
      12,
      ethers.parseEther("500000")
    );
    await pool.waitForDeployment();

    await pool.connect(admin).grantRecorder(recorder.address);

    // Gate disabled by default: contribution should be accepted.
    await pool.connect(recorder).recordVote(worker.address);
    assert.equal(await pool.scores(1, worker.address), 1n);

    const Attestation = await ethers.getContractFactory("SeerWorkAttestation");
    const attestation = await Attestation.deploy(admin.address);
    await attestation.waitForDeployment();

    await pool.connect(admin).setSeerAttestation(await attestation.getAddress());

    // Gate enabled: non-attested worker must be rejected.
    await assert.rejects(
      () => pool.connect(recorder).recordVote(worker2.address),
      /AttestationRequired|revert/
    );

    // After attestation, scoring should succeed.
    const verifierRole = await attestation.VERIFIER_ROLE();
    await attestation.connect(admin).grantRole(verifierRole, recorder.address);

    const taskId = ethers.id("n-m37-task-1");
    const evidence = ethers.id("n-m37-evidence-1");
    await attestation
      .connect(recorder)
      .verifyTaskCompletion(worker2.address, 0, taskId, evidence);

    await pool.connect(recorder).recordVote(worker2.address);
    assert.equal(await pool.scores(1, worker2.address), 1n);
  });
});
