import { describe, expect, it } from '@jest/globals';
import {
  capabilityExists, reachesUserFunds, reportRiskIsCustodial,
  authorizedToCall, ownershipTransferEffective,
  authorizeQueuedAction, validGovernanceDelay, authorizeDelayChange,
  feePolicyAccepted,
  MIN_GOVERNANCE_DELAY_H, MAX_GOVERNANCE_DELAY_DAYS, GOVERNANCE_ACTION_EXPIRY_DAYS,
  FEE_FLOOR_BPS, FEE_CEIL_BPS,
  type OcpCapability,
} from '@/lib/audit/ownerControlPanelModel';

// ════════════════════════════════════════════════════════════════════════
// OWNER CONTROL PANEL — non-custodial boundary + timelock / anti-rug discipline
//   Central question (same flag-shape as EmergencyControl & SeerAutonomous): does a contract literally named
//   "owner control panel" reach user funds? Verdict from source: NO. This matrix encodes why.
// ════════════════════════════════════════════════════════════════════════

const ALL_CAPS: OcpCapability[] = [
  'configureSystemContracts', 'feePolicy', 'sustainability', 'seerThresholds', 'governanceDelay',
  'vaultSetModules', 'vaultSetDAOMultisig', 'vaultSetRecoveryTimelock', 'vaultReportRisk',
  'vaultFreeze', 'vaultSeize', 'setUserWithdrawalCooldown', 'daoRecovery',
];

const REMOVED_OR_DEAD: OcpCapability[] = ['vaultFreeze', 'vaultSeize', 'setUserWithdrawalCooldown', 'daoRecovery'];
const LIVE_CAPS = ALL_CAPS.filter((c) => !REMOVED_OR_DEAD.includes(c));

describe('OCP · A. Non-custodial boundary — NO capability reaches user funds', () => {
  it('A1 reachesUserFunds is FALSE for EVERY capability (the core invariant)', () => {
    for (const cap of ALL_CAPS) expect(reachesUserFunds(cap)).toBe(false);
  });

  it('A2 freeze / seize / DAO-recovery / per-user-cooldown do NOT EXIST on OCP (removed from ABI or never wired)', () => {
    for (const cap of REMOVED_OR_DEAD) expect(capabilityExists(cap)).toBe(false);
  });

  it('A3 the per-vault custodial setter (setUserWithdrawalCooldown) is a dead interface remnant — not callable', () => {
    expect(capabilityExists('setUserWithdrawalCooldown')).toBe(false);
    expect(reachesUserFunds('setUserWithdrawalCooldown')).toBe(false);
  });

  it('A4 the live capabilities are all protocol-level config / signals — present but still fund-safe', () => {
    for (const cap of LIVE_CAPS) {
      expect(capabilityExists(cap)).toBe(true);
      expect(reachesUserFunds(cap)).toBe(false);
    }
  });

  it('A5 vault_reportRisk is a SIGNAL to PanicGuard, NOT a custody freeze', () => {
    expect(capabilityExists('vaultReportRisk')).toBe(true);   // it exists…
    expect(reportRiskIsCustodial()).toBe(false);              // …but it cannot freeze/seize
    expect(reachesUserFunds('vaultReportRisk')).toBe(false);
  });

  it('A6 there is no capability for which (exists && reachesUserFunds) — no fund-touching surface at all', () => {
    const dangerous = ALL_CAPS.filter((c) => capabilityExists(c) && reachesUserFunds(c));
    expect(dangerous).toEqual([]);
  });
});

describe('OCP · B. Owner gating + two-step ownership', () => {
  it('B1 only the owner can call state-changing functions', () => {
    expect(authorizedToCall('owner')).toBe(true);
    expect(authorizedToCall('pendingOwner')).toBe(false);
    expect(authorizedToCall('attacker')).toBe(false);
  });

  it('B2 ownership transfer requires the new owner to ACCEPT (two-step) — no unilateral seizure of control', () => {
    expect(ownershipTransferEffective(true, false)).toBe(false); // proposed but not accepted
    expect(ownershipTransferEffective(false, true)).toBe(false); // accept without a pending transfer
    expect(ownershipTransferEffective(true, true)).toBe(true);   // both → effective
  });
});

