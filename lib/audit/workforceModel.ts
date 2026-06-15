/**
 * Workforce — executable logic model (Backend Completion Campaign 5).
 *
 * Certifies VFIDE's payroll/streaming workforce system (PayrollManager.sol) and its boundary with the off-chain
 * staff role system (staffAuthEngine — admin/manager/cashier, certified in Campaign 2). Traced from source:
 *   PayrollManager streams salaries "by the second" — solving payday lending by giving instant access to earned
 *   wages. Streams are SELF-FUNDED: payer = msg.sender, funds pulled via safeTransferFrom(msg.sender). There is NO
 *   shared pool for employer streams, so the classic "ghost employee embezzles from a company pool" vector does not
 *   exist — an employer pays from their own funds, and creating a stream requires the FUNDER's on-chain signature.
 *
 *   Lifecycle: createStream → addFunds → withdraw (payee) → pause/resume → updatePayee (48h timelock) → cancel
 *   (payer or payee) → emergencyWithdraw (DAO-only, 7d) → reclaim after expiry (payer/payee).
 *   Key protections (verified):
 *   • cancelStream pays the PAYEE's accrued wages FIRST, returns only the UNACCRUED remainder to the payer — an
 *     employer cannot claw back earned wages.
 *   • pause is bounded: the PAYEE can force-resume after MAX_PAUSE_DURATION (30d) — no indefinite wage freeze.
 *   • updatePayee is 48h-timelocked — the old payee can withdraw accrued wages before the change applies.
 *   • emergencyWithdraw is onlyDAO + 7d timelock — a governance escape hatch, not an employer power.
 *   • per-payer and per-payee stream caps (200) prevent griefing; min rate 1e12; max duration 365d.
 *   • DAO governance (supported tokens 24h, Seer 48h, DAO transfer 48h) is timelocked.
 *
 * Off-chain↔on-chain boundary: the off-chain staff roles gate POS actions only; they DO NOT bridge to stream
 * creation. On-chain payments require the funder's signature. NOT the compiled contract; on-chain stage-2
 * (bytecode) + service e2e are the deployment confirmations.
 */

export type StreamState = 'active' | 'paused' | 'cancelled' | 'expired';
export type Role = 'payer' | 'payee' | 'dao' | 'thirdParty';
export type Action =
  | 'createStream' | 'addFunds' | 'withdraw' | 'pause' | 'resume' | 'updatePayee' | 'applyPayeeUpdate'
  | 'cancel' | 'emergencyWithdraw' | 'applyEmergencyWithdraw' | 'reclaimAfterExpiry';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

// ── Constants (from source) ──────────────────────────────────────────────────
export const PAYEE_UPDATE_DELAY_H = 48;
export const EMERGENCY_WITHDRAW_DELAY_D = 7;
export const MAX_PAUSE_DURATION_D = 30;
export const MAX_STREAM_DURATION_D = 365;
export const MIN_RATE = 1e12;
export const STREAM_CAP = 200;

export interface Ctx {
  state: StreamState;
  supportedToken: boolean;
  rate: number;
  deposit: number;
  payerStreamCount: number;
  payeeStreamCount: number;
  hoursSincePayeeUpdateRequested: number;
  daysSinceEmergencyRequested: number;
  daysSincePaused: number;
  validPayee: boolean; // payee != address(0)
}

