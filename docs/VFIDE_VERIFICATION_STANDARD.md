# The VFIDE Verification Standard

> **No VFIDE capability is complete until every function, permission, workflow, edge case, abuse case,
> integration point, and user journey has passed the full verification chain — from Contracts through Grandmother
> Verification.**

This is the project's most important rule. It exists to prevent **false completion** — the failure mode where a
feature *looks* done because the contract compiles, the API responds, the UI renders, and the tests are green,
when in fact no one has verified that the capability survives the full stack and real users. A green checkmark is
a claim; this standard defines what that claim must mean before it may be made.

---

## 1. The principle

A feature is **not** complete because:
- the contract exists,
- the API exists,
- the UI exists,
- the tests pass.

A feature is complete **only** when *every layer of the stack is verified* and *every capability survives
scrutiny* — including scrutiny by a hostile actor and by a non-technical, vulnerable user.

Code existing is the *start* of verification, not the end of it.

---

## 2. The verification chain

Every capability must pass **all** stages, in support of the final one. A stage is "passed" only when the
specific condition below is met and recorded — not when it is plausibly true.

```
Contracts
   ↓
Contract Security
   ↓
Backend Services
   ↓
API Layer
   ↓
Database Layer
   ↓
Permissions & Roles
   ↓
Frontend / UI
   ↓
Workflow Verification
   ↓
User Journey Verification
   ↓
Edge Case Matrix
   ↓
Adversarial Testing
   ↓
Cross-System Integration
   ↓
Grandmother Verification
   ↓
Certification
```

| Stage | Passed only when… |
|---|---|
| **1. Contracts** | The on-chain logic for the capability exists and, on a direct source read, correctly implements it. |
| **2. Contract Security** | The contract is sound under adversarial source analysis **and confirmed against the real compiled bytecode** (a green hardhat run / verify-script), not just a logic model. *This is where VFIDE's current "source-verified + modeled, bytecode pending" boundary lives — it is a real, unfinished stage, not a formality.* |
| **3. Backend Services** | The server-side logic that supports the capability (jobs, indexers, schedulers, attestation readers) is correct and fault-tolerant. |
| **4. API Layer** | The routes exposing the capability validate input, enforce authentication/authorization, and behave correctly on **error and abuse paths**, not only the happy path. |
| **5. Database Layer** | Schema/migrations support the capability; every query targets **columns verified against the migrations**; state transitions are consistent and not corruptible. |
| **6. Permissions & Roles** | "Who may do what" is **enforced at the layer that holds the asset** — not merely hidden in the UI. Least privilege; a hidden button is not a permission. |
| **7. Frontend / UI** | The capability is *reachable, understandable, completable, mobile-capable, and mistake-recoverable* (see §6). |
| **8. Workflow Verification** | The multi-step flow works end-to-end as one coherent process, including partial completion and resumption. |
| **9. User Journey Verification** | A real user, in the context of their actual goal, can discover and complete the capability — not just operate it in isolation. |
| **10. Edge Case Matrix** | The capability has an **exhaustive scenario matrix** of boundary conditions, all covered (see §5). |
| **11. Adversarial Testing** | Abuse cases, attacks, and malicious actors are enumerated and defended (see §5). |
| **12. Cross-System Integration** | The capability composes correctly with every system it touches, and **inherits no certification from them** (see §4). |
| **13. Grandmother Verification** | A non-technical, vulnerable user — VFIDE's actual target, the financially-excluded — can use it **safely**, without being confused, misled, over-trusted, or harmed. The system never implies a protection it doesn't provide. |
| **14. Certification** | Every stage above is passed **and documented**. Only then does the capability earn its mark. |

---

## 3. The granularity principle — audit *everything*, not just systems

Certification is not granted to "systems." It is granted to **capabilities** — every function, permission,
workflow, engine, automation, and integration — *each individually*. A system is just the sum of certified
capabilities.

