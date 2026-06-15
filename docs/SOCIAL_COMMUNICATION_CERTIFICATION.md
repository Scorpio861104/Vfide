# Social & Communication — Certification Report

Sixth system outside Commerce through the gate discipline. It carried a **specific reason to audit it now**:
reviews and endorsements are **reputation inputs**, so if they can be faked or gamed, that's an *input-side
attack* on the ProofScore and Merchant Trust systems already certified. The audit's central question:

**Can the reputation inputs (reviews, endorsements) be abused to manipulate Trust — fake reviews, self-review,
review-bombing, endorsement rings, Sybil attacks?**

**Verdict up front:** Social & Communication **holds**, with **no new findings** — the reputation-input attack
surface is well-defended, and the design is coherent with the rest of the protocol (it all bottoms out in
ProofScore being un-buyable). This system is **off-chain (Postgres + routes) plus the on-chain SeerSocial
endorsement scoring**, so unlike the Solidity audits the logic was modeled AND a real route was tested against
a mocked DB. Marked **🟢 CERTIFIED** for the off-chain surface (no compile boundary), with the on-chain
SeerSocial endorsement contract noted as source-read (its compiled run folds into the Trust/Seer hardhat pass).

## Reviews — display-only, with solid anti-fake fundamentals (cannot manipulate Trust)
`app/api/merchant/reviews` is the review surface. The anti-abuse fundamentals are present and verified on the
real route path (matrix H1–H5):
- **No self-review:** a merchant cannot review their own store (case-insensitive check).
- **One review per (reviewer, product):** no duplicate review-bombing via spam.
- **`verified_purchase` is computed SERVER-SIDE** against the reviewer's paid orders — a reviewer cannot *claim*
  verified status; the flag is derived from `merchant_orders.payment_status = 'paid'`.
- Non-purchasers **may** review but are honestly flagged `verified_purchase = false` (a display choice, not a
  manipulation vector).

**The decisive fact:** reviews are **display-only social proof — they do NOT feed Merchant Trust or
ProofScore.** A grep across `lib/seer/`, `Seer.sol`, and `ProofLedger.sol` finds no review input to the score
computation (Merchant Trust consumes disputes/refunds/confirmed-payments/verification, per the Trust audit —
not raw ratings). So even a flood of fake unverified reviews **cannot move reputation**; the worst case is
misleading a human reader, mitigated by the verified-purchase badge.

