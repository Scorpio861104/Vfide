import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VFIDETermLoan batch #258/#259 guardrails", () => {
  it("blocks loan creation for lenders with unresolved defaults", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, lenderA, lenderB, borrower, guarantor, feeCollector] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const TermLoan = await ethers.getContractFactory("VFIDETermLoan");
    const termLoan = await TermLoan.deploy(
      await token.getAddress(),
      dao.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      feeCollector.address,
    );
    await termLoan.waitForDeployment();

    const principal = ethers.parseEther("100");
    await token.mint(lenderA.address, principal);
    await token.mint(lenderB.address, principal);
    await token.mint(guarantor.address, principal);

    await token.connect(lenderA).approve(await termLoan.getAddress(), principal);
    await token.connect(lenderB).approve(await termLoan.getAddress(), principal);
    await token.connect(guarantor).approve(await termLoan.getAddress(), principal);

    await termLoan.connect(lenderA).createLoan(principal, 500, 24 * 60 * 60);
    await termLoan.connect(borrower).acceptLoan(1);
    await termLoan.connect(guarantor).signAsGuarantor(1);

    await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await termLoan.connect(lenderA).claimDefault(1);
    assert.equal(await termLoan.unresolvedDefaults(borrower.address), 1n);

    await assert.rejects(
      () => termLoan.connect(borrower).createLoan(principal, 500, 24 * 60 * 60),
      /TL_DebtOutstanding|revert/i
    );

    await termLoan.connect(lenderB).createLoan(principal, 500, 24 * 60 * 60);
  });

  it("rejects non-monotonic DAO score tiers", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, feeCollector] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("test/contracts/helpers/Stubs.sol:MintableTokenStub");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const TermLoan = await ethers.getContractFactory("VFIDETermLoan");
    const termLoan = await TermLoan.deploy(
      await token.getAddress(),
      dao.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      feeCollector.address,
    );
    await termLoan.waitForDeployment();

    await assert.rejects(
      () => termLoan.connect(dao).setScoreTiers(200n, 100n, 300n, 400n),
      /TL_InvalidTerms|revert/i
    );

    await termLoan.connect(dao).setScoreTiers(100n, 200n, 300n, 400n);
    assert.equal(await termLoan.tier1Limit(), 100n);
    assert.equal(await termLoan.tier2Limit(), 200n);
    assert.equal(await termLoan.tier3Limit(), 300n);
    assert.equal(await termLoan.tier4Limit(), 400n);
  });
});
