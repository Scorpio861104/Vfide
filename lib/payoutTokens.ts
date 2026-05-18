/**
 * Off-ramp token configurations.
 *
 * Symbol → on-chain address (from env) + decimals.
 *
 * Two consumers:
 *   - The `/merchant/payouts` UI uses this to render balances and decide
 *     which tokens to expose in the "Cash out" picker.
 *   - The `/api/merchant/withdraw` API uses the same logic server-side
 *     to look up the address when filtering the balance query.
 *
 * NEXT_PUBLIC_* env vars are inlined at build time and available on both
 * the client and server, which is what we need here.
 *
 * If a token's env var is unset, the token is "not configured" — the UI
 * hides it from the picker (so users can't request something the server
 * is guaranteed to reject) and the API short-circuits with a 422.
 */

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

export type TokenSymbol = 'VFIDE' | 'USDC' | 'USDT' | 'DAI';

export interface PayoutTokenConfig {
  symbol: TokenSymbol;
  address: string; // lowercase 0x address
  decimals: number;
  /** Human label shown in pickers and balance rows. */
  label: string;
}

const SYMBOL_META: Record<TokenSymbol, { addressEnv: string; decimals: number; label: string }> = {
  VFIDE: { addressEnv: 'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS', decimals: 18, label: 'VFIDE' },
  USDC: { addressEnv: 'NEXT_PUBLIC_USDC_ADDRESS', decimals: 6, label: 'USDC' },
  USDT: { addressEnv: 'NEXT_PUBLIC_USDT_ADDRESS', decimals: 6, label: 'USDT' },
  DAI: { addressEnv: 'NEXT_PUBLIC_DAI_ADDRESS', decimals: 18, label: 'DAI' },
};

/**
 * Read the configured tokens at runtime. Tokens whose env var is missing
 * or malformed are excluded.
 */
export function getPayoutTokens(): PayoutTokenConfig[] {
  const out: PayoutTokenConfig[] = [];
  for (const symbol of Object.keys(SYMBOL_META) as TokenSymbol[]) {
    const meta = SYMBOL_META[symbol];
    // Inlined env var access — Next.js statics NEXT_PUBLIC_* at build time
    // when accessed via `process.env.NEXT_PUBLIC_FOO`. Reading via bracket
    // notation (`process.env[varName]`) defeats that on the client, so we
    // hard-code the access per symbol.
    let raw: string | undefined;
    switch (symbol) {
      case 'VFIDE': raw = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS; break;
      case 'USDC':  raw = process.env.NEXT_PUBLIC_USDC_ADDRESS; break;
      case 'USDT':  raw = process.env.NEXT_PUBLIC_USDT_ADDRESS; break;
      case 'DAI':   raw = process.env.NEXT_PUBLIC_DAI_ADDRESS; break;
    }
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!ADDRESS_LIKE_REGEX.test(trimmed)) continue;
    out.push({
      symbol,
      address: trimmed.toLowerCase(),
      decimals: meta.decimals,
      label: meta.label,
    });
  }
  return out;
}

/**
 * Lookup the config for a single symbol. Returns null if unconfigured.
 */
export function getPayoutToken(symbol: TokenSymbol): PayoutTokenConfig | null {
  return getPayoutTokens().find((t) => t.symbol === symbol) ?? null;
}

/**
 * Find the configured token for a given address (case-insensitive).
 * Used by the payouts UI to map a balance row (keyed by address) back
 * to its symbol/decimals.
 */
export function findPayoutTokenByAddress(address: string): PayoutTokenConfig | null {
  const lower = address.toLowerCase();
  return getPayoutTokens().find((t) => t.address === lower) ?? null;
}

/** All off-ramp providers we currently support. */
export const PAYOUT_PROVIDERS = [
  { id: 'transak', label: 'Transak', regions: 'Global (160+ countries)' },
  { id: 'moonpay', label: 'MoonPay', regions: 'Global (~150 countries)' },
  { id: 'yellowcard', label: 'Yellow Card', regions: 'Africa (20+ countries)' },
  { id: 'kotanipay', label: 'KotaniPay', regions: 'Africa (Kenya, Ghana, others)' },
  { id: 'fonbnk', label: 'Fonbnk', regions: 'Africa (airtime ↔ crypto)' },
] as const;

export type ProviderId = (typeof PAYOUT_PROVIDERS)[number]['id'];

/** Settlement rails available across providers. Real provider support varies. */
export const PAYOUT_NETWORKS = [
  { id: 'mpesa', label: 'M-Pesa', region: 'Kenya, Tanzania, others' },
  { id: 'mtn_momo', label: 'MTN Mobile Money', region: 'Uganda, Ghana, Nigeria, others' },
  { id: 'gcash', label: 'GCash', region: 'Philippines' },
  { id: 'bank', label: 'Bank account', region: 'Global, depending on provider' },
  { id: 'wallet', label: 'Provider wallet', region: 'Used when the provider holds custody' },
  { id: 'airtime', label: 'Mobile airtime credit', region: 'Africa (via Fonbnk)' },
] as const;

export type NetworkId = (typeof PAYOUT_NETWORKS)[number]['id'];
