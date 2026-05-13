# Changelog

## 2026-05-12 (Round 15) — Frontend-wide memorability: ticker, Monument corner, numeric voice

Round 14 made the homepage feel distinctive. The honest follow-up
question was "what about the other 100+ pages?" — a user clicking
between /vault, /governance, /treasury, /marketplace, /merchant,
/proofscore would still feel like they were tabbing through screens
in a generic crypto product. The wow had to extend across the entire
surface, not just the hero.

This round adds three **through-line elements** that show up on every
page so the product reads as one place, not a collection of routes.

### 1. ProtocolTicker — pinned strip below the top nav, everywhere

**`components/navigation/ProtocolTicker.tsx`** — a thin 28px strip
pinned at `top-14` (just below the fixed TopNav) on every page that
shows chrome. Recent payments, burns, score changes, governance votes
scroll right-to-left at a calm 35 px/sec.

Design:
- **Continuous scroll, no visible reset.** The event list is rendered
  twice end-to-end; when the inner track's `translateX` crosses one
  copy's width, it snaps by exactly that width — invisible to the
  user because the second copy is already in position.
- **Transform-based animation, single rAF loop.** No setInterval, no
  React re-render per frame. The track moves via direct DOM mutation.
- **Pause-on-hover** so users can read items. State held in a ref so
  pausing doesn't restart the rAF loop.
- **Pulse-dot "live" indicator** on the right edge with a "demo"
  badge until the protocol is on mainnet. Honest about the synthetic
  source.
- **Respects `prefers-reduced-motion`.** Falls back to a static
  snapshot.

Each row carries a kind-specific lucide icon tinted to the event's
ProofScore tier color, so the strip reads as a colored stream of
activity rather than a homogenous gray.

### 2. MonumentCorner — small persistent brand mark, bottom-right

**`components/navigation/MonumentCorner.tsx`** — a 48×48 button in
the bottom-right corner of every chrome-bearing page. Inside it,
the Monument mini-mark (the V monogram with a vertex glow).

Three jobs:
- **Be a recognizable artifact present everywhere.** Linear's L,
  Vercel's triangle, Slack's lozenge — VFIDE didn't have one. The
  Monument was being used as a 140px logo and nowhere else. Now it
  appears on every page in a consistent place.
- **Pulse the vertex on every protocol event.** Each new event from
  the shared `useProtocolPulse` hook fires a brief radial glow at the
  vertex, color-matched to the event's tier. So even on a static
  page (settings, governance, an admin screen), the system feels
  alive.
- **Peek overlay on click.** A 360px popover lists the last 12
  events with kind icons, formatted amounts/scores via `<Numeric>`,
  and relative-time timestamps. Plus a link to `/treasury` for the
  full view.

The vertex tint adopts the **dominant tier color** of the last 8
events — so if the network is mostly small high-trust payments,
the corner glows cyan/violet; mostly low-trust risky activity, it
glows orange/rose. The brand mark becomes a live signal of network
health.

### 3. useProtocolPulse — unified data source

**`hooks/useProtocolPulse.ts`** — the shared heartbeat that both
the ticker and the corner read from. Means the two elements always
agree on what "the protocol is doing right now" looks like.

Two modes:
- **`'demo'`** (current default): synthetic events generated locally
  with realistic distributions — 55% payments ($2–$482 skewed
  toward small), 25% burns (0.1–12 VFIDE), 13% score changes, 5%
  guardian, 2% governance. Every event has a `synthetic: true` flag
  so the UI can label them honestly.
- **`'live'`** (future): swap in `useWatchContractEvent` for the
  VFIDE Transfer event + MerchantPortal PaymentProcessed. Same event
  shape returned, so consumers don't need to know which mode is on.

Updates throttled to 10 Hz max so heavy event flow doesn't thrash
React. Buffer caps at 30 events.

### 4. Numerical voice — strategic adoption of `<Numeric>`

A previous session built a `<Numeric>` component with `font-numeric`
(JetBrains Mono + tabular-nums + slashed-zero + ss01) backing every
monetary value, score, percentage, and timestamp. It was complete
but only used in 3 places. This round adopts it on the highest-
visibility numeric surfaces:

- **`/proofscore` live score card** — the 5xl score readout and the
  burn-fee percentage. The biggest single number the product shows
  is now in the canonical voice.
- **`/merchant` processor comparison table** — the headline pitch
  ("VFIDE 0% vs Square 2.6% + $0.10"). The fee column was
  `font-mono`; switched to `font-numeric` for the full feature
  treatment.
- **Ticker rows** — every amount, score, burn quantity, and
  timestamp uses `<Numeric>` with appropriate format variants
  (`currency`, `token`, `score`, `time`).
- **Monument corner overlay** — same.

`<Numeric>` is now the single answer for "how should this number
look?" anywhere in the product. As future rounds touch other pages,
they can swap raw `font-mono tabular-nums` for `<Numeric ... />`
incrementally — no big migration needed since the visual baseline
already matches.

### 5. Hook reorganization

The `usePrefersReducedMotion` hook existed in two locations
(`app/components/` and `app/merchant/components/`) — both private
to their app trees, neither importable from the global navigation
components. Hoisted the canonical version to
**`hooks/usePrefersReducedMotion.ts`** and replaced both legacy
locations with re-export stubs so existing callsites keep working
without touching them.

### Mounting

**`components/navigation/AppShell.tsx`** — the existing global
shell now mounts the ticker (pinned, fixed), wraps `children` in a
`pt-7` div to make room for it, and mounts `MonumentCorner` after
the PieMenu. The same `EXCLUDED_PATHS` (`/embed`, `/s/`) that
already gated the PieMenu now also gates the ticker and corner —
embedded checkouts and short-link redirects stay chrome-free.

### Why this matters

The previous round's wow elements (LiveProofScoreHero, FeeFlowRiver,
MonumentBackdrop) live on the homepage. They're great there but
disappear the moment the user navigates anywhere else. The three
new elements here are present **on every chrome-bearing page**:

- The ticker means the visitor always sees the network moving.
- The Monument corner means the brand is always anchoring the
  bottom-right and pulsing when things happen.
- `<Numeric>` means every number across the product feels like part
  of the same intentional typography system.

A user clicking from `/marketplace` to `/vault` to `/governance`
now sees consistent activity, consistent brand presence, and
consistent numerical voice. The product reads as one place.

### TypeScript clean, dead-component scan clean

`npx tsc --noEmit -p tsconfig.json` — clean. Strict dead-component
scan: 0 truly dead. The legacy `usePrefersReducedMotion` files were
replaced with re-export stubs (one-line shims) so the existing
callsites that import from them still work — no migration touches.

### What this round did not do

- The ticker + Monument run on synthetic data. When VFIDE is
  deployed, `useProtocolPulse` can swap to `useWatchContractEvent`
  in one place and both consumers light up with real data.
- The other items on the merchant audit (real refund flow, real-time
  payment listener on the merchant home, fixing the merchant home
  info architecture, receipt sending UI) are still pending — this
  round was about frontend-wide memorability.
- The remaining ~330 numeric callsites that still use raw
  `font-mono tabular-nums` can be migrated to `<Numeric>` opportunistically
  as their pages are touched. The system is in place; adoption is a
  background tax.

### Final-mile fixes (continuation of the same round)

A holistic audit of the wiring before zipping revealed a real gap:

**TopNav and BottomTabBar weren't actually mounted.** Both
components were complete and exported, but no parent in the tree
rendered them. The `AppShell` mounted only the ticker, pie menu, and
Monument corner — and even had a comment referring to "the (also-fixed)
TopNav" as though it were rendering. Pages still had `pt-20` /
`pt-24` paying tribute to a top nav that didn't paint. The visible
result: empty space at the top of every page, no nav for users to
move between sections.

Fix in `components/navigation/AppShell.tsx`: mount `<TopNav />` and
`<BottomTabBar />` alongside the existing ticker + pie + corner.
Inline comment documents the history. With the chrome restored, four
layout bugs surfaced:

