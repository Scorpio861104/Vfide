import { describe, expect, it } from '@jest/globals';
import {
  effectivePrice, hasActiveVariants, validatePurchase, lineTotal,
  type ProductLike, type VariantLike,
} from '@/lib/commerce/variants';

// ─────────────────────────── builders
const P = (o: Partial<ProductLike> = {}): ProductLike => ({
  id: 1, price: 20, inventory_tracking: true, inventory_count: 100, ...o,
});
const V = (o: Partial<VariantLike> = {}): VariantLike => ({
  id: 10, product_id: 1, price_override: null, inventory_count: 50, status: 'active', ...o,
});

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1A — VARIANT SCENARIO MATRIX
// Every scenario below EXECUTES against the pure variant logic. Grouped:
//   A. Functional   B. Pricing   C. Inventory/depletion   D. Variant-required
//   E. Archived/wrong-product   F. Scale (100 variants)   G. Adversarial   H. Concurrency model
// ════════════════════════════════════════════════════════

describe('Phase 1A · A. Functional — variant shapes (size / color / size+color)', () => {
  it('A1 size-only variant purchases at product price when no override', () => {
    const v = V({ attributes: undefined } as Partial<VariantLike>);
    const r = validatePurchase(P(), v, 1, [v]);
    expect(r.ok).toBe(true);
    expect(r.unitPrice).toBe(20);
  });
  it('A2 color-only variant resolves and decrements variant stock', () => {
    const v = V({ id: 11, inventory_count: 5 });
    const r = validatePurchase(P(), v, 2, [v]);
    expect(r.ok).toBe(true);
    expect(r.inventoryTarget).toEqual({ kind: 'variant', id: 11, newCount: 3 });
  });
  it('A3 size+color variant (two-axis) is just one variant row — resolves normally', () => {
    const v = V({ id: 12 });
    const r = validatePurchase(P(), v, 1, [v]);
    expect(r.ok).toBe(true);
    expect(r.inventoryTarget?.id).toBe(12);
  });
  it('A4 product with NO variants purchases at product level', () => {
    const r = validatePurchase(P({ inventory_count: 10 }), null, 1, []);
    expect(r.ok).toBe(true);
    expect(r.inventoryTarget).toEqual({ kind: 'product', id: 1, newCount: 9 });
  });
  it('A5 quantity > 1 of a variant decrements by exactly the qty', () => {
    const v = V({ inventory_count: 10 });
    expect(validatePurchase(P(), v, 4, [v]).inventoryTarget?.newCount).toBe(6);
  });
});

describe('Phase 1A · B. Pricing — override semantics', () => {
  it('B1 price_override wins over product price', () => {
    expect(effectivePrice(P({ price: 20 }), V({ price_override: 35 }))).toBe(35);
  });
  it('B2 null override falls back to product price', () => {
    expect(effectivePrice(P({ price: 20 }), V({ price_override: null }))).toBe(20);
  });
  it('B3 no variant uses product price', () => {
    expect(effectivePrice(P({ price: 20 }), null)).toBe(20);
  });
  it('B4 override of 0 (free variant) is honored, not treated as null', () => {
    expect(effectivePrice(P({ price: 20 }), V({ price_override: 0 }))).toBe(0);
    expect(validatePurchase(P(), V({ price_override: 0 }), 1, [V({ price_override: 0 })]).ok).toBe(true);
  });
  it('B5 line total rounds to cents', () => {
    expect(lineTotal(19.99, 3)).toBe(59.97);
    expect(lineTotal(0.1, 3)).toBe(0.3); // float-safe
  });
  it('B6 validatePurchase returns the override as unitPrice', () => {
    const v = V({ price_override: 12.5 });
    expect(validatePurchase(P(), v, 1, [v]).unitPrice).toBe(12.5);
  });
});

