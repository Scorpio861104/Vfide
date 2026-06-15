# Wave 89 — Successors & Emergency Operators Campaign

A scenario-driven adversarial audit of the *roles that may act in the owner's absence*. The brief named four
institutions — **Successors, Next of Kin, Emergency Operators, Chain of Return** — and instructed:
"assume the systems are incomplete until proven otherwise… the goal is discovering why it isn't [complete]."
So Stage 1 was ground truth, and it reshaped the whole campaign.

Verified (off-chain layer): typecheck 0, nav 0 broken, **126 tests / 13 suites** (+4 reclaim tests). The
one real defect found is fixed and tested; two of the four named institutions turned out not to exist as
built systems, which is reported plainly rather than papered over.

## Stage 1 — Role inventory (the ground truth that reframed everything)
| Named institution | On-chain (.sol) | Hooks | UI | What it actually is |
|---|---|---|---|---|
| **Successor** | 0 | 2 | 5 | Not an on-chain role. UI framing over (a) the inheritance-manager **heirs** (personal/vault) and (b) a real off-chain **business successor** in the merchant-continuity flow. |
| **Next of Kin** | 1 (legacy only) | 3 | 7 | **No active on-chain role.** The single `.sol` hit is `contracts/legacy/VaultInfrastructure.sol` (deprecated, only referenced by ABI/contract registries — dead). Active references are admin **fraud-telemetry**. The functional equivalent is heirs + proof-of-life (audited Wave 88). |
| **Emergency Operator** | 0 | 0 | 1 | **Does not exist as a vault role.** Exists only as an off-chain **business** operator record in the merchant-continuity flow — designation only, no enforced authority. |
| **Chain of Return** | 0 | 0 | 3 | **Legacy / removed.** Two references are comments documenting it was *cleaned up* ("pre-cleanup this file had a parallel 'Chain of Return' recovery flow"); one is an admin fraud-monitor label. It is not a current institution. |

**Conclusion:** "Successor / Next of Kin / Emergency Operator" are not four separate vault-authority systems.
The *personal* side is the heir + proof-of-life machinery already audited in Wave 88. The *business* side is
one real off-chain system — merchant continuity (succession + emergency operators + business transfer) — and
that is where this campaign's real audit and its one defect live. "Chain of Return" is a removed legacy flow.

## Stages 2 & 5 — Authority audit of the business-continuity roles
The merchant-continuity system (`/api/merchant/continuity`, `/api/merchant/business-transfer`,
`lib/merchant/businessTransfer.ts`) is where business successor + emergency operator are real. Its design is
careful and embodies "protection strong, authority weak, ownership preserved":

| Capability | Business Successor | Emergency Operator | Owner |
|---|---|---|---|
| View business | ✅ (once transferred) | — (designation only today) | ✅ |
| Be designated / revoked | by owner only | by owner only | n/a |
| **Touch the vault / funds** | **❌ never** | **❌ never** | ✅ (on-chain, separate) |
| Start a voluntary transfer | ❌ | ❌ | ✅ |
| Accept a voluntary transfer | ✅ | ❌ | ❌ |
| **Request an emergency transfer** | ✅ | ✅ | n/a |
| **Seize the business unilaterally** | **❌** (only a veto-windowed request) | **❌** | n/a |
| Veto an emergency transfer | ❌ | ❌ | ✅ (always) |
| Execute after veto window | ✅ (if no veto) | ✅ (if no veto) | ✅ |
| Change heirs / guardians / recovery / proof-of-life | ❌ | ❌ | ✅ |

**Verified sound:** the authority gate is owner-only for designations (JWT-scoped `merchant` address); an
emergency transfer is a *request* that opens a 7-day owner-veto window, never a seizure; the transfer target
is constrained to the pre-recorded successor; and **funds/vault are explicitly excluded** —
`TRANSFERABLE_MERCHANT_TABLES` is an explicit allow-list of business tables only, funds tables deliberately
omitted, "this never touches funds." Emergency authority therefore **cannot become ownership**.

## Stage 4 — Reputation does not auto-transfer (verified)
The business-transfer allow-list contains **no** ProofScore / Trust / Builder Record / reputation tables.
Trust, Builder Record, and ProofScore remain personal and do not transfer with a business handoff. Confirmed
by reading the explicit table list, not by assumption.

## The defect found & fixed — owner-returns has no remedy after an emergency business transfer
This is the direct Wave 88 continuation the brief's Stage 7 asks for, and it's worse here than for the vault.
An **emergency** business transfer happens *because the owner was absent*. The 7-day veto only protects an
owner who can respond in time; an owner hospitalized/deployed/comatose for longer cannot veto, the window
elapses, the successor executes, and `reassignBusinessRecords` moves the entire business to them. **Before
this wave there was no `reclaim`/reverse action and `executed` was terminal — the returning owner had no
in-product remedy at all.** (Worse than the vault, which is on-chain and non-custodial so the owner still
holds keys; here the business records are simply gone.)

**Fix — a bounded owner-returns reclaim window (tested):**
- Migration adds a `reclaimed` status + `reclaim_until` / `reclaimed_at` columns.
- At execution, an **emergency** transfer sets `reclaim_until = now + 30 days` (voluntary transfers stay
  NULL — the owner consented, so they are not reclaimable).
