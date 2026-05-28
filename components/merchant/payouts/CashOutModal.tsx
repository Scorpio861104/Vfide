'use client';

/**
 * CashOutModal — initiates a withdrawal via /api/merchant/withdraw.
 *
 * Flow:
 *   1. User picks a provider (Transak/MoonPay/Yellow Card/KotaniPay/Fonbnk)
 *      and a settlement rail (M-Pesa, MTN MoMo, GCash, bank, wallet, airtime).
 *   2. Enters an amount in the token's natural unit (e.g. "25" for 25 USDC).
 *   3. Enters the mobile number / bank handle. We display this with a
 *      "we only store the last 4 digits" notice — the API masks it before
 *      writing to the DB.
 *   4. POST /api/merchant/withdraw. On success the API returns a
 *      `redirectUrl` we open in a new tab. The user completes KYC and
 *      the sell in the provider's flow. Our row stays at `requested`
 *      until the provider's webhook tells us otherwise.
 *
 * Honest disclosures: we tell the user the provider holds KYC + handles
 * settlement, that VFIDE never touches fiat, and that the status row
 * won't auto-update without provider webhook integration. This isn't a
 * "magic cash button" — it's a hand-off.
 */

import { useEffect, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { X, AlertTriangle, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import {
  PAYOUT_NETWORKS,
  PAYOUT_PROVIDERS,
  type NetworkId,
  type PayoutTokenConfig,
  type ProviderId,
} from '@/lib/payoutTokens';

interface CashOutModalProps {
  token: PayoutTokenConfig;
  availableWei: bigint;
  onClose: () => void;
  /** Called after a successful POST (so the page can refresh history). */
  onSubmitted: () => void;
}

interface WithdrawSuccess {
  success: true;
  request: { id: number | string; provider_tx_id: string | null };
  redirectUrl: string;
  instructions: string;
}

interface WithdrawError {
  error: string;
  available?: string;
}

function formatTokenAmount(wei: bigint, decimals: number, fractionDigits = 6): string {
  if (wei === 0n) return '0';
  const text = formatUnits(wei, decimals);
  if (!text.includes('.')) return text;
  const parts = text.split('.');
  const whole = parts[0] ?? '0';
  const frac = parts[1] ?? '';
  const trimmed = frac.replace(/0+$/, '').slice(0, fractionDigits);
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole;
}

export function CashOutModal({ token, availableWei, onClose, onSubmitted }: CashOutModalProps) {
  const [provider, setProvider] = useState<ProviderId>('transak');
  const [network, setNetwork] = useState<NetworkId>('mpesa');
  const [amount, setAmount] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<WithdrawSuccess | null>(null);

  const availableHuman = useMemo(
    () => formatTokenAmount(availableWei, token.decimals),
    [availableWei, token.decimals],
  );

  // Esc closes when not actively submitting (so we don't trash an
  // in-flight request).
  useEffect(() => {
    if (submitting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const amountIsValid = useMemo(() => {
    if (!/^[0-9]+(\.[0-9]+)?$/.test(amount.trim())) return false;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return false;
    return true;
  }, [amount]);

  const exceedsBalance = useMemo(() => {
    if (!amountIsValid) return false;
    // Compare in wei to avoid float drift. Convert the user's decimal
    // input to wei manually rather than parseUnits (avoids importing
    // viem's parser into this branch).
    const amountParts = amount.split('.');
    const whole = amountParts[0] ?? '0';
    const frac = amountParts[1] ?? '';
    const fracPadded = (frac + '0'.repeat(token.decimals)).slice(0, token.decimals);
    let amountWei: bigint;
    try {
      amountWei = BigInt(whole) * 10n ** BigInt(token.decimals) + BigInt(fracPadded || '0');
    } catch {
      return false; // an unparseable amount will be caught upstream
    }
    return amountWei > availableWei;
  }, [amount, amountIsValid, availableWei, token.decimals]);

  const mobileIsValid = mobileNumber.trim().length >= 6 && mobileNumber.trim().length <= 32;

  const canSubmit = amountIsValid && !exceedsBalance && mobileIsValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount.trim(),
          token: token.symbol,
          provider,
          mobileNumber: mobileNumber.trim(),
          network,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<WithdrawSuccess & WithdrawError>;
      if (!res.ok || !data.success) {
        const msg = data.error || 'Withdrawal request failed';
        const detail = data.available != null ? ` (available: ${data.available} ${token.symbol})` : '';
        setError(msg + detail);
        return;
      }
      setSubmitted(data as WithdrawSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenProvider = () => {
    if (!submitted) return;
    window.open(submitted.redirectUrl, '_blank', 'noopener,noreferrer');
    onSubmitted();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cashout-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="cashout-modal-title" className="text-lg font-semibold text-white">
              Cash out {token.label}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Available: <span className="text-gray-200 font-medium">{availableHuman}</span> {token.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step 2 — submitted, show provider hand-off */}
        {submitted ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-emerald-200 text-sm">
              <div className="font-medium mb-1">Request created.</div>
              <p className="text-emerald-100/80">
                Continue with {PAYOUT_PROVIDERS.find((p) => p.id === provider)?.label} to verify your
                identity and finalise the {token.label} → fiat conversion. Your funds aren&apos;t moved
                until you complete the provider flow.
              </p>
              {submitted.request.provider_tx_id && (
                <div className="mt-3 text-xs text-emerald-300/80 font-mono">
                  Tracking ID: {submitted.request.provider_tx_id}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleOpenProvider}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-400"
            >
              Open {PAYOUT_PROVIDERS.find((p) => p.id === provider)?.label}
              <ExternalLink size={14} />
            </button>
            <p className="text-xs text-gray-500">
              The provider opens in a new tab. Your payout row stays in <em>Awaiting provider</em>
              {' '}until the provider&apos;s webhook updates it (or, if you close this without completing
              the provider flow, it stays awaiting and can be cancelled by support).
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-rose-200 text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {/* Provider */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderId)}
                disabled={submitting}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-accent/50 focus:outline-none disabled:opacity-50"
              >
                {PAYOUT_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.regions}
                  </option>
                ))}
              </select>
            </label>

            {/* Network */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Settle to</span>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as NetworkId)}
                disabled={submitting}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-accent/50 focus:outline-none disabled:opacity-50"
              >
                {PAYOUT_NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} — {n.region}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Network support varies by provider. If your combination isn&apos;t supported, the
                provider will tell you on the next screen.
              </p>
            </label>

            {/* Mobile number */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                {network === 'bank' ? 'Bank account / IBAN' : network === 'wallet' ? 'Provider account ID' : 'Mobile number'}
              </span>
              <input
                type="text"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                disabled={submitting}
                placeholder={network === 'bank' ? 'IBAN or account number' : '+254 7XX XXX XXX'}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-accent/50 focus:outline-none disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>We store only the last 4 digits. The full number is forwarded to the provider for settlement.</span>
              </p>
            </label>

            {/* Amount */}
            <label className="block">
              <div className="flex items-end justify-between">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Amount</span>
                <button
                  type="button"
                  onClick={() => setAmount(availableHuman)}
                  disabled={submitting || availableWei === 0n}
                  className="text-xs text-accent hover:text-accent disabled:opacity-40"
                >
                  Use full balance
                </button>
              </div>
              <div className="mt-1.5 relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 pl-3 pr-16 py-2 text-sm text-white focus:border-accent/50 focus:outline-none disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                  {token.label}
                </span>
              </div>
              {amount && !amountIsValid && (
                <p className="text-xs text-rose-300 mt-1.5">Enter a positive decimal amount.</p>
              )}
              {exceedsBalance && (
                <p className="text-xs text-rose-300 mt-1.5">Exceeds your available balance.</p>
              )}
            </label>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-gray-400 leading-relaxed">
              VFIDE never holds your fiat. The provider you choose handles KYC and the on-ramp/off-ramp.
              Fees and exchange rates are shown by the provider before you confirm.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  'Request payout'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
