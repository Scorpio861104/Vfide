import { describe, expect, it } from '@jest/globals';
import {
  requiredApprovals, vaultIsRecoverable, authorizeInitiate, castGuardianVote,
  challengeWindowDays, authorizeFinalize, authorizeChallenge,
  authorizeVoluntaryExecute, authorizeEmergencyExecute,
  ACTIVE_VAULT_CHALLENGE_PERIOD_DAYS, CHALLENGE_PERIOD_DAYS,
  type VaultRecoveryConfig, type SuccessionState,
} from '@/lib/audit/recoveryModel';

const CFG = (o: Partial<VaultRecoveryConfig> = {}): VaultRecoveryConfig =>
  ({ guardianCount: 3, trusteeCount: 1, matureGuardians: 3, guardianSetupComplete: true, ...o });

// ════════════════════════════════════════════════════════
// RECOVERY & CONTINUITY — THEFT-RESISTANCE MATRIX
//   A. Threshold   B. Initiation gating   C. Guardian vote   D. Finalize (challenge gate)
//   E. Owner challenge   F. No-guardian = unrecoverable   G. Active-vault window   H. Business continuity
// ════════════════════════════════════════════════════════

describe('Recovery · A. Approval threshold (majority social recovery)', () => {
  it('A1 2-of-3 (the documented default)', () => expect(requiredApprovals(3)).toBe(2));
  it('A2 3-of-5', () => expect(requiredApprovals(5)).toBe(3));
  it('A3 majority for larger sets (7→4)', () => expect(requiredApprovals(7)).toBe(4));
  it('A4 single-guardian needs 1 (single point of failure — see finding)', () => expect(requiredApprovals(1)).toBe(1));
  it('A5 zero guardians needs 0 — but recovery is blocked elsewhere', () => expect(requiredApprovals(0)).toBe(0));
});

describe('Recovery · B. Initiation gating (anti-grief, anti-hijack)', () => {
  it('B1 a trustee can initiate when trustees exist', () => {
    expect(authorizeInitiate({ caller: 'trustee', vaultExists: true, cfg: CFG(), callerIsTrustee: true, callerOnCooldown: false, claimantOwnsVault: false, activeClaimExists: false }).ok).toBe(true);
  });
  it('B2 a non-trustee CANNOT initiate when trustees exist (anti-grief)', () => {
    expect(authorizeInitiate({ caller: 'attacker', vaultExists: true, cfg: CFG({ trusteeCount: 2 }), callerIsTrustee: false, callerOnCooldown: false, claimantOwnsVault: false, activeClaimExists: false }))
      .toEqual({ ok: false, reason: 'NOT_TRUSTEE' });
  });
  it('B3 with no trustees, anyone may initiate (pre-R8 fallback) — but guardian approval still gates progress', () => {
    expect(authorizeInitiate({ caller: 'claimant', vaultExists: true, cfg: CFG({ trusteeCount: 0 }), callerIsTrustee: false, callerOnCooldown: false, claimantOwnsVault: false, activeClaimExists: false }).ok).toBe(true);
  });
  it('B4 an initiator on cooldown is blocked (post-challenge harassment defense)', () => {
    expect(authorizeInitiate({ caller: 'trustee', vaultExists: true, cfg: CFG(), callerIsTrustee: true, callerOnCooldown: true, claimantOwnsVault: false, activeClaimExists: false }).reason).toBe('COOLDOWN_ACTIVE');
  });
  it('B5 a claimant who already owns a vault cannot claim another', () => {
    expect(authorizeInitiate({ caller: 'claimant', vaultExists: true, cfg: CFG({ trusteeCount: 0 }), callerIsTrustee: false, callerOnCooldown: false, claimantOwnsVault: true, activeClaimExists: false }).reason).toBe('CLAIMANT_HAS_VAULT');
  });
  it('B6 a second concurrent claim is blocked', () => {
    expect(authorizeInitiate({ caller: 'trustee', vaultExists: true, cfg: CFG(), callerIsTrustee: true, callerOnCooldown: false, claimantOwnsVault: false, activeClaimExists: true }).reason).toBe('CLAIM_EXISTS');
  });
  it('B7 a claim on a non-vault is rejected', () => {
    expect(authorizeInitiate({ caller: 'trustee', vaultExists: false, cfg: CFG(), callerIsTrustee: true, callerOnCooldown: false, claimantOwnsVault: false, activeClaimExists: false }).reason).toBe('INVALID_VAULT');
  });
});

