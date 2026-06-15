/**
 * Proof-of-Life Continuity — executable logic model (ACTIVE path audit).
 *
 * Mirrors the authority + state-machine logic of `CardBoundVaultInheritanceManager.sol` (the DEPLOYED continuity
 * system per VFIDE_CONTINUITY_ARCHITECTURE.md — NOT the legacy UserVaultLegacy next-of-kin flow). It exists so the
 * adversarial + edge matrix can execute against real logic rather than prose. It is NOT the compiled contract; a
 * green hardhat run against the bytecode remains the stage-2 confirmation.
 *
 * Modeled invariants (the security properties the matrix asserts):
 *  • Only a guardian initiates a claim; the DAO guardian can veto but never initiate.
 *  • A claim cannot start while a recovery rotation is pending (recovery = evidence the owner lives).
 *  • The owner-admin OR the snapshot proof-of-life wallet can OVERRIDE (cancel) a claim through the ENTIRE claim
 *    window until distribution is finalized — defeating even full guardian collusion while the owner is alive.
 *  • Guardians can collectively VETO during the veto period (threshold-gated, one veto per guardian per claim).
 *  • PoL wallet + owner-admin + veto threshold are SNAPSHOTTED at initiation; changing PoL mid-claim cannot grant
 *    an attacker override authority over the in-flight claim.
 *  • Recovery suspends the claim and FREEZES the timers; on resume the frozen duration is added back, so the
 *    owner's clock never runs during recovery.
 */

export const STATE_NORMAL = 0;
export const STATE_VETO = 1;
export const STATE_CLAIM = 2;
export const STATE_MEMORIAL = 3;

export const VETO_PERIOD = 30 * 24 * 60 * 60; // 30 days
export const CLAIM_WINDOW = 90 * 24 * 60 * 60; // 90 days
export const CLAIM_FINALIZE_FLOOR = 14 * 24 * 60 * 60; // 14 days

export interface PoLState {
  state: number;
  windowEnd: number;
  admin: string; // current owner-admin wallet
  proofOfLifeWallet: string; // current PoL wallet (address(0)-equivalent = '')
  guardians: Set<string>;
  daoGuardian: string; // '' = none
  guardianThreshold: number;
  heirCount: number;
  pendingRecovery: boolean;
  recoverySuspendedAt: number; // 0 = not suspended
  vaultPaused: boolean;
  // per-claim snapshots
  snapshotAdmin: string;
  snapshotPoL: string;
  snapshotThreshold: number;
  vetoCount: number;
  vetoedBy: Set<string>;
  distributionFinalized: boolean;
  claimNonce: number;
}

export function freshState(overrides: Partial<PoLState> = {}): PoLState {
  return {
    state: STATE_NORMAL,
    windowEnd: 0,
    admin: 'OWNER',
    proofOfLifeWallet: '',
    guardians: new Set(['G1', 'G2', 'G3']),
    daoGuardian: '',
    guardianThreshold: 2,
    heirCount: 2,
    pendingRecovery: false,
    recoverySuspendedAt: 0,
    vaultPaused: false,
    snapshotAdmin: '',
    snapshotPoL: '',
    snapshotThreshold: 0,
    vetoCount: 0,
    vetoedBy: new Set(),
    distributionFinalized: false,
    claimNonce: 0,
    ...overrides,
  };
}

export type Result = { ok: true } | { ok: false; reason: string };
const OK: Result = { ok: true };
const ERR = (reason: string): Result => ({ ok: false, reason });

const isGuardian = (s: PoLState, actor: string) => s.guardians.has(actor);

/** Mirrors _rolloverToClaimWindowIfNeeded: VETO→CLAIM when window elapses, BUT NOT while suspended. */
export function rollover(s: PoLState, now: number): void {
  if (s.state !== STATE_VETO) return;
  if (s.recoverySuspendedAt !== 0) return; // timer-freeze: do not advance during recovery
  if (now < s.windowEnd) return;
  s.state = STATE_CLAIM;
  s.windowEnd = now + CLAIM_WINDOW;
}

/** setProofOfLifeWallet: admin-only direct setter (no timelock — admin already has full control). */
export function setProofOfLifeWallet(s: PoLState, actor: string, polWallet: string): Result {
  if (actor !== s.admin) return ERR('not-admin');
  s.proofOfLifeWallet = polWallet;
  return OK;
}

