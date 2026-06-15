/**
 * DAOTimelock — timelock execution-guarantee MODEL (audit artifact).
 *
 * HONESTY NOTE (as in the other on-chain audits): models the timelock's AUTHORIZATION / timing logic in pure TS
 * so the invariants run as scenarios. NOT the deployed bytecode (no solc here); the repo's
 * DAOTimelockExecutionFlow hardhat suite is the on-chain evidence for a compiler-equipped environment.
 *
 * DAOTimelock backs DAO governance: privileged actions are queued, must wait `delay`, then execute. Its
 * `execute` makes a low-level `target.call` — so, as with AdminMultiSig, the audit confirms the call is bounded
 * by timing + state, and that the delay itself cannot be collapsed to bypass the lock:
 *
 *   • CORE GUARANTEE: a queued op executes only if it was queued, isn't done, the delay elapsed
 *     (block.timestamp >= eta), and it hasn't expired (eta + 7d). Double-execution is impossible (op.done).
 *   • RISK LENGTHENS, NEVER SHORTENS: when PanicGuard signals global risk, execution needs an EXTRA 6h
 *     (eta + 6h). The risk check fails OPEN (a PanicGuard outage can't brick execute).
 *   • DELAY FLOOR — NO BYPASS: setDelay (onlyTimelockSelf) is bounded [24h, 30d]. emergencyReduceDelay
 *     (onlyAdmin) can only REDUCE, never below ABSOLUTE_MIN_DELAY (24h), at most 50% per call, with a 24h
 *     cooldown, and is one-shot until a 30-day reset. The timelock can never be zeroed.
 *   • SELF-GOVERNED PARAMS: admin / delay / secondaryExecutor / ledger / panicGuard change ONLY through the
 *     timelock itself (onlyTimelockSelf) — i.e. via a queued+delayed call. The one exception is
 *     emergencyReduceDelay, which is bounded as above.
 *   • SECONDARY EXECUTOR ADDS DELAY: the backup executor must wait eta + 3 days — it is a liveness backstop, it
 *     can never rush execution.
 *   • REQUEUE RESTARTS THE CLOCK: requeueExpired works only on a genuinely expired op and gives it a FRESH full
 *     delay (eta = now + delay) — an expired action cannot be instantly re-sprung.
 *   • PERMISSIONLESS CARVE-OUT IS TINY: a non-admin may execute ONLY a queued self-`setAdmin` call (deadlock
 *     recovery if the bootstrap admin key is lost) — nothing else.
 *   • NON-CUSTODIAL: holds no user funds; its reach is whatever it is admin of, which the vault/OCP architecture
 *     bounds away from freeze/seize.
 */

export const DELAY_DEFAULT_H = 48;
export const MIN_DELAY_H = 12;            // setDelay lower bound (but ABSOLUTE_MIN_DELAY also applies)
export const ABSOLUTE_MIN_DELAY_H = 24;   // hard floor — delay can never be below this
export const MAX_DELAY_H = 30 * 24;       // 30 days
export const EXPIRY_WINDOW_H = 7 * 24;    // 7 days after ETA
export const RISK_EXTRA_DELAY_H = 6;
export const SECONDARY_EXECUTOR_DELAY_H = 3 * 24; // 3 days

export type Caller = 'admin' | 'timelockSelf' | 'secondaryExecutor' | 'other';

// ─────────────────────────── Queue gating

/** Only the admin may queue a transaction. */
export function authorizeQueue(caller: Caller): boolean {
  return caller === 'admin';
}

// ─────────────────────────── Execute — the core timelock guarantee

export type ExecResult = { ok: true } | { ok: false; reason:
  | 'NOT_QUEUED' | 'ALREADY_DONE' | 'EXPIRED' | 'TOO_EARLY' | 'RISK_DELAY' | 'NOT_AUTHORIZED' };