**Recovery** is not "the Recovery system." It is:
`Create Recovery` · `Cancel Recovery` · `Challenge Recovery` · `Guardian Voting` · `Trustee Logic` ·
`Recovery Expiration` · `Recovery Notifications` · `Recovery UI` · `Recovery API` · `Recovery Permissions` —
each certified on its own.

**Variants** is not "the Variant system." It is:
`Create Variant` · `Edit Variant` · `Delete Variant` · `Inventory Tracking` · `Checkout Selection` ·
`Order History` · `Refund Handling` · `Exchange Handling` — each certified on its own.

**ProofScore** is not "ProofScore." It is:
`Score Calculation` · `Score Sources` · `Source Weighting` · `Appeals` · `Visibility Effects` · `Fee Effects` ·
`Escrow Effects` · `Governance Effects` — each certified on its own.

---

## 4. The no-inheritance rule

**A system cannot inherit certification from a parent, and a parent cannot be certified by assertion about its
children.**

Commerce is **not** certified *because* Variants, Bundles, Shipping, Tax, Returns, Employees, POS, and Discovery
are certified. Rather: each component is certified first, **then** Commerce may be certified — and Commerce's own
certification additionally requires that the components *compose* correctly (stage 12), which is a separate fact
from each component working alone.

Corollary: a 🟢 on a group is a claim that **every** capability beneath it cleared the chain **and** that they
integrate. If any capability beneath it is uncertified, the group is not certified — regardless of how mature it
looks.

---

## 5. The scenario-matrix requirement

Every capability must carry a scenario matrix with three tiers, all exhausted before it advances:

**`Recovery Challenge`** — illustrative matrix:

| Tier | Scenarios |
|---|---|
| **Normal** | Challenge succeeds · Challenge fails |
| **Edge** | Guardian dies · Guardian unreachable · Owner hospitalized · Owner returns after expiration · Recovery starts during inheritance · Multiple recoveries attempted · Trustee compromised |
| **Adversarial** | Stolen phone · SIM swap · Colluding guardians · Recovery spam · Timing attacks |

A capability with only "normal" cases covered is **not** through stages 10–11. The adversarial tier is mandatory,
not optional, because VFIDE custodies value for people who cannot afford to lose it.

---

## 6. The frontend / UX gate

**A backend-complete feature is not a complete feature.** Stage 7 is passed only when every question is "yes":

- Can users **find** it?
- Can users **understand** it?
- Can users **complete** it?
- Can users **recover from mistakes** while doing it?
- Can users complete it **on mobile**?

If any answer is "no": **Frontend = Failed → Certification = Blocked.** A capability that works only for its
author, or only on desktop, or only if you already know it's there, has not passed.

---

## 7. The grandmother gate (stage 13, stated plainly)

VFIDE's users are the financially-excluded — often non-technical, sometimes in precarity, frequently the exact
people predatory systems target. Stage 13 asks: **would this capability be safe in the hands of someone with no
crypto fluency and a lot at stake?**

- It must never imply a protection it does not provide (e.g. a "you're protected" screen when recovery isn't set
  up — a real defect this standard caught and forced fixed).
- It must never let a confusing path cost someone their funds.
- It must fail toward *safety and the user's interest*, not toward the system's convenience.

A capability that is correct but *misleading* fails this gate.

---

## 8. Per-capability certification checklist (reusable)

Copy this block for **each capability**. A capability is certified only when every box is checked or explicitly
marked N/A with a reason.

