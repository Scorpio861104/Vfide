# Batch C API Integrity Verification (2026-05-04)

Scope:

- #62 (merchant orders tx_hash trust)
- #95 (payment-request completion with unverified tx_hash)
- #138 (merchant withdrawal amount not tied to confirmed balance)
- #91 (missing `/api/crypto/transfer` route)
- #92 (payment-request route module-load stability)
- #72/#93 (params access within withAuth closures)
- #105 (customer-controlled pricing)

## Implemented

### #62 — Merchant orders tx_hash trust

- `app/api/merchant/orders/route.ts`
  - POST ignores client-supplied `tx_hash` and always creates orders as `pending/unpaid`.
  - PATCH rejects `tx_hash` updates and directs callers to verified `/api/merchant/payments/confirm` flow.

### #95 — Payment request completion verification

- `app/api/crypto/payment-requests/[id]/route.ts`
  - `status=completed` now requires `txHash`.
  - tx hash is verified on-chain; failures return `422`.
  - if verification is unavailable, endpoint fails closed with `503`.

### #138 — Merchant withdrawal balance check

- `app/api/merchant/withdraw/route.ts`
  - POST now computes confirmed net balance and rejects withdrawals above available confirmed balance (`422`).

### #91 — Missing endpoint

- Added `app/api/crypto/transfer/route.ts`.
  - Non-custodial-safe behavior: deterministic `501` response with guidance to sign in wallet.
  - Prevents missing-route/module errors while avoiding insecure server-side transfer execution.

### #105 — Server-authoritative pricing

- `app/api/merchant/orders/route.ts`
  - POST now requires `product_id` per item and resolves authoritative prices from `merchant_products` (and `merchant_product_variants.price_override` where applicable).
  - Client-supplied `unit_price` is no longer trusted for subtotal/total calculations.

## Test coverage added/updated

- `__tests__/api/crypto/transfer.test.ts` (new)
- `__tests__/api/crypto/payment-requests/id.test.ts` (updated)
- `__tests__/api/crypto/payment-requests.test.ts` (updated for current withAuth harness)
- `__tests__/api/merchant/orders.webhook-hardening.test.ts` (updated fixture expectations)

## Focused test pack

```bash
npx jest __tests__/api/crypto/payment-requests.test.ts \
  __tests__/api/crypto/payment-requests/id.test.ts \
  __tests__/api/merchant/orders.webhook-hardening.test.ts \
  __tests__/api/crypto/transfer.test.ts \
  __tests__/app/checkout-id-page-param-guard.test.tsx \
  --runInBand
```

Outcome: all suites passing.

## Audited/validated-only

- #92: payment-request routes now load and execute in test harness.
- #72/#93: `[id]` params are resolved inside route closures with `withAuth` handlers.

## Batch C status

- Completed for #62, #91, #92, #95, #138, #72, #93, and #105 with focused passing test coverage.