## Endorsements — a real reputation input, but Sybil/ring-resistant (the headline result)
Endorsements DO feed ProofScore (Seer.sol: "Social endorsements — time-limited boosts that decay
automatically"), via `SeerSocial.sol`. That makes ring/Sybil resistance critical, and it is strong on multiple
independent axes:
- **Only HIGH-TRUST accounts may endorse (`minScoreToEndorse = 7000`).** This is the core Sybil defense: a army
  of fresh/zero-score accounts **cannot endorse at all**. To endorse, an account must itself have earned a high
  ProofScore — which (per the Trust audit) cannot be bought or flash-loaned. A Sybil ring of 100 zero-score
  accounts produces **zero** bonus (matrix E1–E2).
- **The total endorsement bonus is CAPPED (`endorsementBonusCap = 1500` = 15% on the 0–10000 scale).** Even
  many *legitimate* high-trust endorsers cannot push a subject's score arbitrarily — endorsements can never
  dominate (E3).
- **Boosts DECAY / expire** — they are time-limited, so you cannot accumulate a standing, permanently-inflated
  score (D3).
- **Self-endorsement is blocked** on-chain (`subject == msg.sender` reverts) AND in the off-chain route.
- **Per-endorser cooldown (1 day)** and **no duplicate active endorsement** rate-limit and de-dup the input.

So the endorsement-ring attack is closed three ways at once: the endorsers must be high-trust (no cheap Sybil),
the aggregate bonus is capped (no domination), and it decays (no permanent inflation).

## Messaging — private, rate-limited, blockable
`app/api/messages`: payloads are **end-to-end encrypted and opaque to the server** ("only the recipient's
client can" decrypt) — VFIDE cannot read message content. Sending is **rate-limited** (spam defense) and a
recipient can **block** a sender (`friends` supports a `blocked` status — harassment defense). Conversations are
scoped to the sender/recipient pair. Appropriate for the financially-excluded audience's safety.

## Evidence sharing — access scoped to the uploader
`app/api/attachments/[id]`: an attachment fetch is gated `WHERE id = $1 AND uploaded_by = $2` — a requester can
read an attachment **only if they uploaded it**, so a non-party cannot read another user's dispute evidence by
guessing IDs. (Restrictive-by-default; see residual note on intra-dispute sharing.)

## The Scenario Matrix — 34 executing scenarios
Model (`lib/audit/socialModel.ts`, 29 in `__tests__/audit/socialModel.test.ts`) + real route (5 in
`__tests__/api/reviews-route.test.ts`, mocked DB):
- **A. Review gating (A1–A6):** verified/unverified flag (server-computed), no self-review, one-per-product.
- **B. Reviews don't feed Trust (B1–B2):** display-only; fake reviews can't move reputation.
- **C. Endorse gating (C1–C6):** high-trust-only (Sybil defense), no self-endorse, cooldown, no dup.
- **D. Cap & decay (D1–D4):** 15% aggregate cap; expired endorsements contribute nothing.
- **E. Sybil ring defense (E1–E4):** **100 zero-score accounts → 0 bonus;** even many legit endorsers capped;
  a high-trust Sybil army isn't free (each needs an un-buyable ProofScore ≥7000).
- **F. Messaging (F1–F4):** rate-limited, blockable, E2E-encrypted (server can't read).
- **G. Evidence access (G1–G3):** uploader-scoped, no ID-guessing leak.
- **H. Reviews route (H1–H5):** self-review→400, duplicate→409, verified/unverified computed, bad rating→400.

Full regression green (audit matrices total 214); typecheck 0.

## Certification verdict (scoped)
| Gate | Result |
|---|---|
| Build/Read | ✅ reviews + endorsements (+ SeerSocial) + messages + attachments + friends mapped |
| Functional | ✅ review submit, endorse, message, evidence fetch modeled + reviews route tested |
| Edge-Case | ✅ unverified reviews, cooldowns, expiry, cap boundaries |
| Adversarial | ✅ **fake reviews can't move Trust; Sybil rings produce zero bonus; self-review/self-endorse blocked; evidence access scoped** |
| Integration | ✅ endorsement gate = ProofScore ≥7000 (Trust); reviews independent of score; coherent with the un-buyable-reputation thesis |
| Grandmother | ✅ a competitor can't tank you with fake reviews, a bot farm can't fake endorsements, your DMs are private, and you can block harassers |
| **Social & Communication (reputation inputs)** | ✅ **CERTIFIED** |

## Residual honesty notes
- The **off-chain routes** were modeled + the reviews route tested against a mocked DB (not a live DB — standing
  caveat). The **on-chain `SeerSocial.sol`** endorsement scoring was source-read here; its compiled hardhat
  verification folds into the Seer/Trust on-chain pass already flagged.
- **Evidence sharing within a dispute:** attachments are uploader-scoped, which is correctly *restrictive* — but
  it means a counterparty/arbiter seeing shared evidence would require an explicit grant path. I did not trace
  whether the disputes flow exposes evidence to the other party/jury through a separate authorized read; if
  intra-dispute evidence visibility is intended, that path should be audited (it's a feature-completeness
  question, not a leak — the default denies access).
- **Reviews allow unverified submissions.** This is a deliberate design (labeled, display-only, no Trust
  impact), not a finding — but if VFIDE later wants verified-only reviews, the gate is a one-line change
  (`if (!verifiedPurchase) reject`).
- **`community` (21 lines), `groups` (329), `friends` (537)** were confirmed to exist and were read at the
  boundary (friends provides the block primitive); their full logic (group permissions, friend-request abuse)
  was not exhaustively audited — candidates for a focused pass, though none feeds the score.

## Tracker impact
Social & Communication moves 🔴 → 🟢 (reputation inputs certified; intra-dispute evidence sharing + groups/
friends depth are noted follow-ups). Next per the tracker: **Seer** (per-engine — Opportunity / Risk / Incentive
/ Forecasting / Visibility), much of which overlaps Commerce (Discovery/Visibility certified in Phase 5) and the
market-stability engines; the remaining engines get a dedicated pass.