```
CAPABILITY: <name>           SYSTEM: <parent>          DATE: <date>

[ ]  1. Contracts            — on-chain logic exists + correct on source read         evidence:
[ ]  2. Contract Security    — sound adversarially + GREEN compiled bytecode run      evidence:
[ ]  3. Backend Services     — supporting services correct + fault-tolerant           evidence:
[ ]  4. API Layer            — input validation + authz + error/abuse paths           evidence:
[ ]  5. Database Layer       — migrations support it; columns verified                evidence:
[ ]  6. Permissions & Roles  — enforced at the asset layer, not UI-hidden             evidence:
[ ]  7. Frontend / UI        — findable/understandable/completable/mobile/recoverable evidence:
[ ]  8. Workflow             — end-to-end multi-step flow incl. resume                evidence:
[ ]  9. User Journey         — discoverable + completable in real goal context        evidence:
[ ] 10. Edge Case Matrix     — exhaustive boundary scenarios covered                  evidence:
[ ] 11. Adversarial          — abuse/attack cases enumerated + defended               evidence:
[ ] 12. Cross-System         — composes correctly; inherits nothing                   evidence:
[ ] 13. Grandmother          — safe + honest for a non-technical, at-stake user       evidence:
[ ] 14. Certification        — all of the above passed AND documented                 evidence:
```

---

## 9. Calibration — applying this standard to VFIDE's *current* state (honest)

The standard would be hypocritical if it created the very false completion it forbids. So, measured honestly
against the 14-stage chain, here is what VFIDE's existing certifications actually cover today:

- **The protocol's core logic is well-verified at the contract/model layers.** Across Governance, Trust, Seer,
  Recovery, and Core Ownership, the audits have strong coverage of **stage 1 (Contracts)**, **stage 10 (Edge Case
  Matrix)** and **stage 11 (Adversarial)** — but at the level of *executable TS logic models + source reads*, with
  **456 modeled scenarios** mapped to existing hardhat tests.
- **Stage 2 (Contract Security) is the universal open boundary.** The contract audits are source-verified and
  logic-modeled, but **not yet confirmed against compiled bytecode** — every cert says so. The verification
  manifest (`ONCHAIN_VERIFICATION_MANIFEST.md`) now maps the whole campaign to runnable hardhat evidence; a single
  `solc`-environment run closes this stage across Core Ownership, Recovery, Governance, Seer, and Trust at once.
  Until then, stage 2 is **incomplete by this standard's own bar** — correctly so.
- **Stages 3–9 and 12–13 are unevenly covered, per-capability.** They are **strongest for Commerce** (the one
  group taken through the broader gate discipline, including integration and grandmother gates) and for the
  **Onboarding safety-critical core** (wizard + quest, with app-layer API/DB/permission/frontend coverage and the
  attestation path). For most other systems, these full-stack and UX stages have **not** been independently
  verified at the per-capability granularity §3 demands.
- **Therefore the honest reading of the tracker is:** a 🟢 today means a capability cleared the gate discipline as
  it was applied (strong at logic + edge + adversarial, and — for Commerce/Onboarding-core — through the UX/
  integration gates); it does **not** yet mean every capability beneath every system has independently cleared all
  14 stages including compiled bytecode. This standard makes that distinction explicit instead of letting a
  checkmark imply more than is true — which is exactly its job.

In short: **the core is sound and well-modeled; the full-stack, per-capability, bytecode-confirmed certification
is the work this standard now defines and measures.** That is a far more honest and useful position than "the code
exists, so it's done."

---

## 10. How this is used going forward

1. **Decompose** each system into its capabilities (§3) before claiming anything about the system.
2. **Run each capability** through the 14-stage chain using the §8 checklist; attach evidence to each stage.
3. **Never inherit** (§4): certify capabilities first, then the system, then verify the system's integration.
4. **Exhaust the matrix** (§5): no capability advances on normal cases alone.
5. **Gate on UX** (§6) and **on the grandmother** (§7): backend-complete is not complete.
6. **Record honestly** (§9): a stage is passed only when its specific condition is met — and the open boundary
   (stage 2 / compiled verification) is named, not glossed.

This rule is what surfaced VFIDE's real defects — Commerce operational gaps, ownership-transition integration
defects, Discovery UI gaps, the onboarding attestation issue, and workforce permission-enforcement gaps. Applied
consistently across the remaining systems, it produces a confidence level that "does the code exist?" never
could.
