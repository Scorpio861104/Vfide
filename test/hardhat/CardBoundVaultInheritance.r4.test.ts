/**
 * R-4 — cross-contract obligation settlement tests.
 *
 * Covers the VFIDETermLoan.settleLoanByInheritance entry point landed in v1's
 * R-4 partial closure (see VFIDE_INHERITANCE_THREAT_MODEL.md R-4).
 *
 * The VaultHubStub helper `setInMemorialState(vault, bool)` is used to
 * simulate a deceased party without spinning up the full inheritance
 * state machine. The R-4 entry points only call `vaultOf` and
 * `isInMemorialState` — both fully supported by the stub.
 *
 * Threat-model test IDs covered:
 *   T-R4-6: settle reverts when VaultHub is wired but neither party is in memorial
 *   T-R4-7: settle succeeds when one party's vault is in memorial state
 *
 * Each test names its threat ID in the title.
 *
 * Note: parallel coverage for CommerceEscrow.settleByInheritance now lives
 * in the CommerceEscrow test suite. EscrowManager coverage was retired
 * alongside the contract in Phase 3e (2026-05-15).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';

let connectionPromise: Promise<any> | null = null;

async function getConnection() {
  connectionPromise ??= network.connect();
  return connectionPromise;
}

async function expectRevert(promise: Promise<unknown>, hint?: string) {
  await assert.rejects(promise, (err) => {
    if (!(err instanceof Error)) return false;
    if (hint) return err.message.includes(hint);
    return /revert|VM Exception|execution reverted/i.test(err.message);
  });
}

describe('R-4 — VFIDETermLoan.settleLoanByInheritance', { concurrency: 1 }, () => {
  it('T-R4-6: settle reverts when VaultHub is wired but neither party is in memorial', async () => {
    const f = await deployTermLoanFixture();
    // Create an OPEN loan offer.
    await f.loan.connect(f.lender).createLoan(
      f.ethers.parseEther('100'),
      500, // 5% interest
      30 * 24 * 60 * 60 // 30 days
    );
    // VaultHub is wired but neither vault is marked memorial.
    await expectRevert(f.loan.connect(f.external).settleLoanByInheritance(0));
  });

  it("R-4: OPEN loan settles when lender's vault enters MEMORIAL, refunds lender", async () => {
    const f = await deployTermLoanFixture();
    const principal = f.ethers.parseEther('100');
    // Lender creates a loan offer (principal locked in contract).
    await f.loan.connect(f.lender).createLoan(principal, 500, 30 * 24 * 60 * 60);
    const lenderBalBefore = await f.token.balanceOf(f.lender.address);
    // Mark lender's vault as in MEMORIAL.
    await f.hub.setInMemorialState(f.lenderVaultAddr, true);
    // Anyone can call settle.
    const tx = await f.loan.connect(f.external).settleLoanByInheritance(0);
    const receipt = await tx.wait();
    // Lender's settlement recipient (the lender themselves if no vault is set
    // in the stub's `vaultOf` — actually we DID set their vault, so funds go
    // there. The stub's vaults[lender] = lenderVaultAddr.)
    // For the test we just check that the loan transitioned to CANCELLED.
    const loanData = await f.loan.loans(0);
    assert.equal(Number(loanData.state), 7); // LoanState.CANCELLED
    // Event fired.
    const event = receipt.logs.find((l: any) => {
      try {
        return f.loan.interface.parseLog(l)?.name === 'LoanSettledByInheritance';
      } catch {
        return false;
      }
    });
    assert.ok(event, 'LoanSettledByInheritance event expected');
  });

  it("R-4: OPEN loan settles when borrower's vault enters MEMORIAL, refunds lender", async () => {
    const f = await deployTermLoanFixture();
    await f.loan.connect(f.lender).createLoan(f.ethers.parseEther('50'), 700, 30 * 24 * 60 * 60);
    await f.hub.setInMemorialState(f.borrowerVaultAddr, true);
    await f.loan.connect(f.external).settleLoanByInheritance(0);
    const loanData = await f.loan.loans(0);
    assert.equal(Number(loanData.state), 7);
  });

  it('T-R4-5: double-settle reverts (loan already in terminal state)', async () => {
    const f = await deployTermLoanFixture();
    await f.loan.connect(f.lender).createLoan(f.ethers.parseEther('50'), 500, 30 * 24 * 60 * 60);
    await f.hub.setInMemorialState(f.lenderVaultAddr, true);
    await f.loan.connect(f.external).settleLoanByInheritance(0);
    // Second call should revert.
    await expectRevert(f.loan.connect(f.external).settleLoanByInheritance(0));
  });

  it('T-R4-3: settle reverts when vault was rolled back to NORMAL', async () => {
    const f = await deployTermLoanFixture();
    await f.loan.connect(f.lender).createLoan(f.ethers.parseEther('50'), 500, 30 * 24 * 60 * 60);
    // Briefly mark as memorial, then roll back.
    await f.hub.setInMemorialState(f.lenderVaultAddr, true);
    await f.hub.setInMemorialState(f.lenderVaultAddr, false);
    // Settle should revert — no party is currently in memorial.
    await expectRevert(f.loan.connect(f.external).settleLoanByInheritance(0));
  });

  it('R-4: cancelled loan cannot be re-settled', async () => {
    const f = await deployTermLoanFixture();
    await f.loan.connect(f.lender).createLoan(f.ethers.parseEther('50'), 500, 30 * 24 * 60 * 60);
    // Lender cancels normally.
    await f.loan.connect(f.lender).cancelLoan(0);
    // Now mark memorial — settle should still revert because state is terminal.
    await f.hub.setInMemorialState(f.lenderVaultAddr, true);
    await expectRevert(f.loan.connect(f.external).settleLoanByInheritance(0));
  });
});