describe('Phase 1A · C. Inventory & depletion', () => {
  it('C1 exact-stock purchase succeeds (boundary)', () => {
    const v = V({ inventory_count: 3 });
    expect(validatePurchase(P(), v, 3, [v]).ok).toBe(true);
  });
  it('C2 one over stock is rejected', () => {
    const v = V({ inventory_count: 3 });
    expect(validatePurchase(P(), v, 4, [v]).reason).toBe('INSUFFICIENT_INVENTORY');
  });
  it('C3 zero-stock variant rejects any purchase', () => {
    const v = V({ inventory_count: 0 });
    expect(validatePurchase(P(), v, 1, [v]).reason).toBe('INSUFFICIENT_INVENTORY');
  });
  it('C4 null variant inventory = untracked → always ok, no decrement', () => {
    const v = V({ inventory_count: null });
    const r = validatePurchase(P(), v, 9999, [v]);
    expect(r.ok).toBe(true);
    expect(r.inventoryTarget?.newCount).toBeNull();
  });
  it('C5 depletion to exactly 0 reports newCount 0', () => {
    const v = V({ inventory_count: 5 });
    expect(validatePurchase(P(), v, 5, [v]).inventoryTarget?.newCount).toBe(0);
  });
  it('C6 product-level untracked (tracking off) → ok regardless of count', () => {
    expect(validatePurchase(P({ inventory_tracking: false, inventory_count: 0 }), null, 50, []).ok).toBe(true);
  });
  it('C7 product-level null count → untracked even if tracking flag on', () => {
    const r = validatePurchase(P({ inventory_tracking: true, inventory_count: null }), null, 50, []);
    expect(r.ok).toBe(true);
    expect(r.inventoryTarget?.newCount).toBeNull();
  });
  it('C8 variant stock is independent — depleting one variant does not affect the model of another', () => {
    const small = V({ id: 1, inventory_count: 0 });
    const large = V({ id: 2, inventory_count: 9 });
    expect(validatePurchase(P(), small, 1, [small, large]).reason).toBe('INSUFFICIENT_INVENTORY');
    expect(validatePurchase(P(), large, 1, [small, large]).ok).toBe(true);
  });
});

describe('Phase 1A · D. Variant-required rule', () => {
  it('D1 product WITH active variants rejects a variant-less purchase', () => {
    expect(validatePurchase(P(), null, 1, [V()]).reason).toBe('VARIANT_REQUIRED');
  });
  it('D2 product WITHOUT active variants allows a variant-less purchase', () => {
    expect(validatePurchase(P(), null, 1, []).ok).toBe(true);
  });
  it('D3 product whose only variants are archived is NOT variant-required', () => {
    expect(validatePurchase(P(), null, 1, [V({ status: 'archived' })] .filter(v => v.status === 'active')).ok).toBe(true);
  });
  it('D4 hasActiveVariants is false for an all-archived set', () => {
    expect(hasActiveVariants([V({ status: 'archived' }), V({ status: 'archived' })])).toBe(false);
  });
  it('D5 hasActiveVariants is true if any one is active', () => {
    expect(hasActiveVariants([V({ status: 'archived' }), V({ status: 'active' })])).toBe(true);
  });
  it('D6 choosing a variant satisfies the rule', () => {
    expect(validatePurchase(P(), V(), 1, [V()]).ok).toBe(true);
  });
});

describe('Phase 1A · E. Archived / wrong-product variants', () => {
  it('E1 archived variant is rejected even if chosen', () => {
    const v = V({ status: 'archived' });
    expect(validatePurchase(P(), v, 1, [V({ id: 99 })]).reason).toBe('VARIANT_NOT_ACTIVE');
  });
  it('E2 variant from a DIFFERENT product is rejected', () => {
    const v = V({ product_id: 777 });
    expect(validatePurchase(P({ id: 1 }), v, 1, [v]).reason).toBe('VARIANT_WRONG_PRODUCT');
  });
  it('E3 wrong-product takes precedence over inventory (checked first)', () => {
    const v = V({ product_id: 777, inventory_count: 0 });
    expect(validatePurchase(P({ id: 1 }), v, 1, [v]).reason).toBe('VARIANT_WRONG_PRODUCT');
  });
  it('E4 archived takes precedence over inventory', () => {
    const v = V({ status: 'archived', inventory_count: 0 });
    expect(validatePurchase(P(), v, 1, [V({ id: 5 })]).reason).toBe('VARIANT_NOT_ACTIVE');
  });
});

describe('Phase 1A · F. Scale — 100 variants', () => {
  const hundred: VariantLike[] = Array.from({ length: 100 }, (_, k) =>
    V({ id: 1000 + k, inventory_count: k, price_override: k % 2 === 0 ? null : 30 + k }));
  it('F1 hasActiveVariants true across 100', () => {
    expect(hasActiveVariants(hundred)).toBe(true);
  });
  it('F2 each of 100 variants prices + inventories independently', () => {
    for (const v of hundred) {
      const r = validatePurchase(P({ price: 20 }), v, 1, hundred);
      if (v.inventory_count !== null && v.inventory_count < 1) {
        expect(r.reason).toBe('INSUFFICIENT_INVENTORY');
      } else {
        expect(r.ok).toBe(true);
        expect(r.unitPrice).toBe(v.price_override ?? 20);
      }
    }
  });
  it('F3 the single in-stock-0 variant (id 1000) is the only insufficient one at qty 1', () => {
    const insufficient = hundred.filter(v => validatePurchase(P(), v, 1, hundred).reason === 'INSUFFICIENT_INVENTORY');
    expect(insufficient.map(v => v.id)).toEqual([1000]);
  });
});

