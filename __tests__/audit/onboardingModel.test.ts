import { describe, expect, it } from '@jest/globals';
import {
  nextChapter, chapterResolved, wizardComplete, vaultIsProtected, safeCompletionGate,
  pathSteps, progressPercent, isOnboarding,
  emptyQuestState, markStepSelfAsserted, markStepVerified, questComplete,
  CHAPTER_ORDER, REQUIRED_CHAPTERS,
  type WizardState, type VaultProtectionState, type ProgressState,
} from '@/lib/audit/onboardingModel';

const W = (completed: string[] = [], skipped: string[] = []): WizardState =>
  ({ completedChapters: completed as never, skippedChapters: skipped as never });
const V = (o: Partial<VaultProtectionState> = {}): VaultProtectionState =>
  ({ vaultCreated: true, guardiansAdded: 0, recoveryActivated: false, ...o });
const P = (o: Partial<ProgressState> = {}): ProgressState =>
  ({ path: 'buyer', accountCreated: false, firstPurchase: false, storeCreated: false, firstProductAdded: false, storeLinkShared: false, dismissed: false, ...o });

// ════════════════════════════════════════════════════════
// ONBOARDING SCENARIO MATRIX
//   A. Wizard progression   B. Required-chapter gating   C. SAFETY GAP (finding A)
//   D. Stronger gate (the fix)   E. Buyer/seller progress   F. Quest anti-gaming (finding B)
//   G. Grandmother (comprehension/safety reachability)
// ════════════════════════════════════════════════════════

describe('Onboarding · A. Wizard chapter progression', () => {
  it('A1 starts at welcome', () => expect(nextChapter(W())).toBe('welcome'));
  it('A2 advances past completed chapters', () => expect(nextChapter(W(['welcome', 'createVault']))).toBe('spendLimits'));
  it('A3 advances past skipped chapters', () => expect(nextChapter(W(['welcome'], ['createVault', 'spendLimits']))).toBe('guardians'));
  it('A4 returns null when all chapters resolved', () => expect(nextChapter(W([...CHAPTER_ORDER]))).toBeNull());
  it('A5 chapter order has guardians BEFORE recovery (finalizeGuardians)', () => {
    expect(CHAPTER_ORDER.indexOf('guardians')).toBeLessThan(CHAPTER_ORDER.indexOf('finalizeGuardians'));
  });
});

describe('Onboarding · B. Required-chapter gating', () => {
  it('B1 createVault is the only required chapter (as built)', () => expect(REQUIRED_CHAPTERS).toEqual(['createVault']));
  it('B2 a required chapter CANNOT be satisfied by skipping', () => expect(chapterResolved(W([], ['createVault']), 'createVault')).toBe(false));
  it('B3 a non-required chapter IS satisfied by skipping', () => expect(chapterResolved(W([], ['guardians']), 'guardians')).toBe(true));
  it('B4 wizard incomplete while createVault unresolved', () => expect(wizardComplete(W(['welcome'], ['spendLimits', 'guardians', 'finalizeGuardians', 'merchantApproval', 'proofScore', 'done']))).toBe(false));
});

describe('Onboarding · C. THE SAFETY GAP (finding A — demonstrable)', () => {
  it('C1 a user can COMPLETE the wizard having skipped guardians AND recovery', () => {
    const s = W(['welcome', 'createVault'], ['spendLimits', 'guardians', 'finalizeGuardians', 'merchantApproval', 'proofScore', 'done']);
    expect(wizardComplete(s)).toBe(true); // wizard says "done"
  });
  it('C2 ...but that vault is NOT protected (no guardians, no recovery)', () => {
    expect(vaultIsProtected(V({ vaultCreated: true, guardiansAdded: 0, recoveryActivated: false }))).toBe(false);
  });
  it('C3 a vault is protected only with guardians AND recovery activated', () => {
    expect(vaultIsProtected(V({ guardiansAdded: 2, recoveryActivated: true }))).toBe(true);
  });
  it('C4 guardians without recovery activation is still unprotected', () => {
    expect(vaultIsProtected(V({ guardiansAdded: 2, recoveryActivated: false }))).toBe(false);
  });
  it('C5 recovery "activated" but zero guardians is incoherent → unprotected', () => {
    expect(vaultIsProtected(V({ guardiansAdded: 0, recoveryActivated: true }))).toBe(false);
  });
});

