import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("SanctumVault reward guardrails", () => {
  it("blocks dust reward farming and enforces one reward per day", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, donor] = await ethers.getSigners();

    const SeerStub = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:SeerScoreStub");
    const seer = await SeerStub.deploy();
    await seer.waitForDeployment();

    const Token = await ethers.getContractFactory("TestMintableToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Sanctum = await ethers.getContractFactory("SanctumVault");
    const sanctum = await Sanctum.deploy(dao.address, ethers.ZeroAddress, await seer.getAddress());
    await sanctum.waitForDeployment();

    await token.mint(donor.address, ethers.parseEther("100"));
    await token.connect(donor).approve(await sanctum.getAddress(), ethers.parseEther("100"));

    // Dust deposit should not reward.
    await sanctum.connect(donor).deposit(await token.getAddress(), 1n, "dust");
    assert.equal(await seer.getScore(donor.address), 0n);

    // First qualifying deposit rewards donor.
    await sanctum.connect(donor).deposit(await token.getAddress(), 1_000_000n, "qualifying");
    assert.equal(await seer.getScore(donor.address), 10n);

    // Same-day qualifying deposit should not grant additional reward.
    await sanctum.connect(donor).deposit(await token.getAddress(), 1_000_000n, "same-day");
    assert.equal(await seer.getScore(donor.address), 10n);

    // Next day deposit grants reward again.
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await sanctum.connect(donor).deposit(await token.getAddress(), 1_000_000n, "next-day");
    assert.equal(await seer.getScore(donor.address), 20n);
  });
});
