# Product Variants — Wiring Spec (Commerce Operations, E-Commerce unblock)

Not a build — a **wiring** job. The audit flagged variants as "table exists, not wired." A precise read
confirms the storage is actually *more* complete than the audit assumed; the gap is purely the **write side**.
This spec scopes the minimal wiring to make variants work end-to-end so variant-heavy merchants (apparel, etc.)
can use the platform.

## What already exists (confirmed by file read — do NOT rebuild)
- **`merchant_product_variants`** (migration `20260319_140000`): `product_id` FK (cascade), `name`
  ("Large / Blue"), `sku`, `price_override` (NULL = use product price), `inventory_count`, `sort_order`,
  `attributes` JSONB (`{"size":"L","color":"Blue"}`), `status`, `created_at` + index on `product_id`. **Complete.**
- **`merchant_order_items.variant_id`** — FK to `merchant_product_variants` **already exists** (cascade SET
  NULL). So an order line can already record *which* variant sold. **Complete.**
- **Read path:** `merchant/products` GET already joins active variants (route line ~170); `product/[id]` page
  already types + displays `variants[]` with `price_override`. **Complete.**

## The actual gaps (write side only)
1. **No variant CRUD.** No way to create / edit / reorder / archive variants. The products route only *reads*
   them; there is no `merchant/products/[id]/variants` endpoint.
2. **Checkout ignores variant selection.** The purchase path does not accept a `variant_id`, so it cannot:
   apply the variant's `price_override`, decrement the variant's `inventory_count`, or persist
   `order_items.variant_id`. A buyer cannot actually choose "Large / Blue" and have it priced/stocked/recorded.

## Wiring (minimal, reuse-heavy)
### A. Variant CRUD route — `app/api/merchant/products/[id]/variants/route.ts` (NEW, ~150 L)
Follows the existing merchant-route conventions (`withAuth`, `withRateLimit`, zod, `query`):
- `GET` — list variants for a product (merchant-scoped).
- `POST` — create: `{name, sku?, price_override?, inventory_count?, attributes, sort_order?}`. Validate the
  product belongs to the caller. Insert into `merchant_product_variants`.
- `PATCH` — update a variant (price_override, inventory_count, status, sort_order, attributes).
- `DELETE` — archive (`status='archived'`), not hard-delete (preserves `order_items` history via the existing
  SET NULL FK — but archive keeps the row).
- **No schema change.** Pure write surface over the existing table.

### B. Thread `variant_id` through purchase (EDIT existing checkout/order creation)
At the point order items are created:
1. Accept optional `variant_id` per cart line.
2. If present: resolve the variant, use `COALESCE(variant.price_override, product.price)` as `unit_price`,
   and write `order_items.variant_id` (FK already there).
3. **Inventory:** when `inventory_tracking` is on, decrement the **variant's** `inventory_count` if a variant
   was chosen, else the product's. Reject if insufficient (the existing inventory guard, scoped to the variant).
4. **Variant required when variants exist:** if a product has ≥1 active variant, a purchase **must** specify
   one (reject a variant-less purchase of a variant product) — prevents ambiguous "which size did they buy."

### C. UI wiring (EDIT)
- **Product editor:** a variants section (add rows: attributes + optional price/stock) calling route (A).
- **Product page / checkout:** a variant selector (dropdowns from `attributes` keys) that sets the cart line's
  `variant_id`; show the variant's effective price + stock. The page already *receives* `variants[]`, so this
  is front-end selection wiring, not data plumbing.

## Inventory semantics (the one real decision)
A product with variants should treat **the variant as the stock-keeping unit**. Product-level
`inventory_count` becomes either ignored or a derived rollup when variants exist. **Decision needed:** ignore
product-level stock when variants exist (simplest, recommended) vs. sum-of-variants rollup (nicer display, more
code). Recommend **ignore-when-variants-exist** for the unblock; rollup is a later polish.

## Effort & risk
- **Effort:** small — one new CRUD route + threading `variant_id`/price/inventory through the existing checkout,
  plus front-end selection. **No migration, no contract, no new custody.** Days, not a campaign.
- **Risk:** low. The only correctness-sensitive piece is **variant inventory decrement** (must be atomic with
  order creation, in the same transaction the checkout already uses) and the **variant-required rule**.
- **Sequencing:** run this just ahead of / alongside the Professional Services campaign — it unblocks merchants
  the rest of the stack already serves, and must not wait behind a multi-week build.

## Honesty note
Storage and read paths verified present by file read (table schema, `order_items.variant_id` FK, products-GET
join, product-page typing). "Gap" = write paths (CRUD + checkout threading) not found on inspection. Nothing
here is implemented yet; this is the wiring plan.