describe('Recovery · C. Guardian vote (only mature guardians, threshold from snapshot)', () => {
  const base = { status: 'Pending' as const, expired: false, alreadyVoted: false, approve: true, priorApprovals: 0, guardianCountSnapshot: 3 };
  it('C1 a mature guardian vote counts', () => expect(castGuardianVote({ ...base, voterIsGuardian: true, voterIsMature: true })).toMatchObject({ ok: true, approvals: 1 }));
  it('C2 an IMMATURE guardian cannot vote (attacker-added-self defense)', () => {
    expect(castGuardianVote({ ...base, voterIsGuardian: true, voterIsMature: false }).reason).toBe('NOT_MATURE');
  });
  it('C3 a non-guardian cannot vote', () => expect(castGuardianVote({ ...base, voterIsGuardian: false, voterIsMature: false }).reason).toBe('NOT_GUARDIAN'));
  it('C4 double-voting blocked', () => expect(castGuardianVote({ ...base, voterIsGuardian: true, voterIsMature: true, alreadyVoted: true }).reason).toBe('ALREADY_VOTED'));
  it('C5 one approval on a 3-guardian vault does NOT reach threshold', () => {
    expect(castGuardianVote({ ...base, voterIsGuardian: true, voterIsMature: true, priorApprovals: 0, guardianCountSnapshot: 3 }).reachedThreshold).toBe(false);
  });
  it('C6 the second approval reaches the 2-of-3 threshold', () => {
    expect(castGuardianVote({ ...base, voterIsGuardian: true, voterIsMature: true, priorApprovals: 1, guardianCountSnapshot: 3 }).reachedThreshold).toBe(true);
  });
  it('C7 voting on an expired claim is rejected', () => expect(castGuardianVote({ ...base, voterIsGuardian: true, voterIsMature: true, expired: true }).reason).toBe('EXPIRED'));
});

describe('Recovery · D. Finalize — ownership only rotates after the challenge window', () => {
  it('D1 cannot finalize a Pending (un-approved) claim', () => expect(authorizeFinalize({ status: 'Pending', nowDay: 100, challengeEndsDay: 0, expiresDay: 200 }).reason).toBe('NOT_APPROVED'));
  it('D2 cannot finalize DURING the challenge window (the anti-theft gate)', () => {
    expect(authorizeFinalize({ status: 'GuardianApproved', nowDay: 10, challengeEndsDay: 14, expiresDay: 200 }).reason).toBe('CHALLENGE_ACTIVE');
  });
  it('D3 cannot finalize until grace period past the challenge end', () => {
    expect(authorizeFinalize({ status: 'GuardianApproved', nowDay: 14, challengeEndsDay: 14, expiresDay: 200 }).reason).toBe('CHALLENGE_ACTIVE'); // needs +1 grace
  });
  it('D4 CAN finalize once challenge + grace elapsed', () => {
    expect(authorizeFinalize({ status: 'GuardianApproved', nowDay: 16, challengeEndsDay: 14, expiresDay: 200 })).toEqual({ ok: true });
  });
  it('D5 cannot finalize an expired claim', () => expect(authorizeFinalize({ status: 'GuardianApproved', nowDay: 201, challengeEndsDay: 14, expiresDay: 200 }).reason).toBe('EXPIRED'));
});

