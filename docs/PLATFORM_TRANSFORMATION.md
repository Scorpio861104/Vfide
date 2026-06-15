# VFIDE Platform Transformation — Campaign Charter & Wave 1

**Status: COMPLETE — all 7 waves delivered (Foundation, Command Center, Headquarters, Seer, Academy, Playbooks, Simulation Bureau, Community Network).**

This is a platform transformation, not a redesign: turning ~147 pages and ~372 components into a unified adaptive
operating environment — a premium personal headquarters for freedom, ownership, preparedness, trust, commerce,
governance, learning, and connection. Because the surface is large and mature, the transformation runs as sequenced
waves on a shared foundation rather than a single rewrite, so the existing app keeps working throughout.

## Calibrated scope (what is real today)
Wave 1 builds the **load-bearing foundation** and the **Command Center reference surface** that proves it. The
remaining environments (full headquarters pages, embedded Academy, Playbook engine, Simulation bureau, Community
network) are real subsequent waves — not built yet. Nothing in this doc claims they are. The repo state is green
(typecheck 0; full suite 2638/42).

## Wave 1 — delivered
**Visual doctrine as real tokens** — `lib/design/hqTokens.ts`. A cool charcoal foundation (never pure black), muted
architectural gold as the primary accent (never bright yellow), and a muted jewel tone per domain (Ownership→Gold,
Business→Sapphire, Preparedness→Amber, Trust→Emerald, Governance→Violet). Scoped under a `.hq-root` wrapper via
`HQRoot`, so the doctrine applies to the new environment **without disturbing the 372 legacy components** that use
the existing cyan token system. Sculpted depth (surfaces, layers, quiet accents) instead of card spam.

**Adaptive architecture as a real model** — `lib/headquarters/model.ts`. Five headquarters (Ownership, Business,
Preparedness, Trust, Governance) plus the Command Center briefing and a Profile, each answering one question and
aggregating a capability catalog. Every capability carries an honest status — **Ready / In progress / Coming** (the
same discipline as `lib/seer/coverage`) — and searchable keywords. It **maps onto** the existing seven-institution
civilization model and real routes; it does not replace it.

**The adaptive engine** — `lib/headquarters/adaptive.ts`. The spec's central rule, made concrete and deterministic
(no LLM, matching the Seer's philosophy):
- **Adaptive Emphasis** — emphasis, priority, and ordering adapt to the participant's goals, life/business/
  preparedness stage, trust maturity, configured systems, and usage.
- **Universal Discoverability** — capabilities are NEVER hidden, removed, or made secret. `computeEmphasis` returns
  *every* capability exactly once; only emphasis and order vary. `searchCapabilities` always reaches the whole
  catalog, even for de-emphasized items. This invariant is asserted by tests (`__tests__/headquarters/adaptive.test.ts`,
  25 scenarios across a signal matrix), including that a **'coming' capability is never surfaced as a primary
  action** (honesty) and that **emphasis is deterministic**.

**The Command Center briefing environment** — `app/command-center/page.tsx`. Not a dashboard — a briefing. A calm
thesis header, a prominent **universal search** (discoverability made visible), an adaptive "what's worth your
attention" list, the five headquarters laid out as environments, and a Seer line that explains rather than decides.
Wave 1 orders capabilities with the real engine from neutral signals; wiring live participant signals (vault state,
ProofScore, continuity readiness) deepens personalization in a later wave — so the briefing shows truthful
availability and real structure without claiming a personalized protection status it has not yet computed.

**Primary navigation** — `components/headquarters/PrimaryNav.tsx`. The flat, non-sprawling nav: Command Center,
Ownership, Business, Preparedness, Trust, Governance, Profile — each headquarters in its jewel tone.

## Wave 2 — delivered
**The five headquarters as environments** — `components/headquarters/HeadquartersEnvironment.tsx` +
`app/hq/[domain]/page.tsx` (a validated dynamic route; Next 16 async params). Each headquarters opens with its
question, then shows a **real status reading for the participant** wired to the existing subsystem hooks:
- **Ownership / Preparedness** read `useContinuityStatus().readiness` → "You are protected" / "Partly set up" /
  "Needs setup", or a plain prompt to connect.
- **Trust** reads `useProofScore().score` → the actual ProofScore with an honest band note.
- **Business** reads `useMerchantHealth()` for a live account reading.
- **Governance** has no single composite metric, so it states what participation means rather than inventing one.

Below the reading, the domain's capabilities are **adaptive-ordered** (Start here / Worth a look / Everything
else) with honest availability, each linking to its real tool route, plus a domain-specific Seer line that explains
rather than decides. The primary nav and Command Center now route into these `/hq/<domain>` environments. Nothing
is fabricated: where a participant has not connected or set something up, the reading says so.