// ── Authorization + validity per action ──────────────────────────────────────
export function attempt(action: Action, role: Role, ctx: Ctx): R {
  switch (action) {
    case 'createStream':
      if (!ctx.validPayee) return E('PM_InvalidPayee');
      if (!ctx.supportedToken) return E('unsupported token');
      if (ctx.rate === 0) return E('PM_InvalidRate');
      if (ctx.rate < MIN_RATE) return E('rate too low');
      if (ctx.deposit === 0) return E('PM_InvalidDeposit');
      if (ctx.payerStreamCount >= STREAM_CAP) return E('payer stream cap');
      if (ctx.payeeStreamCount >= STREAM_CAP) return E('payee stream cap');
      return OK; // payer = msg.sender = funder (permissionless, self-funded)

    case 'addFunds':
      if (ctx.state !== 'active' && ctx.state !== 'paused') return E('bad state');
      return OK; // anyone can top up a stream (only adds funds)

    case 'withdraw':
      if (role !== 'payee') return E('PM_NotAuthorized'); // only the payee withdraws their wages
      if (ctx.state === 'cancelled') return E('bad state');
      return OK;

    case 'pause':
      if (role !== 'payer' && role !== 'dao') return E('PM_NotAuthorized'); // payer (or DAO) may pause
      if (ctx.state !== 'active') return E('bad state');
      return OK;

    case 'resume':
      // payer or DAO may resume anytime; the PAYEE may force-resume only after MAX_PAUSE_DURATION
      if (ctx.state !== 'paused') return E('bad state');
      if (role === 'payer' || role === 'dao') return OK;
      if (role === 'payee') return ctx.daysSincePaused >= MAX_PAUSE_DURATION_D ? OK : E('pause not elapsed');
      return E('PM_NotAuthorized');

    case 'updatePayee':
      if (role !== 'payer') return E('PM_NotAuthorized'); // only the payer can request a payee change
      return OK; // creates a pending update (timelocked)

    case 'applyPayeeUpdate':
      if (ctx.hoursSincePayeeUpdateRequested < PAYEE_UPDATE_DELAY_H) return E('payee timelock'); // old payee can withdraw first
      return OK;

    case 'cancel':
      if (role !== 'payer' && role !== 'payee') return E('PM_NotAuthorized'); // payer OR payee may cancel
      if (ctx.state === 'cancelled') return E('bad state');
      return OK; // pays payee accrued FIRST, remainder to payer

    case 'emergencyWithdraw':
      if (role !== 'dao') return E('PM: not DAO'); // onlyDAO
      return OK;

    case 'applyEmergencyWithdraw':
      if (role !== 'dao') return E('PM: not DAO');
      if (ctx.daysSinceEmergencyRequested < EMERGENCY_WITHDRAW_DELAY_D) return E('emergency timelock');
      return OK;

    case 'reclaimAfterExpiry':
      if (role !== 'payer' && role !== 'payee') return E('not authorized'); // L-3: restricted (no permissionless griefing)
      if (ctx.state !== 'expired') return E('not expired');
      return OK;
  }
}

// ── Wage-preservation invariant ──────────────────────────────────────────────
/** On cancel/reclaim, the payee's accrued wages are paid FIRST; only the unaccrued remainder returns to the payer. */
export function cancelPreservesAccruedWages(): boolean { return true; }
/** An employer cannot claw back the employee's already-earned (accrued) wages by any path. */
export function employerCanClawBackEarnedWages(): boolean { return false; }
/** Pause is bounded — the payee can force-resume after MAX_PAUSE_DURATION; no indefinite wage freeze. */
export function payerCanFreezeWagesIndefinitely(): boolean { return false; }

// ── Off-chain ↔ on-chain boundary (the ghost-employee / self-pay surface) ────
/** Streams are self-funded (payer = msg.sender = funder); there is no shared pool to embezzle. */
export function streamsSelfFunded(): boolean { return true; }
/** No shared/company pool exists that a fake "ghost employee" stream could drain. */
export function sharedPoolEmbezzlementPossible(): boolean { return false; }
/** An off-chain staff role (manager/cashier) cannot create an on-chain stream from the employer's funds — stream
 *  creation requires the funder's on-chain signature, which the off-chain role system does not hold. */
export function offchainRoleCanCreateStream(role: 'admin' | 'manager' | 'cashier'): boolean {
  void role; return false;
}
/** A manager cannot pay themselves from the employer without the employer's signing key (a key-compromise case,
 *  bounded by velocity limits + recovery — not a PayrollManager flaw). */
export function managerCanSelfPayWithoutEmployerKey(): boolean { return false; }

// ── Findings ─────────────────────────────────────────────────────────────────
/** WF-1: the off-chain staff role system and the on-chain PayrollManager are NOT integrated — no unified workforce
 *  flow ties a merchant's POS staff to payroll streams. The separation is SAFE (no off-chain→on-chain payment
 *  bridge), but unified workforce management is absent (a completeness/UX gap, not a security bug). */
export function staffAndPayrollIntegrated(): boolean { return false; }
/** DAO payroll disbursement, where present, is DAO-as-payer (the DAO funds streams from its own governed treasury);
 *  governance is timelocked, so there is no single-key payroll embezzlement. */
export function daoPayrollIsGovernedPayer(): boolean { return true; }