- A new `reclaim` action: **only the original owner**, **only an executed emergency transfer**, **only while
  the window is open** — reverses the reassignment (successor → owner) in one transaction. Funds were never
  moved, so nothing else needs undoing.
- 4 new tests prove: owner can reclaim in-window; successor cannot; reclaim is rejected after the window;
  voluntary transfers can't be reclaimed.

## Owner-Returns Matrix (business side; vault side per Wave 88)
| Owner returns… | Business outcome | Remedy |
|---|---|---|
| During veto window (≤7d) | Transfer not executed | `veto` — instant. |
| After emergency execution, **within 30d** | Business reassigned to successor | **`reclaim` (NEW) — reverses it.** |
| After emergency execution, **>30d** | Business with successor | No automatic remedy — reclaim window closed (a deliberate bound; see risks). |
| After a **voluntary** transfer | Business with successor | None — the owner consented. Correct. |
| Vault funds, any timing | Unaffected by business transfer | Owner still holds keys; vault is on-chain non-custodial. Inheritance side per Wave 88 (post-veto reclaim is the open contract-audit flag). |

## Stage 6 — Chain of Return
**Not a current institution.** It was a parallel legacy recovery flow that was already removed in favor of the
CardBound recovery + inheritance systems; the only live references are cleanup comments and an admin
fraud-monitor label. There is nothing to harden — and importantly, nothing to mistake for a third parallel
takeover path. (If a distinct "presumed permanently gone" process is ever desired beyond the existing
inheritance/MEMORIAL flow, that's a *new build*, not an audit target.)

## Stage 9 — Civilization separation (verified)
**Recovery ≠ Continuity ≠ Chain of Return** holds, and the repo enforces it:
- **Recovery** (owner alive, regaining access) and **Continuity** (owner cannot participate) are mutually
  exclusive at the contract level — an inheritance claim reverts `INH_RecoveryInProgress` while a recovery
  rotation is pending, so the two cannot run at once or collapse into one.
- **Chain of Return** is not a live third system (removed), so there is no third institution to conflate.
- The **business** continuity flow is deliberately separate from **personal** vault continuity (its own API,
  its own records, funds excluded) — the merchant surface used to be "a veneer over /inheritance" and was
  intentionally split out (documented in the continuity API header).

## Remaining risks (honest)
1. **Two named institutions don't exist as built systems.** Emergency Operator (as an enforced role) and
   Chain of Return are not implemented. The *security* consequence is benign — a non-existent role grants no
   authority — but if the product intends them as real capabilities, that is **net-new engineering**, not a
   completed audit. Flagged plainly.
2. **The business-continuity flow has no frontend.** initiate/emergency/veto/execute/**reclaim** are
   API-complete but unsurfaced (the API header itself says execution is "explicitly deferred"). The reclaim
   remedy exists and is tested, but a returning owner can't *use* it until a UI is built. This matches the
   feature's existing state; it is not a regression, but it is a real gap to building it for production.
3. **Operator access isn't enforced yet.** An "emergency operator" record confers no operational access
   today (no auth-layer wiring). Good (it can't be abused) and incomplete (it doesn't yet *do* the helpful
   thing) — the same deferred-execution note.
4. **The 30-day reclaim bound** is a judgment call. Beyond 30 days the returning owner has no automatic
   remedy. That mirrors the vault's veto-window bound and is surfaced rather than hidden; a longer or
   challenge-based window is a reasonable future option.
5. **DB-layer, not on-chain.** Business records and their transfer/reclaim are off-chain; correctness rests
   on the API + state machine (now tested) rather than a contract. Funds remain on-chain and untouched.

## Completion decision — PARTIAL, scoped honestly
Per the brief's strict rule ("if serious unresolved risks remain, do not award completion; document them"):

- **Business Successor + Emergency Operator (the off-chain merchant-continuity flow): ✅ COMPLETE (off-chain,
  execution-deferred).** Authority boundaries are clear, ownership is protected, emergency authority cannot
  become ownership (funds excluded, owner always vetoes), reputation does not auto-transfer, and the
  owner-returns reclaim gap that this audit found is fixed and tested. The honest caveat is that the flow has
  no UI yet (deferred by design).
- **Personal Successor / Next of Kin: ✅ COVERED under Wave 88** — these resolve to heirs + proof-of-life,
  already audited; no separate system exists to complete.
- **Emergency Operator as an *enforced vault role*, and Chain of Return: ❌ NOT COMPLETE — because they do
  not exist.** Not a defect to fix; a build that hasn't happened. Awarding "complete" would be dishonest.

So this wave earns **✅ COMPLETE for the institutions that exist**, with an explicit **NOT-BUILT** finding for
the two that don't. That is the honest result the campaign was designed to surface.

## Next
**Wave 90 — Preparedness Civilization Audit** across Ownership → Recovery → Guardians → Continuity →
(business) Successors/Operators, verifying they operate as one coherent organism. Two questions dominate it:
the **post-veto owner-reclaim** boundary (vault, Wave 88 contract flag) and whether the **business-continuity
flow should be surfaced and its operator access enforced** before launch. The civilization audit should also
record that "Next of Kin / Chain of Return" are naming aspirations, not separate systems, so the model isn't
described as having institutions it doesn't have.
