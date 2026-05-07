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

async function deployFixture() {
  const { ethers } = (await getUnlimitedConnection()) as any;
  const [owner, target] = await ethers.getSigners();

  const Placeholder = await ethers.getContractFactory("Placeholder");
  const devVault = await Placeholder.deploy();
  await devVault.waitForDeployment();
  const treasuryVault = await Placeholder.deploy();
  await treasuryVault.waitForDeployment();

  const VFIDEToken = await ethers.getContractFactory("VFIDEToken");
  const token = await VFIDEToken.deploy(
    await devVault.getAddress(), await treasuryVault.getAddress(),
    ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress,
  );
  await token.waitForDeployment();

  const OCP = await ethers.getContractFactory("OwnerControlPanel");
  const panel = await OCP.deploy(
    owner.address, await token.getAddress(),
    ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress,
  );
  await panel.waitForDeployment();

  const panelAddr = await panel.getAddress();
  await token.connect(owner).transferOwnership(panelAddr);
  await ethers.provider.send("hardhat_setBalance", [panelAddr, "0xDE0B6B3A7640000"]);
  await ethers.provider.send("hardhat_impersonateAccount", [panelAddr]);
  const panelSigner = await ethers.getSigner(panelAddr);
  await token.connect(panelSigner).acceptOwnership();
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [panelAddr]);

  return { ethers, owner, target, token, panel };
}

describe("OwnerControlPanel (C-329 queue consistency for token proposals)", () => {
  it("requires queue before token_proposeSystemExempt", async () => {
    const { ethers, owner, target, token, panel } = await deployFixture();

    await expectHardhatRevert(
      () => panel.connect(owner).token_proposeSystemExempt(target.address, true),
    );

    const actionId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "address", "bool"],
        ["token_proposeSystemExempt", target.address, true],
      ),
    );
    await panel.connect(owner).governance_queueAction(actionId);
    const eta = await panel.queuedActionEta(actionId);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    await ethers.provider.send("evm_increaseTime", [Number(eta - now + 1n)]);
    await ethers.provider.send("evm_mine", []);
    await panel.connect(owner).token_proposeSystemExempt(target.address, true);

    assert.equal(await token.pendingExemptAddr(), target.address);
    assert.notEqual(await token.pendingExemptAt(), 0n);
  });

  it("requires queue before token_proposeWhitelist", async () => {
    const { ethers, owner, target, token, panel } = await deployFixture();

    await expectHardhatRevert(
      () => panel.connect(owner).token_proposeWhitelist(target.address, true),
    );

    const actionId = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "address", "bool"],
        ["token_proposeWhitelist", target.address, true],
      ),
    );
    await panel.connect(owner).governance_queueAction(actionId);
    const eta = await panel.queuedActionEta(actionId);
    const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
    await ethers.provider.send("evm_increaseTime", [Number(eta - now + 1n)]);
    await ethers.provider.send("evm_mine", []);
    await panel.connect(owner).token_proposeWhitelist(target.address, true);

    assert.equal(await token.pendingWhitelistAddr(), target.address);
    assert.notEqual(await token.pendingWhitelistAt(), 0n);
  });
});