/** Standard execute path. `isSelfAdminRotation` enables the tiny permissionless carve-out for non-admin callers. */
export function authorizeExecute(args: {
  caller: Caller;
  isSelfAdminRotation: boolean; // target == this && selector == setAdmin
  queued: boolean; done: boolean;
  nowH: number; etaH: number;
  globalRisk: boolean;
}): ExecResult {
  if (!args.queued) return { ok: false, reason: 'NOT_QUEUED' };
  if (args.done) return { ok: false, reason: 'ALREADY_DONE' };
  // Authorization: admin always; otherwise ONLY a queued self-setAdmin rotation (deadlock recovery).
  if (args.caller !== 'admin' && !args.isSelfAdminRotation) return { ok: false, reason: 'NOT_AUTHORIZED' };
  if (args.nowH > args.etaH + EXPIRY_WINDOW_H) return { ok: false, reason: 'EXPIRED' };
  if (args.globalRisk) {
    if (args.nowH < args.etaH + RISK_EXTRA_DELAY_H) return { ok: false, reason: 'RISK_DELAY' };
  } else if (args.nowH < args.etaH) {
    return { ok: false, reason: 'TOO_EARLY' };
  }
  return { ok: true };
}

/** Secondary (backup) executor: same guarantees PLUS an extra 3-day wait. Cannot rush. */
export function authorizeExecuteBySecondary(args: {
  caller: Caller; secondarySet: boolean;
  queued: boolean; done: boolean; nowH: number; etaH: number;
}): ExecResult {
  if (!args.secondarySet || args.caller !== 'secondaryExecutor') return { ok: false, reason: 'NOT_AUTHORIZED' };
  if (!args.queued) return { ok: false, reason: 'NOT_QUEUED' };
  if (args.done) return { ok: false, reason: 'ALREADY_DONE' };
  if (args.nowH > args.etaH + EXPIRY_WINDOW_H) return { ok: false, reason: 'EXPIRED' };
  if (args.nowH < args.etaH + SECONDARY_EXECUTOR_DELAY_H) return { ok: false, reason: 'TOO_EARLY' };
  return { ok: true };
}

// ─────────────────────────── Delay floor — no bypass

/** setDelay (onlyTimelockSelf): bounded; the effective floor is ABSOLUTE_MIN_DELAY (24h), ceiling 30d. */
export function validSetDelay(hours: number): boolean {
  return hours >= MIN_DELAY_H && hours >= ABSOLUTE_MIN_DELAY_H && hours <= MAX_DELAY_H;
}

export type EmergencyReduceResult = { ok: true } | { ok: false; reason:
  | 'BELOW_ABSOLUTE_MIN' | 'NOT_A_REDUCTION' | 'OVER_50_PERCENT' | 'COOLDOWN' | 'ALREADY_USED' };

/**
 * emergencyReduceDelay (onlyAdmin): the only admin-direct delay change. Can only reduce, never below 24h, max
 * 50% per call, 24h cooldown, one-shot until the 30-day reset. Cannot collapse the timelock.
 */
export function authorizeEmergencyReduce(args: {
  currentDelayH: number; newDelayH: number;
  alreadyUsed: boolean; resetElapsed: boolean; cooldownElapsed: boolean;
}): EmergencyReduceResult {
  const used = args.alreadyUsed && !args.resetElapsed;
  if (used) return { ok: false, reason: 'ALREADY_USED' };
  if (args.newDelayH < ABSOLUTE_MIN_DELAY_H) return { ok: false, reason: 'BELOW_ABSOLUTE_MIN' };
  if (args.newDelayH >= args.currentDelayH) return { ok: false, reason: 'NOT_A_REDUCTION' };
  if (args.newDelayH < args.currentDelayH / 2) return { ok: false, reason: 'OVER_50_PERCENT' };
  if (!args.cooldownElapsed) return { ok: false, reason: 'COOLDOWN' };
  return { ok: true };
}

// ─────────────────────────── Self-governed params + requeue

/** admin / delay / secondaryExecutor / ledger / panicGuard setters require the timelock-self context. */
export function authorizeParamSetter(caller: Caller): boolean {
  return caller === 'timelockSelf';
}

/** cancel / cleanupExpired: admin OR the timelock itself (post-rotation DAO-as-admin via a queued call). */
export function authorizeCancel(caller: Caller): boolean {
  return caller === 'admin' || caller === 'timelockSelf';
}

/** requeueExpired: admin-only, only on a genuinely expired op; the new op gets a FRESH full delay. */
export function authorizeRequeue(args: { caller: Caller; queued: boolean; done: boolean; expired: boolean }): boolean {
  return args.caller === 'admin' && args.queued && !args.done && args.expired;
}

/** The re-queued ETA restarts the full delay from now (no instant re-spring of an expired action). */
export function requeuedEtaH(nowH: number, delayH: number): number {
  return nowH + delayH;
}

export function holdsUserFunds(): boolean { return false; }
export function canFreezeOrSeizeUserFunds(): boolean { return false; }
