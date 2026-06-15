# VFIDE Wave 71 — Reaction Engine Integration (Trace Map)

The audit confirmed the reaction architecture was already sound, and found **one genuine dead-end** in
Phase 10 — fixed by wiring real merchant activity into the HQ advisor inputs. **Built into the existing
HQ route, no standalone files.** Verified: typecheck **0 errors**, nav **0 broken**, **64 tests passing
across 6 suites**.

## Honest audit: the reaction architecture was already in place (Phases 1–9)
- **Every merchant action already emits an event** — sale (`PAYMENT_RECEIVED`), subscription
  (`SUBSCRIPTION_STARTED`/`CANCELLED`), booking (`BOOKING_CREATED`/`COMPLETED`), dispute
  (`DISPUTE_OPENED`/`RESOLVED`), delivery (`SHIPMENT_VERIFIED`). Confirmed by emit counts in each route.
- **Intelligence recomputes live from the DB on every read** — HQ does 13 query/compute calls per GET;
  discovery does 10 per search. So the data path is **action → writes a DB row → signal recomputed fresh
  on next read**. No stale cache, no event-driven invalidation needed.
- Opportunity Center / Risk Center (Phase 6/7), discovery consumption (Phase 5), and the signal traces
  (Phase 9) were delivered in Waves 68–70 and verified again here.

## The genuine gap (Phase 10): some actions wrote rows nothing read
`readAdvisorInputs` in the HQ route hardcoded `distinctCustomers90: 0`, `repeatCustomers90: 0`,
`refundsGranted90: 0`, and `hasSubscriptionPlans: false`. So three merchant actions **terminated without
creating intelligence**:
- **Subscriptions** — a merchant *with* plans was still told "Subscriptions could fit" (the advisor's
  `subscription-opp` signal fires on `!hasSubscriptionPlans`). Now reads `merchant_subscription_plans`.
- **Refunds** — refund actions never reached commerce health. Now reads `merchant_orders.refunded_at`
  (last 90 days, `payment_status IN ('refunded','partial_refund')`).
- **Repeat customers / retention** — retention signals saw zero. Now derived from
  `merchant_payment_confirmations.customer_address` (distinct + ≥2-purchase repeat, 90 days).

Each read is in its own try/catch and fails soft to the prior zero if a table is absent — provisional,
never fabricated.

## Runtime bug avoided while wiring
My first refund query filtered on `updated_at`; I verified the `merchant_orders` schema and switched to
the dedicated **`refunded_at`** column — more precise, and confirmed to exist (the table also has the
expected timestamps). Checking the schema before trusting it is what caught this.

## PHASE 10 — Merchant economy reaction chain (verified write → read)
| Action | Writes | Read by | Reacts in |
|---|---|---|---|
| Sale | `merchant_payment_confirmations` | advisor + Merchant Health (revenue/orders/**customers**) | discovery rank, lending, HQ |
| Subscription | `merchant_subscription_plans` | **advisor (now)** | HQ subscription opportunity |
| Refund | `merchant_orders.refunded_at` | **advisor commerce health (now)** | Merchant Health, HQ |
| Dispute | `disputes` | Merchant Trust + fraud risk | discovery rank, HQ Risk Center |
| Delivery | `shipments` | Delivery Reliability | Merchant Health, trust, discovery |
| Repeat purchase | `merchant_payment_confirmations` | **retention (now)** | Merchant Health, subscription signal |
**No merchant action now terminates without creating ecosystem intelligence.**

## FINAL — "What ecosystem behavior changes because of each signal?"
| Signal | Ecosystem behavior |
|---|---|
| Builder Record | Lending terms, discovery visibility, emergency eligibility, HQ opportunities |
| Extraction Index | Discretionary friction (lending/visibility); HQ Risk Center; never ownership |
| Merchant Health | Discovery ranking lift; HQ growth opportunities + decline risks; **now reacts to retention/refunds/subscriptions** |
| Merchant Trust | Discovery ranking; HQ Risk Center dispute flags |
| Stability Bonding | HQ benefits preview (active on bond) |
| Market Impact | Still awaiting real on-chain magnitudes — the one honest orphan |

## Honest caveats
- Built + typecheck-clean + handler/unit-tested against your repo; **not run against a live DB/chain/browser**.
- The new reads assume `merchant_subscription_plans(merchant_address)`, `merchant_orders(refunded_at,
  payment_status, merchant_address)`, and `merchant_payment_confirmations(customer_address, created_at)`
  — verify against your live schema; each fails soft to provisional if absent.
- The repeat-customer subquery adds one correlated read to the HQ load. Fine for a single-merchant HQ
  view; cache if HQ is hit at high frequency.
- **Market Impact remains the one orphan** — engine correct, but needs real on-chain transfer magnitudes;
  not wired to placeholder data.

## Bottom line
The ecosystem already reacted to intelligence via live recompute; this wave closed the one place that
didn't — subscription, refund, and retention actions now feed the advisor and Merchant Health, so no
merchant action dead-ends. Every major signal drives a real ecosystem behavior except Market Impact,
which honestly awaits an on-chain data feed.