describe('Onboarding · D. The recommended stronger completion gate (the fix)', () => {
  const doneWizard = W(['welcome', 'createVault'], ['spendLimits', 'guardians', 'finalizeGuardians', 'merchantApproval', 'proofScore', 'done']);
  it('D1 complete + protected → PROTECTED', () => {
    expect(safeCompletionGate(W([...CHAPTER_ORDER]), V({ guardiansAdded: 2, recoveryActivated: true }), false))
      .toEqual({ complete: true, protected: true, reason: 'PROTECTED' });
  });
  it('D2 complete + unprotected + no ack → flagged COMPLETE_BUT_UNPROTECTED (the gap)', () => {
    expect(safeCompletionGate(doneWizard, V(), false))
      .toEqual({ complete: true, protected: false, reason: 'COMPLETE_BUT_UNPROTECTED' });
  });
  it('D3 complete + unprotected + explicit informed deferral → honest DEFERRED_WITH_ACK', () => {
    expect(safeCompletionGate(doneWizard, V(), true))
      .toEqual({ complete: true, protected: false, reason: 'DEFERRED_WITH_ACK' });
  });
  it('D4 incomplete wizard is never "complete"', () => {
    expect(safeCompletionGate(W(['welcome']), V(), true).complete).toBe(false);
  });
});

describe('Onboarding · E. Buyer/seller progress trackers', () => {
  it('E1 buyer has 3 steps, seller has 4', () => { expect(pathSteps('buyer')).toHaveLength(3); expect(pathSteps('seller')).toHaveLength(4); });
  it('E2 undecided path has no steps and is not onboarding', () => { expect(pathSteps('undecided')).toEqual([]); expect(isOnboarding(P({ path: 'undecided' }))).toBe(false); });
  it('E3 progress reflects completed steps', () => expect(progressPercent(P({ accountCreated: true }))).toBe(33));
  it('E4 fully complete buyer = 100%, not onboarding', () => {
    const s = P({ accountCreated: true, firstPurchase: true });
    expect(progressPercent(s)).toBe(100);
    expect(isOnboarding(s)).toBe(false);
  });
  it('E5 dismissed → not onboarding regardless of progress', () => expect(isOnboarding(P({ dismissed: true }))).toBe(false));
  it('E6 seller progress increments per step', () => {
    expect(progressPercent(P({ path: 'seller', accountCreated: true, storeCreated: true }))).toBe(50);
  });
});

describe('Onboarding · F. Quest anti-gaming (finding B — demonstrable)', () => {
  it('F1 AS BUILT: a step is marked complete on self-assertion (no proof)', () => {
    const s = markStepSelfAsserted(emptyQuestState(), 'firstTransaction');
    expect(s.firstTransaction).toBe(true); // user never had to actually transact
  });
  it('F2 AS BUILT: all steps self-asserted → quest "complete" + reward, unverified', () => {
    let s = emptyQuestState();
    for (const step of ['connectWallet','completeProfile','firstTransaction','addFriend','joinGroup','voteProposal','earnBadge','depositVault','giveEndorsement','completeQuest'] as const) {
      s = markStepSelfAsserted(s, step);
    }
    expect(questComplete(s)).toBe(true); // farmable today
  });
  it('F3 FIX: verified completion ignores an unproven claim', () => {
    const { state, changed } = markStepVerified(emptyQuestState(), 'firstTransaction', false);
    expect(changed).toBe(false);
    expect(state.firstTransaction).toBe(false);
  });
  it('F4 FIX: verified completion accepts a proven action', () => {
    const { state, changed } = markStepVerified(emptyQuestState(), 'voteProposal', true);
    expect(changed).toBe(true);
    expect(state.voteProposal).toBe(true);
  });
  it('F5 quest incomplete until every step set', () => {
    let s = emptyQuestState();
    s = markStepSelfAsserted(s, 'connectWallet');
    expect(questComplete(s)).toBe(false);
  });
});

describe('Onboarding · G. Grandmother — can a non-technical user reach a SAFE setup?', () => {
  it('G1 the safe path exists: complete vault + guardians + recovery → protected', () => {
    expect(safeCompletionGate(W([...CHAPTER_ORDER]), V({ guardiansAdded: 1, recoveryActivated: true }), false).protected).toBe(true);
  });
  it('G2 the unsafe path is detectable (so the UI can warn rather than imply "all set")', () => {
    const g = safeCompletionGate(W(['welcome','createVault'], ['spendLimits','guardians','finalizeGuardians','merchantApproval','proofScore','done']), V(), false);
    expect(g.reason).toBe('COMPLETE_BUT_UNPROTECTED'); // a UI can key a warning off this
  });
  it('G3 one guardian is enough to begin protection (low barrier for the vulnerable user)', () => {
    expect(vaultIsProtected(V({ guardiansAdded: 1, recoveryActivated: true }))).toBe(true);
  });
});
