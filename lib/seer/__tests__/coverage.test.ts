/**
 * Seer coverage-ledger honesty test (Wave 83 campaign).
 *
 * The Seer's coverage map is a Veritas-Law surface: it publicly states which subsystems are LIVE vs
 * PARTIAL. These tests lock the discipline so the ledger can't silently drift — every entry must carry a
 * valid status and a substantive note, the summary math must be correct, and PARTIAL entries must explain
 * what's missing (so "partial" is never a vague hand-wave).
 */

import { describe, expect, it } from '@jest/globals';
import { SEER_SUBSYSTEMS, coverageSummary, type SeerCoverageStatus } from '@/lib/seer/coverage';

const VALID: SeerCoverageStatus[] = ['LIVE', 'PARTIAL', 'NOT_BUILT'];

describe('Seer coverage ledger — honesty discipline (Wave 83)', () => {
  it('every subsystem has a name, a valid status, and a substantive note', () => {
    expect(SEER_SUBSYSTEMS.length).toBeGreaterThan(0);
    for (const s of SEER_SUBSYSTEMS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(VALID).toContain(s.status);
      // A note must actually explain something, not be a placeholder.
      expect(s.note.length).toBeGreaterThan(20);
    }
  });

  it('coverageSummary math matches the ledger exactly', () => {
    const cov = coverageSummary();
    expect(cov.total).toBe(SEER_SUBSYSTEMS.length);
    expect(cov.live).toBe(SEER_SUBSYSTEMS.filter((s) => s.status === 'LIVE').length);
    expect(cov.partial).toBe(SEER_SUBSYSTEMS.filter((s) => s.status === 'PARTIAL').length);
    expect(cov.notBuilt).toBe(SEER_SUBSYSTEMS.filter((s) => s.status === 'NOT_BUILT').length);
    // The buckets must sum to the total — no entry uncounted.
    expect(cov.live + cov.partial + cov.notBuilt).toBe(cov.total);
  });

  it('PARTIAL subsystems explain what is missing (not a vague status)', () => {
    const partials = SEER_SUBSYSTEMS.filter((s) => s.status === 'PARTIAL');
    for (const p of partials) {
      // Each PARTIAL note should reference the gap (data feed, deployment, verification, etc.).
      expect(p.note.length).toBeGreaterThan(40);
      expect(/partial|pending|remaining|until|not yet|needs|no live|no pools|upgrade|deployed|audit/i.test(p.note)).toBe(true);
    }
  });
});
