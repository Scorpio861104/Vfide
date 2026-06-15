# VFIDE Master Completion — Cohesion & Experience Audit (Wave 75)

An experience/cohesion audit (not infrastructure). The central finding is concrete and evidence-backed,
and I closed the single highest-impact gap rather than only documenting it. Verified: typecheck 0, nav 0
broken, **73 tests / 7 suites**, no regression.

## THE CENTRAL FINDING (Phase 8 cohesion + Phase 9 grandmother test)
**Most of the intelligence built across Waves 66–72 is backend-only — a participant cannot see it.**
Evidence (UI consumers, `grep` across `app/`+`components/`+`hooks/`):
| Engine (built + tested) | UI consumers before this wave |
|---|---|
| Merchant HQ payload (`/api/merchant/hq`) | **0** |
| Discovery ranking (`/api/discovery`) | **0** |
| Merchant Transparency Panel | **0** |
| Opportunity / Risk Center | **0** |
| Merchant Health composite | **0** |
This is *the* cohesion problem: the systems exist and are correct, but they don't yet *feel* like
anything because they aren't surfaced. "Do these feel like one system?" — not yet, because the
intelligence is invisible at the UI.

## WHAT I CLOSED THIS WAVE (the highest-impact gap, wired into existing UI)
Surfaced the Merchant HQ intelligence on the actual merchant page:
- **`hooks/useMerchantHQ.ts`** — consumes `/api/merchant/hq` (mirrors the existing `useMarketStanding`
  pattern; treats 401/not-a-merchant as a quiet empty state).
- **`components/merchant/MerchantOpportunityRisk.tsx`** — renders the **Opportunity Center**
  (cause → benefit → action, emerald/encouraging) and **Risk Center** (cause → impact → mitigation,
  amber/red by level), plus the health summary, in the codebase's zinc/cyan palette. Every risk reaffirms
  "none of these affect your ownership."
- Wired into **`app/merchant/page.tsx`** below the existing HQ section.
- **Result:** HQ payload UI consumers went **0 → 2** (hook + component on the page). The Opportunity/Risk
  Center a merchant sees is now the structured intelligence from the backend, not a dead payload.

This makes the Seer feel like an **advisor, not a judge** (Phase 2): opportunities are framed as
encouragement; risks always carry a concrete next step and an ownership-safety reassurance.

## PHASE 1 — Command Center audit
**Evidence:** `components/seer/SeerCommandCenter.tsx` exists; nav exposes Dashboard + Seer. The command
surfaces are real, but (per the central finding) the richest signals weren't reachable. **Constitution
principle:** every card must yield Action / Opportunity / Protection / Preparedness / Understanding — the
new Opportunity/Risk Center embodies this (each entry has an action/mitigation). **Remaining:** the
standalone Seer command page should consume the same HQ/discovery payloads (currently `/api/discovery`
has 0 UI consumers).

## PHASE 2 — Seer Explainability Framework
**Evidence:** discovery returns `whyRanked` (itemized contributions); HQ returns cause/effect/action.
The *data* for explainability exists end-to-end. **Framework:** for every recommendation show — why it
appeared (the `cause`), what data (the signal), what improves/hurts it (opportunity vs risk), what to do
(the `action`). The new component renders exactly this shape. **Remaining:** the Seer *page* itself
(`app/seer/page.tsx`) shows minimal explainability (1 "why/improve" reference) — it should adopt the same
cause→action rendering.

## PHASE 3 — Merchant HQ Constitution
**Evidence:** `/api/merchant/hq` composes Merchant Health, Builder Record, Trust, Continuity, Recovery,
Lending, Extraction, Stability-Bonding preview, Opportunity Center, Risk Center (all tested). The merchant
can now answer **"How am I doing?"** (health score + band) and **"What should I do next?"** (Opportunity/
Risk Center actions) — *now visible on the page*. **Remaining:** the page still also renders the older
`useMerchantHealth` summary; consolidating onto the HQ payload would remove the dual-source seam.

## PHASE 4 — Discovery Constitution
**Evidence (`lib/seer/discovery.ts`):** ranking = relevance bucket (dominant) → trust ≤30 → delivery ≤20
→ commerce health ≤10 → Builder ≤8 → new-merchant ≤12 → distance ≤10 → fraud −60. **Forbidden inputs are
structurally absent** from `MerchantDiscoverySignals` — no wealth/holdings/followers/ad-spend field
exists (proven by a test). Trust, reliability, and Builder contribution **do** influence discovery;
wealth/popularity/ad-spend **cannot**. **Remaining:** discovery's `whyRanked` is computed but has **0 UI
consumers** — merchants can't yet see why they rank. (Highest-value next wiring.)