## Wave 3 — delivered
**The Seer made live** — `lib/seer/headquartersObservations.ts` + `hooks/useSeerInputs.ts` +
`components/headquarters/SeerPanel.tsx`. The static Seer lines from Waves 1–2 are replaced by a **deterministic
observation engine** that reads real participant state (wallet connection, ProofScore, continuity readiness,
merchant activity) and produces typed observations — EXPLAIN, TEACH, WARN, OPPORTUNITY, RECOMMEND, CONNECT — with a
severity that mirrors the existing `lib/seer/merchantAdvisor` vocabulary for one consistent Seer voice. It never
decides; the participant always acts.

Honest by construction, asserted by `__tests__/headquarters/seerObservations.test.ts` (14 scenarios):
- **No fabricated warnings** — the protection-gap concern fires ONLY when continuity readiness is actually
  incomplete; a protected participant never sees a concern.
- **Live-only recommendations** — every action the Seer offers points to a real, usable route; it never recommends
  a capability that is not built.
- **Deterministic** — the same inputs always produce the same observations, ordered by severity (concern first).

`SeerPanel` renders these with a quiet, severity-appropriate treatment (concern amber, settled emerald, the rest
calm — never alarmist) and is wired into the Command Center (whole-picture briefing) and every headquarters
environment (domain-scoped, including the cross-cutting reassurances like "guardians help you recover, never control
your funds").

## Wave 4 — delivered
**Academy embedded, not a portal** — `components/headquarters/HeadquartersAcademy.tsx` +
`lib/academy/headquartersContent.ts`. Rather than build a parallel lesson system, this **reuses the existing in-place
education** (`KnowledgePanelGroup` — collapsed by default, "open any to learn in place, no navigation required") and
the domain content already written for trust, commerce, and continuity, then **adds the two domains that had no
embedded learning yet** — Preparedness and Governance — in the same plain-language, participant-owned voice. Each
headquarters maps to its learning (`HQ_ACADEMY_MAP`), so a lesson appears exactly where it is relevant: directly
beneath the Seer that teaches it, in the headquarters environment.

Honest by construction, asserted by `__tests__/headquarters/academy.test.ts` (14 scenarios): every headquarters
maps to learning, each maps to a distinct source, every panel is well-formed, and forward-looking copy is **hedged**
— the business-continuity panel explicitly says it is "still being built," governance copy reassures that
participation never puts funds at risk and the treasury is separate from the personal vault, and preparedness copy
reinforces participant control. The three "Future" academies in the spec (Workforce, Leadership, Operations) are not
asserted as available.

## Wave 5 — delivered
**Playbook engine** — `lib/playbooks/model.ts` + `lib/playbooks/progress.ts` +
`components/headquarters/PlaybooksPanel.tsx` + `app/playbooks/page.tsx`. Operational journeys — Protect Assets,
Complete Continuity, Prepare Family, Start Selling, Grow Business, Hire Employees, Improve Preparedness, Improve
Trust — each an ordered set of steps. Every step **references a capability by id**, so it inherits the real route and
honest status from the single source of truth; a Veritas fix along the way repointed three capability links that had
gone to dead routes.

Progress is **derived from the same real signals the Seer reads** (continuity readiness, ProofScore, merchant
activity), and is deliberately conservative — a step is marked done only when a real signal confirms it; otherwise it
is neutral ('unknown'), never falsely complete. A journey that includes a not-yet-fully-built step is marked
**"partly available,"** so nothing implies a journey can be finished when it cannot.

Asserted by `__tests__/headquarters/playbooks.test.ts` (14 scenarios): every step resolves to a real capability;
availability is 'available' only when every step is live; not-connected yields zero completed steps; 'coming' steps
never read as done; unconfirmable steps stay 'unknown'; progress is deterministic; and the recommended next journey
never points to one that cannot be started. Journeys surface in context — a recommended one on the Command Center,
the domain's journeys inside each headquarters, and all of them at `/playbooks` (reached from the work, not the nav).

## Wave 6 — delivered
**Simulation Bureau** — `lib/simulations/model.ts` + `lib/simulations/engines.ts` +
`components/headquarters/SimulationRunner.tsx` + `app/simulations/page.tsx`. Understand consequences before reality
forces them, in three honest kinds:
- **Walk-throughs** (Lost Phone, Inheritance Event) — deterministic, factual walks through the REAL protocol
  mechanics, grounded in the actual on-chain constants (recovery 30 days; inheritance veto 30 / claim 90 / finalize
  floor 14 / memorial 365). They teach exactly what happens; they predict nothing.
- **Calculators** (Emergency Fund, Income Loss) — pure arithmetic on the participant's OWN numbers (how long given
  savings last at a given spend / income shortfall). They show the math for the figures entered, not a forecast.
- **Illustration** (Long-Term Thinking) — a fixed example used to teach a behavioral pattern, explicitly not market
  data, not a prediction, and not advice.

