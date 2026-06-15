# Wave 84 — Commerce Civilization Audit

The first civilization-level audit. Not "is each institution complete?" (all six are, Waves 78–83) but
"do Builder Record, Merchant Trust, Merchant Health, Merchant HQ, Discovery, and Seer operate as ONE
organism?" The hunt was for defects in the SEAMS between institutions — drift, broken handoffs, duplicate
calculations, terminology collisions. It found **one real defect** and verified six flows are coherent.
Verified: typecheck 0, nav 0 broken, **109 tests / 11 suites** (+5 cross-institution), no regression.

## The defect found — Terminology collision (two health vocabularies)
Only a cross-institution audit surfaces this: the same concept ("merchant health") spoke **two different
languages** depending on the surface.
- The **composite Merchant Health** institution (the audited engine) uses bands: `provisional / at_risk /
  developing / healthy / thriving`.
- The **crude `useMerchantHealth` hook** (on-chain `txCount`/`isMerchant`) used: `Healthy / Growing / At
  Risk / Inactive / Unknown`.

So a merchant saw **"Growing"** on their dashboard (MerchantSummaryCard) and **"developing"** in their HQ —
same business, contradictory health words on different pages. Worse, MerchantOperatingModel labeled the
crude state "Overall business health", directly competing with the composite. (Wave 81 fixed the HQ
*headline* to defer to the composite, but the crude vocabulary still surfaced in the dashboard card, the
operating-model row, and component fallbacks.)

**Fix (alignment, not false merging):** the two measure genuinely different things — account *activity* vs
the weighted *health score* — so merging their semantics would be dishonest. Instead the crude state now
renders through a **de-collided account-status vocabulary** (`Active / Getting started / Attention needed /
Not active / —`) that shares **no word** with the composite bands. The composite remains the single
"health" figure; the crude state reads honestly as account status. A new test asserts the two vocabularies
are disjoint so they can never collide again. MerchantOperatingModel's misleading "Overall business health"
note was corrected to "Whether your store is actively transacting."

## The six flows — traced and verified
### 1. Trust flow ✅ (Builder → Trust → Health → Discovery → Seer)
**Coherent.** All four trust consumers (HQ, storefront transparency, discovery-standing, discovery
ranking) call the canonical `computeMerchantTrust` with **identical inputs** (verified, disputesUpheld,
refundsGranted, disputesTotal, confirmedPayments) read from the **same tables** (disputes.respondent_address,
merchant_payment_confirmations, verified_at). A merchant's trust is the SAME number everywhere. The W79
split-brain fix held. Merchant Health consumes that exact `trust.score` (a test proves the handoff
preserves the value, not a re-derivation).

### 2. Builder flow ✅ (Activity → Builder Record → everywhere)
**Coherent.** All five consumers (HQ, discovery, discovery-standing, Seer market-standing, Sanctum) use the
same canonical `deriveBuilderSignals` + `computeBuilderRecord`. Same merchant, same Builder Record
everywhere. (Discovery enriches builder for the top-20 only — a documented W82 perf bound; builder only
ever adds, so order stays honest.)

### 3. Recovery flow ✅ (no permanent economic exile)
**Coherent — every penalty mechanic has a recovery path:**
- Trust: upheld-dispute penalty is offset by a bounded proven-track-record signal (W79) — earned rebuild.
- Extraction: decays continuously over 90 days (`applyDecay` on every read; fractional periods).
- Fraud (discovery): penalty scales with *current* fraudRisk — clears when disputes resolve (W82).
- Health: provisional for thin data; renormalizes as real signals arrive.
No mechanic is permanent. Tests assert extraction decays and trust rebuilds.

### 4. Visibility flow ✅ (no hidden intelligence)
**Coherent.** Every key institution signal now reaches the participant: Builder Record (MarketStandingPanel
+ SeerStandingExplainer), Merchant Trust (storefront MerchantTrustPanel), composite Health
(MerchantOpportunityRisk + Hero), Discovery whyRanked (MerchantDiscoveryStanding), Seer lending
(SeerLendingTerms, wired W83), Seer coverage (SeerCommandCenter). The invisible-intelligence pattern the
campaigns kept finding (W76/79/80/82/83) is now closed across the stack.

### 5. Terminology flow ⚠️→✅ (the defect above; now fixed)
Trust labels (building/established/strong) and Builder categories (Newcomer…Institutional Merchant) were
already perfectly consistent across institutions. Health was the lone collision — now de-collided.

### 6. Grandmother civilization test ✅
After this wave a merchant sees ONE coherent picture: a single trust number, a single health figure (the
composite), account status in distinct words, their Builder Record and discovery standing explained, and
the Seer's advice — all using consistent vocabulary, all reaching them, none contradicting. The "advisor
not authority" framing (W83) is consistent throughout: VFIDE proposes, the DAO governs, tokens stay yours.

## What was already coherent (verified, not assumed)
- **No duplicate calculations:** trust, builder, health, discovery each have exactly ONE canonical engine;
  consumers call it rather than re-deriving. (The W79 trust split-brain was the last duplication; it's
  fixed and now test-locked.)
- **Consistent handoffs:** the value one institution produces is the value the next consumes (trust →
  health proven by test).
- **No forbidden cross-contamination:** wealth/holdings/popularity/ad-spend remain structurally absent from
  every engine's inputs.

## New tests (cross-institution, not per-engine)
5 civilization invariants: trust determinism (one concept), trust→health handoff fidelity, vocabulary
disjointness, extraction-decay recovery, trust-rebuild recovery.

## Remaining caveats (honest)
- "Coherent" here means verified by code-trace + engine tests + typecheck; **not** executed end-to-end
  against a live Postgres/browser (a launch-gate check — and the strongest argument for standing up the
  real stack, since the Discovery phantom-column bug in W82 showed SQL drift hides from typecheck).
- The crude `useMerchantHealth` hook still exists (it serves the activity rows + trust/customer/continuity
  sub-panels it's suited for). This audit eliminated its vocabulary *collision* with the composite, not the
  hook itself. Fully unifying onto one merchant-data source remains a reasonable future refactor — flagged,
  not forced.
- This audit covers the COMMERCE civilization (six institutions). Ownership, Recovery, Governance,
  Continuity, Sanctum, etc. are separate institutions (many infrastructure-gated) and are not in scope here.

## Conclusion
The six commerce institutions operate as **one coherent organism**, not six independent systems. Trust
means one thing everywhere; Builder Record means one thing everywhere; every penalty is recoverable; every
signal reaches the participant; and — the one real seam defect — the two health vocabularies that
contradicted each other are now disjoint. The commerce civilization passes.

**Across the full commerce campaign: 18 meaningful defects found and fixed** (17 in the six institution
campaigns + 1 civilization-level terminology collision), including two runtime-fatal bugs that typecheck
could not catch.

## Next
The commerce civilization is verified. Reasonable next steps: (a) begin institution campaigns on the
non-commerce stack (Ownership/Vault, Recovery, Governance, Continuity, Sanctum) — though several are
infrastructure-gated on contract audit/deploy; or (b) stand up the live stack (Postgres + RPC + indexer +
contract audit) to convert the six off-chain-Verified institutions into live-runtime-Complete, which is the
real remaining gate before launch.