describe('Recovery · E. Owner challenge (the original wallet/PoL always wins while present)', () => {
  const base = { status: 'GuardianApproved' as const, nowDay: 5, challengeEndsDay: 14 };
  it('E1 the original owner can challenge within the window → Rejected + cooldown', () => {
    expect(authorizeChallenge({ ...base, caller: 'originalOwner', isOriginalOwner: true, isPolWallet: false }))
      .toMatchObject({ ok: true, nextStatus: 'Rejected', initiatorCooldownDays: 30 });
  });
  it('E2 the proof-of-life wallet can ALSO challenge (unified alive-signal)', () => {
    expect(authorizeChallenge({ ...base, caller: 'polWallet', isOriginalOwner: false, isPolWallet: true }).ok).toBe(true);
  });
  it('E3 a stranger/attacker CANNOT challenge (only owner/PoL)', () => {
    expect(authorizeChallenge({ ...base, caller: 'attacker', isOriginalOwner: false, isPolWallet: false }).reason).toBe('NOT_OWNER_OR_POL');
  });
  it('E4 cannot challenge after the window ends', () => {
    expect(authorizeChallenge({ status: 'GuardianApproved', nowDay: 20, challengeEndsDay: 14, caller: 'originalOwner', isOriginalOwner: true, isPolWallet: false }).reason).toBe('WINDOW_ENDED');
  });
  it('E5 cannot challenge an already-executed claim', () => {
    expect(authorizeChallenge({ status: 'Executed', nowDay: 5, challengeEndsDay: 14, caller: 'originalOwner', isOriginalOwner: true, isPolWallet: false }).reason).toBe('NO_ACTIVE_CLAIM');
  });
});

describe('Recovery · F. No-guardian vault is UNRECOVERABLE (ties to Onboarding Finding A)', () => {
  it('F1 a vault with guardians is recoverable', () => expect(vaultIsRecoverable(2)).toBe(true));
  it('F2 a vault with ZERO guardians cannot be recovered (verifier path disabled)', () => expect(vaultIsRecoverable(0)).toBe(false));
  it('F3 implication: skipping guardian setup (Onboarding finding) makes key-loss UNRECOVERABLE', () => {
    // a user who skipped guardians during onboarding has guardianCount 0 → no recovery path exists
    expect(vaultIsRecoverable(0)).toBe(false);
  });
});

describe('Recovery · G. Active-vault / incomplete-setup gets the EXTENDED challenge window', () => {
  it('G1 an active vault gets 30 days (max owner reaction time)', () => expect(challengeWindowDays(true, true)).toBe(ACTIVE_VAULT_CHALLENGE_PERIOD_DAYS));
  it('G2 a guardian-setup-incomplete vault ALSO gets 30 days', () => expect(challengeWindowDays(false, false)).toBe(ACTIVE_VAULT_CHALLENGE_PERIOD_DAYS));
  it('G3 a quiet, fully-set-up vault uses the base 14-day window', () => expect(challengeWindowDays(false, true)).toBe(CHALLENGE_PERIOD_DAYS));
});

describe('Recovery · H. Merchant business continuity (succession)', () => {
  const S = (successor: string | null): SuccessionState => ({ successorRecorded: successor });
  it('H1 voluntary execute requires the RECORDED successor', () => {
    expect(authorizeVoluntaryExecute(S('0xSucc'), '0xAttacker', true).reason).toBe('NOT_RECORDED_SUCCESSOR');
  });
  it('H2 voluntary execute requires the successor to have ACCEPTED', () => {
    expect(authorizeVoluntaryExecute(S('0xSucc'), '0xSucc', false).reason).toBe('NOT_ACCEPTED');
  });
  it('H3 voluntary execute succeeds for an accepted recorded successor', () => {
    expect(authorizeVoluntaryExecute(S('0xSucc'), '0xsucc', true).ok).toBe(true); // case-insensitive
  });
  it('H4 no successor configured → cannot transfer', () => {
    expect(authorizeVoluntaryExecute(S(null), '0xAnyone', true).reason).toBe('NO_SUCCESSOR');
  });
  it('H5 emergency execute requires the 7-day veto window to elapse', () => {
    expect(authorizeEmergencyExecute(S('0xSucc'), true, false).reason).toBe('VETO_WINDOW_ACTIVE');
  });
  it('H6 emergency execute requires a recorded requester', () => {
    expect(authorizeEmergencyExecute(S('0xSucc'), false, true).reason).toBe('NOT_RECORDED_SUCCESSOR');
  });
  it('H7 emergency execute succeeds for a recorded requester after the veto window', () => {
    expect(authorizeEmergencyExecute(S('0xSucc'), true, true).ok).toBe(true);
  });
});
