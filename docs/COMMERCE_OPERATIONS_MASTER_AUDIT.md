# Commerce Operations Master Audit

**The question this audit answers is not "can VFIDE *evaluate* commerce?" (the Commerce Civilization Audit
covered that) but "can VFIDE *operate* commerce?"** Pretend VFIDE launches tomorrow: what kind of business
cannot run successfully on it? Every rating below is grounded in an actual read of the code (API routes,
contracts, migrations, pages) — not the architecture's intent, not marketing language. Ratings:
**✅ COMPLETE** (a real business could rely on it), **🟡 PARTIAL** (exists but has an operational gap that would
bite), **❌ MISSING** (not implemented).

## Surface reality (what actually exists)
- **41 merchant API routes**, **~35 commerce pages**, **179 DB migrations**, and commerce contracts incl.
  `CommerceEscrow` (570 L), `SubscriptionManager` (854 L), `PayrollManager` (989 L), `ServicePool` (612 L),
  `MerchantRegistry`, `MerchantPortal`.
- This is **far more operational machinery than a payment protocol needs** — VFIDE has genuinely built a
  merchant-operations layer. The gaps below are therefore specific, not wholesale.

---

## CATEGORY 1 — E-COMMERCE (Shopify-equivalent)
| Capability | Rating | Evidence / gap |
|---|---|---|
| Store creation / storefront | ✅ | `merchant/profile`, `store/[slug]`, `merchant_catalog_storefront_orders` migration |
| Product catalog | ✅ | `merchant/products` (631 L) — price, SKU, compare-at, type, images(≤10), token price |
| Categories | ✅ | `merchant/categories` + `platform_category_id` |
| Product images | ✅ | `productImageSchema`, ≤10 images per product |
| Digital goods | 🟡 | `merchant/digital` route + `product_type:'digital'` exist; **automated delivery (download link / license key issuance on payment) is thin** — fulfillment is recorded, not provisioned |
| Physical goods | ✅ | `product_type:'physical'`, inventory tracking |
| **Variants** (size/color) | 🟡 | `merchant_product_variants` **table exists**, but the products API references variants only minimally — **first-class variant CRUD + per-variant inventory/price selection at checkout is not wired through** |
| **Bundles** | ❌ | No bundle table/route found |
| Inventory | ✅ | `inventory_count` + `inventory_tracking` on products |
| Coupons / discounts | ✅ | `merchant/coupons` + `coupons/validate` + `merchant_coupons` migration |
| Taxes | 🟡 | `merchant/tax-rates` **stores** rates; `calculateTaxEvents` is **reporting-side**. **No checkout-time tax engine** (nexus / jurisdiction rate applied to a cart at sale) |
| Shipping | 🟡 | `merchant/shipments` records carrier+tracking; route's own comment: *"this records and confirms; it is not a live carrier API."* **No rate calculation / label purchase / zones** |
| Returns / refunds | ✅ | `merchant/returns` + `merchant/refunds` + refund order-state; escrow refund on-chain |
| **Exchanges** | ❌ | Returns exist; **no exchange flow** (swap item, not money-back) |
| Reviews | ✅ | `merchant/reviews` (256 L) with **verified-purchase gating** |
| Order lifecycle | ✅ | `merchant/orders` (591 L) — full state machine pending→confirmed→processing→shipped→delivered→completed (+cancel/refund) with enforced transitions |
| Checkout | ✅ | `merchant/checkout/[id]` (370 L) + `checkout/[id]` page (534 L) |

**Verdict:** *A merchant CAN run a complete online business for simple catalogs.* They **cannot** cleanly sell
**variant-heavy** products, **bundles**, compute **sales tax at checkout**, buy **shipping labels / live
rates**, offer **exchanges**, or auto-**deliver digital goods**. → **Operationally PARTIAL.**

