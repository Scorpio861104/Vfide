/**
 * StabilityBond — non-custodial invariant audit (Wave 74).
 *
 * Off-chain static/logic audit expressed as Jest assertions (the repo's `__tests__/contracts` pattern):
 * it reads the raw contracts/StabilityBond.sol source and asserts the safeguards the audit evidence
 * claims, WITHOUT requiring a live Hardhat node (the 0.8.30 compiler can't be downloaded in this
 * sandbox). A full deploy-and-call hardhat test belongs in test/hardhat/ and runs in the project's CI
 * where the compiler is available — this file guards the source-level invariants in the meantime.
 *
 * Invariants verified:
 *   - NON-CUSTODIAL: no admin/owner role, no pause, no seize, no early-release-by-other.
 *   - withdraw() releases only to msg.sender, and only after maturity.
 *   - Uses SafeERC20 + ReentrancyGuard.
 *   - Fee-on-transfer-safe: bonds the measured balance delta, not the requested amount.
 *   - Only the four allowed terms (3/6/12/24) are accepted.
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';

const SRC = 'contracts/StabilityBond.sol';
const src = fs.existsSync(SRC) ? fs.readFileSync(SRC, 'utf8') : '';

describe('StabilityBond — production contract exists and is non-custodial', () => {
  it('the production contract exists (not just the draft)', () => {
    expect(fs.existsSync(SRC)).toBe(true);
    // The draft must not be the only version; production lives in contracts/ root.
    expect(src.length).toBeGreaterThan(0);
  });

  it('has NO admin/owner/pause/seize surface — the non-custodial guarantee', () => {
    // No ownership or access-control roles.
    expect(/\bOwnable\b/.test(src)).toBe(false);
    expect(/\bAccessControl\b/.test(src)).toBe(false);
    expect(/onlyOwner|onlyAdmin|onlyRole/.test(src)).toBe(false);
    // No pause/seize/emergency-withdraw escape hatches.
    expect(/function\s+pause\b/.test(src)).toBe(false);
    expect(/function\s+seize\b/.test(src)).toBe(false);
    expect(/function\s+emergencyWithdraw\b/.test(src)).toBe(false);
    // No admin-settable token/owner reassignment.
    expect(/function\s+setOwner\b/.test(src)).toBe(false);
  });

  it('withdraw() releases ONLY to msg.sender and ONLY after maturity', () => {
    // The transfer in withdraw must target msg.sender (never an arbitrary address param).
    expect(/safeTransfer\(\s*msg\.sender\s*,/.test(src)).toBe(true);
    // Maturity gate present.
    expect(/block\.timestamp\s*<\s*b\.maturityAt/.test(src)).toBe(true);
    // withdraw indexes bonds by msg.sender (you can only touch your own bonds).
    expect(/_bonds\[msg\.sender\]/.test(src)).toBe(true);
  });

  it('uses SafeERC20 and ReentrancyGuard (production hardening over the draft)', () => {
    expect(/using SafeERC20 for IERC20/.test(src)).toBe(true);
    expect(/is ReentrancyGuard/.test(src)).toBe(true);
    expect(/function bond\([^)]*\)\s*external\s+nonReentrant/.test(src)).toBe(true);
    expect(/function withdraw\([^)]*\)\s*external\s+nonReentrant/.test(src)).toBe(true);
  });

  it('is fee-on-transfer safe: bonds the MEASURED balance delta, not the requested amount', () => {
    expect(/balanceOf\(address\(this\)\)/.test(src)).toBe(true);
    expect(/received\s*=\s*vfide\.balanceOf\(address\(this\)\)\s*-\s*balBefore/.test(src)).toBe(true);
    // The stored amount is `received`, not the raw `amount` argument.
    expect(/amount:\s*received/.test(src)).toBe(true);
  });

  it('accepts only the four allowed terms (3/6/12/24 months)', () => {
    expect(/termMonths == 3/.test(src)).toBe(true);
    expect(/termMonths == 6/.test(src)).toBe(true);
    expect(/termMonths == 12/.test(src)).toBe(true);
    expect(/termMonths == 24/.test(src)).toBe(true);
    expect(/revert InvalidTerm/.test(src)).toBe(true);
  });

  it('pins the codebase Solidity version (0.8.30)', () => {
    expect(/pragma solidity 0\.8\.30;/.test(src)).toBe(true);
  });
});