/** initiateInheritanceClaim: guardian-only, not DAO-guardian, NORMAL state, heirs exist, no pending recovery. */
export function initiateClaim(s: PoLState, actor: string, now: number): Result {
  rollover(s, now);
  if (s.vaultPaused) return ERR('vault-paused');
  if (s.state !== STATE_NORMAL) return ERR('wrong-state');
  if (s.heirCount === 0) return ERR('no-heirs');
  if (s.pendingRecovery) return ERR('recovery-in-progress');
  if (!isGuardian(s, actor)) return ERR('not-guardian');
  if (s.daoGuardian !== '' && actor === s.daoGuardian) return ERR('dao-cannot-initiate');

  s.claimNonce += 1;
  s.state = STATE_VETO;
  s.windowEnd = now + VETO_PERIOD;
  // snapshots frozen at initiation
  s.snapshotAdmin = s.admin;
  s.snapshotPoL = s.proofOfLifeWallet;
  s.snapshotThreshold = s.guardianThreshold;
  s.vetoCount = 0;
  s.vetoedBy = new Set();
  s.distributionFinalized = false;
  return OK;
}

/** vetoInheritanceClaim: guardian-only, VETO state, one veto per guardian per claim, threshold cancels. */
export function veto(s: PoLState, actor: string, now: number): Result {
  rollover(s, now);
  if (s.state !== STATE_VETO) return ERR('wrong-state');
  if (!isGuardian(s, actor)) return ERR('not-guardian');
  if (s.vetoedBy.has(actor)) return ERR('already-vetoed');
  s.vetoedBy.add(actor);
  s.vetoCount += 1;
  if (s.vetoCount >= s.snapshotThreshold) cancelClaim(s);
  return OK;
}

/**
 * ownerOverrideClaim: owner-admin OR snapshot PoL wallet cancels through VETO and CLAIM (until finalized).
 * Defensive: an UNSET snapshot PoL wallet ('') must never match an empty/zero actor.
 */
export function ownerOverride(s: PoLState, actor: string, now: number): Result {
  rollover(s, now);
  const inVeto = s.state === STATE_VETO;
  const inReclaimableClaim = s.state === STATE_CLAIM && !s.distributionFinalized;
  if (!inVeto && !inReclaimableClaim) return ERR('override-expired');
  const matchesAdmin = actor !== '' && actor === s.snapshotAdmin;
  const matchesPoL = actor !== '' && s.snapshotPoL !== '' && actor === s.snapshotPoL;
  if (!matchesAdmin && !matchesPoL) return ERR('not-pol-or-owner');
  cancelClaim(s);
  return OK;
}

/** pauseTimersForRecovery: idempotent (first freeze wins); only while a claim is active. */
export function pauseTimersForRecovery(s: PoLState, now: number): void {
  if (s.state === STATE_NORMAL) return;
  if (s.recoverySuspendedAt !== 0) return;
  s.recoverySuspendedAt = now;
}

/** resumeTimersAfterRecovery: add frozen duration back onto the active window, then unfreeze. */
export function resumeTimersAfterRecovery(s: PoLState, now: number): void {
  if (s.recoverySuspendedAt === 0) return;
  const elapsed = now - s.recoverySuspendedAt;
  if (s.state !== STATE_NORMAL && s.windowEnd !== 0) {
    s.windowEnd += elapsed;
  }
  s.recoverySuspendedAt = 0;
}

/** Recovery SUCCEEDS → the owner is alive → cancel any active claim outright. */
export function recoverySuccessCancel(s: PoLState): void {
  s.recoverySuspendedAt = 0;
  cancelClaim(s);
}

/** finalizeInheritanceDistribution: CLAIM state, not during recovery, floor enforced, sets finalized. */
export function finalize(s: PoLState, now: number, allHeirsRevealed: boolean): Result {
  rollover(s, now);
  if (s.pendingRecovery) return ERR('recovery-in-progress');
  if (s.state !== STATE_CLAIM) return ERR('wrong-state');
  if (s.distributionFinalized) return ERR('already-finalized');
  // claim-window floor: cannot finalize before the floor even if all heirs revealed early
  const claimWindowStart = s.windowEnd - CLAIM_WINDOW;
  const floorReached = now >= claimWindowStart + CLAIM_FINALIZE_FLOOR;
  const windowElapsed = now >= s.windowEnd;
  if (!windowElapsed && !(allHeirsRevealed && floorReached)) return ERR('claim-floor');
  s.distributionFinalized = true;
  return OK;
}

function cancelClaim(s: PoLState): void {
  s.state = STATE_NORMAL;
  s.windowEnd = 0;
  s.vetoCount = 0;
  s.vetoedBy = new Set();
  s.snapshotAdmin = '';
  s.snapshotPoL = '';
  s.snapshotThreshold = 0;
  s.distributionFinalized = false;
}
