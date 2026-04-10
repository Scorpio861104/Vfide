/**
 * Format Utilities — Consolidated string/number formatting
 * 
 * Replaces duplicate definitions from:
 * - lib/utils.ts (formatAddress)
 * - lib/messageEncryption.ts (formatAddress)
 * - app/guardians/components/types.ts (shortAddress)
 * - app/governance/components/ProposalsTab.tsx (formatAddress inline)
 * - components/wallet/WalletSwitcher.tsx (formatAddress inline)
 * - components/wallet/SessionKeyManager.tsx (formatAddress inline)
 * - components/crypto/TransactionHistory.tsx (formatAddress inline)
 * 
 * MIGRATION: Replace all inline address formatters with:
 *   import { shortAddress, formatBalance, formatTimeAgo, formatUSD } from '@/lib/format';
 */

// ── Address formatting ──────────────────────────────────────────────────────

/** Truncate an address to 0x1234...abcd format */
export function shortAddress(address: string, prefixChars = 6, suffixChars = 4): string {
  if (!address || address.length < prefixChars + suffixChars + 3) return address || '';
  return `${address.slice(0, prefixChars)}...${address.slice(-suffixChars)}`;
}

/** Alias for backward compatibility */
export const formatAddress = shortAddress;

// ── Balance / number formatting ─────────────────────────────────────────────

/** Format a token balance with appropriate decimal places */
export function formatBalance(value: string | number, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  if (num === 0) return '0';
  if (num < 0.01) return '< 0.01';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(decimals);
}

/** Format as USD currency string */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format large numbers with locale separators */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

// ── Time formatting ─────────────────────────────────────────────────────────

/** Relative time: "Just now", "5m ago", "3h ago", "2d ago" */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Format countdown: "2d 5h", "3h", "45m" */
export function formatCountdown(endTime: number): string {
  const diff = endTime - Date.now();
  if (diff <= 0) return 'Ended';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${Math.max(minutes, 1)}m`;
}

// ── Fee formatting ──────────────────────────────────────────────────────────

/** Calculate fee rate from ProofScore */
export function getFeeRate(proofScore: number): number {
  if (proofScore <= 4000) return 5.00;
  if (proofScore >= 8000) return 0.25;
  return 5.00 - ((proofScore - 4000) * 4.75 / 4000);
}

/** Format fee rate as percentage string */
export function formatFeeRate(proofScore: number): string {
  return `${getFeeRate(proofScore).toFixed(2)}%`;
}

// ── Proposal type formatting ────────────────────────────────────────────────

const PROPOSAL_TYPE_MAP: Record<number, string> = {
  0: 'PARAMETER',
  1: 'TREASURY',
  2: 'UPGRADE',
  3: 'POLICY',
};

export function formatProposalType(ptype: number): string {
  return PROPOSAL_TYPE_MAP[ptype] || 'OTHER';
}

// ── Safe bigint conversion ──────────────────────────────────────────────────

export function toSafeNumber(value: bigint): number {
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value);
}

// ── Percentage formatting ───────────────────────────────────────────────────

/** Calculate percentage with safety for division by zero */
export function calcPercent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}