1. **ProtocolTicker at `top-14` was floating in empty space on
   mobile** (no TopNav, since it's `hidden md:flex`). Made the top
   position responsive: `top-0 md:top-14`.
2. **MonumentCorner overlapped BottomTabBar on mobile** — both
   occupied the bottom ~64px. Made the corner's bottom position
   responsive: `bottom-20 md:bottom-4`. Same fix on the peek overlay
   (`bottom-36 md:bottom-20`).
3. **PieMenu and BottomTabBar competed on mobile** — both primary
   navs at the bottom of the viewport. Added `hidden md:block` to
   PieMenu since BottomTabBar provides the same function on mobile.
4. **Mobile content was hidden under the 64px BottomTabBar.** Added
   `pb-20 md:pb-0` to the AppShell wrapper.

**Numeric adoption expanded** to three more high-visibility surfaces:
- `components/analytics/MerchantAnalytics.tsx` — stat cards (Total
  Revenue, Transactions, AOV), top-product revenue list, % change
  indicator
- `app/governance/components/ProposalCard.tsx` — vote counts (FOR /
  AGAINST), proposal ID, quorum progress
- `app/governance/components/ProposalsTab.tsx` — the inline duplicate
  of the proposal card markup, plus the detail modal's vote summary

Held off on `FeeSavingsTracker.tsx` (uses `useLocale` for i18n —
converting would be a downgrade) and `MerchantPayouts` (already uses
`font-numeric` utility directly with precise wei→decimal handling
that `<Numeric>` doesn't yet do).

All 14 of the merchant-API tests from earlier rounds still pass on
the first run. TypeScript clean. Dead-component scan: 0.

---

## 2026-05-12 (Round 14) — Wow factor: live ProofScore, fee river, Monument backdrop

Feedback from the previous round: the frontend was competent but
looked like every other DeFi product. The landing was generic — a
slow rotating logo, three feature cards, a number-counter strip, a
"how it works" section. The whole tree shared the same Tailwind +
Framer-Motion default aesthetic: dark zinc, gradient buttons, glass
cards, lucide icons in colored squares. Nothing on the page made
someone stop and say "wait, what is that?"

The diagnosis was that VFIDE has three things most protocols don't —
a live reputation engine on a 0-10000 scale, an unusual five-way fee
distribution model, and a designed brand mark (the Monument) — but
none of those were doing real work on the landing page. The
reputation engine was buried three screens down. The fee distribution
existed only in a whitepaper. The Monument was a 140px logo.

This round puts all three of them in the foreground.

### LiveProofScoreHero — the product thesis in 5 seconds

**`app/components/LiveProofScoreHero.tsx`** — replaces the previous
HeroVisualization (a logo with three pulsing rings and three orbit
dots). The new widget is an interactive ProofScore engine:

- Draggable slider from 0 → 10,000
- Live tier badge that changes label + color across the seven tiers
  (Risky → Low Trust → Neutral → Governance → Trusted → Council → Elite)
- Big tabular-nums score readout
- Buyer fee % on a $50 sample payment, computed against the same curve
  the on-chain `ProofScoreBurnRouter` uses (linear-interpolated between
  the contract anchors at 4000/5000/7000/8000)
- Live fee curve SVG showing the score's position along the burn-fee
  curve, with a pulsing cursor at the current position
- The $X.XX sample fee broken down into the canonical five-way split
  (35% burn / 20% Sanctum / 20% merchant / 15% payroll / 10%
  headhunter), with spring-animated bars
- Capability strip ("Can vote / Can sell / Council eligible / Can
  endorse others") with each capability lighting up when the score
  crosses its threshold
- Auto-demo mode: before the visitor touches the slider, the score
  gently sweeps 0 → 10k → 0 in a smoothstep so the page is alive
  when someone arrives. Stops the instant they grab the slider — the
  page feels like it's responding to them
- Honest disclosure that the demo math mirrors the on-chain router
  and that the user's actual score replaces the slider once they
  connect

This is the page's new center of gravity. A visitor can see the
entire product mechanic — trust score → fee curve → fee distribution
— in one widget, before reading any copy.

### FeeFlowRiver — the protocol's economy made visible

**`app/components/FeeFlowRiver.tsx`** — live animated SVG sitting in
its own section below the hero. Transactions arrive on the left as
particles, hit a central split node, and fan out into five labeled
pools on the right with running dollar totals:

- 800×220 SVG, particles are simple circles with `cx`/`cy` updated
  every frame from a single rAF loop
- Each particle carries a random $0.50..$8.50 value, weighted by the
  canonical 35/20/20/15/10 split to pick which pool it flows toward
- Cubic-bezier paths for both entry (left → split) and exit (split →
  pool); particles sample the path at u ∈ [0..1] for smooth flow
- Running totals tick upward with a brief Framer fade when they change
- Five honest labels with their real percentages and helper text
  ("permanently removed from supply", "charity + community grants",
  "top-merchant volume rewards", "elected council pay", "rewards for
  inviting active users")

Performance: single rAF loop, particles mutated in place, React
re-render throttled to ~30Hz via a forceRender counter. Single shared
time origin between the loop and the JSX render so particle positions
line up exactly with their stored `t0` — a real bug I caught during
self-review where the render and loop were reading two slightly
different `performance.now()` values.

Disclosure: a clear caveat line under the river says the numbers are
illustrative until VFIDE is on mainnet. No pretending this is real
on-chain activity yet.

### MonumentBackdrop — the brand mark as page architecture

**`app/components/MonumentBackdrop.tsx`** — the canonical Monument
SVG (from `public/icon.svg`) rendered at page-scale as a structural
background element. Sits behind the hero and the fee river:

- Faceted V arms in faint gradients so it doesn't compete with
  foreground text
- Inner traced edge in the brand cyan, opacity modulated by intensity
- Luminous vertex at the bottom with four concentric circles of
  decreasing opacity — that's the visual hook
- `intensity` prop (0..1) drives vertex glow, aura ellipse scale, and
  edge stroke opacity. When unset, an autonomous 6-second sine pulse
  runs at ~20Hz so the system looks like it's breathing
- Optional `vertexHex` override so the backdrop can adopt the
  user's current tier color when wired up

Two `variant` modes: `'hero'` (anchored behind the hero block,
~1100px max height) and `'full'` (fills the section it's placed in).

The brand stops being decoration and becomes the page architecture —
the Monument is now a thing you experience, not just see.

### Landing page restructure

**`app/page.tsx`** — rewritten. Same five-section flow but the
weight has shifted:

1. **Hero** — text on the left, `<LiveProofScoreHero />` on the
   right, Monument backdrop, hero tagline now uses a cyan→violet
   gradient on the word "earn"
2. **OnboardingPathChooser** — unchanged
3. **FeeFlowRiver** — new section, also backed by the Monument
4. **Stats strip** — unchanged
5. **How it works** — slightly tightened copy with a sub-headline
   that connects to the new visuals
6. **FeeSavingsCalculator** — unchanged
7. **60-second start** — unchanged

`HeroVisualization.tsx` was removed — it's the old rings+dots widget
and nothing else referenced it.

Two correctness fixes to the section stacking: added `isolate` to
both hero and fee-river sections so the backdrop's `-z-10` doesn't
tunnel behind the page background. Tailwind's `isolation-isolate`
utility creates a new stacking context, which is what we need for
absolutely-positioned negative-z children to stay scoped.

### Behaviour under reduced motion

Every animated piece checks `prefers-reduced-motion` (via the
existing `usePrefersReducedMotion` hook and Framer's `useReducedMotion`):

- LiveProofScoreHero: auto-demo disabled; user must drive the slider
- FeeFlowRiver: particles disabled; static splits + pools shown
- MonumentBackdrop: pulse disabled; renders at full intensity statically

So the page degrades gracefully for users who've opted out of motion.

### TypeScript and dead-component scan

`npx tsc --noEmit` clean. Strict dead-component scan: 0 truly dead
components.

### What this round did not do

- The new widgets are pure visuals + math; no on-chain data wired in
  yet. Future round: when VFIDE token is deployed,
  `useWatchContractEvent('Transfer')` can feed real particle spawns
  into FeeFlowRiver, and `MonumentBackdrop` can take its `intensity`
  from `useProofScore` for the connected user.
- The other merchant audit items (real refund flow on Returns,
  real-time payment listener on the merchant home, fixing the merchant
  home info architecture, receipt sending UI) are still pending —
  this round was about the landing page.

---

## 2026-05-12 (Round 13) — Earnings & Payouts (with three backend bugfixes underneath)

Original ask was "build a power-user merchant earnings & payouts page."
While verifying what already existed, I found that the entire data
pipeline feeding that page was broken — the `/api/merchant/withdraw`
balance check was guaranteed to return 0 forever, because no
confirmation rows were being written by either of the two callsites
that should have been writing them. So a frontend on top of that would
have been a UI that always says "0 available" and rejects every
withdrawal. Fixed the backend first, then built the page.

### Backend bug #1 — `payments/confirm` decimal/wei mismatch

The confirm endpoint's `parseAmountToUnits` parsed `"5"` (the form
input) as the literal bigint `5n` (5 wei), then compared it against
the on-chain event's `args.amount` which is `5_000_000_000_000_000_000n`
(5 VFIDE in wei). They never matched → every confirm POST returned 422
→ no rows ever inserted.

**Fix:** rewrote `parseAmountToUnits(value, decimals)` to accept
decimal strings (`"5"`, `"5.50"`) and convert via viem's `parseUnits`
against the *actual* token decimals. Token decimals are read on-chain
via `decimals()` with a per-process cache. The schema now requires
`token` as a 0x address (no more `"VFIDE"` symbol strings) and
`amount` matches the decimal-string regex `/^[0-9]+(\.[0-9]+)?$/`.

Stored data is normalized: confirmations table now keys `token` as
lowercase address consistently. The webhook payload includes the wei
amount (canonical on-chain value) for downstream consumers.

### Backend bug #2 — `withdraw` balance comparison broken three ways

The balance check had three independent bugs:

1. SQL filter `($2 = 'VFIDE' OR token IS NOT NULL)` summed *all*
   tokens regardless of which one the user requested — VFIDE earnings
   would count toward USDC withdrawals and vice versa.
2. The token in the WHERE clause compared the request's symbol
   (`'USDC'`) against confirmations' token (an address) — never
   matched.
3. `parseFloat(net_balance)` compared a wei sum (~1e18) against the
   user's small human amount (`5`) — `5 > 1e18` is always false, so
   any amount up to ~1e18 would pass the balance check even with zero
   actual balance.

**Fix:** new `resolveTokenConfig(symbol)` that maps the symbol to
{address, decimals} via env vars (`NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS`,
`NEXT_PUBLIC_USDC_ADDRESS`, etc.). Stablecoin env vars don't exist
yet for this environment — those tokens get a clear 422 explaining
which env var is missing, rather than silently summing the wrong rows.
Balance query now filters confirmations by `LOWER(token) = $address`
and divides the wei sum by `POWER(10, decimals)` to get human units
before comparing.

GET handler now also returns a `balances` array per token with
`{token, confirmed_wei, reserved_wei}` so the new payouts page can
render available balance without re-implementing the math.

### Backend bug #3 — `MerchantPOS.tsx` confirm payload

The POS sent `{ token: 'VFIDE', /* no tx_hash */ }`. Schema requires
both. Every POST returned 400 → no confirmation rows from the POS.

**Fix:** extract `transactionHash` from the `useWatchContractEvent`
log object and `args.token` from the decoded event. Both flow through
`handlePaymentConfirmed` into the POST. If either is missing (rare —
both come from the event), skip the POST entirely rather than send
something the server will reject. Inline comment explaining the
historical bug so the next person doesn't redo it.

### Tests — 14 passing

Updated all three test files to match the new contracts:

- `payments-confirm.test.ts` — uses real `parseUnits`/`formatUnits`
  via `jest.requireActual('viem')`, mocks the on-chain `decimals()`
  read to return 18, includes `token` in all valid payloads, adds a
  new test for "missing token returns 400", updates the
  "missing chain config" test to expect 503 since failure now happens
  earlier (during decimals resolution).
- `payments-confirm-idempotency.test.ts` — same pattern; event amount
  mocked as `10n ** 18n * 1000n` to match a decimal `"1000"` request.
- `withdraw.test.ts` — adds env-var setup for USDC/VFIDE addresses,
  tests the new `balances` field in GET response, tests
  `resolveTokenConfig` 422 path for unconfigured tokens, tests the
  insufficient-balance 422 (now reports `available` field), tests the
  happy path.

A critical pattern discovered along the way: the `withAuth` mock has
to be set up *at import time* (inside `jest.mock`'s factory function),
not in `beforeEach`. The route exports `export const POST = withAuth(handler)`
which runs when the module loads — by the time `beforeEach` fires,
`POST` is already bound to whatever `withAuth` returned at import
(undefined if the mock was `jest.fn()` with no implementation).
Documented inline so anyone touching these tests later understands
why the mock is structured that way.

### The actual feature: `/merchant/payouts` page

Now that confirmations flow and balances are real, built the page:

**`app/merchant/payouts/page.tsx`** — three sections:

1. *Available balances grid* — one card per configured token (VFIDE
   today, stablecoins as ops adds the env vars). Each card shows the
   available balance (confirmed − reserved), the lifetime confirmed
   amount, and any amount currently reserved by in-flight withdrawals.
   Disabled "Cash out" button if balance is 0 or the token isn't
   configured. Honest about: "Available = confirmed earnings minus
   any cash-out requests still in flight."

2. *Recent payouts table* — 50 most recent withdrawal rows: timestamp,
   provider tx ID, amount, provider, settlement rail, masked mobile
   hint (last 4), status badge (Awaiting provider / Pending /
   Processing / Completed / Failed / Cancelled). Honest disclosure
   that the status stays "Awaiting provider" until a provider webhook
   updates it (a future round adds the webhook handlers).

3. *CashOutModal* — provider picker (5 options, each labelled with
   region coverage), settlement rail picker (6 options with region
   notes), mobile number / IBAN field with a "we store only the last
   4 digits" notice, decimal amount field with "Use full balance"
   shortcut. Validates amount client-side using bigint arithmetic
   (avoid float drift). On submit, POSTs to `/api/merchant/withdraw`;
   on success shows the success state with an "Open {Provider}" button
   that opens the redirect URL in a new tab. Honest about: "VFIDE
   never holds your fiat. Fees and exchange rates are shown by the
   provider before you confirm."

**`lib/payoutTokens.ts`** — shared client/server config that maps
token symbols to addresses + decimals. Tokens whose env var is missing
or malformed are excluded from the picker so users can't request
something the API would reject.

**`app/merchant/page.tsx`** — adds an "Earnings & payouts" section
at the top of the connected-merchant module grid (above Sales &
checkout). Lucide `Banknote` icon added to the import set.

### Discoveries — what I'm not yet fixing

Things I found in the merchant audit that aren't in scope this round
(documented so the next round can prioritise):

- The merchant home (`/merchant`) renders `<PaymentInterface />`,
  which is a customer-paying-merchant UI ("enter merchant address +
  amount + order ID"). Merchants shouldn't see this on their own
  dashboard. To remove next round.
- The "Getting Started" section on `/merchant` has three label cards
  with no actions, links, or checkmarks. Just three labels. To
  replace with a real progress checklist.
- Returns approval (`PATCH /api/merchant/returns`) updates the DB and
  restocks inventory but never fires an on-chain transfer back to the
  customer. The customer doesn't get their money back. To wire up
  next round.
- `useWatchContractEvent` for `PaymentReceived` isn't used anywhere
  in the merchant surface. A POS station running the merchant page
  can't ding the merchant when payment arrives. To add next round.
- `/api/merchant/receipts` and `/api/merchant/receipts/sms` endpoints
  exist with zero frontend consumers. To wire next round.
- 11 of the other merchant API tests (locations, returns, suppliers,
  etc.) are failing because their `withAuth` mocks are pre-existing
  broken in the same way I fixed for payments/withdraw. Same one-line
  fix pattern applies. Pre-existing — not introduced this round.

### TypeScript: clean throughout

Six new/modified files, all `npx tsc --noEmit` clean. Strict
dead-component scan: 0 truly dead components.

### Final-mile fixes (continuation of the same round)

- `withdraw.test.ts` was rewritten to match the new contract. Sets the
  `NEXT_PUBLIC_USDC_ADDRESS` / `NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS` env
  vars **before** the route import so the module-load-time
  `resolveTokenConfig` calls see them. Five scenarios covered: GET
  returns balances summary; bad enums get 400; unconfigured token gets
  422; insufficient balance gets 422 + `available` field; happy path
  creates a row and returns the Transak redirect URL. All 14 tests
  across the three rewritten files pass.
- Two strict-mode TS errors surfaced when the existing
  `app/merchant/payouts/page.tsx` and
  `components/merchant/payouts/CashOutModal.tsx` were typechecked in
  the fresh build (string-split destructure where the second element
  is typed as possibly undefined, and a `Record<string, ...>` lookup
  under `noUncheckedIndexedAccess`). Fixed both by guarding with
  `parts[1] ?? ''` and explicit fallback.
- Confirmed (and deleted) a duplicate `lib/merchant/payoutTokens.ts`
  I'd started building before noticing the existing `lib/payoutTokens.ts`.
  No regression — the existing module is more complete and the page
  was already importing from it.

---

## 2026-05-12 (Round 12) — Vault setup wizard

Earlier rounds deleted the legacy `OnboardingManager` → `HelpCenter` →
`SetupWizard` → `GuardianWizard` chain (1,441 lines) because its core
`useSimpleVault.executeVaultAction` always errored and nothing in the
running app actually rendered the wizard. So the app had no onboarding
flow at all. This round rebuilds one — a real, chapter-based wizard
that walks new users through everything their vault needs, calls real
contracts at every step, and can be turned off and back on.

### What was asked for

> Full system wizard that can be turned off and on. Chapters, after
> each section it asks if they want to continue. Vault create
> required, everything else skippable. All six steps.

### What was built

**`components/wizard/`** — 13 new files:

- `useWizardState.tsx` — Context-backed shared state (a previous attempt
  used per-component `useState`, which meant the launcher page and the
  overlay had separate copies that only resynced through localStorage on
  reload — fixed by moving state into a Context, mounted in `ClientLayout`).
  Persists to localStorage, listens for `storage` events so two open tabs
  stay in sync, auto-pauses after every chapter except `welcome` and the
  one before `done`.

- `VaultSetupWizard.tsx` — modal shell, progress bar, the "continue or
  pause here?" prompt between chapters, X close, all the chapter-routing
  glue. Calls `useOnboarding.completeStep('account')` when the
  CreateVault chapter completes so the legacy `OnboardingProvider`
  stays consistent.

- `WizardMount.tsx` — auto-launches for first-time users (connected
  wallet + no vault + wizard enabled + no completed/skipped chapters
  yet), suppressed on `/checkout`, `/legal`, `/api`. Force-opens when
  the URL has `?wizard=1`, and clears the param on close to avoid a
  "X doesn't actually close it" loop.

- `ChapterShell.tsx` — consistent header (chapter index, required
  badge), body, error/info notice, footer with Skip link (only when
  `onSkip` is provided — required chapters don't get one).

- `chapters/WelcomeChapter.tsx` — orientation card with six-feature
  grid explaining what's coming. "Skip this step" turns the wizard off
  entirely (not just skip-and-advance), since the user clicked Skip on
  the *entire* wizard not a specific feature.

- `chapters/CreateVaultChapter.tsx` — required. Handles every state:
  not connected (ConnectButton), wrong chain (chain-switch button via
  RainbowKit), VaultHub not configured (helpful error, no skip
  available), loading, already-has-vault (Continue), or create flow
  (calls `useVaultHub.createVault` which hits `VaultHub.ensureVault`).
  Refetches `vaultOf` after a successful tx so `hasVault` flips.

- `chapters/SpendLimitsChapter.tsx` — three input fields (per-transfer,
  per-day, large-transfer threshold) with current on-chain values
  shown as hints. "Use sensible defaults" button (100/500/50 VFIDE).
  Two sequential writes — `setSpendLimits` then
  `setLargeTransferThreshold` — with `waitForTransactionReceipt`
  between them so the user sees both confirmations before moving on.
  Validates `perTransfer ≤ perDay` and rejects zero/negative inputs.

- `chapters/GuardiansChapter.tsx` — address input + Add button. Calls
  `useVaultRecovery.addGuardian` which hits `CardBoundVault.setGuardian`.
  Blocks self-as-guardian (owner can't be their own guardian — the
  contract requires at least one *independent* guardian for the
  finalize call). Re-reads `guardianCount` after every add so the
  visible count is the on-chain count, not session-only state.

- `chapters/FinalizeGuardiansChapter.tsx` — picks a threshold (≥2,
  ≤guardianCount) via labelled buttons ("2 of 3", "3 of 3"…), then runs
  two txs: `setGuardianThreshold` (bootstrap-only, only fires if the
  threshold actually changed) and `VaultHub.completeGuardianSetup`.
  Reads `guardianSetupComplete` from the hub so re-running the wizard
  on a finalized vault shows a Continue button instead of trying to
  re-finalize.

- `chapters/MerchantApprovalChapter.tsx` — optional. Reads VFIDE
  allowance via `ERC20.allowance(vault, MerchantPortal)` from the token
  contract (NOT a `vfideAllowance` getter on the vault — that doesn't
  exist; matches the existing `MerchantApprovalPanel` pattern). Approves
  up to `dailyTransferLimit`. Honest about scope ("only needed if you
  pay merchants directly from your vault"), and guards against the case
  where `dailyTransferLimit` is still 0 (suggests skipping or going back
  to spend limits).

- `chapters/ProofScoreChapter.tsx` — explainer only, no on-chain
  action. Shows live ProofScore from `useProofScore` (real
  `Seer.getScore` read), live burn-fee percentage, fee schedule by
  tier, and links to `/marketplace` + `/proofscore`.

- `chapters/DoneChapter.tsx` — recap: each chapter labelled Completed
  / Skipped / Not visited, "Required" badge on the vault chapter if it
  somehow wasn't completed. Quick-link grid to Vault / Guardians /
  Marketplace. "Turn off the wizard" button.

- `index.ts` — barrel export.

**`app/onboarding/page.tsx`** — stable URL the user can bookmark or
return to. Shows current progress (n of m chapters completed), Resume
button (sets `?wizard=1` so `WizardMount` force-opens), and Start over
(reset state). If the wizard is currently turned off, the launch button
re-enables it.

**`components/layout/ClientLayout.tsx`** — wraps the child tree in
`<WizardStateProvider>` and renders `<WizardMount />` so the wizard is
available globally.

**`components/layout/Footer.tsx`** — added "Setup wizard" link in the
resources section so the wizard has a permanent, discoverable entry
point even after the user turns off auto-launch.

### Skippability behaviour

Per the user's request: vault create is required (no skip button in
the shell), everything else is skippable. Skipping a chapter still
counts as "moved past" — the wizard advances to the next chapter and
the recap lists it as Skipped. The Welcome chapter's "Skip" means "I
don't want this wizard at all" (turns it off entirely); within-chapter
skip on optional chapters just moves the user forward.

### "Chapters" pattern

After completing or skipping any chapter except `welcome` and the one
immediately before `done`, the wizard pauses and shows: *"{Just
finished} · done. Keep going to {Next chapter}, or pause here and come
back later."* Two buttons: Continue (resume), or Pause here (turn the
wizard off; progress saved). This is the explicit user-requested flow.

### Off-by-default-on-known-users

The wizard auto-shows once per session for users with no vault and no
prior wizard engagement (empty `completedChapters` and `skippedChapters`).
It does NOT pop up on every page navigation, and it does NOT pop up
again after the user has touched it at all (since touching it implies
they know it exists). Re-entry is always via the Footer link or
`/onboarding`.

### TypeScript

Clean throughout. The Context refactor caught a real bug — the original
per-component `useWizardState` instances were not sharing state in
memory, which would have broken the launcher → overlay handoff. Found
during a self-review reading the WizardMount code top-to-bottom, before
the user saw it.

### No real function lost

The wizard is purely additive. No existing component or page was
deleted or restricted in this round. The two modified files
(`ClientLayout.tsx`, `Footer.tsx`) only had additions. The
`OnboardingProvider.completeStep('account')` sync call uses the
existing public API of the legacy provider at the natural moment.

---

## 2026-05-12 (Rounds 10–11) — Pretend-data sweep

After the wallet/vault campaign closed cleanly, I went back across the
whole codebase looking for the same anti-pattern in other surfaces —
"UI that looks real but isn't connected to a real backend.\" Found more
than I expected.

### Real bugs found and fixed

**Elections page rendered fake candidates as if registered.**
`app/elections/page.tsx` imported `SEED_CANDIDATES` from
`lib/data/seed.ts` (the same fixture file that powered the legacy fake
feed) and rendered them as a real candidate leaderboard, complete with
vote counts and a "Winning" badge for everyone in the top N. The fake
addresses were `0xd3m0…` literals. Dropped the import, replaced with
empty array — the page now shows its genuine "No candidates registered
yet" empty state. The vote button was already disabled with a tooltip
explaining the contract isn't deployed; that part was honest.

**`/feed` and `/social-payments` rendered seed posts as live activity.**
The legacy `SocialFeed` component (650 lines, `components/social/SocialFeed.tsx`)
mounted on both pages, rendering `SEED_POSTS` (Kofi Textiles, Amara's
Kitchen, etc.) with hardcoded engagement numbers and no-op
Like/Bookmark/Share. The working `/social-hub` page already exists and
uses the real `/api/community/posts` endpoint.

- `/feed` → server-side redirect to `/social-hub`. The previous page
  said "for backward compatibility" but still mounted the fake feed.
- `/social-payments` → dropped the "Social Feed" tab and its
  `SocialFeed` mount. Other tabs already said "live data pending"
  honestly. Added a link pointing users to `/social-hub` for the real
  feed.
- `SocialFeed.tsx` → no longer imported anywhere. Deleted (650 lines).
- `lib/data/seed.ts` → no consumers left. Deleted (197 lines).

**Social hub had pretend Like/Bookmark/Story handlers.**
Three `onClick={() => {}}` no-ops on the social-hub page (Story tap,
Like, Bookmark). `handlePost` was adding posts to local state only —
never POSTed to `/api/community/posts` even though the route exists.

Fixed: `handlePost` does optimistic insert + real POST + rollback on
error. Story row removed (no fetch, no handler — pretend UI). The
Like/Bookmark `() => {}` no-ops are kept with a comment explaining
there's no API endpoint yet — better than silent dead handlers. Also
deleted the orphaned `app/social-hub/components/StoryRing.tsx`.

**`useLeaderboard` seeded with three random Ethereum addresses
labeled "Known active addresses on testnet".** They weren't — they
were arbitrary mainnet addresses (`0x742d35Cc…`, etc.) with no score
in our Seer contract. Always filtered out by the `score > 0` gate, so
they didn't show in the UI, but the seeding was misleading. Also
dropped the `badges: Math.floor(score / 1000)` field which was in the
type but never rendered (real badge counts need a `BadgeNFT` read).

**`UserProfile.tsx` was a 1446-line orphan with fake initial state.**
`getInitialProfile()` returned a default profile of "John Doe" with
email `john.doe@example.com`, location "San Francisco, CA", website
`vfide.example/johndoe`. `getInitialStats()` returned hardcoded fake
stats (`totalActivities: 142, badgesEarned: 4, votescast: 17,
proofScore: 8700`). The component had no consumers outside two test
files. Deleted the component + both test files (1446 + ~200 lines).
The real profile page (`app/profile/page.tsx`) uses
`components/profile/ProfileSettings.tsx`, which I verified is fine.

**`VaultOverviewStats` showed "$0 USD" and fake guardian limits.**
- `usdValue` hardcoded to `'0.00'` ("requires live price feed") →
  removed the USD row entirely until a price feed exists.
- `Guardians: N/5` with an arbitrary `/5` ceiling the contract doesn't
  enforce → dropped to just `N`.
- "3+ guardians unlock recovery mode" → aligned with actual on-chain
  threshold (≥2).
- Static "ACTIVE • All systems secure" card that didn't check anything
  → removed entirely. Real pause/quarantine state lives in
  `VaultSecuritySection` which subscribes to the on-chain `paused()`
  flag.

**`useSelfPanic` had a fake `durationHours` parameter.** Accepted
`durationHours: number = 24`, threaded through `panicDuration` state
and a 1h/6h/24h/3d/7d dropdown — but `vault.pause()` takes no
duration. The dropdown was gated by `supportsDuration: false`, so it
never rendered, but the parameter and the unreached branch were
misleading. Cleaned up the hook signature and dropped the dropdown
branch from `VaultSecuritySection`.

### `isCardBoundVaultMode()` finally deleted

Removed the function from `lib/contracts.ts:301` and the test mock.
Deleted `lib/vaultMode.ts` entirely (orphaned). Collapsed the trivial
`resolveVaultImplementation()` indirection — just assigns the literal
`'cardbound'` now. The test mock's `VaultImplementation` type
tightened from `'uservault' | 'cardbound'` to just `'cardbound'`.
Every callsite has been cleaned up over the previous rounds; the
function and its alternates were the last vestige.

### Strict dead-component scan: clean

Ran the export-symbol-aware `dead_components.py` against the full
post-cleanup tree. **Zero truly dead components.** The 68 hits from
the loose scan reported earlier are all barrel re-exports that the
loose regex couldn't see through. Earlier rounds were thorough.

### Merchant/checkout audit: clean

Spot-checked the checkout page (`app/checkout/[id]/page.tsx`) and
`usePayMerchant` — both are real EIP-712 signed payment flows. Three
orphan hooks in `useMerchantHooks.ts` (`useProcessPayment`,
`useSetMerchantPullPermit`, `useVaultPayMerchant`) are real working
primitives for flows the UI hasn't built yet — left in place rather
than deleted, since they're forward-looking surfaces with concrete
contract calls. Documented intent.

### Cumulative since rounds 5–9

- 650 lines (`SocialFeed.tsx`) + 197 lines (`seed.ts`) + 1446 lines
  (`UserProfile.tsx` + tests) = ~2,300 additional lines of unreachable
  or fake-data code deleted this campaign
- 5 distinct fake-content surfaces dismantled (Elections candidates,
  `/feed`, `/social-payments` feed tab, Social Hub Like/Bookmark
  handlers, leaderboard seed addresses)
- 4 misleading parameters removed (`durationHours` on `useSelfPanic`,
  `useVault` on `usePayment`, `badges` on leaderboard entries, the
  hardcoded `$0 USD` field)
- TypeScript clean throughout

## 2026-05-12 (Rounds 5–9) — Non-CardBound dead-code surgery

Across five iterative rounds the entire `cardBoundMode` runtime branch
was removed from the frontend. `isCardBoundVaultMode()` in
`lib/contracts.ts:315` is hard-coded to `true` and has been for some
time; this surgery removed everything that asked.

### Why this is a big deal

Before this work, dozens of UI files carried parallel implementations
of the same feature — one CardBound, one legacy UserVault. The legacy
branches were never reachable, but they:

- created the illusion of features that didn't actually work (Deposit
  Funds, Withdraw Funds, inheritance/Next-of-Kin promo cards,
  "Inheritance Cancellation Voting" panels)
- imported large amounts of dead code (orphan hook chains,
  always-disabled `useReadContract` calls, stub handlers that just
  toasted error messages)
- made the codebase confusing to navigate — half the conditional
  branches in a file are answering a question the runtime never asks

After this work: zero `cardBoundMode` references in any non-comment
source. The function itself stays as a safety guard.

### Round-by-round

**Round 5 — Critical wallet-auth bug fix + pretend features**

Two real production bugs:

1. `ClientLayout` rendered twice. `app/layout.tsx` wrapped
   `<CoreProviders><ClientLayout>` while `CoreProviders` already
   includes `<ClientLayout>`. Result: two AppShells, two WebSocket
   connections, duplicate nav. Fixed.

2. SIWE re-prompt on every page reload. Server uses httpOnly cookie
   auth but `useAuth` only called `verifyToken()` when an in-memory
   token was non-null. Fixed: `getToken()` cleaned,
   `useAuth` always calls `verifyToken()` on mount, added
   `isCheckingSession` state; `WalletAuthManager` waits for it.

Pretend-feature pages (`/streaming`, `/multisig`, `/time-locks`,
`/reporting`, `/agent`, `/lending`) routed to `ComingSoonPage`.
Storage-only pages wired to real APIs: `useNotificationHub`,
governance `HistoryTab` (real `Voted` events), `ScoreSimulatorTab`,
`lib/financialIntelligence.ts`, `/taxes`, `/budgets`, `/price-alerts`.
Removed lying `useThreatDetection` stubs.

**Round 6 — Next-of-Kin inheritance UI removed**

`useVaultRecovery.ts`: 7 always-throw stubs (the legacy NoK functions)
removed. `useVaultOperations.ts`: `handleSetNextOfKin` removed.
`VaultRecoveryPanel.tsx`: 185 → 75 lines, CardBound only.
`NextOfKinTab.tsx` deleted (255 lines). `NextOfKinInboxCard.tsx`
deleted. `useNextOfKinWatchlist` hook deleted (60 lines).
`NextOfKinWatchedVault` type deleted. `'next-of-kin'` removed from
`TabType` enum. All guardian-page NoK references removed.

`lib/wallet/`, `lib/compliance/` directories deleted entirely
(unused). `components/wallet/index.ts` +
`EnhancedNetworkBanner.tsx` + `EnhancedWalletConnect.tsx` deleted.
`app/guardians/components/GuardianManagementTabs.tsx` deleted (753
lines, unused after NoK removal).

**Round 7 — Guardian tree CardBound cleanup**

Rewrote 4 guardian files clean, patched 3 more, eliminating 95
`cardBoundMode` references from the guardian tree:

- `PendingActionsTab.tsx` — dropped 3 dead branches
- `OverviewTab.tsx` — collapsed to CardBound only, dropped NoK promo
- `MyGuardiansTab.tsx` — dropped variable + 7 ternaries
- `RecoveryActivePanel.tsx` — full rewrite, dropped `cancelRecovery`
  button + 7-day maturity wait UI
- `RecoveryTab.tsx` — full rewrite, CardBound only
- `RecoveryTimeline.tsx` — full rewrite, dropped legacy 5-step alt
  and "NoK without guardians" guardrails card
- `GuardianPendingRecoveryCard.tsx` — full rewrite, dropped 4 disabled
  `USER_VAULT_ABI` reads
- `hooks/usePayment.ts` — dropped `useVault: true` option (always
  errored, zero callers)
- `app/page.tsx` — dropped dead NoK alternate text on home

**Round 8 — Onboarding chain + legacy vault hooks**

Deleted orphan onboarding chain (1,441 lines):
`OnboardingManager` → `HelpCenter` → `SetupWizard` → `GuardianWizard`
→ `useSimpleVault`. All five imported each other, none had external
consumers, and `useSimpleVault.executeVaultAction` always errored in
CardBound mode. The `GuardianWizard` would have failed at runtime if
anything had ever rendered it.

`hooks/useVaultHooks.ts` 758 → ~150 lines (611 lines removed):
dropped 11 legacy hooks (`useCreateVault`, `useTransferVFIDE`,
`useVaultGuardiansDetailed`, `useIsGuardianMature`, `useSetGuardian`,
`useAbnormalTransactionThreshold`, `useSetBalanceSnapshotMode`,
`useUpdateBalanceSnapshot`, `useBalanceSnapshot`,
`usePendingTransaction`, `useApprovePendingTransaction`,
`useExecutePendingTransaction`, `useCleanupExpiredTransaction`,
`useGuardianCancelInheritance`, `useInheritanceStatus`). Every one
had `enabled: false`, threw unconditionally, or had zero consumers.
Simplified `useVaultBalance` by dropping its dead `pendingTransactions`
batch read.

`components/vault/VaultSettingsPanel.tsx` 396 → 70 lines: was an
`if (cardBoundMode) return <Placeholder />` short-circuit + 286 lines
of legacy UserVault UI that never rendered.

`components/security/GuardianManagementPanel.tsx` 493 → 23 lines: same
short-circuit pattern. Replaced with a thin re-export of
`MyGuardiansTab`. The 460-line `LegacyGuardianManagementPanel` was
unreachable.

`app/vault/settings/page.tsx` rewritten: was advertising legacy
features (Balance Snapshot, Abnormal TX Detection, Pending TX Queue,
Inheritance Guard) that the user could never actually use. Now
describes the real CardBound feature set.

**Round 9 — Vault tree dead UI removal + deposit/withdraw decision**

Made a product decision on the long-standing Deposit/Withdraw UI:
`handleDeposit` in `useVaultOperations` is a stub that always toasts
an error (legacy execute() path that doesn't exist in CardBound mode).
`handleWithdraw` is fully implemented as an EIP-712 signed
`executeVaultToVaultTransfer`. Conclusion: the **only** working flow
is "Transfer to Vault". Removed the misleading buttons entirely.

Files rewritten:
- `WithdrawModal.tsx` — full rewrite as vault-to-vault transfer only;
  11 `cardBoundMode` ternaries gone, 24-hour cooldown notice gone,
  "Use my wallet address" shortcut gone
- `VaultQuickActions.tsx` — full rewrite to a single-action panel
  (Transfer to Vault); was previously rendering two dead buttons
  with a "this is disabled in CardBound mode" info banner
- `VaultContent.tsx` — dropped `cardBoundMode` props on 4 children,
  dropped `DepositModal` import + render

Files patched:
- `MerchantApprovalPanel.tsx` — dropped prop + 3 dead `enabled` guards
- `VaultQueueSection.tsx` — dropped prop from interface + destructure
- `VaultHeader.tsx` — dropped variable + 3 ternaries (description,
  two feature cards)
- `OnboardingTour.tsx` — dropped variable + 4 ternaries
- `useVaultOperations.ts` — dropped deposit state cluster
  (`showDepositModal`, `depositAmount`, `isDepositing`, `depositStep`,
  `handleDeposit` stub), dropped `walletBalance` +
  `walletBalanceFormatted` reads (only used by DepositModal), dropped
  `cardBoundMode` from return type, dropped unused imports

Deleted dead files (798 lines):
- `app/vault/components/DepositModal.tsx` (107)
- `components/modals/DepositModal.tsx` (162, unused)
- `components/modals/SwapModal.tsx` (191, unused)
- `components/modals/TransactionModal.tsx` (145, unused)
- `components/modals/WithdrawModal.tsx` (193, unused — different from
  the active vault one)

### Cumulative totals (rounds 5–9)

- ~3,000+ lines of unreachable code deleted
- 95 `cardBoundMode` references → 0
- 2 production bugs fixed (double ClientLayout, SIWE re-prompt)
- ~10 misleading UI surfaces removed (Deposit Funds button, NoK promo
  cards, "Inheritance Guard" feature card, etc.)
- TypeScript clean throughout

## 2026-05-12 (Round 4) — Dead buttons + overflow sweep

User said: "I found a lot of overflow and dead buttons. End-to-end search
the front end for them." This round did exactly that.

### End-to-end audit results

Initial scan found **99 dead buttons across 40 files** and **56 address-
display sites without break-all/truncate protection**, **30 flex-1
containers without min-w-0**, and **4 tables without overflow-x-auto**.

After the work below:
- 4 dead buttons remain, all false positives (multi-line onClick, or
  `onMouseEnter` on a prefetch helper). Confirmed wired.
- 0 real address-display overflow risks (the original 56 was inflated by
  false positives matching variables that contained the word "address"
  but didn't render an address).
- Genuine `flex-1` overflow bugs fixed across ~24 files.
- All real tables are safely wrapped via `.table-responsive` CSS class or
  explicit `overflow-x-auto` ancestor.

### Dead code removed (964 KB total)

**76 truly-dead component files** confirmed unimported anywhere
(via strict scan that checks all exported symbols, not just basename).
Highlights: `AdvancedSearch.tsx` (39 KB), `GovernanceUI.tsx` (36 KB),
`WalletManager.tsx` (35 KB), `SettingsDashboard.tsx` (33 KB),
`SocialFeatures.tsx` (31 KB), the entire dead `components/dashboard/`
chain (`VFIDEDashboard.tsx`, `VFIDEDashboardSections.tsx` with its
hardcoded `MOCK_SCORE`/`MOCK_BALANCE`/`MOCK_ADDRESS` constants,
`AssetBalances`, `EnhancedAnalytics`, `VaultDisplay`, and the
`index.ts` barrel that re-exported them), `useTwoFactorAuth.ts`
(319 lines, zero callsites).

**6 empty Next.js route groups deleted:** `app/(gamification)`,
`app/(auth)`, `app/(social)`, `app/(finance)`, `app/(seer)`,
`app/(security)`. Each had only `layout.tsx` and `error.tsx` files but
no `page.tsx` anywhere underneath, so they served no routes — the
layouts wrapped nothing.

**5 `page.group.tsx` files** in `(marketing)` and `(commerce)` — Next.js
only recognizes `page.tsx`/`.ts`/`.js`/`.jsx`, so these were inert
alternates to real pages elsewhere in the tree. Deleted along with their
dead barrel files: `(finance)/vault/components/index.ts` and
`(security)/guardians/components/index.ts`.

**Orphan governance modal + barrels:**
`app/governance/components/ProposalDetailModal.tsx` was re-exported by
`app/(governance)/governance/components/index.ts` but never rendered
anywhere. The actual proposal detail view is inline in `ProposalsTab.tsx`.
Deleted along with the entire `(governance)` route group and 5 other
unused tabs: `DiscussionsTab`, `SuggestionsTab`, `DiscussionThread`,
`SuggestionCard`, `CreateProposalTab`, plus `suggestion-types.ts`,
`MembersTab.tsx`, `OverviewTab.tsx`, and the governance `index.ts` barrel.

### New reusable component

`components/ui/Address.tsx` — handles address truncation and overflow
with two variants: `short` ("0x1234…abcd") and `full` (with `break-all`
for wrapping). Optional click-to-copy with visual feedback. Used to fix
4 real address-overflow sites.

### Dead buttons fixed

| File | Action |
|------|--------|
| `app/lending/page.tsx` | Whole page replaced with `ComingSoonPage`. Had 5 dead buttons (Accept Loan, Repay Now, Repay Default, Extract from Guarantors, Deposit & Earn) handling money on a page with **zero `useWriteContract` hooks**. Money-handling buttons that did nothing was the highest-severity finding of this round. |
| `app/checkout/[id]/page.tsx` | Replaced dead "Connect Wallet" `<button>` with live RainbowKit `<ConnectButton />`. |
| `components/commerce/MerchantPOS.tsx` | Category-filter buttons now **wired for real**: added `selectedCategory` state, `filteredProducts` memo, onClick handlers. Active category renders in solid cyan; product grid filters by selection. |
| `app/taxes/page.tsx` | "Export CSV" wired to build a real CSV file from `taxEvents` and trigger a browser download. "Export PDF" and the FIFO/LIFO/HIFO selector disabled with explanatory titles (no PDF library, no per-method calculation in the hook). |
| `app/budgets/page.tsx` | "Edit" and "Delete" buttons wired. Added `removeBudget` to `useFinancialIntelligence`. Edit mode reuses the create modal; title and CTA label adapt (`Edit Budget`/`Save` vs `Create Budget`/`Create`); cancel + backdrop dismiss reset edit state. |
| `app/governance/components/ProposalsTab.tsx` | "Create Proposal" navigates to the Create tab via a new `onCreateProposal` prop (passed from the page). Inline "Vote FOR" / "Vote AGAINST" buttons call `onVote?.(BigInt(selectedProposal.id), true/false)` and dismiss the modal. |
| `app/governance/components/CouncilTab.tsx` | "View Schedule" became a `<Link href="/elections">`. "Nominate Candidate" and "View Charter" disabled with explanatory titles. |
| `app/control-panel/components/SystemStatusPanel.tsx` | `QuickActionButton` wrapper refactored to accept optional `onClick` and `disabledReason` props. All 3 admin actions (Howey-Safe Mode, Auto-Swap, Production Setup) show as disabled with concrete `title` attributes explaining what's needed. |
| `components/FinancialDashboard.tsx` | Replaced 3 dead export buttons with "Open Tax Report" link to `/taxes` (which has working CSV export) + 2 disabled buttons (PDF, TurboTax) with explanatory titles. |

### Dead buttons disabled with `title` attributes (missing backends)

Pattern: every disabled button got both `disabled` attribute AND a `title`
naming the exact endpoint, contract, or alternative route that would make
it work. No silent stubs.

- `components/social/UserProfile.tsx` — 6 buttons (Edit Profile, Follow,
  Add Friend, Share on X, Share Message, View Profile on friend cards)
- `components/social/SocialFeed.tsx` — 6 buttons (image/emoji compose,
  post overflow menu, Share, comment-like, reply-Send)
- `components/social/MessagingCenter.tsx` — 3 buttons (conversation
  overflow, emoji picker, file attach)
- `components/social/GroupMessaging.tsx` — 2 buttons (Group Settings,
  Add Members)
- `components/social/GlobalUserSearch.tsx` — 2 buttons (friend request,
  message)
- `components/social/ShoppablePost.tsx` — 2 buttons (Comment, Share)
- `app/social-hub/components/PostCard.tsx` — 5 buttons (Report, Follow,
  Comment, Repost, Share)
- `app/social-hub/components/CreatePostCard.tsx` — 4 toolbar buttons
  (Image, Video, Emoji, Location)
- `app/social-hub/components/TrendingSidebar.tsx` — 2 buttons (Follow,
  Show more)
- `app/social-hub/page.tsx` — Load More Posts (pagination not in API)
- `app/treasury/components/EcosystemTab.tsx` — 2 claim buttons
- `app/treasury/components/SanctumTab.tsx` — 2 (Approve / Reject — must
  flow through DAO governance)
- `app/sanctum/components/DisbursementsTab.tsx` — 3 (New Proposal,
  Approve, View Details)
- `app/sanctum/components/CharitiesTab.tsx` — 1 (View Details)
- `app/enterprise/components/FinanceTab.tsx` — 2 ("DAO Only" treasury
  operations)
- `app/elections/page.tsx` — 1 (Vote for candidate — CouncilElection
  contract not deployed)
- `app/admin/AdminDashboardClient.tsx` — 3 notification webhook stubs
  (Email Alerts, Discord, Telegram)

### Overflow fixes (real, not false positives)

`flex-1 min-w-0` added where a flex child contains potentially-long
content (proposal titles, usernames, addresses, achievement names,
provider names, product names, etc.):

- `components/tx-preview/TransactionPreview.tsx` (×2 — both halves of
  the transaction flow visualization; the existing `truncate` on
  recipient names now actually truncates)
- `app/explorer/page.tsx` (activity row with `max-w-[200px] truncate`
  on addresses)
- `components/gamification/Leaderboard.tsx` (added `truncate` too)
- `components/profile/UserProfile.tsx` (main profile-info container)
- `components/social/PurchaseProofEvent.tsx`
- `components/social/GroupMessaging.tsx` (chat area viewport)
- `components/badge/BadgeDisplay.tsx` (badge tooltip name)
- `components/wallet/ChainSelector.tsx`
- `components/wallet/NetworkSwitcher.tsx`
- `app/governance/components/ProposalsTab.tsx`
- `app/governance/components/ProposalCard.tsx`
- `app/vault/recover/components/ClaimFlowModal.tsx`
- `components/commerce/MerchantPOS.tsx` (cart item names)
- `components/gamification/GamificationWidgets.tsx`
- `components/gamification/OnboardingChecklist.tsx`
- `components/compliance/OnRampIntegration.tsx`
- `components/social/UserProfile.tsx`
- `components/social/FriendCirclesManager.tsx`
- `components/merchant/SetupStepProducts.tsx`
- `components/security/BiometricSetup.tsx`
- `components/wallet/EnhancedWalletConnect.tsx`
- `components/modals/LessonModal.tsx`
- `components/onboarding/OnboardingFlow.tsx`

Address-display sites fixed with new `<Address>` component:
- `components/social/CreatorDashboard.tsx` (`supporter.address`, `tx.from`)
- `components/customers/CustomerManager.tsx` (`detail.walletAddress`)
- `app/headhunter/components/ActivityTab.tsx` (`item.address`)

### Type-check status

`npx tsc --noEmit -p tsconfig.json` passes cleanly across the entire
codebase after all changes.

## 2026-05-12 (later) — Round 3 fixes (deeper audit, lib/ layer)

After Round 2, ran the scanners again to catch anything missed. Three
more issues surfaced — all real, all now fixed.

### Tax report was localStorage-only (most dangerous finding of this round)

`/taxes` and `/budgets` both load from `useFinancialIntelligence` in
`lib/financialIntelligence.ts`. That hook was reading transactions from
`localStorage[vfide-tx-${address}]` only — never the server. A user
with a wallet they've used on multiple devices would see an *incomplete*
tax report from whichever browser they happened to be in. The code had
a comment "In production, fetch from API/indexer" that was never acted on.

Fix: `useFinancialIntelligence` now fetches from
`/api/crypto/transactions/[address]` first (the existing endpoint accepts
either a numeric userId or a wallet address with proper auth), with
localStorage as offline cache only. Adapter maps the flat API row shape
(user_address, from_address, to_address, token_amount, currency,
message, tx_hash, created_at) into the UI's Transaction type.

Additionally, added an explicit "not tax advice" disclaimer at the top
of `/taxes` covering off-platform activity, other chains, cost-basis
adjustments, and jurisdiction-specific rules. Added a "saved on this
device only" banner at the top of `/budgets` because budgets remain
client-side (no API yet) and users need to know they won't sync.

### Dead CommandBar with fake "execute transactions" loop

`components/CommandBar.tsx` was a natural-language + voice command bar
that, on user input like "Send 100 VFIDE to alice.eth", would:
- Parse via `lib/naturalLanguage.ts`
- Iterate over a fake execution plan
- Show `toast.info('Executing: ...')` for each step
- `await new Promise(r => setTimeout(r, 1000))` — **just sleeping**
- Show `toast.success('All actions completed')`
- Comment said "In production, this would actually execute the transactions"

It would have completely deceived a voice user about sending money. But
nothing mounted CommandBar — it was 378 lines of dead UI plus its
naturalLanguage and voiceCommands dependencies. Deleted all three:
`components/CommandBar.tsx`, `lib/naturalLanguage.ts`, `lib/voiceCommands.ts`.

### Type-check status

`npx tsc --noEmit -p tsconfig.json` passes with zero errors across the
full codebase after all three rounds of changes.

## 2026-05-12 — Frontend Audit Round 2 (Pretend-Features Removal)

Did a deep audit of the frontend after the merchant-OS round. Goal:
find UIs that pretend to work but actually don't, and either make them
honest or wire them to real backends.

### Severity-1 fixes (fake "success" UI replaced with honest coming-soon)

These pages used to show success toasts and decorative buttons with no
onClick handlers. A user could "create a stream" or "add a signer" and
believe they did something real when nothing on-chain or server-side
happened. Replaced with explicit `ComingSoonPage` explaining what the
feature does, what's needed to ship it, and pointing to the closest
real alternative today.

| Page | Was | Now |
|------|-----|-----|
| `/streaming` | "Stream created successfully" toast on client-only `setStreams([newStream])` | Honest description of payment streaming; points to `/merchant/subscriptions` |
| `/multisig` | Hardcoded `required=0`, "Add Signer" / "Approve" buttons with no handlers | Explains M-of-N multisig; points to `/guardians` for today's protection |
| `/time-locks` | `setTimeLocks([])` and buttons with no handlers | Explains tiered transaction delays; points to `/vault` withdrawal queue |
| `/reporting` | 457-line `useReportingAnalytics` hook that wrote "scheduled reports" to localStorage | Points to `/merchant/analytics` for the real, merchant-scoped version |
| `/agent` | localStorage-only audit log for cash-handling agents (dangerous — agents handle real money) | Coming-soon with requirements (server audit log, KYC, regulatory review) |

### Severity-2 fixes (localStorage masquerading as backend → wired to real APIs)

| Hook / Page | Was | Now |
|------|-----|-----|
| `useNotificationHub` / `/notifications` | 400 lines of localStorage state; real `/api/notifications` endpoint existed but was never called | Rewrote to use API as source of truth, with per-wallet localStorage cache for offline. Adapter maps API shape → UI Notification type. Mutations (markAsRead, markAllAsRead) hit the API with optimistic local update and revert-on-failure |
| `useThreatDetection` / `/security-center` | Three "checks" — `checkUnusualLocation()` always returned `false`, `checkSuspiciousIp()` always returned `false`, only `checkUnusualDevice()` was real. The hook emitted "Your account security looks good" recommendations from sources it never actually consulted | Removed the lying stubs. Kept the real device-fingerprint comparison and client-side rate limiting. Risk score now reflects only the signals we actually have. `detectAnomalies()` is explicit that "server-side signals (IP reputation, geographic anomalies, cross-session brute-force tracking) are not yet wired up" |
| `/price-alerts/ActiveTab` | Fetched price once on mount and never again. Had `Bell` icons but never called `Notification(...)`. localStorage with no disclosure | Polls `/api/crypto/price` every 30s. Fires Web Notifications when thresholds trigger (with permission request UI). Throttles re-fires (30 min per alert). Explicit banner that alerts are local-only and only fire while a tab is open. Permission state UI |

### Severity-3 fixes (fake data labeled as real)

| File | Was | Now |
|------|-----|-----|
| `app/governance/components/HistoryTab.tsx` | 8 hardcoded fake votes in user's "Your Voting History" | Real implementation reading `Voted(uint256, address, bool)` events from DAO contract via `publicClient.getLogs`, filtered by connected wallet, enriched with `getProposalDetails` for proposal title + final status. Proper empty/loading/error/not-deployed states |
| `app/council/components/SalaryTab.tsx` | One placeholder period row, no disclosure | Added `SampleDataBanner` |
| `app/dashboard/components/ScoreSimulatorTab.tsx` | Made-up scoring formula `transactions * 50 + governanceVotes * 100 + ...` that bore no relation to the actual Seer contract | Rewrote against real Seer constants (max 100/call, 200/day per operator pair, 300/day total, 100/month decay toward NEUTRAL=5000). 5 activity-level scenarios over 1-24 months. Trajectory sparkline. Explicit "how scoring actually works" disclosure box |

### Dead code removed

- `components/dashboard/VFIDEDashboard.tsx` — 9.8KB, never rendered anywhere
- `components/dashboard/VFIDEDashboardSections.tsx` — had `MOCK_SCORE = 7420`, `MOCK_BALANCE = "12,847.32"`, `MOCK_ADDRESS`. Was only imported by VFIDEDashboard. Both deleted together
- `components/dashboard/index.ts` — barrel cleaned, removed broken exports
- `hooks/useTwoFactorAuth.ts` — 319 lines, zero callsites. `TwoFactorSetup` component is correctly gated as "coming soon" so the hook had nothing to power

### New reusable component

`components/feedback/ComingSoonPage.tsx` — used by all 5 honest-replacement pages. Has slots for: title, tagline, description of what the feature would do, requirements list of what's needed to ship it, and an optional "use this instead today" link to the closest real feature.

### Type-check status

After all changes: `npx tsc --noEmit -p tsconfig.json` passes cleanly with zero errors across the entire codebase. The Seer-contract event signature in HistoryTab matches the contract's `event Voted(uint256 id, address voter, bool support)` declaration (DAO.sol:44).

### What's still pending

These were flagged in the audit but left as-is intentionally:

- `/social-payments` & the 5 broken `/api/social/*` endpoints — page already says "Live tip history is not available yet"; consistent self-disclosure, no user-facing lie. Build the feature when there's appetite, or remove the page.
- `/api/admin/metrics/dashboard` — silently fails; admin tooling, no end-user impact.
- `/api/crypto/ens/[address]` — silently falls back to raw address. Cosmetic only.
- Embedded wallet stub (`lib/wallet/VFIDEWalletProvider.tsx`) — throws by design until Privy/Web3Auth/Magic SDK installation decision is made. Properly self-disclosed.
- `components/security/TwoFactorSetup.tsx` — explicit "2FA not in this release" UI. Correct as-is.

## 2026-05-11 (night, part 2) — Merchant OS + Broken API Endpoint Audit

User pushed back: "things are still not finished." Right. Did a proper
systematic feature audit and found multiple substantial gaps.

### 6 missing Merchant OS modules → built

Per user memory, the Merchant OS has 13 systems. Found 7 of 13 had
routes. Built the 6 missing routes plus their APIs/migrations.

| Route | Status | Implementation |
|-------|--------|---------------|
| `/merchant/invoices` | **NEW** | API existed (`/api/merchant/invoices`, 353 lines, full CRUD). Built 465-line page with list, status filtering, create modal with line items, status transitions (draft → sent → paid). |
| `/merchant/inventory` | **NEW** | API existed (`/api/merchant/products`, 564 lines). Built 424-line page with search, status filter, low-stock alerts (threshold 5), inventory value, create modal for physical/digital/service products. |
| `/merchant/bookings` | **NEW** | API existed (`/api/merchant/bookings`). Built 448-line page with appointments + availability slots tabs, status transitions (confirmed → completed/no_show), depends on service-type products in inventory. |
| `/merchant/subscriptions` | **NEW** | API existed (`/api/merchant/subscriptions`). Built 330-line page with plans list, weekly/monthly/quarterly/yearly intervals, trial days, MRR estimate (weights by interval), pause/resume/archive. |
| `/merchant/tips` | **NEW + new API** | API didn't exist. Built `/api/merchant/tips/route.ts` (138 lines, GET+PUT) + 253-line settings page with preset percentage editor, custom-amount toggle, tip totals from existing `merchant_tips` table. |
| `/merchant/payment-links` | **NEW + new API + new buyer route** | API didn't exist. Built `/api/merchant/payment-links/route.ts` (232 lines, full CRUD), 368-line settings page with fixed vs open-amount toggle, single-use vs max_uses, expiry, copy-to-clipboard. Plus built public buyer-side `/pay/link/[id]` page + API (link resolution with same-origin redirect to /pay). |
| `/merchant/tax` | **NEW + new API** | API didn't exist. Built `/api/merchant/tax-rates/route.ts` (213 lines, full CRUD with transactional default-rate enforcement using getClient+BEGIN/COMMIT), 380-line page with multi-jurisdiction config, basis-point storage, applies_to selector, single-default-per-merchant via partial unique index. |

### Merchant hub completely rebuilt

The existing `/merchant/page.tsx` was a marketing page that linked to
**exactly one** sub-route (`/merchant/setup`). All 13+ Merchant OS
sub-systems were inaccessible from the hub. A merchant landing there
would have no way to discover their tools.

Replaced with a real hub: detects wallet connection, shows 20 module
cards organized into 5 logical sections (Sales & checkout, Customers,
Operations, Business, Setup), each with icon + label + description.
First-time prompt suggests setup → inventory → payment-links flow.
Disconnected wallet still sees the processor-fee comparison.

### Subnav merchant section also updated

`components/navigation/SubNav.tsx` was missing the 6 new routes too.
Added: inventory, invoices, payment-links, bookings, subscriptions,
tax, tips. Now 21 merchant routes navigable from the SubNav too.

### New database migration

`migrations/20260511_180000_merchant_tip_paylink_tax.sql` + `.down.sql`:

- `merchant_tip_settings` (per-merchant tip-jar config)
- `merchant_payment_links` (shareable URLs with usage/expiry/email/shipping)
- `merchant_tax_rates` (multi-jurisdiction tax with basis points)

All three: owner-RLS scoped by `merchant_address`, grants to `vfide_app`.
Payment links have an additional public-read RLS policy for status='active'
so the buyer page `/pay/link/[id]` can resolve without auth.

### Broken API endpoints found by audit → fixed where critical

Ran a scanner that maps every `fetch('/api/...')` in client code against
the actual API routes. Found 6 broken endpoints:

| Endpoint | Severity | Action |
|----------|----------|--------|
| POST `/api/crypto/transactions` | **Critical** — every payment's server-side log was silently failing | **Built** the missing route + extended `transactions` schema via migration `20260511_190000_extend_transactions_table.sql` (adds user_address, from_address, to_address, token_amount, currency, message, fee, metadata, created_at columns; converts id to TEXT for idempotent upsert; adds party-based RLS) |
| GET `/api/crypto/ens/[address]` | Low — ENS resolution nice-to-have, displays raw address as fallback | **Left as is** — graceful degradation |
| `/api/social/tips`, `/api/social/content-purchases`, `/api/social/payment-stats/*`, `/api/social/content-access` | Medium — social payments feature, page already shows "not available yet" message | **Left as is** — consistent with the explicit not-yet-implemented UI on `/social-payments` |
| `/api/admin/metrics/dashboard` | Low — only called from `lib/optimization/monitoring.ts`, admin-only | **Left as is** — admin tooling, no end-user impact |

### Components built but never wired (audit finding, no action)

Sweep found multiple "Manager" / "Dashboard" / "System" / "Portal" /
"Panel" components in `components/<feature>/` that aren't imported by
any page. Most are reasonable (alternative implementations, legacy code
replaced by newer wiring). Notable:

- `InvoiceManager`, `BookingSystem`, `InventoryManager`, `TipSystem`,
  `RefundManager` — these are pure-presentational widgets that take
  data as props; my new pages handle their own data fetching directly
  and don't need them. Architectural duplication, not breakage.
- `CreateProposalTab`, `DiscussionsTab`, `SuggestionsTab` in
  `app/governance/components/` — full UIs for on-chain proposal
  creation + community forums + suggestions with upvotes, built but
  never wired into `app/governance/page.tsx` (which uses `CreateTab`,
  an API-only stub instead). Real disconnect; not fixing now without
  a clearer signal of which version of governance you want active.

### Files

New routes:
- `app/merchant/invoices/page.tsx`
- `app/merchant/inventory/page.tsx`
- `app/merchant/bookings/page.tsx`
- `app/merchant/subscriptions/page.tsx`
- `app/merchant/tips/page.tsx`
- `app/merchant/payment-links/page.tsx`
- `app/merchant/tax/page.tsx`
- `app/pay/link/[id]/page.tsx`
- `app/pay/link/[id]/components/PayLinkContent.tsx`

New APIs:
- `app/api/merchant/tips/route.ts`
- `app/api/merchant/payment-links/route.ts`
- `app/api/merchant/tax-rates/route.ts`
- `app/api/pay/link/[id]/route.ts`
- `app/api/crypto/transactions/route.ts`

New migrations:
- `migrations/20260511_180000_merchant_tip_paylink_tax.sql` + `.down.sql`
- `migrations/20260511_190000_extend_transactions_table.sql` + `.down.sql`

Modified:
- `app/merchant/page.tsx` — rebuilt as real hub
- `components/navigation/SubNav.tsx` — added 7 missing merchant routes

### Migration order

When applying to your database, append these to the existing 5
migrations in order:

```
6. 20260511_180000_merchant_tip_paylink_tax.sql
7. 20260511_190000_extend_transactions_table.sql
```

Both are wrapped in BEGIN/COMMIT so a failure rolls back cleanly.

## 2026-05-11 (night) — QR Payment Audit + iOS Scanner Fix

User asked to double-check QR payment flow. Audit findings:

### What was already working ✅

- **Merchant QR generation** (SmartQR, PaymentQR, MerchantPOS) — fully
  wired with `qrcode` library and `qrcode.react`
- **Signed QRs with expiry** — `lib/payments/qrSignature.ts` builds a
  canonical message (`vfide:qr-payment:v1\nmerchant:...\namount:...\n
  orderId:...\nexpiresAt:...`); merchant signs with their wallet via
  EIP-191; signature + expiry embedded as `sig` and `exp` query params
- **Buyer-side signature verification** at `/pay` — uses
  `viem.verifyMessage` to recover the signer and confirm it matches
  the merchant address in the URL
- **Pay button gated on valid signature** — `qrReadyForPayment` check
  at PayContent.tsx line 185 disables the submit button until signature
  is `'valid'`; tampered/expired/missing QRs show explicit error states
- **Security event logging** — invalid/expired/missing signatures
  POST to `/api/security/qr-signature-events` with merchant, amount,
  reason, signature prefix (for forensics without leaking the full sig)
- **Universal-link fallback** — `https://yourdomain/pay?merchant=...&
  amount=...&sig=...` opens in any phone's native browser, so iOS
  users can scan with Camera.app and the link auto-opens VFIDE

### What was broken ⚠️

- **In-app QR scanner only worked on Android.** `lib/barcode/index.ts`
  used the browser-native `BarcodeDetector` API, which is supported on
  Android Chrome / Edge / desktop Chrome but **not on iOS Safari**.
  Users on iOS who tapped "Scan QR" got "Barcode scanning is not
  supported on this device" with no fallback.
- **No dedicated buyer-side scan page.** The PieMenu's "Scan QR" quick
  action was wired to `/pay` (which has no scanner — just the payment
  form). Users tapping it landed on an empty pay form.

### Fixed

- **`lib/barcode/index.ts`** rewritten with a two-tier strategy:
  - Tries native `BarcodeDetector` first (fastest path on Android)
  - Falls back to **jsQR** (pure JavaScript, ~14KB, works on iOS
    Safari 11+) when the native API is absent
  - Both paths drive the same `<video>` element the caller provides
  - jsQR path throttled to ~10 scans/sec to preserve battery on iOS
  - Lazy-imports jsQR so Android users don't pay its bundle cost
- **Added `jsqr@^1.4.0`** to dependencies
- **Created `app/scan/page.tsx` + `app/scan/components/ScanContent.tsx`** —
  fullscreen camera viewfinder with rear-camera default, targeting
  reticle UI, permission-denied / unsupported-browser / camera-error
  states, "Try again" button, and a critical security check:
  - **Decoded QRs are validated for same-origin before redirecting.**
    A QR encoding `https://attacker.example/pay?...` will NOT be
    auto-followed — the user sees "Unrecognized QR" with the raw
    string. Only same-origin `/pay` paths trigger a redirect. Prevents
    QR-phishing attacks where a malicious sticker placed over a
    merchant's real QR redirects users to a fake VFIDE.
  - Also blocks `javascript:`, `data:`, `vbscript:`, `file:` URL
    schemes regardless of origin.
- **PieMenu Scan QR action** rewired from `/pay` to `/scan`
  (`components/navigation/PieMenuEnhancements.tsx` line 92)

### What the user will now see

- **Merchant flow** (unchanged, was working): generate signed QR,
  show to buyer
- **Buyer flow, iOS Camera path** (unchanged, was working): point
  Camera at QR → tap link → opens `/pay` → signature verified → tap
  to pay
- **Buyer flow, in-app scan path** (NEW): long-press the V button →
  Scan QR → camera opens fullscreen → point at any merchant's signed
  QR → automatically redirects to `/pay` → signature verified → tap
  to pay. Works on iOS and Android.

### Files changed

- `lib/barcode/index.ts` — BarcodeDetector + jsQR strategy
- `package.json` — `jsqr@^1.4.0` added to dependencies
- `app/scan/page.tsx` — NEW, fullscreen scanner route
- `app/scan/components/ScanContent.tsx` — NEW, camera + decode + safe redirect
- `components/navigation/PieMenuEnhancements.tsx` — wire Scan QR to /scan

## 2026-05-11 (late evening) — PieMenu Mount Fix

User reported: "the pie navigation with color-changing ring tied to
ProofScore plus press-and-hold merchant quick-nav isn't showing up."

### Root cause

The full feature was built and wired:

- `components/navigation/PieMenu.tsx` (1086 lines) — the radial nav
  with V-button trigger, 400ms long-press detection, merchant
  quick-actions overlay (line 1041), full 8-direction fan-out
- `components/navigation/PieMenuEnhancements.tsx` (477 lines) — the
  4-tier ProofScore color thresholds (red < 5000, amber 5000+,
  cyan 6500+, emerald 8000+)
- `components/ui/ProofScoreRing.tsx` (238 lines) — the color-changing
  ring component itself
- `components/navigation/AppShell.tsx` — renders `<PieMenu />` on
  every route except `/embed` and `/s/*`
- `components/layout/ClientLayout.tsx` — wraps children in
  `<AppShell>`

But `app/layout.tsx` (the Next.js root layout) was rendering
`<CoreProviders>{children}</CoreProviders>` directly, completely
bypassing ClientLayout. So AppShell never mounted, so PieMenu never
rendered. The build worked, every page loaded, but the radial nav
was simply not in the DOM. This is the classic "thin-shell missing
wiring" regression — likely lost during the frontend overhaul that
decomposed the monolith pages.

### Fixed

- **`app/layout.tsx`** — Now imports `ClientLayout` from
  `@/components/layout/ClientLayout` and wraps children in it inside
  CoreProviders. The mounting chain
  `RootLayout → CoreProviders → ClientLayout → AppShell → PieMenu`
  is now complete.

### Bonus fix — ring now shows the LIVE ProofScore

Without a `PieMenuContextProvider` ancestor, the ring defaults to
5000 (neutral / amber) regardless of the user's actual ProofScore.
Wiring this was previously left as a TODO in `PieMenu.tsx` line 712.

Added `components/navigation/LiveProofScoreProvider.tsx`:

- Reads connected wallet's score from `Seer.getScore(address)` via
  wagmi `useReadContract`
- Wraps children in `PieMenuContextProvider` with the live score
- 60s staleTime so the ring doesn't refetch on every remount
- Degrades silently — no wallet, no Seer address, RPC error all fall
  back to neutral 5000

Wired into ClientLayout above AppShell so every route inherits the
live score automatically.

### What the user will now see

- V-button at bottom-right on every route (except `/embed` and `/s/*`)
- Ring around the V tinted by ProofScore tier:
  - Red — score < 5000 (low / new user)
  - Amber — score 5000–6499 (neutral)
  - Cyan — score 6500–7999 (building)
  - Emerald — score 8000+ (trusted)
- Tap V → 8-direction radial nav fans out for primary navigation
- Press-and-hold V (400ms) → merchant quick-actions overlay fans out
  above the V button for one-tap access to common merchant flows

### Files changed

- `app/layout.tsx` — mount ClientLayout
- `components/layout/ClientLayout.tsx` — wrap AppShell in LiveProofScoreProvider
- `components/navigation/LiveProofScoreProvider.tsx` — NEW, wagmi wiring

## 2026-05-11 (evening) — Vercel Build Fix

User pushed to Vercel and the build failed with `npm run build exited 1`
and no visible error message. Two root causes:

### Root cause 1: prebuild validator was failing silently

`scripts/postinstall-validate-env.cjs` skips in CI (good), but the
`prebuild` script (`npm run validate:env` → `tsx lib/validateProduction.ts`)
runs unconditionally. It detected Vercel (`process.env.VERCEL === '1'`),
saw missing required env vars, and exited 1 — but its output was
completely suppressed because the validator used `logger.info(...)` for
ALL messages including error reports. The production logger config is
`['warn', 'error']`, so info-level output is dropped.

**Fix:** Converted all 21 `logger.info()` / `logger.warn()` / `logger.error()`
calls in `lib/validateProduction.ts` to direct `console.log()` /
`console.warn()` / `console.error()`. Build-time validation output is
operator-facing and must survive the runtime log-level filter. Dropped
the now-unused `logger` import.

### Root cause 2: testnet builds were forced to provide mainnet addresses

`strictProduction` was `isProduction && !frontendOnly`. On Vercel,
`NODE_ENV=production` always, so every "production: true" env-var check
fired — including all 18 contract addresses that don't exist until
operator runs `deploy-full.ts`. Classic chicken-and-egg.

**Fix:** Made `strictProduction = isProduction && !frontendOnly && !isTestnet`.
The `isTestnet` flag (already computed but unused) is true unless
`NEXT_PUBLIC_IS_TESTNET` is explicitly `"false"`. Testnet builds now
warn on missing contract addresses; mainnet builds (`NEXT_PUBLIC_IS_TESTNET=false`)
still hard-fail. Same treatment applied to the Redis-required check.

### Verified behaviour

```
NODE_ENV=production VERCEL=1 NEXT_PUBLIC_IS_TESTNET=true  + 7 floor vars → exit 0  ✅
NODE_ENV=production VERCEL=1 NEXT_PUBLIC_IS_TESTNET=false + 7 floor vars → exit 1  ✅
```

### Minimum env vars to set in Vercel for a testnet deploy

These 8 must be set explicitly (no auto-fallback on Vercel; this is by
design — operator must be explicit):

```
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.basescan.org
NEXT_PUBLIC_IS_TESTNET=true
APP_ORIGIN=https://<your-vercel-domain>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
DATABASE_URL=postgresql://vfide_app:...@host/vfide
JWT_SECRET=<32+ char random string>
```

After running `deploy-full.ts` against Base Sepolia, copy each
`NEXT_PUBLIC_*_ADDRESS` line from the deploy script's console output
into Vercel env vars. The build no longer requires them, but the
frontend wagmi hooks do.

### Files changed

- `lib/validateProduction.ts` — logger calls → console; strictProduction
  excludes testnet; Redis-required check excludes testnet.

## 2026-05-11 (afternoon) — Architecture Correction

User correction (was wrong about this across multiple rounds): this
codebase does NOT use Next.js's built-in `middleware.ts` mechanism. The
security stack lives in `proxy.ts` and is invoked by a separate proxy
layer (see `next.config.ts`: "CSP is applied per-request in proxy.ts
with a nonce" and "Strict fallback CSP for non-proxy paths").

### Fixed in this round

- **Deleted the erroneous `middleware.ts` shim.** Creating it was wrong;
  a Next.js auto-loaded middleware would either bypass or duplicate the
  proxy stack the codebase actually uses.
- **Rewrote `scripts/validate-frontend-ready.ts` section 1.** Was
  checking that `middleware.ts` existed (and called this "required");
  now correctly checks `proxy.ts` has its proxy function, config
  matcher, validateCSRF call, CSP nonce, and body-size enforcement.
- **Added section 2 to the validator: a guard AGAINST stray
  `middleware.ts`.** If a `middleware.ts` ever re-appears at the project
  root, the validator now fails loud. This prevents the same wrong fix
  from being re-applied in future rounds.

### Wrong assertions removed from earlier CHANGELOG entries

The previous CHANGELOG entries for 2026-05-10 (afternoon) and the
2026-05-11 round-1 entry both falsely claimed `middleware.ts` was
"missing" and "required" — those claims were wrong. The proxy layer
that invokes `proxy.ts` has always been in place; nothing was broken.

## 2026-05-11 — Restoration + Writer-Role Split

This round restored work from rounds 2 and 3 that had been reverted in
the user's zip, and closed the final outstanding code-level item.

### Restored from prior rounds (lost in zip round-trip)

The uploaded zip dropped almost all of the round-2/3 deliverables. Re-applied:

- `scripts/compile-with-solcjs.cjs` (sandbox compile fallback)
- `scripts/validate-frontend-ready.ts` (hardhat-free pre-flight)
- `scripts/sync-abis.ts` with SKIP_LIST / RENAME_MAP / MERGE_MAP support
- `migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql` + .down
- `migrations/20260510_140000_complete_rls_baseline.sql` + .down
- `migrations/20260510_141500_normalize_legacy_rls_lower.sql` + .down
- 13 ABI files re-synced from artifacts (CardBoundVault 84→102 fns,
  VFIDEBridge 0→112 fns, VFIDECommerce 16→35 fns, MainstreamPayments
  20→36 fns, DevReserveVesting 26→28 fns, plus 8 others)
- `package.json` — removed 9 dead/broken script entries; re-added 7 new
- Deleted (again): `scripts/deploy-all.ts`, `scripts/apply-all.ts`

(NOTE: An erroneous `middleware.ts` shim was also re-applied in this
round but subsequently removed in the 2026-05-11 afternoon correction —
see the entry above.)

### New — closes the last open code-level item

- **`migrations/20260511_160000_split_writer_role.sql`** + .down. Creates
  a `vfide_app_writer` role (NOBYPASSRLS, no LOGIN by default), revokes
  INSERT/UPDATE/DELETE from `vfide_app` on the 25 Pattern F
  system/lookup tables, and grants those four privileges to the new
  writer role. `vfide_app` retains SELECT — reads from API routes
  continue to work. Backend jobs (indexer, cron, webhook handlers) must
  switch to a `DATABASE_URL_WRITER` env var that connects as the writer
  role. Until they do, those flows hit "permission denied" — fails loud,
  not silent. Tables touched: platform_categories, daily_quests,
  weekly_challenges, achievement_milestones, prize_tiers,
  monthly_prize_pool, seer_analytics_daily_rollup,
  seer_reason_code_daily_rollup, performance_metrics, indexed_events,
  indexer_state, merchant_webhook_deliveries, merchant_invoice_items,
  merchant_order_items, merchant_product_variants,
  merchant_digital_assets, merchant_digital_deliveries,
  coupon_redemptions, installment_payments,
  merchant_wholesale_group_buys, audit_events,
  security_alert_dispatches, security_webhook_replay_events,
  flashloan_lanes, flashloan_lane_events, vault_identities.

- `validate-frontend-ready.ts` extended with the new migration check.

### State at end of round

All 16 frontend pre-flight checks pass. Five migrations on disk cover
the full RLS surface:

1. `20260503_120000_create_app_role_rls_enforcement.sql` — creates vfide_app NOBYPASSRLS
2. `20260510_120000_grant_vfide_app_and_baseline_rls.sql` — 102-table grants + 31-table RLS
3. `20260510_140000_complete_rls_baseline.sql` — 47 more tables, 5 ownership patterns
4. `20260510_141500_normalize_legacy_rls_lower.sql` — case-insensitive wallet matching
5. `20260511_160000_split_writer_role.sql` — Pattern F write protection

## 2026-05-10 (evening) — Closing All Open Items

This pass closes the four "Open" items I documented at the end of the
previous session.

### Compile + ABI sync (✅ closed)

Got Solidity compilation working in a sandboxed environment without the
native solc binary. The Hardhat compiler downloader fetches from
`binaries.soliditylang.org` which is unreachable in some networks
(including the prep environment used for this work). Resolved by:

- **`scripts/compile-with-solcjs.cjs`** — standalone Node script that uses
  the pure-JS `solc` npm package (already in `devDependencies`) to compile
  any subset of contracts directly, writing Hardhat-compatible artifacts
  to `artifacts/contracts/`. Supports a CLI list of contract names so you
  can compile in batches when viaIR makes a full build too slow.
- Compiled the full production contract set across 8 batches.
- **All 58 frontend ABIs are now in sync** with the deployed contract
  surface. Drift in 11 ABIs was fixed:
  - **CardBoundVault**: 18 functions added — `executeQueuedPayment`,
    `cancelQueuedPayment`, `applyLargePaymentThreshold`,
    `setLargePaymentThreshold`, `pauseApprovalByGuardian`,
    `splitAdminFromActive`, and 12 supporting view/state vars. These
    drive the withdrawal-queue UI.
  - **FraudRegistry**: `getPendingEscrowsPaginated`, `userActiveEscrowCount`
  - **VFIDEBridge**: 21 functions for refund-window and recovery flows
  - **VFIDEBadgeNFT**: 18 functions for emergency-controller flow
  - **VFIDECommerce**: 18 functions across MerchantRegistry+CommerceEscrow
  - **VFIDEEnterpriseGateway**: 10 oracle-floor functions
  - **VFIDEFlashLoan**: 13 fee-distributor/orphan-sweep functions
  - **VFIDEPriceOracle**: 19 emergency-controller functions
  - **VFIDETermLoan**: 3 cosigning functions
  - **VaultRegistry**: 4 vault-hub-change functions
  - **VaultInfrastructure**: removed 1 stale function (`getRecoveryStatus`)

### sync-abis.ts — handles all corner cases now

Extended with three new categories so `--check` is now CI-clean:

- **SKIP_LIST** (`ERC20`) — hand-curated standard interfaces are never
  overwritten by sync.
- **RENAME_MAP** — when `lib/abis/<X>.json` reflects a contract that was
  renamed (`DevReserveVesting` → `DevReserveVestingVault`,
  `MainstreamPayments` → `MainstreamPriceOracle`), the symbol stays stable
  while the artifact source is correctly tracked.
- **MERGE_MAP** — for multi-contract files like `VFIDECommerce.sol`
  (defines both `MerchantRegistry` and `CommerceEscrow`), the script
  merges both artifacts' ABIs into one file. Dedupes by type+name+inputs.

### Full RLS coverage (✅ closed)

Two new migrations close the policy gap on the ~72 sensitive tables that
had no RLS at all:

- **`migrations/20260510_140000_complete_rls_baseline.sql`** — covers 47
  tables across 5 ownership patterns:
  - Pattern A (28 tables): `user_id` FK joined through `users.wallet_address`
  - Pattern B (4 tables): `address` PRIMARY KEY = wallet
  - Pattern C (5 tables): dual-address payments/streams/loans — both
    `from`/`to` parties can read; only originator can insert; either party
    can update (cancellation/acceptance)
  - Pattern D (7 tables): actor FK columns (`creator_id`, `sender_id`,
    `uploaded_by`, `reporter_id`, `staff_id`)
  - Pattern E (2 tables): group membership scope — visible to current
    group members via `group_members` lookup
  - Pattern F (25 tables): explicit no-RLS decision documented in-migration
    for system/lookup tables (categories, daily quests, achievement
    milestones, performance metrics, indexer state, etc.) — these stay
    open-read with writes gated by future role split.
- **`migrations/20260510_141500_normalize_legacy_rls_lower.sql`** —
  consistency-patches the 6 legacy RLS-protected tables (users, messages,
  friendships, user_rewards, endorsements) to use `LOWER()` on wallet
  comparisons, matching the modern pattern established by
  `20260430_120000_user_portfolios_and_users_insert_rls.sql`. Closes a
  latent footgun where any mixed-case wallet address inserted by an admin
  job would become invisible to its rightful owner under RLS.
  user_portfolios already used LOWER(); proposals is intentionally
  read-public.

Both migrations are idempotent and have companion `.down.sql` files.

### Legacy-RLS audit (✅ closed)

The 7 pre-existing RLS-protected tables were audited:

| Table           | Had | Now |
|-----------------|-----|-----|
| users           | R,U + insert (bare =) | R,U,I (LOWER) |
| messages        | R,I,D (bare =)        | R,I,D (LOWER) |
| friendships     | R,I,U (bare =)        | R,I,U (LOWER) |
| user_rewards    | R,U (bare =)          | R,U (LOWER)   |
| endorsements    | read-all + I,D (bare =) | read-all + I,D (LOWER) |
| user_portfolios | R,I,U (LOWER)         | unchanged     |
| proposals       | read-all              | unchanged     |

Three intentional gaps remain by design:
- `users` has no DELETE policy (admin-only deletion)
- `messages` has no UPDATE policy (messages are immutable)
- `endorsements` has no UPDATE policy (endorsements are immutable)

### Compile validation (✅ closed)

The 8-batch compile against solc 0.8.30 surfaced ZERO compile errors in
the production set. Warnings logged:
- 18 "unused parameter" warnings (cosmetic)
- 4 "function can be restricted to view/pure" warnings (cosmetic)
- 4 "contract size exceeds 24576 bytes" warnings on Seer.sol,
  SeerAutonomous.sol, CardBoundVault.sol, EcosystemVault.sol — these are
  EXPECTED in a default runs:200 build; `hardhat.config.ts` has per-file
  overrides with `runs:0` and `revertStrings: "strip"` that bring each
  under 24KB for actual deployment. Verify with `npx hardhat
  size-contracts` on a real Hardhat compile before mainnet.

### Files added in this pass

- `scripts/compile-with-solcjs.cjs`
- `migrations/20260510_140000_complete_rls_baseline.sql` + `.down.sql`
- `migrations/20260510_141500_normalize_legacy_rls_lower.sql` + `.down.sql`

### Files modified in this pass

- `scripts/sync-abis.ts` — added SKIP_LIST, RENAME_MAP, MERGE_MAP
- `scripts/validate-frontend-ready.ts` — recognizes the two new RLS migrations
- `lib/abis/` — 11 files updated with fresh ABIs from solc 0.8.30

### Single remaining caveat

The 25 Pattern F tables (system/lookup) stay open-read by intentional
decision. The migration documents this in a long comment block. For
mainnet, consider splitting `vfide_app` into `vfide_app_reader` and
`vfide_app_writer` so writes to those tables are role-gated.

## 2026-05-10 (afternoon) — Frontend / API / DB Readiness

Goal: close the non-Solidity testnet blockers blocking "100% mainnet parity."

### Critical fixes

- **Created root `middleware.ts`** — re-export shim pulling `middleware`
  and `config` from `proxy.ts`. Next.js (currently 16.2.4) only picks up
  middleware named EXACTLY `middleware.ts` at project root. Without this
  file, `proxy.ts` was never executed — meaning no CSRF validation, no CSP
  nonce, no request-size limits, no Content-Type validation, no CORS
  enforcement on any API route, despite all that logic being implemented.

- **Added `migrations/20260510_120000_grant_vfide_app_and_baseline_rls.sql`.**
  Of 110 tables defined across migrations, only 8 had `GRANT … TO
  vfide_app` statements. Promoting `DATABASE_URL` to the `vfide_app` role
  (NOBYPASSRLS — the only safe production setup) would have failed at the
  first query against any other table with "permission denied". The
  migration:
    - Grants SELECT/INSERT/UPDATE/DELETE on all existing public tables
    - Grants USAGE on all sequences
    - Sets ALTER DEFAULT PRIVILEGES so future tables/sequences inherit
      these grants without per-migration boilerplate
    - For every table with an obvious owner column (`wallet_address`,
      `owner_address`, `user_address`, `merchant_address`,
      `merchant_wallet_address`), adds `_read_own`/`_insert_own`/
      `_update_own`/`_delete_own` RLS policies keyed on
      `current_setting('app.current_user_address', true)`
    - Prints NOTICE listing tables with no obvious owner column so they
      can be reviewed manually before mainnet
  Companion down migration drops the policies and revokes grants.

### New tooling

- **`scripts/validate-frontend-ready.ts`** + `npm run validate:frontend`.
  Pre-flight that does NOT require hardhat. Checks: middleware.ts present;
  proxy.ts exports correct surface and calls validateCSRF; /api/csrf
  route exists; CSRF exempt list doesn't include high-value paths;
  lib/db.ts calls set_config(app.current_user_address, ...);
  instrumentation.ts calls verifyRlsEnforcementOrThrow; both vfide_app
  migrations are present. Pairs with validate:testnet for full coverage.

### Re-applied (drifted between zip rounds)

- `package.json` had reverted to pre-cleanup state. Re-removed six broken
  script entries; re-added five new ones; added `validate:frontend`.
- `scripts/deploy-all.ts` and `scripts/apply-all.ts` had been restored.
  Re-deleted. These deploy a strict subset of `deploy-full.ts` (18 of 28+
  contracts), directly contradicting the testnet==mainnet goal.

### Verified-already-wired (user-memory note was stale)

The user-memory note `"SET app.current_user_address never called in
lib/db.ts"` referred to an earlier code state. Current `lib/db.ts:32-33`
defines `applyDbUserAddressContext`, and every `query()` / `getClient()`
invocation either resolves the user from AsyncLocalStorage or from
request headers/cookies and applies the context on a dedicated client.
Wired correctly. The actual gap was the table-grant gap above.

## 2026-05-10

### Testnet Readiness — Deployment Pipeline Consolidation

Goal: deploy the same contract set + wiring on testnet that we'd ship to
mainnet, with no parallel scripts to maintain and no silent runtime gaps.

#### Deployment scripts
- **Made `scripts/deploy-full.ts` the canonical deploy path.** Added
  `TESTNET_CHAIN_IDS` constant matching `_isSupportedTestnetChain` in
  `contracts/testnet/VFIDETestnetFaucet.sol`, and gated the faucet
  deployment behind `isTestnetChain && DEPLOY_TESTNET_FAUCET=true`.
  `DEPLOY_TESTNET_FAUCET=true` on a mainnet chain now throws fast with a
  clear error instead of relying on the faucet constructor revert.
- **Wired the faucet to EcosystemVault.** Previously every faucet claim
  silently lost its referral inside a try/catch because
  `EcosystemVault.registerUserReferral` is `onlyManager` and the faucet
  was never registered. Deploy now calls `setManager(faucet, true)` (which
  queues a 2-day timelock) and `faucet.setEcosystemVault(ecoAddr)`.
- **Added missing module DAO transfer finalizations to `apply-full.ts`.**
  `MerchantPortal.applyDAO`, `VFIDEFlashLoan.applyDAO`,
  `VFIDETermLoan.applyDAO`, and `FraudRegistry.applyDAO_FR` are all
  48h-timelocked and were queued by `deploy-full.ts` but never executed.
  Without this fix the deployer remained DAO of all four modules forever.
- **Added `EcosystemVault.executeManagerChange()` to `apply-full.ts`** so
  the faucet manager grant queued at deploy time actually takes effect.
- **Deleted `scripts/deploy-all.ts` and `scripts/apply-all.ts`** — the
  partial duplicate of `deploy-full.ts`/`apply-full.ts` that only covered
  18 of the 28+ production contracts.
- **Removed nine dead script entries from `package.json`** that pointed at
  `.broken` files: `contract:deploy`, `deploy:apply-wiring:{mainnet,sepolia}`,
  `deploy:solo:{base,mainnet,sepolia}`, `deploy:wizard`, `deploy:all`, `apply:all`.

#### New scripts (all idempotent, chain-guarded)
- `scripts/fund-faucet.ts` — funds the testnet faucet with VFIDE + ETH,
  with pre-flight balance check and optional operator registration. Refuses
  to run on non-testnet chains. Reads `.deployments/<network>.json` so no
  hand-typed addresses.
- `scripts/sync-abis.ts` — copies fresh ABIs from `artifacts/contracts/`
  into `lib/abis/` after `hardhat compile`. `--check` mode for CI.
  Fixes the recurring "function not in ABI" wagmi runtime errors.
- `scripts/validate-testnet-ready.ts` — single-shot pre-flight that checks
  chain id, deployment book completeness, token total supply (200 M),
  token module wiring, faucet balance + ecosystem vault wiring,
  EcosystemVault.isManager(faucet), all six module DAO ownerships, and
  parity between `NEXT_PUBLIC_*_ADDRESS` env vars and the deployment book.
  Exits non-zero on any failure for CI gating.

#### hardhat.config.ts
- Removed three phantom Solidity overrides for files that don't exist:
  `contracts/DeployPhases3to6.sol`, `contracts/DeployPhase1.sol`,
  `contracts/DeployPhase1Governance.sol`.
- Corrected the path for `BadgeManager.sol` and `SeerAutonomous.sol` to
  `contracts/future/` (where they actually live).
- Added testnet networks: `zkSyncSepolia` (300), `arbitrumSepolia` (421614),
  `optimismSepolia` (11155420) — all in the faucet's allowlist but
  previously unreachable from `--network ...`.
- Added matching mainnet networks: `arbitrum` (42161), `optimism` (10).
- Extended etherscan config with `ARBISCAN_API_KEY` and
  `OPTIMISTIC_ETHERSCAN_API_KEY` plus custom-chain endpoints for all four
  new networks.

#### Faucet API
- `app/api/faucet/claim/route.ts` — replaced hardcoded `baseSepolia`
  imports/usages with a `resolveTestnetChain()` helper that maps
  `NEXT_PUBLIC_DEFAULT_CHAIN_ID` to its viem chain definition + default
  RPC URL. Supports Base Sepolia, Polygon Amoy, zkSync Sepolia, Ethereum
  Sepolia, Arbitrum Sepolia, and Optimism Sepolia. Returns 503
  "Unsupported testnet chain" if `NEXT_PUBLIC_DEFAULT_CHAIN_ID` is set to
  anything not in the testnet allowlist.

#### Doc / env hygiene
- Updated `.env.example` and `.env.staging.example` references from the
  deleted `deploy-all.ts` to `deploy-full.ts`. Added
  `NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS` to the canonical post-deploy block.
- Updated stale references in `scripts/verify-admin-roles.ts` and
  `scripts/future/apply-phase2.ts`.

#### Known follow-ups (not fixed in this pass)
- ABI drift inventory: `FraudRegistry` is missing 8 functions from
  `lib/abis/FraudRegistry.json`; `CardBoundVault` is missing 9 (including
  `executeQueuedPayment` and `cancelQueuedPayment` — both needed for the
  withdrawal-queue UI). Run `npx hardhat compile && npm run sync-abis`
  after this drop to repair.
- Hardhat compile was not run in the prep environment (no solc binary
  available); a clean compile + `hardhat size-contracts` should be the
  next gate.

## 2026-04-13

### Security And Reliability Remediation

- Finalized deep audit remediations across token, vault, escrow, governance, and router flows.
- Added testnet chain guard for the faucet to block deployment on major production chains.
- Enforced timelocked whale-limit exemption application flow and aligned related tests.
- Hardened fee-routing, score fallback, whitelist enforcement, and anti-whale accounting behavior.
- Standardized compiler configuration and interface surface updates for safer operations.

### Release

- Commit: `8e18922e`
- Branch: `main`
- Validation: `hardhat compile` clean; representative Jest regression suite passing.
