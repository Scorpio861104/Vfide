/**
 * Guardian resilience tests (Wave 87 — Guardian institution campaign).
 *
 * Locks the death/disappearance-redundancy assessment: the contract allows threshold == guardianCount,
 * which is the silent lockout trap (lose one guardian → recovery impossible). These tests prove the helper
 * flags exactly that case and grades healthier configs correctly.
 */

import { describe, expect, it } from '@jest/globals';
import { assessGuardianResilience } from '@/lib/vault/guardianResilience';

describe('Guardian resilience (Wave 87)', () => {
  it('no guardians → level none, recovery not possible', () => {
    const r = assessGuardianResilience(0, 0);
    expect(r.level).toBe('none');
    expect(r.warning).not.toBeNull();
  });

  it('threshold == count is FLAGGED as fragile (losing one guardian locks recovery)', () => {
    const r = assessGuardianResilience(2, 2);
    expect(r.zeroRedundancy).toBe(true);
    expect(r.level).toBe('fragile');
    expect(r.lossTolerance).toBe(0);
    expect(r.warning).toContain('one'); // explains losing one guardian breaks recovery
  });

  it('3 guardians / threshold 3 is also fragile (zero redundancy regardless of size)', () => {
    const r = assessGuardianResilience(3, 3);
    expect(r.zeroRedundancy).toBe(true);
    expect(r.level).toBe('fragile');
  });

  it('3 guardians / threshold 2 survives one loss (ok)', () => {
    const r = assessGuardianResilience(3, 2);
    expect(r.zeroRedundancy).toBe(false);
    expect(r.lossTolerance).toBe(1);
    expect(r.level).toBe('ok');
    expect(r.warning).toBeNull();
  });

  it('5 guardians / threshold 3 survives two losses (strong)', () => {
    const r = assessGuardianResilience(5, 3);
    expect(r.lossTolerance).toBe(2);
    expect(r.level).toBe('strong');
    expect(r.warning).toBeNull();
  });

  it('NaN / garbage inputs are hardened (never throws, treated as 0)', () => {
    const r = assessGuardianResilience(NaN, NaN);
    expect(r.level).toBe('none');
    expect(Number.isFinite(r.lossTolerance)).toBe(true);
  });
});