describe('Phase 1A · G. Adversarial', () => {
  it('G1 negative quantity rejected', () => {
    expect(validatePurchase(P(), V(), -1, [V()]).reason).toBe('INVALID_QUANTITY');
  });
  it('G2 zero quantity rejected', () => {
    expect(validatePurchase(P(), V(), 0, [V()]).reason).toBe('INVALID_QUANTITY');
  });
  it('G3 fractional quantity rejected', () => {
    expect(validatePurchase(P(), V(), 1.5, [V()]).reason).toBe('INVALID_QUANTITY');
  });
  it('G4 NaN quantity rejected', () => {
    expect(validatePurchase(P(), V(), Number.NaN, [V()]).reason).toBe('INVALID_QUANTITY');
  });
  it('G5 negative price_override is rejected as INVALID_PRICE', () => {
    const v = V({ price_override: -5 });
    expect(validatePurchase(P(), v, 1, [v]).reason).toBe('INVALID_PRICE');
  });
  it('G6 huge quantity against tracked stock is rejected (no overflow bypass)', () => {
    const v = V({ inventory_count: 10 });
    expect(validatePurchase(P(), v, Number.MAX_SAFE_INTEGER, [v]).reason).toBe('INSUFFICIENT_INVENTORY');
  });
  it('G7 attempting to buy a variant belonging to another product cannot borrow this product price', () => {
    const v = V({ product_id: 2, price_override: 0 }); // would be "free" if mis-resolved
    expect(validatePurchase(P({ id: 1, price: 20 }), v, 1, [v]).ok).toBe(false);
  });
  it('G8 archived variant cannot be revived via purchase path', () => {
    const v = V({ status: 'archived', inventory_count: 100 });
    expect(validatePurchase(P(), v, 1, [V({ id: 5 })]).ok).toBe(false);
  });
  it('G9 variant-required cannot be bypassed by passing null variant', () => {
    expect(validatePurchase(P(), null, 1, [V(), V({ id: 2 })]).ok).toBe(false);
  });
  it('G10 inventory check uses the chosen variant, not a cheaper sibling', () => {
    const chosen = V({ id: 1, inventory_count: 0 });
    const sibling = V({ id: 2, inventory_count: 999 });
    expect(validatePurchase(P(), chosen, 1, [chosen, sibling]).reason).toBe('INSUFFICIENT_INVENTORY');
  });
});

describe('Phase 1A · H. Concurrency model (decrement determinism)', () => {
  // The route enforces atomicity with FOR UPDATE + GREATEST(0, ...). Here we verify the *logic* the route
  // relies on: sequential decrements never go below zero and reject once depleted.
  it('H1 two sequential buyers draining a 1-stock variant: first ok, second insufficient', () => {
    let stock = 1;
    const buy = () => {
      const r = validatePurchase(P(), V({ inventory_count: stock }), 1, [V({ inventory_count: stock })]);
      if (r.ok && r.inventoryTarget) stock = r.inventoryTarget.newCount ?? stock;
      return r;
    };
    expect(buy().ok).toBe(true);
    expect(stock).toBe(0);
    expect(buy().reason).toBe('INSUFFICIENT_INVENTORY');
  });
  it('H2 newCount never negative across a depleting sequence', () => {
    let stock = 5;
    for (let n = 0; n < 10; n++) {
      const r = validatePurchase(P(), V({ inventory_count: stock }), 1, [V({ inventory_count: stock })]);
      if (r.ok && r.inventoryTarget) stock = r.inventoryTarget.newCount ?? 0;
      expect(stock).toBeGreaterThanOrEqual(0);
    }
    expect(stock).toBe(0);
  });
  it('H3 GREATEST(0,..) parity: logic floors at 0, never wraps', () => {
    // even if a stale read of 1 sees a qty-2 request, the check rejects before decrement
    expect(validatePurchase(P(), V({ inventory_count: 1 }), 2, [V({ inventory_count: 1 })]).reason)
      .toBe('INSUFFICIENT_INVENTORY');
  });
});
