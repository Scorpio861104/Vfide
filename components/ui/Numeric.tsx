'use client';

/**
 * <Numeric> — the unified numerical voice for the entire product.
 *
 * VFIDE shows numbers everywhere: balances, scores, percentages, fees,
 * timestamps, counts. Before this component each page picked its own
 * font weight, decimal precision, and color story for numbers, which
 * meant 100+ different visual treatments of "$5.50" across the app.
 * This component centralizes the choice so a number on /merchant/payouts
 * looks like a number on /governance looks like a number on /vault.
 *
 * The visual baseline:
 *   - JetBrains Mono via the .font-numeric utility (configured in
 *     app/layout.tsx and app/globals.css)
 *   - Tabular-nums + slashed-zero so columns of numbers stay aligned
 *   - Subtle weight (font-medium by default) — numbers should feel
 *     confident without shouting
 *
 * Format variants:
 *   - 'currency'  → "$1,234.56" (intl currency formatter, 2 decimals)
 *   - 'percent'   → "12.5%" (smart precision: <1 → 2 decimals; ≥1 → 1)
 *   - 'integer'   → "10,000" (no decimals)
 *   - 'decimal'   → "1,234.56" (free-form, configurable precision)
 *   - 'token'     → "100.50 VFIDE" (decimal + a unit suffix)
 *   - 'score'     → "8,432" (integer formatting, no currency symbol)
 *   - 'compact'   → "1.2K", "3.4M" (en-US compact notation)
 *   - 'duration'  → "2h 14m" (humanized from seconds)
 *   - 'time'      → "3m ago" (relative time, falls back to absolute past 30d)
 *
 * Color variants (optional):
 *   - 'neutral'   → default text color (current text color)
 *   - 'positive'  → emerald — used for credits, gains, "you earned" amounts
 *   - 'negative'  → rose — used for debits, losses, fees
 *   - 'accent'    → cyan — used for highlights/CTAs
 *   - 'muted'     → gray-500 — used for secondary data
 *
 * Size variants map to a small set of presets so we don't end up with
 * 20 different sizes scattered across the codebase.
 */

import { CSSProperties, ReactNode } from 'react';

export type NumericFormat =
  | 'currency'
  | 'percent'
  | 'integer'
  | 'decimal'
  | 'token'
  | 'score'
  | 'compact'
  | 'duration'
  | 'time';

export type NumericTone = 'neutral' | 'positive' | 'negative' | 'accent' | 'muted';

export type NumericSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

export interface NumericProps {
  /**
   * The raw numeric value. Strings are accepted and parsed (handy when
   * the source is a wire-format decimal string like "1234.56789012345678"
   * — a Number cast would lose precision).
   */
  value: number | string | null | undefined;

  /**
   * How to format. Default 'decimal'.
   */
  format?: NumericFormat;

  /**
   * For 'currency': ISO 4217 code. Default 'USD'.
   * For 'token': the unit suffix (e.g. 'VFIDE', 'USDC'). Default 'VFIDE'.
   */
  currency?: string;
  unit?: string;

  /**
   * Override decimal precision. Default depends on format.
   */
  precision?: number;

  /**
   * Whether to show a sign for positive numbers (default false; negatives
   * always show '−'). Useful for "+$5.00" credit rows.
   */
  showPositiveSign?: boolean;

  /**
   * Color tone. Default 'neutral'.
   */
  tone?: NumericTone;

  /**
   * Size preset. Default 'md' (16px). The component sets size via
   * tailwind text utilities; you can also wrap it in your own sizing
   * class and pass size={undefined}.
   */
  size?: NumericSize;

  /** Font weight 400 / 500 / 600 / 700. Default 500. */
  weight?: 400 | 500 | 600 | 700;

  /**
   * If true, applies leading-none (useful inside heroes where you want
   * a number to butt up against the cards above/below).
   */
  flush?: boolean;

  /** Extra classes. */
  className?: string;

  /** Inline style override (rare — usually className is enough). */
  style?: CSSProperties;

  /**
   * Optional ARIA label override. Defaults to the rendered text.
   */
  'aria-label'?: string;

  /**
   * For 'time'/'duration' formats only — when true, render absolute
   * datetime in a title attribute so hovering reveals the underlying
   * value. Default true.
   */
  showAbsoluteOnHover?: boolean;
}

