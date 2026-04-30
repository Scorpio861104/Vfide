import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("AdminMultiSig security hardening", { concurrency: 1, timeout: 120000 }, () => {
  async function deployMultiSig() {
    const { ethers } = (await network.connect()) as any;
    const signers = await ethers.getSigners();
    const council = [
      signers[0].address,
      signers[1].address,
      signers[2].address,
      signers[3].address,
      signers[4].address,
    ] as [string, string, string, string, string];

    const AdminMultiSig = await ethers.getContractFactory("AdminMultiSig");
    const multisig = await AdminMultiSig.deploy(council, ethers.ZeroAddress);
    await multisig.waitForDeployment();

    return { ethers, signers, multisig };
  }

  it("rejects EOA targets at proposal creation time", async () => {
    const { signers, multisig } = await deployMultiSig();
    const [c0, , , , , outsider] = signers;

    let reverted = false;
    try {
      await multisig.connect(c0).createProposal(
        0,
        outsider.address,
        "0x12345678",
        "attempt no-op call to EOA"
      );
    } catch (error) {
      reverted = true;
      assert.match(String(error), /target not allowed|revert/i);
    }
    assert.equal(reverted, true);
  });

  it("reverts when the underlying proposal execution fails", async () => {
    const { ethers, signers, multisig } = await deployMultiSig();
    const [c0, c1, c2] = signers;

    const payload = multisig.interface.encodeFunctionData("setExecutionGasLimit", [1]);

    await multisig.connect(c0).createProposal(
      0,
      await multisig.getAddress(),
      payload,
      "set invalid execution gas"
    );
    await multisig.connect(c1).approveProposal(0);
    await multisig.connect(c2).approveProposal(0);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await assert.rejects(
      async () => {
        await multisig.connect(c0).executeProposal.staticCall(0);
      },
      /execution failed|revert/i,
    );
  });
});
