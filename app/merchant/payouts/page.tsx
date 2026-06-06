'use client';

export const dynamic = 'force-dynamic';

/**
 * Merchant Earnings & Payouts — /merchant/payouts
 *
 * Power-user merchant view of confirmed earnings and how to cash out.
 *
 * Backed by GET /api/merchant/withdraw which returns:
 *   - withdrawals: recent withdrawal rows (status, provider, mobile hint, etc.)
 *   - balances:    per-token { token, confirmed_wei, reserved_wei }
 *
 * The token in `balances` is an on-chain address (lowercased) — we map
 * it to a symbol via lib/payoutTokens. Tokens whose env var isn't set
 * for this environment don't appear in the cash-out picker and aren't
 * surfaced as recommended next steps (since the API would reject them).
 *
 * Cash out: opens a modal that POSTs /api/merchant/withdraw with the
 * token symbol + provider + mobile number + amount. On success the
 * provider's redirect URL opens in a new tab; the user completes KYC
 * and the sell flow there. VFIDE never touches the fiat side.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { CashOutModal } from '@/components/merchant/payouts/CashOutModal';
import {
  findPayoutTokenByAddress,
  getPayoutTokens,
  type PayoutTokenConfig,
} from '@/lib/payoutTokens';

interface WithdrawalRow {
  id: number | string;
  merchant_address: string;
  amount: string; // NUMERIC, human-decimal string
  token: string;  // symbol stored at request time (e.g. "VFIDE")
  provider: string;
  mobile_number_hint: string | null;
  network: string;
  status: string; // 'requested' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  provider_tx_id: string | null;
  created_at: string;
  completed_at: string | null;
}

interface BalanceRow {
  token: string;        // address (lowercased) per the API
  confirmed_wei: string;
  reserved_wei: string;
}

interface WithdrawApiResponse {
  success?: boolean;
  withdrawals?: WithdrawalRow[];
  balances?: BalanceRow[];
  error?: string;
}

interface DisplayBalance {
  tokenConfig: PayoutTokenConfig;
  confirmedWei: bigint;
  reservedWei: bigint;
  availableWei: bigint;
}

function safeBigInt(value: string | undefined | null): bigint {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function formatTokenAmount(wei: bigint, decimals: number, fractionDigits = 4): string {
  // formatUnits returns the canonical string; for display we trim or
  // pad to a sensible number of fraction digits without losing precision
  // we care about. For wei = 0 we show "0".
  if (wei === 0n) return '0';
  const formatted = formatUnits(wei, decimals);
  // Trim trailing zeros after the decimal point, but keep at most
  // `fractionDigits` to keep numbers readable.
  if (!formatted.includes('.')) return formatted;
  const parts = formatted.split('.');
  const whole = parts[0] ?? '0';
  const frac = parts[1] ?? '';
  const trimmedFrac = frac.replace(/0+$/, '').slice(0, fractionDigits);
  return trimmedFrac.length > 0 ? `${whole}.${trimmedFrac}` : whole;
}

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  requested:  { label: 'Awaiting provider',  cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20', icon: Clock },
  pending:    { label: 'Pending',            cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20', icon: Clock },
  processing: { label: 'Processing',         cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20',   icon: Loader2 },
  completed:  { label: 'Completed',          cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', icon: CheckCircle2 },
  failed:     { label: 'Failed',             cls: 'bg-rose-500/10 text-rose-300 border-rose-500/20',   icon: AlertTriangle },
  cancelled:  { label: 'Cancelled',          cls: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',   icon: AlertTriangle },
};

const DEFAULT_STATUS_STYLE = STATUS_STYLES.requested!;

function StatusBadge({ status }: { status: string }) {
  // STATUS_STYLES is a Record<string,...> so under `noUncheckedIndexedAccess`
  // the indexed lookup is typed as possibly undefined. Fall back to the
  // requested style for any unknown status string.
  const entry = STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE;
  const Icon = entry.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${entry.cls}`}>
      <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      {entry.label}
    </span>
  );
}

export default function MerchantPayoutsPage() {
  const { address, isConnected } = useAccount();
  const { formatDate } = useLocale();

  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [cashOutToken, setCashOutToken] = useState<PayoutTokenConfig | null>(null);

  // All tokens configured for this environment. Used by the cash-out
  // picker so we never offer USDT if the address env isn't set.
  const configuredTokens = useMemo(() => getPayoutTokens(), []);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/merchant/withdraw?merchant=${address}`);
      const data = (await res.json().catch(() => ({}))) as WithdrawApiResponse;
      if (!res.ok) {
        setLoadError(data.error || 'Failed to load earnings');
        setWithdrawals([]);
        setBalances([]);
        return;
      }
      setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
      setBalances(Array.isArray(data.balances) ? data.balances : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  // Build the display list. We:
  //   1. Match every API balance row against a configured token (drop
  //      rows whose token address we don't recognise — they'd just be
  //      noise the merchant can't act on).
  //   2. Add any *configured* tokens that have no balance row, so the
  //      cash-out picker can still show them with a 0 balance. This
  //      avoids the empty-state UX where a new merchant sees nothing.
  const displayBalances = useMemo<DisplayBalance[]>(() => {
    const byAddress = new Map<string, BalanceRow>();
    for (const row of balances) {
      if (typeof row.token !== 'string') continue;
      byAddress.set(row.token.toLowerCase(), row);
    }
    const out: DisplayBalance[] = [];
    for (const tokenConfig of configuredTokens) {
      const row = byAddress.get(tokenConfig.address);
      const confirmedWei = safeBigInt(row?.confirmed_wei);
      const reservedWei = safeBigInt(row?.reserved_wei);
      const availableWei = confirmedWei - reservedWei > 0n ? confirmedWei - reservedWei : 0n;
      out.push({ tokenConfig, confirmedWei, reservedWei, availableWei });
    }
    // Also surface any balance rows whose token we couldn't map (rare —
    // typically means the env config changed). Show them as read-only.
    for (const row of balances) {
      const addr = (row.token || '').toLowerCase();
      const known = configuredTokens.find((t) => t.address === addr);
      if (known) continue;
      const found = findPayoutTokenByAddress(addr);
      if (found) continue;
      // Use 18 decimals as a display-only fallback. The merchant can't
      // cash this out yet anyway because the symbol isn't configured.
      out.push({
        tokenConfig: { symbol: 'VFIDE', address: addr, decimals: 18, label: `Unknown (${addr.slice(0, 6)}…)` },
        confirmedWei: safeBigInt(row.confirmed_wei),
        reservedWei: safeBigInt(row.reserved_wei),
        availableWei: 0n,
      });
    }
    return out;
  }, [balances, configuredTokens]);

  const openCashOut = useCallback((tokenConfig: PayoutTokenConfig) => {
    setCashOutToken(tokenConfig);
    setCashOutOpen(true);
  }, []);

  const onCashOutSubmitted = useCallback(() => {
    setCashOutOpen(false);
    setCashOutToken(null);
    void load(); // refresh balances + history
  }, [load]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
        </div>
        <div className="relative container mx-auto max-w-5xl px-4">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent text-sm">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <header className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="badge-live"><span className="badge-live-dot" />Earnings &amp; Payouts</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-accent bg-clip-text text-transparent flex items-center gap-3">
                <Banknote size={32} className="text-emerald-400" />Your Earnings
              </span>
            </h1>
            <p className="mt-2 max-w-3xl text-white/50">
              Confirmed on-chain payments from your customers, and a record of every cash-out
              request you&apos;ve initiated. VFIDE never holds your fiat — when you cash out we hand
              you off to your chosen provider, who handles KYC and settlement into your
              mobile-money, bank, or airtime balance.
            </p>
          </header>

          {!isConnected && (
            <div className="glass-card-premium p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Connect your merchant wallet</h2>
              <p className="text-white/40">
                Sign in with the wallet linked to your store to see your confirmed earnings
                and request a payout.
              </p>
            </div>
          )}

          {isConnected && (
            <>
              {/* Balances grid */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4">Available balances</h2>

                {loadError && (
                  <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-200 text-sm flex items-start gap-3">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>{loadError}</div>
                  </div>
                )}

                {loading && displayBalances.length === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                  </div>
                )}

                {!loading && displayBalances.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
                    <Wallet size={36} className="mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-300">No tokens are currently configured for payouts.</p>
                    <p className="text-gray-500 text-sm mt-1">
                      An operator needs to set <code className="font-mono">NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS</code> (or
                      the stablecoin equivalents) for this environment.
                    </p>
                  </div>
                )}

                {displayBalances.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayBalances.map((b) => {
                      const canCashOut =
                        b.availableWei > 0n &&
                        configuredTokens.some((t) => t.address === b.tokenConfig.address);
                      return (
                        <div
                          key={b.tokenConfig.address}
                          className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/3 p-5"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm uppercase tracking-wider text-gray-400">{b.tokenConfig.label}</span>
                            {b.reservedWei > 0n && (
                              <span className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">
                                <span className="font-numeric">{formatTokenAmount(b.reservedWei, b.tokenConfig.decimals)}</span> reserved
                              </span>
                            )}
                          </div>
                          <div className="mb-1 font-numeric text-3xl font-bold tracking-tight">
                            {formatTokenAmount(b.availableWei, b.tokenConfig.decimals)}
                          </div>
                          <div className="text-xs text-gray-500 mb-4">
                            Earned: <span className="font-numeric">{formatTokenAmount(b.confirmedWei, b.tokenConfig.decimals)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCashOut(b.tokenConfig)}
                            disabled={!canCashOut}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent/15 border border-accent/30 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ArrowUpRight size={14} />
                            Cash out
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                  Available = confirmed earnings minus any cash-out requests still in flight.
                  Reserved amounts are released back if a provider marks the request failed or cancelled.
                </p>
              </section>

              {/* Withdrawals history */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Recent payouts</h2>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Refresh
                  </button>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center">
                    <Banknote size={36} className="mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-300">No payouts requested yet.</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Once you&apos;ve received customer payments, request a cash-out above to settle into mobile money,
                      bank, or airtime.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-4 py-3">When</th>
                          <th className="text-left px-4 py-3">Amount</th>
                          <th className="text-left px-4 py-3">Provider</th>
                          <th className="text-left px-4 py-3">Settling to</th>
                          <th className="text-left px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {withdrawals.map((w) => (
                          <tr key={String(w.id)} className="text-gray-200">
                            <td className="px-4 py-3 align-top">
                              <div>{formatDate(w.created_at)}</div>
                              {w.provider_tx_id && (
                                <div className="text-xs text-gray-500 font-mono mt-0.5">{w.provider_tx_id}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top font-medium whitespace-nowrap">
                              {w.amount} {w.token}
                            </td>
                            <td className="px-4 py-3 align-top capitalize">{w.provider}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="capitalize">{w.network.replace('_', ' ')}</div>
                              {w.mobile_number_hint && (
                                <div className="text-xs text-gray-500 mt-0.5">{w.mobile_number_hint}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <StatusBadge status={w.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-300">How status works:</strong> a payout stays at{' '}
                  <em>Awaiting provider</em> until the provider&apos;s webhook lets us know they&apos;ve moved
                  to processing or completed. If you completed the provider flow and it&apos;s still
                  shown as awaiting after a few minutes,{' '}
                  <Link href="/support" className="text-accent hover:underline inline-flex items-center gap-1">
                    contact support <ExternalLink size={11} />
                  </Link>.
                </p>
              </section>
            </>
          )}
        </div>
      </div>

      <Footer />

      {cashOutOpen && cashOutToken && (
        <CashOutModal
          token={cashOutToken}
          availableWei={(() => {
            const found = displayBalances.find((b) => b.tokenConfig.address === cashOutToken.address);
            return found ? found.availableWei : 0n;
          })()}
          onClose={() => {
            setCashOutOpen(false);
            setCashOutToken(null);
          }}
          onSubmitted={onCashOutSubmitted}
        />
      )}
    </>
  );
}