## CATEGORY 2 — LOCAL SERVICE BUSINESS (restaurant, barber, mechanic, dentist, trades)
| Capability | Rating | Evidence / gap |
|---|---|---|
| Service listings | ✅ | `product_type:'service'`, `ServicePool` contract |
| Appointment booking | ✅ | `merchant/bookings` (334 L) — create_slot / book_appointment |
| Scheduling / availability | 🟡 | Slots exist; **recurring availability, calendar conflict/double-book prevention, business-hours/staff-calendar** not evidenced beyond per-slot records |
| Quotes / estimates | ❌ | **No quote route** (distinct from invoices) — trades can't send an estimate→approve→convert flow |
| Invoices | ✅ | `merchant/invoices` + `merchant_webhooks_invoices` migration |
| **Deposits** (partial up-front) | ❌ | No deposit/partial-payment-against-booking flow (the only "deposit" hits are onboarding streaks) |
| Completion verification | ✅ | `CommerceEscrow` delivery confirmation + order `completed` state |
| Reviews | ✅ | shared with Cat 1 |

**Verdict:** *Appointment-based businesses can take bookings and get paid.* Trades/quote-driven businesses
**cannot** quote→deposit→complete. Scheduling lacks conflict-safety. → **PARTIAL.**

## CATEGORY 3 — BRICK & MORTAR / RETAIL (grocery, retail, boutique, hardware)
| Capability | Rating | Evidence / gap |
|---|---|---|
| POS (charge) | 🟡 | `pos/charge` is **72 L** — a payment charge only. **No tendering (cash/card/change), barcode scan, register/drawer, receipt printing** |
| Inventory | ✅ | product inventory tracking |
| Employees | ✅ | see Cat 4 (roles incl. `cashier`, `sale`/`refund` permissions) |
| Cashier operations | 🟡 | staff `sale`/`refund` actions exist; **no cash drawer / shift / till reconciliation** |
| Receipts | 🟡 | `merchant/receipts/sms` exists (SMS); **no printed/POS receipt with line items + tax breakdown** |
| Refunds | ✅ | refunds route + staff `refund` permission |
| Loyalty | ✅ | `merchant/loyalty` + `merchant_loyalty` migration; gift cards too |
| Multi-location | 🟡 | `merchant/locations` exists; **per-location inventory and per-location staff assignment not wired** — locations are records, not operational silos |

**Verdict:** *VFIDE is NOT yet a drop-in replacement for Square/Clover at a physical counter.* It can record
sales and manage staff/loyalty, but lacks true POS tendering, receipts, drawer/shift, and per-location ops.
→ **PARTIAL (weakest physical-retail).**