const TONE_CLASSES: Record<NumericTone, string> = {
  neutral:  '',
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
  accent:   'text-accent',
  muted:    'text-gray-500',
};

const SIZE_CLASSES: Record<NumericSize, string> = {
  xs:   'text-xs',
  sm:   'text-sm',
  md:   'text-base',
  lg:   'text-lg',
  xl:   'text-xl',
  '2xl':'text-2xl',
  '3xl':'text-3xl',
  '4xl':'text-4xl',
  '5xl':'text-5xl',
  '6xl':'text-6xl',
};

const WEIGHT_CLASSES: Record<400 | 500 | 600 | 700, string> = {
  400: 'font-normal',
  500: 'font-medium',
  600: 'font-semibold',
  700: 'font-bold',
};

function coerceNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatCurrency(n: number, currency: string, precision?: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: precision ?? 2,
    maximumFractionDigits: precision ?? 2,
  }).format(n);
}

function formatPercent(n: number, precision?: number): string {
  const auto = Math.abs(n) < 1 ? 2 : 1;
  const digits = precision ?? auto;
  return `${n.toFixed(digits)}%`;
}

function formatDecimal(n: number, precision?: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision ?? 0,
    maximumFractionDigits: precision ?? 2,
  }).format(n);
}

function formatInteger(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

/**
 * Format epoch-seconds-or-ms as a relative-time string.
 * "just now" / "5s ago" / "3m ago" / "2h ago" / "4d ago" / falls back to
 * absolute date (en-US short) after 30 days.
 */
function formatRelativeTime(value: number): string {
  // Heuristic: values < 1e12 are seconds; >= 1e12 are milliseconds.
  const ms = value < 1e12 ? value * 1000 : value;
  const diff = Date.now() - ms;
  if (diff < 0) return 'in the future';
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function absoluteTitle(value: number): string {
  const ms = value < 1e12 ? value * 1000 : value;
  return new Date(ms).toLocaleString('en-US');
}

export function Numeric({
  value,
  format = 'decimal',
  currency = 'USD',
  unit = 'VFIDE',
  precision,
  showPositiveSign = false,
  tone = 'neutral',
  size = 'md',
  weight = 500,
  flush = false,
  className = '',
  style,
  'aria-label': ariaLabel,
  showAbsoluteOnHover = true,
}: NumericProps): ReactNode {
  const n = coerceNumber(value);

  // Em-dash for missing data — same character everywhere so
  // missing-value rows align visually across the product.
  if (n === null) {
    const classes = `font-numeric ${SIZE_CLASSES[size] ?? ''} ${WEIGHT_CLASSES[weight]} ${TONE_CLASSES.muted} ${flush ? 'leading-none' : ''} ${className}`;
    return <span className={classes.trim()} style={style}>—</span>;
  }

  let rendered: string;
  let titleAttr: string | undefined;

  switch (format) {
    case 'currency':
      rendered = formatCurrency(Math.abs(n), currency, precision);
      if (n < 0) rendered = `−${rendered}`;
      else if (showPositiveSign) rendered = `+${rendered}`;
      break;
    case 'percent':
      rendered = formatPercent(n, precision);
      if (n > 0 && showPositiveSign) rendered = `+${rendered}`;
      break;
    case 'integer':
      rendered = formatInteger(n);
      if (n > 0 && showPositiveSign) rendered = `+${rendered}`;
      break;
    case 'compact':
      rendered = formatCompact(n);
      break;
    case 'token': {
      const num = formatDecimal(n, precision);
      rendered = `${num} ${unit}`;
      break;
    }
    case 'score':
      rendered = formatInteger(n);
      break;
    case 'duration':
      rendered = formatDuration(n);
      if (showAbsoluteOnHover) titleAttr = `${Math.round(n)}s`;
      break;
    case 'time':
      rendered = formatRelativeTime(n);
      if (showAbsoluteOnHover) titleAttr = absoluteTitle(n);
      break;
    case 'decimal':
    default:
      rendered = formatDecimal(n, precision);
      if (n > 0 && showPositiveSign) rendered = `+${rendered}`;
      break;
  }

  const classes = [
    'font-numeric',
    SIZE_CLASSES[size] ?? '',
    WEIGHT_CLASSES[weight],
    TONE_CLASSES[tone],
    flush ? 'leading-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} style={style} title={titleAttr} aria-label={ariaLabel ?? rendered}>
      {rendered}
    </span>
  );
}

export default Numeric;
