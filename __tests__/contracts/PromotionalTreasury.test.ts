/**
 * PromotionalTreasury — removed
 *
 * The PromotionalTreasury contract has been removed from the protocol.
 * All token rewards (referral bonuses, merchant incentives, education rewards,
 * pioneer badges, etc.) are not offered — VFIDE is a governance utility token
 * and distributing rewards would create an expectation of profits, violating
 * Howey Test compliance.
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';

describe('PromotionalTreasury — removed from protocol', () => {
  it('confirms that token rewards are not available', () => {
    // There is no PromotionalTreasury contract to test.
    // Rewards are not part of the VFIDE protocol.
    expect(fs.existsSync('contracts/PromotionalTreasury.sol')).toBe(false);
  });

  it('confirms referral bonuses are not available', () => {
    // Legacy ABI file is intentionally removed; no referral bonus surface remains.
    expect(fs.existsSync('lib/abis/PromotionalTreasury.json')).toBe(false);
  });

  it('confirms merchant milestone rewards are not available', () => {
    // claimMerchantMilestone and similar functions are removed with the contract/ABI.
    expect(fs.existsSync('lib/abis/PromotionalTreasury.json')).toBe(false);
  });
});
