/**
 * Variant business logic (Commerce Operations Phase 1A).
 *
 * Pure, side-effect-free functions for the variant rules so they can be exhaustively scenario-tested
 * independent of the database. The API routes call these; the DB only persists their results.
 *
 * Policy decisions encoded here (from VARIANTS_WIRING_SPEC.md):
 *  • A variant's effective price is its price_override, else the product price.
 *  • When a product has ≥1 active variant, the VARIANT is the stock-keeping unit — product-level inventory is
 *    ignored and a purchase MUST name a variant (the "variant-required" rule).
 *  • Inventory is enforced on whichever SKU applies (variant if chosen, else product), only when tracking is on
 *    and the count is non-null (null = untracked/unlimited).
 */

export interface ProductLike {
  id: number;
  price: number;
  inventory_tracking: boolean;
  inventory_count: number | null; // null = untracked
}

export interface VariantLike {
  id: number;
  product_id: number;
  price_override: number | null; // null = use product price
  inventory_count: number | null; // null = untracked
  status: string; // 'active' | 'archived' | ...
}

export type PurchaseRejection =
  | 'VARIANT_REQUIRED'        // product has active variants but none was chosen
  | 'VARIANT_WRONG_PRODUCT'   // variant_id does not belong to this product
  | 'VARIANT_NOT_ACTIVE'      // variant archived/inactive
  | 'INSUFFICIENT_INVENTORY'  // tracked stock < requested qty
  | 'INVALID_QUANTITY'        // qty <= 0 or non-integer
  | 'INVALID_PRICE';          // resolved price not finite / negative

export interface PurchaseCheck {
  ok: boolean;
  reason?: PurchaseRejection;
  unitPrice?: number;
  // which SKU's inventory should be decremented, and to what value, if tracked
  inventoryTarget?: { kind: 'variant' | 'product'; id: number; newCount: number | null };
}

/** Effective unit price: variant override wins, else product price. */
export function effectivePrice(product: ProductLike, variant: VariantLike | null): number {
  if (variant && variant.price_override !== null && variant.price_override !== undefined) {
    return Number(variant.price_override);
  }
  return Number(product.price);
}

/** True if the product has at least one ACTIVE variant (i.e. the variant-required rule is in force). */
export function hasActiveVariants(variants: VariantLike[]): boolean {
  return variants.some((v) => v.status === 'active');
}

/**
 * Validate a single purchase line against the product + (optional) chosen variant, and compute the
 * authoritative price and the inventory decrement. `allActiveVariants` is the product's active-variant set
 * (used only to enforce the variant-required rule); pass [] for a product with no variants.
 */
export function validatePurchase(
  product: ProductLike,
  chosenVariant: VariantLike | null,
  qty: number,
  allActiveVariants: VariantLike[],
): PurchaseCheck {
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, reason: 'INVALID_QUANTITY' };

  const variantRequired = hasActiveVariants(allActiveVariants);

  if (variantRequired && !chosenVariant) {
    return { ok: false, reason: 'VARIANT_REQUIRED' };
  }

  if (chosenVariant) {
    if (chosenVariant.product_id !== product.id) return { ok: false, reason: 'VARIANT_WRONG_PRODUCT' };
    if (chosenVariant.status !== 'active') return { ok: false, reason: 'VARIANT_NOT_ACTIVE' };
  }

  const unitPrice = effectivePrice(product, chosenVariant);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return { ok: false, reason: 'INVALID_PRICE' };

  // Inventory enforcement: the variant is the SKU when chosen, else the product.
  if (chosenVariant) {
    if (chosenVariant.inventory_count !== null && chosenVariant.inventory_count !== undefined) {
      if (chosenVariant.inventory_count < qty) return { ok: false, reason: 'INSUFFICIENT_INVENTORY' };
      return {
        ok: true, unitPrice,
        inventoryTarget: { kind: 'variant', id: chosenVariant.id, newCount: chosenVariant.inventory_count - qty },
      };
    }
    // variant untracked → no decrement
    return { ok: true, unitPrice, inventoryTarget: { kind: 'variant', id: chosenVariant.id, newCount: null } };
  }

  // No variant: product-level inventory (only when tracking on + count non-null)
  if (product.inventory_tracking && product.inventory_count !== null && product.inventory_count !== undefined) {
    if (product.inventory_count < qty) return { ok: false, reason: 'INSUFFICIENT_INVENTORY' };
    return { ok: true, unitPrice, inventoryTarget: { kind: 'product', id: product.id, newCount: product.inventory_count - qty } };
  }
  return { ok: true, unitPrice, inventoryTarget: { kind: 'product', id: product.id, newCount: null } };
}

/** Line total, rounded to cents (mirrors the orders route's rounding). */
export function lineTotal(unitPrice: number, qty: number): number {
  return Math.round(unitPrice * qty * 100) / 100;
}
