# VFIDE Wave 68 — Consume the Intelligence (Trace Map)

This wave closed the one place major intelligence wasn't consumed — the Merchant HQ payload — and
documents the full consumption trace. **Wired into the existing HQ route, no standalone files.**
Verified: typecheck **0 errors**, nav **0 broken**, **62 tests passing across 6 suites** (up from 60).

## What was actually missing (the audit result)
Builder Record and Extraction Index were already consumed almost everywhere — the audit found exactly
**one gap**: the Merchant HQ aggregation (`/api/merchant/hq`) had **0 builder, 0 extraction, 0 lending**
references. Everything else (lending policy, stability policy, discovery, market-standing, command
center) already consumed them. So this wave is a targeted closure, not a rebuild.

## Wired this wave — Builder + Extraction + Lending into Merchant HQ (Phase 3)
`app/api/merchant/hq/route.ts` now composes the same proven pattern as `/api/seer/market-standing`:
- **Builder section** — score, classification, contributing factors, and **opportunity signals** ("verify
  your business / participate in governance / configure recovery / set up continuity to raise your
  Builder Record"), each tied to a next action.
- **Lending section** — eligibility, on-chain max, suggested limit, fair interest range, risk tier, with
  an action ("you qualify for up to N VFIDE in growth financing").
- **Extraction section** — index + category + the ownership-safety note ("can reduce discretionary
  services, never affects ownership").
- **Snapshot** now carries `builderRecord`, `builderClassification`, and `extractionIndex` (previously
  absent).
- **Proven by runtime test:** `__tests__/api/merchant-hq.test.ts` (2 tests) exercises the handler with a
  mocked DB and asserts the Builder/Lending/Extraction sections appear with actions, and that a merchant
  with no governance/recovery/continuity gets concrete Builder opportunities.

## PHASE 1 — Builder Record consumption (traced, post-wave)
| Consumer | How it consumes Builder Record | Evidence |
|---|---|---|
| Lending (`lendingPolicy`) | `builderFavor` adjusts suggested limit + interest | 3 refs |
| Whale Protection (`stabilityPolicy`) | builder protection → lending/visibility/emergency | 6 refs |
| Discovery (`/api/discovery`) | top-N Builder enrichment in ranking | 12 refs |
| Market-standing (`/api/seer/market-standing`) | composes builder into standing + lending | 7 refs |
| Command Center (`SeerCommandCenter`) | displays builder | 3 refs |
| **Merchant HQ** | **NEW: builder section + opportunities + snapshot** | **23 refs** |
**No required consumer is missing.** Builder Record unlocks: better lending terms, marketplace
visibility, emergency eligibility, and now HQ opportunity signals.

## PHASE 2 — Extraction Index consumption (traced, post-wave)
| Consumer | How | Evidence |
|---|---|---|
| Lending | high extraction trims suggested limit, requires guarantor | 14 refs |
| Whale Protection | extraction → discretionary friction (never tokens) | 11 refs |
| Market-standing | composes extraction + persists state | 10 refs |
| **Merchant HQ** | **NEW: extraction posture surfaced with safety note** | **16 refs** |
DAO visibility: extraction-driven overrides are recorded in the DAO override ledger.

## PHASE 7 — Intelligence trace map (origin → consumers → outcomes)
| Signal | Origin | Storage | Consumers | Participant outcome |
|---|---|---|---|---|
| **Builder Record** | `deriveBuilderSignals` (merchant/gov/continuity/recovery) | computed on read | lending, whale, discovery, standing, command center, **HQ** | better terms, visibility, emergency eligibility, HQ opportunities |
| **Extraction Index** | `deriveExtractionSignals` (indexed transfers ← swap classification) | `extraction_index_state` | lending, whale, standing, **HQ**, override ledger | discretionary friction on extraction; ownership untouched |
| **Merchant Health** | `computeMerchantHealth` (composite) | computed on read | **HQ** | one glanceable health score + risk/growth signals |
| **Merchant Trust** | disputes/refunds/verification | `disputes` | discovery, HQ, health | visibility + buyer confidence |
| **Commerce Health** | `computeMerchantAdvisor` | computed on read | HQ, health | recommendations + retention/revenue intel |
| **Marketplace Trust** | disputes + delivery + builder | `disputes`/`shipments` | discovery ranking | honest visibility, fraud suppression |

## PHASE 8 — Runtime verification (evidence, not source-reading)
- HQ handler test (mocked DB): **Builder/Lending/Extraction sections present with actions** — 2 pass.
- The full engine + succession + business-transfer + HQ suites: **62 pass across 6 suites.**
- Honest limit: these are handler + unit level (mocked DB). True end-to-end against a live Postgres /
  chain / browser remains a launch gate — I can't run those here.

## FINAL — "How does each signal improve participant outcomes?"
| Signal | Outcome for the participant |
|---|---|
| Builder Record | Contribution → better lending terms, more visibility, emergency eligibility, and HQ shows *how* to grow it |
| Extraction Index | Protects honest participants by making extraction cost discretionary services (never their tokens) |
| Merchant Health | A merchant sees their whole business health + what to fix, in one glance |
| Merchant Trust | Reliable merchants rank higher; buyers see who delivers |
| Commerce Health | Concrete growth/retention recommendations |
| Marketplace Trust | Buyers find trustworthy stores; scams get suppressed, never via ownership |
Every signal now has a clear participant outcome — none exists only in code.

## Honest caveats
- Built + typecheck-clean + handler/unit-tested against your repo; **not run against a live DB/chain/browser**.
- HQ's Builder/Extraction reads do ~6 extra queries per HQ load (deriveBuilderSignals ~5 + proofscore +
  extraction). Acceptable for a single-merchant HQ view; if HQ is hit at high frequency, consider
  caching the Builder Record. Flagged honestly, not silently shipped.

## Bottom line
The intelligence is now consumed everywhere it should be — the Merchant HQ gap is closed, wired directly
into the existing route with opportunities and actions, and proven by a runtime handler test. No orphan
intelligence remains in the consumption audit; every major signal maps to a participant outcome.
