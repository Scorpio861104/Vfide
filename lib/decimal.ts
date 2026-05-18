/**
 * Decimal arithmetic helpers for Postgres DECIMAL columns.
 *
 * Postgres DECIMAL(precision, scale) values come back to node-postgres as
 * strings (e.g. "12.345000" for DECIMAL(18,6)). The naive approach of
 * parseFloat-then-sum is unsafe: JavaScript IEEE-754 floats can't exactly
 * represent decimals like 0.1, so 0.1 + 0.2 = 0.30000000000000004 instead
 * of 0.3. For financial sums this can produce visibly wrong totals.
 *
 * This module sums by converting each decimal string to a BigInt at the
 * scale of the column (e.g. multiply by 10^6 for 6 decimals), summing the
 * integers, then formatting back. The result is exact.
 *
 * Usage:
 *   import { sumDecimalStrings } from '@/lib/decimal';
 *   const total = sumDecimalStrings(['0.1', '0.2'], 6);
 *   // → '0.300000' (not '0.30000000000000004')
 *
 * The scale parameter must match the column's DECIMAL(_, scale) definition.
 * Use 6 for DECIMAL(18, 6), which is the canonical scale across the
 * `user_rewards`, `transactions`, and similar tables in this project.
 */

const TEN = 10n;

function pow10(n: number): bigint {
  let result = 1n;
  for (let i = 0; i < n; i++) result *= TEN;
  return result;
}

/**
 * Convert a decimal string like "12.345000" to a BigInt at the given scale.
 * "12.345" with scale 6 returns 12345000n. Truncates if more decimals than
 * scale; pads with zeros if fewer.
 */
export function decimalStringToScaledBigInt(raw: string, scale: number): bigint {
  const scaleFactor = pow10(scale);
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-') return 0n;
  const negative = trimmed.startsWith('-');
  const positive = negative ? trimmed.slice(1) : trimmed;
  const [intPart = '0', fracPart = ''] = positive.split('.');
  // Validate: only digits in each part
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return 0n;
  const fracPadded = fracPart.padEnd(scale, '0').slice(0, scale);
  const scaled = BigInt(intPart || '0') * scaleFactor + BigInt(fracPadded || '0');
  return negative ? -scaled : scaled;
}

/**
 * Format a scaled BigInt back to a decimal string.
 * 12345000n with scale 6 returns "12.345000".
 */
export function scaledBigIntToDecimalString(scaled: bigint, scale: number): string {
  const scaleFactor = pow10(scale);
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const intStr = (abs / scaleFactor).toString();
  const fracStr = (abs % scaleFactor).toString().padStart(scale, '0');
  const result = `${intStr}.${fracStr}`;
  return negative ? `-${result}` : result;
}

/**
 * Sum a list of decimal strings exactly, returning the total as a string
 * at the same scale. Invalid entries (non-numeric strings, undefined) are
 * silently skipped — callers should filter or validate beforehand if
 * stricter behavior is needed.
 */
export function sumDecimalStrings(values: ReadonlyArray<string | null | undefined>, scale: number): string {
  let total = 0n;
  for (const raw of values) {
    if (raw === null || raw === undefined) continue;
    try {
      total += decimalStringToScaledBigInt(raw, scale);
    } catch {
      // Malformed value; skip
    }
  }
  return scaledBigIntToDecimalString(total, scale);
}

/**
 * Subtract decimal strings exactly: a - b.
 * Returns a decimal string at the given scale.
 */
export function subtractDecimalStrings(a: string, b: string, scale: number): string {
  const aBig = decimalStringToScaledBigInt(a, scale);
  const bBig = decimalStringToScaledBigInt(b, scale);
  return scaledBigIntToDecimalString(aBig - bBig, scale);
}

/**
 * Canonical scale used by VFIDE's DECIMAL columns (user_rewards.amount,
 * transactions.amount, etc.). Always DECIMAL(18, 6).
 */
export const VFIDE_DB_DECIMAL_SCALE = 6;
