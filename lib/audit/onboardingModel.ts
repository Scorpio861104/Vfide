/**
 * Onboarding — gating & completion MODEL (audit artifact, Core-Systems certification).
 *
 * Extracts the decision logic of VFIDE's onboarding into pure functions so it can be exercised as executing
 * scenarios. It models three real things found in the codebase:
 *   1. The VaultSetupWizard chapter flow (components/wizard/useWizardState.tsx) — the SAFETY setup
 *      (vault → spend limits → guardians → recovery), where today only `createVault` is required and
 *      guardians/recovery are skippable.
 *   2. The buyer/seller progress trackers (components/onboarding/OnboardingContext.tsx).
 *   3. The server-side quest completion gate (app/api/quests/onboarding/route.ts), whose steps are
 *      self-asserted (no verification against real on-chain/DB state).
 *
 * HONESTY: this models the LOGIC as read from source; it is not the mounted React/SQL. It exists to (a) lock
 * the real behaviors with tests and (b) make the audit's two findings precise and demonstrable:
 *   • FINDING A (safety) — RESOLVED in the wizard (components/wizard): completion used to NOT require
 *     guardians/recovery, so a funded-but-unprotected vault was reachable and DoneChapter claimed "you are
 *     protected" regardless. The fix imposes `safeCompletionGate`'s logic — recovery chapters can be skipped
 *     only after an explicit permanent-loss-risk acknowledgment, and the recap reports protection honestly.
 *     `wizardComplete`, `vaultIsProtected`, and `safeCompletionGate` model that bar.
 *   • FINDING B (anti-gaming) — RESOLVED in the route (app/api/quests/onboarding): self-asserted quest steps
 *     were farmable for the 500-XP completion reward. The fix gates each step on server-side evidence
 *     (lib/quests/onboardingVerification): DB-backed steps are checked against real activity, on-chain-truth
 *     steps (vault deposit, governance vote) are not user-self-assertable. `markStepSelfAsserted` vs
 *     `markStepVerified` below contrast the old behavior with the verified-completion design now enforced.
 */

// ─────────────────────────── Wizard chapter flow (the safety setup)

export type ChapterId =
  | 'welcome' | 'createVault' | 'spendLimits' | 'guardians' | 'finalizeGuardians'
  | 'merchantApproval' | 'proofScore' | 'done';

export const CHAPTER_ORDER: ChapterId[] = [
  'welcome', 'createVault', 'spendLimits', 'guardians', 'finalizeGuardians', 'merchantApproval', 'proofScore', 'done',
];

/** As built today: only vault creation is required; everything else (incl. guardians/recovery) is skippable. */
export const REQUIRED_CHAPTERS: ChapterId[] = ['createVault'];

export interface WizardState {
  completedChapters: ChapterId[];
  skippedChapters: ChapterId[];
}

/** The next chapter to show = first in order that is neither completed nor skipped. */
export function nextChapter(s: WizardState): ChapterId | null {
  for (const c of CHAPTER_ORDER) {
    if (!s.completedChapters.includes(c) && !s.skippedChapters.includes(c)) return c;
  }
  return null;
}

/** A chapter is "resolved" if completed OR (skipped AND not required). Required chapters must be completed. */
export function chapterResolved(s: WizardState, c: ChapterId): boolean {
  if (s.completedChapters.includes(c)) return true;
  if (REQUIRED_CHAPTERS.includes(c)) return false; // a required chapter cannot be satisfied by skipping
  return s.skippedChapters.includes(c);
}

/** The wizard is "complete" (as built) once every required chapter is completed and the rest are resolved. */
export function wizardComplete(s: WizardState): boolean {
  return CHAPTER_ORDER.every((c) => chapterResolved(s, c));
}

// ─────────────────────────── Vault protection (the safety property)

export interface VaultProtectionState {
  vaultCreated: boolean;
  guardiansAdded: number;       // count of guardians configured
  recoveryActivated: boolean;   // finalizeGuardians done
}