The hard rule — **educational only, no predictions, no financial advice** — is enforced, not just stated. Asserted by
`__tests__/headquarters/simulations.test.ts` (16 scenarios): the walk-through constants must equal the deployed
protocol values (30 / 90 / 14 / 365 / 30); calculators are deterministic and divide-safe; the illustration's lesson
disclaims advice and prediction; **every** simulator's framing must contain "educational" and a "not a prediction /
not advice" disclaimer, and **none** may contain advice or prediction language (you should, guaranteed, will
earn, buy now…). The recommended simulator only ever points to a live one. The full vision across all five
categories is catalogued honestly, with not-yet-built simulators marked "Coming."

## Wave 7 — delivered
**Community Network — the freedom-first social layer** — `lib/community/model.ts` + `lib/community/feed.ts` +
`components/headquarters/CommunityNetwork.tsx` + `app/community/page.tsx`. Eight sections (People, Communities,
Commerce, Learning, Preparedness, Governance, Messaging, Global Connection), a composer for human posts (life,
family, and business milestones, experiences, lessons, hobbies, interests, ideas, products, services), and a feed the
viewer shapes with their own interests.

The spec's hardest rules are enforced **structurally, not as a promise** — the same precedent the discovery engine
set when it made paid-ranking inputs unrepresentable:
- The `CommunityPost` type has **no** popularity score, like/reaction count, follower count, ranking score,
  engagement score, or trending score. The forbidden signals are enumerated (`FORBIDDEN_SOCIAL_SIGNALS`) and a guard
  (`isFreeOfSocialScoring`) proves a content shape carries none of them.
- `orderFeed(posts, ctx)` is given **only** the posts and the viewer's own interests/communities. It has no access to
  any popularity or engagement data, so it cannot optimize for attention — "no engagement manipulation" becomes an
  absence of capability rather than a pledge. Ordering is viewer-relevance then recency, deterministic.
- People are never ranked, scored, judged, or approved; responses are conversation, never a score, and never affect
  feed order.

Asserted by `__tests__/headquarters/community.test.ts` (12 scenarios): forbidden signals are absent from posts; the
guard catches an injected `likeCount`/`rank`; the invariant functions all return false; the feed orders by recency
and viewer-chosen interest (community match outweighs interest match), is deterministic, and has no popularity field
to consult; and human, non-VFIDE post kinds exist so the network stays about people.

**Honest scope note:** this is a NEW freedom-first layer. Legacy social-commerce components elsewhere in the app
(product reels/shoppable posts) still carry product "likes," and a separate gamification leaderboard exists; this wave
does not retrofit those. The Community Network embodies the Freedom Principle in its own model.

---

## The transformation, complete
All seven waves are delivered. VFIDE now presents as a unified adaptive operating environment — a personal
headquarters — over the existing protocol and component base:
1. **Foundation + Command Center** — visual doctrine (charcoal + architectural gold, per-domain jewel tones), the
   headquarters model + capability catalog, and the adaptive emphasis engine whose invariant is that EVERY capability
   is always present (discoverability), only emphasis and order adapt.
2. **Headquarters environments** — five environments (Ownership, Business, Preparedness, Trust, Governance) wired to
   real subsystem state.
3. **Seer everywhere** — a deterministic observation layer that explains, teaches, warns, and recommends, never
   decides, never fabricates a warning, and only ever recommends a live action.
4. **Academy embedded** — learning in place, beside the work, honest about what is built.
5. **Playbook engine** — operational journeys over the capability catalog with progress derived from real signals,
   honest about what cannot yet be completed.
6. **Simulation Bureau** — educational simulators grounded in the real protocol constants, with no predictions and no
   advice — enforced.
7. **Community Network** — a human, freedom-first social layer with no popularity, ranking, or social credit, enforced
   in the data model.

A single discipline runs through all seven: **every surface honestly represents what is live, partial, coming, or
unavailable** — Veritas Law. Typecheck is clean and the full suite is green throughout.

## Foundational principles (carried by every later wave)
- **Protection without control. Guidance without authority. Transparency without surveillance. Trust through
  evidence.** The participant remains sovereign; the platform orders and explains, never decides or seizes.
- **Adaptive Emphasis, Universal Discoverability** — enforced in code, not just intent.
- **Veritas Law** — every surface represents truthfully what is Ready / In progress / Coming.

## Wave plan (sequenced)
- **Wave 1 — Foundation + Command Center.** ✅ Delivered.
- **Wave 2 — Headquarters environments.** ✅ Delivered.
- **Wave 3 — Seer everywhere.** ✅ Delivered.
- **Wave 4 — Academy embedded.** ✅ Delivered.
- **Wave 5 — Playbook engine.** ✅ Delivered.
- **Wave 6 — Simulation bureau.** ✅ Delivered.
- **Wave 7 — Community network.** ✅ Delivered.

## Success condition (the north star)
A participant enters VFIDE and immediately understands what they own, how protected and prepared they are, how their
business is doing, what opportunities exist, and what to learn or simulate — without feeling overwhelmed. "This is my
headquarters," not "this is an app."
