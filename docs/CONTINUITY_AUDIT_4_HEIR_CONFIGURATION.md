# Continuity Campaign — Audit 4: Heir Configuration (ACTIVE path)

**Scope:** the ACTIVE heir-config SETUP flow — `proposeInheritanceConfig` / `confirmInheritanceConfig` (30-day
cooldown), `cancelInheritanceConfigChange` (owner), `clearAllHeirs`, and the guardian-quorum veto
`cancelInheritanceConfigChangeByGuardians` — in `contracts/vault/CardBoundVaultInheritanceManager.sol`. This is
the setup side that produces the commitments Audit 3 verified at claim time. Conducted under the Continuity
Campaign rule (Audit → Finding → Root Cause → Fix → Retest → Re-Audit → Registry).

## Method
1. **Source read** — full read of propose/confirm (validation, cooldown, version bump, old-heir clearing),
   `clearAllHeirs`, owner-cancel, and the guardian-quorum veto incl. its vote-keying.
2. **Executable model** — `lib/audit/heirConfigurationModel.ts`.
3. **Matrix** — `__tests__/audit/heirConfiguration.test.ts`: **16 scenarios** (authority, cooldown, claim-blocking,
   heir validity, version binding, guardian-removed-during-cooldown, quorum veto, and the Audit-4 stale-vote fix).
   **All pass; typecheck 0; full audit suite 525/20 green.**

## What's strong (verified)
- **Owner-only + claim-blocked:** propose, confirm, clearAllHeirs all require admin and STATE_NORMAL — heirs
  cannot be changed during an active claim (CFG-02/03).
- **30-day cooldown:** a proposed config cannot confirm for `INHERITANCE_CONFIG_COOLDOWN` (30d); the owner can
  cancel anytime in the window (CFG-01/04). A compromised admin's malicious config is exposed for 30 days.
- **Heir validity:** heirs MUST be guardians (no arbitrary addresses), no duplicates, non-zero commitments,
  count ≤ MAX_HEIRS=5 (VAL-01..04).
- **Version binding + cooldown integrity:** confirm bumps the live `inheritanceConfigVersion` (invalidating old
  commitments, which bind the version in their hash — Audit 3), and re-checks each heir is STILL a guardian, so a
  guardian removed during the cooldown cannot be confirmed (VER-01/02).
- **Multi-party veto:** guardians can cancel a pending config at threshold — the backstop if the owner's admin is
  compromised and proposes a malicious heir set (VETO-01).

## Finding

### Finding 4 (MEDIUM-LOW, FIXED) — guardian cancel-vote threshold bypassable via stale votes on a reused version
**Root cause:** `cancelInheritanceConfigChangeByGuardians` keyed its vote tally and per-guardian vote flags by the
config VERSION (`cancelVotesByPendingVersion[pendingConfigVersion]`), and explicitly did NOT reset the tally on
cancellation. But the live `inheritanceConfigVersion` advances ONLY on confirm — so a config that is proposed,
cancelled, and re-proposed **reuses the same version number**. The stale cancel-vote tally from the prior
(cancelled) proposal therefore carried into the new proposal. Consequence: after a config of version *v* was
cancelled at threshold, the NEXT proposal of version *v* started with a tally already at/over threshold —
allowing **fewer-than-threshold guardians (potentially one)** to cancel a fresh, legitimate proposal.
**Severity reasoning:** MEDIUM-LOW. It does not steal funds or grant unauthorized inheritance — but it **breaks
the guardian-threshold invariant** for config cancellation and enables a sub-threshold guardian to grief the owner
out of configuring inheritance (a core continuity feature). It is reachable in normal operation (any
cancelled-then-reproposed config). The in-code comment acknowledged the vote persistence but misjudged it as
"design intent," conflating the version NUMBER with the proposal CONTENT — so a guardian's vote against a
malicious config A wrongly counted against a legitimate config B that happened to reuse the version.
**Fix:** introduced a MONOTONIC `configProposalNonce` (incremented on every `proposeInheritanceConfig` /
`clearAllHeirs`, never reused) and re-keyed the cancel-vote tally + flags to `pendingConfigProposalNonce`. Each
proposal now starts with a fresh (zero) tally and clean flags regardless of version reuse. Events still emit the
version (informational). Mappings renamed `…ByPendingVersion` → `…ByProposalNonce` to match the new semantics (no
misleading names left behind).
**Retest / Re-audit:** model keys votes by the proposal nonce; matrix STALE-01 (reproposed same-version config now
needs a FULL fresh threshold; one vote insufficient), STALE-02 (a guardian who voted on the cancelled proposal can
vote once on the fresh one), STALE-03 (owner confirms a reproposed config a minority tried to grief) verify the
fix. Full audit suite re-run green (525/20).
**Caveat (honest):** SOURCE-level contract change (2 new state vars, mapping rename, re-keyed consumer).
Structurally sound — all symbols in scope, logic identical except the key — but **not compile-confirmed** in this
environment; stage-2 (hardhat) is the confirmation. The model verifies the logic.

## Registry impact
Heir Configuration capabilities advance on the stages this audit evidences — **source-correct (1),
permissions (6: owner-only propose/confirm, guardian-quorum veto with a now-correct threshold), edge matrix (10),
adversarial (11), cross-system (12: version binding to the claim path, claim-state blocking)**, and the
grandmother property (13: a compromised admin cannot quietly install heirs, and a guardian minority cannot block
the owner from setting them). **Stage 2 remains `~` (compiled bytecode pending — and gates the Audit-4 fix);
stages 3–5, 7–9 remain `.`.** Honest partial advance, not all-14.

---

## Continuity Campaign — status after Audit 4
All five capabilities in the campaign's success criteria have now had a full source+model audit under the
find→fix→retest→re-audit rule:

| Capability | Audit | Findings fixed | Evidenced stages |
|---|---|---|---|
| Proof-of-Life | 1 | 1 (stale timer comment) | 1/6/10/11/12/13 |
| Guardian Management | 2 | 1 (maturity not enforced on trustee promotion) | 1/6/10/11/12/13 |
| Inheritance Claim | 3 | 1 (div-by-zero brick) | 1/6/10/11/12/13 |
| Distribution | 3 | (covered) | 1/6/10/11/12/13 |
| Heir Configuration | 4 | 1 (cancel-threshold bypass via stale votes) | 1/6/10/11/12/13 |

**Four real contract fixes** across the campaign, each found by reading the source against an adversarial matrix,
each retested against an executable model. Every row sits at evidenced stages 1/6/10/11/12/13 with **stage 2 (`~`,
compiled bytecode) the single remaining boundary** — the all-14-`Y` certification the success criteria describe is
reached when the hardhat harness runs against the bytecode (in a solc environment) and confirms these four fixes
plus the full claim/recovery state machine. That run, plus a full-stack (backend/API/frontend) pass for stages
3–5/7–9, is the path from here. The registry now means what it says: every advanced cell is backed by a read +
a passing scenario, not an assumption.
