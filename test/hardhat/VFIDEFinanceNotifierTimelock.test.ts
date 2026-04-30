import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("EcoTreasuryVault notifier timelock", () => {
  it("only activates notifier changes after timelock", async () => {
    const { ethers } = (await network.connect()) as any;
    const [dao, notifier, outsider] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Treasury = await ethers.getContractFactory("EcoTreasuryVault");
    const treasury = await Treasury.deploy(
      dao.address,
      ethers.ZeroAddress,
      await token.getAddress(),
    );
    await treasury.waitForDeployment();

    await treasury.connect(dao).setNotifier(notifier.address, true);

    await assert.rejects(
      () => treasury.connect(notifier).noteVFIDE(100n, notifier.address),
      /FI: not authorized notifier|revert/
    );

    await assert.rejects(
      () => treasury.connect(dao).applyNotifier(),
      /FI: notifier timelock|revert/
    );

    await assert.rejects(
      () => treasury.connect(outsider).applyNotifier(),
      /FI_NotDAO|revert/
    );

    await ethers.provider.send("evm_increaseTime", [48 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await treasury.connect(dao).applyNotifier();
    await token.mint(await treasury.getAddress(), 100n);
    await treasury.connect(notifier).noteVFIDE(100n, notifier.address);

    const summary = await treasury.getTreasurySummary();
    assert.equal(summary[1], 100n);
  });
});
