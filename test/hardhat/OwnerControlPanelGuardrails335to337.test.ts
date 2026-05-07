import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { expectHardhatRevert } from "./utils/expectHardhatRevert";

let unlimitedConnectionPromise: Promise<any> | null = null;

async function getUnlimitedConnection() {
  unlimitedConnectionPromise ??= network.connect({
    override: { allowUnlimitedContractSize: true },
  });
  return unlimitedConnectionPromise;
}

describe("OwnerControlPanel (batch #335/#337 guardrails)", () => {
  it("#335: pending ownership acceptance expires after 7 days", async () => {
    const { ethers } = (await getUnlimitedConnection()) as any;
    const [owner, nextOwner] = await ethers.getSigners();

    const OCP = await ethers.getContractFactory("OwnerControlPanel");
    const panel = await OCP.deploy(
      owner.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
    );
    await panel.waitForDeployment();

    await panel.connect(owner).transferOwnership(nextOwner.address);
    await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expectHardhatRevert(
      () => panel.connect(nextOwner).acceptOwnership(),
      /OwnershipTransferExpired|expired/i,
    );
  });

  it("#337: getTokenStatus reports treasury sink balance, not owner balance", async () => {
    const { ethers } = (await getUnlimitedConnection()) as any;
    const [owner] = await ethers.getSigners();

    const Placeholder = await ethers.getContractFactory("Placeholder");
    const devVault = await Placeholder.deploy();
    await devVault.waitForDeployment();
    const treasuryVault = await Placeholder.deploy();
    await treasuryVault.waitForDeployment();

    const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
    const token = await VFIDEToken.deploy(
      await devVault.getAddress(),
      await treasuryVault.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      await treasuryVault.getAddress(),
    );
    await token.waitForDeployment();

    const OCP = await ethers.getContractFactory("OwnerControlPanel");
    const panel = await OCP.deploy(
      owner.address,
      await token.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
    );
    await panel.waitForDeployment();

    const status = await panel.getTokenStatus();
    const treasurySink = await token.treasurySink();
    const sinkBalance = await token.balanceOf(treasurySink);
    const ownerBalance = await token.balanceOf(owner.address);

    assert.equal(status.treasuryBalance, sinkBalance);
    assert.notEqual(status.treasuryBalance, ownerBalance);
  });
});
