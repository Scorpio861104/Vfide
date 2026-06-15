# Discovery & Search — Capability Certification (Backend Completion Campaign 9 · CLOSES WAVE C)

Full certification of VFIDE's merchant/product discovery ranking (`lib/seer/discovery.ts` + `/api/discovery`).
Model: `lib/audit/discoverySearchModel.ts`; matrix: `__tests__/audit/discoverySearch.test.ts` (**155 scenarios; all
pass; typecheck 0; full audit suite 1933/38 green**). Target (150+) met.

## The headline: you cannot buy ranking
The ranking engine's defining property answers "can ranking be gamed or bought?" — **no, not bought**, by
construction:
- **Forbidden inputs are unrepresentable (PAY-*, GAME-01, CLOSE-01):** token holdings, wallet balance, treasury
  size, follower/social counts, and paid-visibility spend are **intentionally absent from the signal type** — they
  cannot be passed into the ranking function. There is no pay-to-rank surface to exploit.
- **Relevance dominates merit (REL-*, BD-*, PW-*, CLOSE-02):** ranking sorts by relevance **bucket** first, merit
  only within a bucket — so a more-relevant result **always** outranks a less-relevant one, no matter how trusted,
  contributive, or (hypothetically) wealthy the latter is. "Trust cannot buy its way past relevance," proven across
  the full bucket-pair grid.
- **Merit = real outcomes (MERIT-*, GAME-02):** the within-bucket ordering uses verification, delivery reliability
  (buyer-confirmed — Campaign 8), refund/dispute behavior (DAO-arbitrated — Campaign 4), and ProofScore — signals a
  merchant **cannot fake**. A keyword-stuffer with poor delivery loses to an honest merchant in the same bucket.

## Certified-sound properties
- **Capped bonuses (CAP-*, LBUILD/LNEW, GAME-03/04):** the Builder bonus is capped (≤10) and the new-merchant boost
  is bounded/decaying — neither can leapfrog relevance or out-rank a trusted incumbent on merit.
- **Fraud demotes visibility, never ownership (FRAUD-*, CLOSE-04):** upheld disputes reduce a merchant's discovery
  score (lower ranking) monotonically up to a capped penalty; ownership is never affected (non-custodial-consistent).
- **Explainable + deterministic (ORD-*, MORD-*):** every signal's contribution is returned ("why is this here?"),
  and ordering is a pure function with a stable address tiebreak — no black-box, no run-to-run shuffle.
- **Privacy (PRIV-*, CLOSE-05):** discovery exposes **public merchant data only** (address, products, verification,
  reliability, dispute outcomes) — no email/phone/PII; it is a public read that never mutates state.

## Findings
### DS-2 (LOW–MEDIUM) — Suspended/delisted merchants are not excluded from discovery
The discovery query has **no WHERE clause excluding suspended/delisted merchants**; the fraud-risk signal only
**demotes** merchants with **upheld disputes** (FIND-DS2). A merchant suspended for other reasons (e.g., auto-
suspension from refund count, or on-chain delisting) could still appear in results, possibly without demotion. It is
**mitigated** — escrow **blocks transactions** to a suspended/delisted merchant regardless of discoverability
(Campaign 4, FIND-DS2-mitigation) — so a buyer cannot complete a purchase to them. But the off-chain discovery
surface and the merchant-status surface are not directly wired. **Recommendation:** incorporate suspended/delisted
status into discovery (exclude, or explicitly demote). **Tracked open.**

### DS-1 (LOW) — Relevance derives from merchant-authored text
Relevance is a text match on merchant-controlled fields (name=3 / short_desc=2 / desc=1 / display_name=2), so
keyword-stuffing can influence it (FIND-DS1). It is **heavily bounded**: relevance is **bucketed** (within a bucket,
merit — not relevance inflation — decides, STUFF-*), **capped per field**, and **backstopped by merit** (real
outcomes that can't be faked, so a stuffer with poor merit still loses). Gaming benefit is limited but relevance is
not fully stuffing-proof. **Recommendation:** relevance normalization / anti-stuffing heuristics. **Tracked open.**

## Certification status (ledger)
**Discovery & Search: Exists = Yes · Certified (src+model) = Yes (155 scenarios) · Findings = DS-1 LOW (authored-text
relevance), DS-2 LOW-MED (suspended not excluded) · Findings-Fixed = No (open).** Open boundary: service e2e (DB FTS
+ the on-chain merchant status that gates transactions).
