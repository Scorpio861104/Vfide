import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe("VFIDETermLoan batch #260 guardrail", () => {
  it("releases guarantor commitments when default is claimed after payment-plan failure", async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, lender, borrower, guarantor, feeCollector] = await ethers.getSigners();

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
    await token.mint(lender.address, principal);
    await token.mint(guarantor.address, principal);

    await token.connect(lender).approve(await termLoan.getAddress(), principal);
    await token.connect(guarantor).approve(await termLoan.getAddress(), principal);

    await termLoan.connect(lender).createLoan(principal, 500, 24 * 60 * 60);
    await termLoan.connect(borrower).acceptLoan(1);
    await termLoan.connect(guarantor).signAsGuarantor(1);

    const committedBefore = await termLoan.guarantorCommittedLiability(1, guarantor.address);
    assert.ok(committedBefore > 0n);

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await termLoan.connect(borrower).proposePaymentPlan(1, 2, 7);
    await termLoan.connect(lender).acceptPaymentPlan(1);

    // Miss first installment long enough to trigger plan-failure default path.
    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 2]);
    await ethers.provider.send("evm_mine", []);

    await termLoan.connect(lender).claimDefault(1);

    assert.equal(await termLoan.guarantorCommittedLiability(1, guarantor.address), 0n);
    assert.equal(await termLoan.committedLiability(guarantor.address), 0n);
  });
});
