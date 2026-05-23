import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

describe('VFIDETermLoan batch #241/#245 guardrails', () => {
  it('rejects guarantor signing when source balance is below committed liability', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, lender, borrower, guarantor, feeCollector] = await ethers.getSigners();

    const Token = await ethers.getContractFactory(
      'test/contracts/helpers/Stubs.sol:MintableTokenStub'
    );
    const token = await Token.deploy();
    await token.waitForDeployment();

    const TermLoan = await ethers.getContractFactory('VFIDETermLoan');
    const termLoan = await TermLoan.deploy(
      await token.getAddress(),
      dao.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      feeCollector.address
    );
    await termLoan.waitForDeployment();

    const principal = ethers.parseEther('100');
    await token.mint(lender.address, principal);
    await token.mint(guarantor.address, ethers.parseEther('50'));

    await token.connect(lender).approve(await termLoan.getAddress(), principal);
    // Allowance is large, but balance is intentionally insufficient.
    await token.connect(guarantor).approve(await termLoan.getAddress(), principal);

    await termLoan.connect(lender).createLoan(principal, 500, 14 * 24 * 60 * 60);
    await termLoan.connect(borrower).acceptLoan(1);

    await assert.rejects(
      () => termLoan.connect(guarantor).signAsGuarantor(1),
      /source balance below liability|revert/i
    );
  });

  it('re-checks borrower score at activation to prevent stale-score funding', async () => {
    const { ethers } = (await getConnection()) as any;
    const [dao, lender, borrower, guarantor, feeCollector] = await ethers.getSigners();

    const Token = await ethers.getContractFactory(
      'test/contracts/helpers/Stubs.sol:MintableTokenStub'
    );
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Seer = await ethers.getContractFactory('test/contracts/helpers/Stubs.sol:SeerScoreStub');
    const seer = await Seer.deploy();
    await seer.waitForDeployment();

    const TermLoan = await ethers.getContractFactory('VFIDETermLoan');
    const termLoan = await TermLoan.deploy(
      await token.getAddress(),
      dao.address,
      await seer.getAddress(),
      ethers.ZeroAddress,
      feeCollector.address
    );
    await termLoan.waitForDeployment();

    const principal = ethers.parseEther('1000');
    await token.mint(lender.address, principal);
    await token.mint(guarantor.address, principal);

    await seer.setScore(borrower.address, 8000);
    await seer.setScore(guarantor.address, 6000);

    await token.connect(lender).approve(await termLoan.getAddress(), principal);
    await token.connect(guarantor).approve(await termLoan.getAddress(), principal);

    await termLoan.connect(lender).createLoan(principal, 500, 14 * 24 * 60 * 60);
    await termLoan.connect(borrower).acceptLoan(1);

    // Borrower drops tiers before final guarantor signature / activation.
    await seer.setScore(borrower.address, 5000);

    await assert.rejects(
      () => termLoan.connect(guarantor).signAsGuarantor(1),
      /TL_ExceedsLimit|revert/i
    );
  });
});