## CATEGORY 4 — EMPLOYEE SYSTEMS (user flagged as under-audited — it is actually the STRONGEST gap-free area)
| Capability | Rating | Evidence / gap |
|---|---|---|
| Employees / staff | ✅ | `merchant/staff` (342 L) + `merchant_staff` + `staff_activity_log` tables |
| Roles | ✅ | `admin` / `manager` / `cashier` |
| Permissions / access control | ✅ | JSONB permissions, scoped actions (`sale`,`refund`,`product_edit`), `normalizeStaffPermissions` |
| Sessions / delegation | ✅ | staff sessions with create/update/**revoke** + **expiry** |
| Termination | ✅ | `revoked_at` (soft-revoke) |
| Payroll | 🟡 | `PayrollManager` (989 L) streams earned wages on-chain + payroll page, **but no payroll API route** — the off-chain operational glue (run payroll, tax withholding, payslips) is thin |
| Scheduling (shift) | ❌ | No employee shift-scheduling (distinct from appointment slots) |
| Manager operates without owning | ✅ | **Answered:** roles/permissions are scoped capabilities; a `manager` can act on the store and **never** becomes admin/owner. Ties cleanly to Preparedness (Cat 8). |

**Answers to the explicit questions:** employees **can** fulfill orders, process refunds, manage inventory,
handle support **if granted** those permissions; they **cannot** change ownership, withdraw funds to themselves,
or alter the trust/recovery graph. **A manager can fully operate a store without becoming the owner.**
**Verdict:** ✅ **Access control is genuinely COMPLETE.** Payroll *execution* and *shift scheduling* are the gaps.

## CATEGORY 5 — MARKETPLACE (Amazon/Etsy-style)
| Capability | Rating | Evidence / gap |
|---|---|---|
| Seller listings | ✅ | merchant products + `merchant/directory` |
| Search | 🟡 | `merchant/directory` GET = `q` + `category` + `featured` + pagination — **substring browse, no relevance/ranking engine, no facets** |
| Discovery / ranking | 🟡 | `merchant/discovery-standing` + trust signals exist, but ranking is **standing-based, not query-relevance** |
| Product pages | ✅ | `product/[id]` |
| Trust signals | ✅ | ProofScore / Seer / verification surfaced — **VFIDE's strongest marketplace differentiator** |
| Escrow | ✅ | `CommerceEscrow` (570 L) — create/release/refund/dispute, buyer-protected |
| Shipping | 🟡 | inherits Cat 1 shipping gap |
| Disputes | ✅ | `disputes` API (160 L) + on-chain dispute |
| Fraud protection | ✅ | FraudRegistry + Seer (the trust spine) |

**Verdict:** *VFIDE can support trust-first, escrow-backed marketplace commerce.* Its **discovery/search is
weak** (no real ranking/relevance), which for a marketplace is core. → **PARTIAL, but uniquely strong on
trust/escrow.**

## CATEGORY 6 — SUBSCRIPTIONS / RECURRING
| Capability | Rating | Evidence / gap |
|---|---|---|
| Memberships / plans | ✅ | `merchant/subscriptions` (354 L) + `SubscriptionManager` (854 L) |
| Recurring billing | ✅ | fixed-amount recurring on-chain |
| Renewals | ✅ | contract renewal logic |
| Cancellations | ✅ | "user can cancel anytime" + memorial-state auto-cancel |
| Failed payments | 🟡 | **on-chain grace period exists** (`GracePeriodStarted`), but **no off-chain dunning/retry runner** found (`subscriptions_runtime_storage` has no retry/cron logic) — failed-payment recovery is manual |

**Verdict:** *Businesses CAN run recurring revenue.* The **automated failed-payment retry/dunning** loop — the
thing that actually preserves recurring revenue — is the gap. → **Near-COMPLETE; PARTIAL on dunning.**

## CATEGORY 7 — PROFESSIONAL SERVICES (lawyers, accountants, consultants, agencies, devs)
| Capability | Rating | Evidence / gap |
|---|---|---|
| Scheduling | 🟡 | shares Cat 2 booking (no conflict-safety) |
| **Contracts / agreements** | ❌ | No engagement-agreement / e-signature / terms artifact (the "agreement" hits are unrelated infra) |
| Deposits / retainers | ❌ | No retainer/deposit flow |
| **Milestones** | ❌ | **No milestone system** (only gamification "milestones"); `ServicePool` is service-payment, not project-phased |
| Invoices | ✅ | shared with Cat 2 |
| Deliverables | ❌ | No deliverable submission/acceptance artifact |

**Verdict:** *Knowledge workers CANNOT yet operate end-to-end on VFIDE.* They can invoice and (loosely) schedule,
but the **contract→retainer→milestone→deliverable→release** spine that defines project/agency work is **almost
entirely MISSING.** → **The biggest category gap.**

## CATEGORY 8 — CONTINUITY (tie Preparedness back into Commerce)
| Capability | Rating | Evidence / gap |
|---|---|---|
| Merchant successors | ✅ | `merchant/continuity` (succession) — audited W90–96 |
| Business continuity | ✅ | continuity center + readiness |
| Proof-of-life | ✅ | business PoL (set/clear) + UI (Phase A) |
| Emergency transfers | ✅ | `merchant/business-transfer` (veto/reclaim) |
| Hospitalization / absence | ✅ | proof-of-life + emergency operators cover temporary absence |
| Owner death | ✅ | succession + on-chain inheritance (CardBoundVault) |
| Multi-employee operation through transition | ✅ | staff roles persist; manager can operate during owner absence without owning |
| **Does the business survive the owner?** | ✅ | **Yes** — this is VFIDE's *strongest* and most-audited area (Waves 90–96). Funds non-custodial; control transfers via succession/recovery; staff keep operating. |

**Verdict:** ✅ **COMPLETE** (design + integration verified through W96). The one open item is the W96
storage/recovery fixes awaiting professional audit — not a continuity-feature gap.

---

## THE MATRIX (operational reality)
| Domain | COMPLETE | PARTIAL | MISSING |
|---|---|---|---|
| **E-Commerce** | storefront, catalog, categories, images, physical goods, inventory, coupons, returns/refunds, reviews, order lifecycle, checkout | digital delivery, variants, taxes (checkout), shipping (rates/labels) | **bundles, exchanges** |
| **Local Services** | listings, booking, invoices, completion | scheduling conflict-safety | **quotes, deposits** |
| **Retail / POS** | inventory, employees, refunds, loyalty | POS tender, cashier ops, receipts, multi-location | (cash drawer/shift) |
| **Employees** | roles, permissions, sessions, termination, manager≠owner | payroll execution | **shift scheduling** |
| **Marketplace** | listings, product pages, trust signals, escrow, disputes, fraud | search, discovery/ranking, shipping | (faceted relevance) |
| **Subscriptions** | plans, recurring, renewals, cancellation | failed-payment dunning/retry | — |
| **Professional Services** | invoices | scheduling | **contracts, retainers, milestones, deliverables** |
| **Continuity** | successors, PoL, emergency transfer, death/inheritance, multi-employee survival | (W96 fixes pending audit) | — |

---

## What this audit uncovers — the next development phase
The honest headline: **VFIDE's commerce layer is real and broad, its trust/escrow/continuity spine is its
genuine differentiator and is the most complete, but its "operate a business end-to-end" coverage is uneven,
and three gaps are large enough to block whole business types at launch.** In priority order:

1. **Professional-services spine (biggest gap).** Contracts/agreements, retainers/deposits, **milestones**, and
   deliverable acceptance. Without it, the entire knowledge-worker economy (lawyers, agencies, devs, consultants)
   cannot operate — and that segment is a natural fit for trust-scored escrow. **Highest leverage.**
2. **E-commerce completeness for real catalogs.** First-class **variants** (the table exists — wire it
   through), **checkout-time tax**, **shipping rates/labels**, **bundles**, **exchanges**, and **automated
   digital delivery**. These are table-stakes for a serious Shopify alternative.
3. **POS / physical-retail depth.** Tendering, receipts with line items + tax, cash drawer/shift, per-location
   inventory & staff. The weakest category; needed to replace Square/Clover.
4. **Subscription dunning** and **employee payroll execution + shift scheduling** — smaller, contained, high-ROI
   completions of otherwise-strong areas.
5. **Marketplace discovery/ranking** — VFIDE has the trust signals; it lacks a relevance/ranking engine to turn
   them into discovery.

**Strategic read (matches the user's hypothesis):** this is more important for launch readiness than another
security review right now. The protocol/security/continuity foundation is sound and heavily audited; the
**operational commerce surface is where launch-blocking gaps live.** The single most defensible next campaign is
**(1) the Professional-Services Operations build**, because it unlocks an entire customer segment with the
least overlap with what already exists — followed by **(2) e-commerce catalog completeness**.

## Method note (honesty)
Ratings are grounded in file reads: route line-counts and schemas, migration tables, contract function
signatures, and the routes' own honesty comments (e.g. shipments explicitly stating it is "not a live carrier
API"). "MISSING" means no implementing file was found on inspection; an auditor should confirm against any
surfaces not surfaced by these searches. No rating was assigned from the architecture's intent or from prior
waves' summaries — only from what the code does today.