## PHASE 5 — Marketplace Experience Report
**Evidence:** `buildTransparencyPanel` (grandmother test: who/trust/delivery/what-if) exists but has **0
UI consumers**. So today a customer *cannot* readily see "can I trust this merchant / will they deliver."
**Gap:** wire the transparency panel into the marketplace/merchant storefront (the customer-facing half
of what I wired for merchants this wave).

## PHASE 6 — Continuity Experience Report
**Evidence:** Continuity is in nav (Continuity / Guardians / Recovery / Inheritance) and the DB succession
state machine is executable. Plain-language help exists (`PlainHelp`). **Reasonably coherent**; the
non-technical framing ("set a successor and emergency operator") is present in the Risk Center mitigation.
**Remaining:** family vs merchant continuity are separate surfaces; a single "preparedness" entry point
would reduce navigation overlap.

## PHASE 7 — Recovery Experience Report
**Evidence:** Recovery is contract-backed (`useVaultRecovery` → real `writeContractAsync`) and in nav.
The Risk Center now answers **"Am I protected?"** (recovery-not-configured → mitigation). **Coherent**;
"what happens if I lose access" is addressed via guardians. **Remaining:** surface recovery readiness in
the command center, not only on the recovery page.

## PHASE 8 — Cohesion Report
- **Terminology: strong.** "citizen" is fully purged (0 references — a past cleanup held). Consistent
  institutional vocabulary in nav: Vault, ProofScore, Continuity, Guardians, Recovery, Marketplace,
  Governance, Sanctum, Seer.
- **Asymmetry:** "ProofScore" appears in 136 UI files; "Builder Record" in 3. Newer institutions are
  under-surfaced relative to their backend depth — the central finding.
- **Navigation: single source** (`components/navigation/navigationItems.ts`) — good. 143 routes; the
  26-route merchant cluster is coherent, but many singleton routes (theme-showcase, demos) add noise.
- **Overlap:** Continuity vs Inheritance vs Recovery are adjacent concepts on separate surfaces.

## PHASE 9 — Grandmother Test Report
| Workflow | Understandable to a non-technical person? | Evidence |
|---|---|---|
| Ownership | ✅ "your tokens are always yours" messaging | reinforced in new Risk Center |
| Recovery | ✅ guardians + "what if I lose access" | nav + contract-backed |
| Continuity | ⚠️ two surfaces (family/merchant) | PlainHelp present |
| Merchant HQ | ✅ **now** (health + opportunities + risks visible) | wired this wave |
| Marketplace trust | ❌ transparency panel not surfaced | 0 UI consumers |
| Discovery | ⚠️ ranking fair but "why" not shown | whyRanked unsurfaced |
| Builder Record | ⚠️ now visible in HQ; thin elsewhere | 3 → more files |

## PHASE 10 — Final completion (experience, not infrastructure)
**What still feels unfinished/disconnected/immature (honest):**
1. **Customer-facing transparency** — the merchant half is wired; the *customer* half (transparency panel
   in marketplace) is the symmetric gap. Highest remaining experience priority.
2. **Discovery explainability in UI** — `whyRanked` exists but isn't shown; merchants can't see why they
   rank or how to improve.
3. **Seer page explainability** — the page lags the data; should adopt cause→action rendering.
4. **Dual-source merchant page** — old `useMerchantHealth` + new HQ payload coexist; consolidate.
5. **Institutional overlap** — Continuity / Inheritance / Recovery could share one "preparedness" entry.
6. **Route noise** — demo/theme/showcase singletons dilute the institutional map.

**None of this is missing intelligence — it's unsurfaced intelligence.** The civilization is built; this
wave connected one of its most important rooms (Merchant HQ) to the door. The remaining work is the same
move repeated: wire transparency panel → marketplace, `whyRanked` → discovery UI, HQ payload → Seer page.

## Honest caveats
- The new hook/component are typecheck-clean and follow the established pattern, but are **not exercised
  by a live browser/DB here** — they render real `/api/merchant/hq` data at runtime (a launch-gate check).
- This wave deliberately surfaced the **highest-impact** gap (Merchant HQ). The customer-facing
  transparency panel and discovery `whyRanked` are the next two, called out explicitly rather than
  silently bundled.

## Bottom line
VFIDE's systems are complete; its **cohesion gap is that the intelligence was invisible.** This wave
proved that with evidence (5 engines at 0 UI consumers) and closed the biggest one — the Merchant HQ
Opportunity/Risk Center is now something a merchant can actually see and act on. The path to "one
civilization" is finishing the surfacing: transparency panel, discovery explainability, and the Seer page,
each a known, scoped wiring, not new architecture.