describe('OCP · C. Timelock queue — queued + delay-elapsed + not-expired', () => {
  it('C1 an un-queued action cannot execute', () => {
    expect(authorizeQueuedAction({ queued: false, nowH: 100, executeAfterH: 50, queuedAtH: 0 }))
      .toEqual({ ok: false, reason: 'NOT_QUEUED' });
  });

  it('C2 a queued action before its delay elapses is blocked', () => {
    expect(authorizeQueuedAction({ queued: true, nowH: 10, executeAfterH: 24, queuedAtH: 0 }))
      .toEqual({ ok: false, reason: 'DELAY_PENDING' });
  });

  it('C3 a queued action after delay (and within expiry) executes', () => {
    expect(authorizeQueuedAction({ queued: true, nowH: 30, executeAfterH: 24, queuedAtH: 0 }))
      .toEqual({ ok: true });
  });

  it('C4 a queued action past the 30-day expiry is rejected (stale actions cannot be sprung later)', () => {
    const expiredNow = GOVERNANCE_ACTION_EXPIRY_DAYS * 24 + 1;
    expect(authorizeQueuedAction({ queued: true, nowH: expiredNow, executeAfterH: 24, queuedAtH: 0 }))
      .toEqual({ ok: false, reason: 'EXPIRED' });
  });
});

describe('OCP · D. governanceDelay bounds + anti-rug reduction', () => {
  it('D1 delay must be within [24h, 30d]', () => {
    expect(validGovernanceDelay(MIN_GOVERNANCE_DELAY_H)).toBe(true);
    expect(validGovernanceDelay(MAX_GOVERNANCE_DELAY_DAYS * 24)).toBe(true);
    expect(validGovernanceDelay(MIN_GOVERNANCE_DELAY_H - 1)).toBe(false); // too short
    expect(validGovernanceDelay(MAX_GOVERNANCE_DELAY_DAYS * 24 + 1)).toBe(false); // too long
  });

  it('D2 INCREASING the delay (or keeping it) is always allowed within range', () => {
    expect(authorizeDelayChange({ oldH: 48, newH: 72, cooldownActive: false })).toEqual({ ok: true });
    expect(authorizeDelayChange({ oldH: 48, newH: 48, cooldownActive: false })).toEqual({ ok: true });
  });

  it('D3 a delay reduction during cooldown is blocked (rate-limited)', () => {
    expect(authorizeDelayChange({ oldH: 96, newH: 72, cooldownActive: true }))
      .toEqual({ ok: false, reason: 'COOLDOWN_ACTIVE' });
  });

  it('D4 a reduction of MORE than half is blocked (cannot collapse the timelock in one move)', () => {
    expect(authorizeDelayChange({ oldH: 96, newH: 24, cooldownActive: false }))
      .toEqual({ ok: false, reason: 'REDUCE_TOO_LARGE' }); // 24 < 96/2
  });

  it('D5 a modest reduction (≤ half) outside cooldown is allowed', () => {
    expect(authorizeDelayChange({ oldH: 96, newH: 72, cooldownActive: false })).toEqual({ ok: true });
  });

  it('D6 an attacker cannot set the delay below the floor even via reduction', () => {
    expect(authorizeDelayChange({ oldH: 48, newH: MIN_GOVERNANCE_DELAY_H - 1, cooldownActive: false }))
      .toEqual({ ok: false, reason: 'OUT_OF_RANGE' });
  });
});

describe('OCP · E. Bounded fee-policy delegation (no confiscatory fee)', () => {
  it('E1 a fee policy within [10%, 95%] is accepted', () => {
    expect(feePolicyAccepted(FEE_FLOOR_BPS, FEE_CEIL_BPS)).toBe(true);
    expect(feePolicyAccepted(2000, 5000)).toBe(true);
  });

  it('E2 a sub-floor minimum is rejected', () => {
    expect(feePolicyAccepted(FEE_FLOOR_BPS - 1, 5000)).toBe(false);
  });

  it('E3 an above-ceiling maximum is rejected (cannot set a near-total or 100% fee)', () => {
    expect(feePolicyAccepted(2000, FEE_CEIL_BPS + 1)).toBe(false);
    expect(feePolicyAccepted(2000, 10000)).toBe(false);
  });

  it('E4 an inverted policy (min > max) is rejected', () => {
    expect(feePolicyAccepted(6000, 3000)).toBe(false);
  });
});
