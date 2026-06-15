/**
 * Heir Configuration — executable logic model (ACTIVE path audit, Continuity Audit 4).
 *
 * Mirrors the heir-config SETUP flow in `CardBoundVaultInheritanceManager.sol`: proposeInheritanceConfig /
 * confirmInheritanceConfig (30-day cooldown), cancelInheritanceConfigChange (owner), clearAllHeirs, and
 * cancelInheritanceConfigChangeByGuardians (guardian-quorum veto). Encodes the Audit-4 fix: cancel votes are
 * keyed by a MONOTONIC proposal nonce, not the reusable config version. NOT the compiled contract.
 *
 * Modeled invariants (asserted by the matrix):
 *  • propose/confirm are owner-only and BLOCKED during an active claim (STATE_NORMAL required).
 *  • Heirs MUST be guardians; no duplicates; commitments non-zero; count <= MAX_HEIRS.
 *  • A proposed config cannot confirm before the 30-day cooldown; the owner can cancel anytime in the window.
 *  • confirm bumps the live config version (invalidating old commitments) and re-checks each heir is STILL a
 *    guardian (a guardian removed during the cooldown cannot be confirmed).
 *  • Guardians can veto a pending config at THRESHOLD; the Audit-4 fix ensures a cancelled-then-reproposed config
 *    starts with a FRESH (zero) tally — sub-threshold guardians cannot cancel a new proposal via stale votes.
 */

export const STATE_NORMAL = 0;
export const STATE_CLAIM_ACTIVE = 2;
export const MAX_HEIRS = 5;
export const INHERITANCE_CONFIG_COOLDOWN = 30 * 24 * 60 * 60; // 30 days

export interface PendingConfig {
  version: number;
  proposalNonce: number;
  heirs: string[];
  commitments: string[];
  effectiveAt: number;
}

export interface ConfigState {
  state: number;
  guardians: Set<string>;
  threshold: number;
  liveVersion: number;
  liveHeirs: Map<string, string>; // heir -> commitment
  pending: PendingConfig | null;
  configProposalNonce: number; // monotonic
  cancelVotes: Map<number, number>; // proposalNonce -> count
  hasVoted: Map<number, Set<string>>; // proposalNonce -> guardians who voted
}

export function freshConfig(overrides: Partial<ConfigState> = {}): ConfigState {
  return {
    state: STATE_NORMAL,
    guardians: new Set(['G1', 'G2', 'G3']),
    threshold: 2,
    liveVersion: 4,
    liveHeirs: new Map(),
    pending: null,
    configProposalNonce: 0,
    cancelVotes: new Map(),
    hasVoted: new Map(),
    ...overrides,
  };
}

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

const isGuardian = (s: ConfigState, g: string) => s.guardians.has(g);

/** proposeInheritanceConfig: owner-only, NORMAL, heirs must be guardians, bumps version + proposal nonce. */
export function propose(
  s: ConfigState, isOwner: boolean, heirs: string[], commitments: string[], now: number,
): R {
  if (!isOwner) return E('not-admin');
  if (s.state !== STATE_NORMAL) return E('wrong-state');
  if (heirs.length !== commitments.length) return E('invalid-commitment');
  if (heirs.length > MAX_HEIRS) return E('too-many-heirs');
  const seen = new Set<string>();
  for (let i = 0; i < heirs.length; i++) {
    const g = heirs[i] ?? '';
    if (g === '' || !isGuardian(s, g)) return E('not-guardian');
    if (seen.has(g)) return E('invalid-commitment');
    seen.add(g);
    if ((commitments[i] ?? '') === '') return E('invalid-commitment');
  }
  const version = s.liveVersion + 1;
  s.configProposalNonce += 1; // monotonic — never reused
  s.pending = {
    version,
    proposalNonce: s.configProposalNonce,
    heirs: [...heirs],
    commitments: [...commitments],
    effectiveAt: now + INHERITANCE_CONFIG_COOLDOWN,
  };
  return OK;
}

/** clearAllHeirs: owner-only, NORMAL — proposes an EMPTY config (also cooldown-gated). */
export function clearAllHeirs(s: ConfigState, isOwner: boolean, now: number): R {
  if (!isOwner) return E('not-admin');
  if (s.state !== STATE_NORMAL) return E('wrong-state');
  const version = s.liveVersion + 1;
  s.configProposalNonce += 1;
  s.pending = { version, proposalNonce: s.configProposalNonce, heirs: [], commitments: [], effectiveAt: now + INHERITANCE_CONFIG_COOLDOWN };
  return OK;
}

/** confirmInheritanceConfig: owner-only, NORMAL, cooldown elapsed, heirs still guardians; bumps live version. */
export function confirm(s: ConfigState, isOwner: boolean, now: number): R {
  if (!isOwner) return E('not-admin');
  if (s.state !== STATE_NORMAL) return E('wrong-state');
  if (!s.pending) return E('no-pending');
  if (now < s.pending.effectiveAt) return E('cooldown-active');
  // re-validate each heir is STILL a guardian
  for (const h of s.pending.heirs) {
    if (!isGuardian(s, h)) return E('not-guardian');
  }
  s.liveHeirs = new Map();
  for (let i = 0; i < s.pending.heirs.length; i++) {
    s.liveHeirs.set(s.pending.heirs[i] ?? '', s.pending.commitments[i] ?? '');
  }
  s.liveVersion = s.pending.version; // ← old commitments now invalid (version bound in the hash)
  s.pending = null;
  return OK;
}

/** cancelInheritanceConfigChange: owner clears the pending config anytime in the window. */
export function cancelByOwner(s: ConfigState, isOwner: boolean): R {
  if (!isOwner) return E('not-admin');
  s.pending = null;
  return OK;
}

/**
 * cancelInheritanceConfigChangeByGuardians: guardian-quorum veto, keyed by the UNIQUE proposal nonce (Audit-4
 * fix). At threshold the pending config is cleared.
 */
export function cancelByGuardians(s: ConfigState, actor: string): R {
  if (!s.pending) return E('no-pending-config');
  if (!isGuardian(s, actor)) return E('not-guardian');
  const nonce = s.pending.proposalNonce; // ← per-proposal, not per-version
  const voters = s.hasVoted.get(nonce) ?? new Set<string>();
  if (voters.has(actor)) return E('already-voted');
  voters.add(actor);
  s.hasVoted.set(nonce, voters);
  const newCount = (s.cancelVotes.get(nonce) ?? 0) + 1;
  s.cancelVotes.set(nonce, newCount);
  if (newCount >= s.threshold) {
    s.pending = null; // cancelled
  }
  return OK;
}