/**
 * A vault is PROTECTED only when it has guardians AND recovery is activated. This mirrors the on-chain
 * GuardianSetupIncomplete warning: a vault with no guardians is operational but unprotected.
 */
export function vaultIsProtected(v: VaultProtectionState): boolean {
  return v.vaultCreated && v.guardiansAdded >= 1 && v.recoveryActivated;
}

/**
 * RECOMMENDED stronger completion bar (the fix this audit proposes): onboarding should not report a user as
 * fully "set up / protected from day one" unless the vault is actually protected — or the user has made an
 * explicit, informed choice to defer (acknowledged), so the promise on the landing page is honest.
 */
export function safeCompletionGate(s: WizardState, v: VaultProtectionState, deferredWithAck: boolean): { complete: boolean; protected: boolean; reason: string } {
  if (!wizardComplete(s)) return { complete: false, protected: false, reason: 'WIZARD_INCOMPLETE' };
  if (vaultIsProtected(v)) return { complete: true, protected: true, reason: 'PROTECTED' };
  if (deferredWithAck) return { complete: true, protected: false, reason: 'DEFERRED_WITH_ACK' };
  // wizard "complete" but vault unprotected and no explicit deferral → the gap the audit flags
  return { complete: true, protected: false, reason: 'COMPLETE_BUT_UNPROTECTED' };
}

// ─────────────────────────── Buyer/seller progress trackers

export type UserPath = 'undecided' | 'buyer' | 'seller';
export interface ProgressState {
  path: UserPath;
  accountCreated: boolean;     // also implies vaultCreated (auto)
  firstPurchase: boolean;
  storeCreated: boolean;
  firstProductAdded: boolean;
  storeLinkShared: boolean;
  dismissed: boolean;
}

export function pathSteps(p: UserPath): string[] {
  if (p === 'buyer') return ['account', 'browse', 'purchase'];
  if (p === 'seller') return ['account', 'store', 'product', 'share'];
  return [];
}

export function progressPercent(s: ProgressState): number {
  const steps = pathSteps(s.path);
  if (steps.length === 0) return 0;
  const done = steps.filter((id) => {
    switch (id) {
      case 'account': return s.accountCreated;
      case 'browse': case 'purchase': return s.firstPurchase;
      case 'store': return s.storeCreated;
      case 'product': return s.firstProductAdded;
      case 'share': return s.storeLinkShared;
      default: return false;
    }
  }).length;
  return Math.round((done / steps.length) * 100);
}

export function isOnboarding(s: ProgressState): boolean {
  if (s.dismissed || s.path === 'undecided') return false;
  return progressPercent(s) < 100;
}

// ─────────────────────────── Quest completion (anti-gaming)

export const QUEST_STEPS = [
  'connectWallet', 'completeProfile', 'firstTransaction', 'addFriend', 'joinGroup',
  'voteProposal', 'earnBadge', 'depositVault', 'giveEndorsement', 'completeQuest',
] as const;
export type QuestStep = typeof QUEST_STEPS[number];
export type QuestState = Record<QuestStep, boolean>;

export function emptyQuestState(): QuestState {
  return Object.fromEntries(QUEST_STEPS.map((s) => [s, false])) as QuestState;
}

/** As built: a step is marked true on the user's say-so (authorization-checked, but NOT authenticity-checked). */
export function markStepSelfAsserted(state: QuestState, step: QuestStep): QuestState {
  return { ...state, [step]: true };
}

/** RECOMMENDED: a step only completes if the underlying action is verified against real state. */
export function markStepVerified(state: QuestState, step: QuestStep, actuallyDone: boolean): { state: QuestState; changed: boolean } {
  if (!actuallyDone) return { state, changed: false };
  return { state: { ...state, [step]: true }, changed: true };
}

export function questComplete(state: QuestState): boolean {
  return QUEST_STEPS.every((s) => state[s]);
}
