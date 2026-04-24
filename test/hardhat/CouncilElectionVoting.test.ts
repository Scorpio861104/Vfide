import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("CouncilElection voting flow", () => {
  it("requires a completed election and top-voted candidates before council proposal", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, candidateA, candidateB, candidateC, voter1, voter2] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    for (const s of [candidateA, candidateB, candidateC, voter1, voter2]) {
      await hub.setVault(s.address, s.address);
    }

    const Seer = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    for (const s of [candidateA, candidateB, candidateC, voter1, voter2]) {
      await seer.setScore(s.address, 8000);
    }

    const Election = await ethers.getContractFactory("CouncilElection");
    const election = await Election.deploy(
      dao.address,
      await seer.getAddress(),
      await hub.getAddress(),
      ethers.ZeroAddress,
    );
    await election.waitForDeployment();

    await election.connect(dao).setParams(2, 7000, 365n * 24n * 60n * 60n, 14n * 24n * 60n * 60n);

    await election.connect(candidateA).register();
    await election.connect(candidateB).register();
    await election.connect(candidateC).register();

    await assert.rejects(
      () => election.connect(dao).proposeCouncil([candidateA.address, candidateB.address]),
      /revert/
    );

    await election.connect(dao).startElection(24n * 60n * 60n);

    await election.connect(voter1).vote(candidateA.address);
    await election.connect(voter2).vote(candidateB.address);

    await assert.rejects(
      () => election.connect(voter1).vote(candidateB.address),
      /revert/
    );

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      () => election.connect(dao).proposeCouncil([candidateA.address, candidateC.address]),
      /CE_NotTopVotedCandidate|revert/
    );

    await election.connect(dao).proposeCouncil([candidateA.address, candidateB.address]);

    await ethers.provider.send("evm_increaseTime", [72 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await election.applyCouncil();

    const members = await election.getCouncilMembers();
    assert.equal(members.length, 2);
    assert.ok(members.includes(candidateA.address));
    assert.ok(members.includes(candidateB.address));
  });

  it("allows more than 200 eligible candidates to register", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Seer = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const Election = await ethers.getContractFactory("CouncilElection");
    const election = await Election.deploy(
      dao.address,
      await seer.getAddress(),
      await hub.getAddress(),
      ethers.ZeroAddress,
    );
    await election.waitForDeployment();

    const totalCandidates = 201;
    for (let i = 0; i < totalCandidates; i++) {
      const hex = (1000 + i).toString(16).padStart(40, "0");
      const candidateAddress = ethers.getAddress(`0x${hex}`);

      await hub.setVault(candidateAddress, candidateAddress);
      await seer.setScore(candidateAddress, 8000);
      await ethers.provider.send("hardhat_setBalance", [candidateAddress, "0x3635C9ADC5DEA00000"]);
      await ethers.provider.send("hardhat_impersonateAccount", [candidateAddress]);

      try {
        const candidate = await ethers.getSigner(candidateAddress);
        await election.connect(candidate).register();
      } finally {
        await ethers.provider.send("hardhat_stopImpersonatingAccount", [candidateAddress]);
      }
    }

    const candidates = await election.getCandidates();
    assert.equal(candidates.length, totalCandidates);
  });

  it("keeps seated council members through mid-term score changes", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, candidateA, candidateB, voter1, voter2] = await ethers.getSigners();

    const Hub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:VaultHubStub");
    const hub = await Hub.deploy();
    await hub.waitForDeployment();

    const Seer = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    for (const s of [candidateA, candidateB, voter1, voter2]) {
      await hub.setVault(s.address, s.address);
      await seer.setScore(s.address, 8000);
    }

    const Election = await ethers.getContractFactory("CouncilElection");
    const election = await Election.deploy(
      dao.address,
      await seer.getAddress(),
      await hub.getAddress(),
      ethers.ZeroAddress,
    );
    await election.waitForDeployment();

    await election.connect(dao).setParams(2, 7000, 365n * 24n * 60n * 60n, 14n * 24n * 60n * 60n);

    await election.connect(candidateA).register();
    await election.connect(candidateB).register();

    await election.connect(dao).startElection(24n * 60n * 60n);
    await election.connect(voter1).vote(candidateA.address);
    await election.connect(voter2).vote(candidateB.address);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await election.connect(dao).proposeCouncil([candidateA.address, candidateB.address]);
    await ethers.provider.send("evm_increaseTime", [72 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await election.applyCouncil();

    await seer.setScore(candidateA.address, 1000);

    await election.connect(dao).refreshCouncil([candidateA.address, candidateB.address]);
    const members = await election.getCouncilMembers();
    assert.equal(members.length, 2);
    assert.ok(members.includes(candidateA.address));
    assert.ok(members.includes(candidateB.address));
  });
});