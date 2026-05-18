'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface PaymentLinkData {
  link_id: string;
  merchant_address: string;
  title: string;
  description: string | null;
  token: string;
  amount: number | null;
  min_amount: number | null;
  max_amount: number | null;
  currency_display: string | null;
  collect_email: boolean;
  collect_shipping: boolean;
  single_use: boolean;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; link: PaymentLinkData };

export function PayLinkContent({ linkId }: { linkId: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [customAmount, setCustomAmount] = useState<string>('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/pay/link/${encodeURIComponent(linkId)}`, { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setState({ kind: 'error', message: data.error || 'Payment link could not be loaded' });
          return;
        }
        setState({ kind: 'ready', link: data.link });
      } catch {
        if (!cancelled) {
          setState({ kind: 'error', message: 'Network error loading payment link' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [linkId]);

  const link = state.kind === 'ready' ? state.link : null;
  const isOpenAmount = useMemo(() => !!link && link.amount === null, [link]);

  const validateAndProceed = useCallback(() => {
    if (!link) return;
    setAmountError(null);

    let payAmount: number;
    if (isOpenAmount) {
      payAmount = Number(customAmount);
      if (!Number.isFinite(payAmount) || payAmount <= 0) {
        setAmountError('Enter a valid amount');
        return;
      }
      if (link.min_amount !== null && payAmount < Number(link.min_amount)) {
        setAmountError(`Minimum is ${Number(link.min_amount).toFixed(2)} ${link.currency_display ?? 'VFIDE'}`);
        return;
      }
      if (link.max_amount !== null && payAmount > Number(link.max_amount)) {
        setAmountError(`Maximum is ${Number(link.max_amount).toFixed(2)} ${link.currency_display ?? 'VFIDE'}`);
        return;
      }
    } else {
      payAmount = Number(link.amount);
    }

    if (link.collect_email && !email.trim()) {
      setAmountError('Email is required for this payment');
      return;
    }

    setSubmitting(true);
    const params = new URLSearchParams();
    params.set('merchant', link.merchant_address);
    params.set('amount', payAmount.toFixed(2));
    params.set('source', 'paylink');
    params.set('settlement', 'escrow');
    params.set('linkId', link.link_id);
    if (email.trim()) params.set('email', email.trim());
    router.push(`/pay?${params.toString()}`);
  }, [link, isOpenAmount, customAmount, email, router]);

  if (state.kind === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem] flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
          Loading payment link…
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem] px-4 flex items-start justify-center text-white">
        <div className="max-w-md w-full mt-20 rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold mb-2">This link isn&apos;t available</h1>
          <p className="text-sm text-zinc-400">{state.message}</p>
          <p className="text-xs text-zinc-500 mt-6">If you&apos;re expecting this to work, ask the merchant to send a new link.</p>
        </div>
      </div>
    );
  }

  // Ready state
  const l = state.link;
  const fixedAmount = l.amount !== null ? Number(l.amount) : null;

  return (
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem] px-4 text-white">
      <div className="container mx-auto max-w-md py-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
            <Link2 size={12} /> Payment link
          </div>

          <h1 className="text-2xl font-bold mb-2">{l.title}</h1>
          {l.description && <p className="text-sm text-zinc-400 mb-4 whitespace-pre-wrap">{l.description}</p>}

          {/* Amount section */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 mb-4">
            {!isOpenAmount && fixedAmount !== null ? (
              <div>
                <div className="text-xs text-zinc-400 mb-1">Amount</div>
                <div className="text-3xl font-bold">{fixedAmount.toFixed(2)} <span className="text-base font-normal text-zinc-400">{l.currency_display ?? 'VFIDE'}</span></div>
              </div>
            ) : (
              <label className="block">
                <span className="text-xs text-zinc-400 mb-1 block">Enter amount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={l.min_amount ?? 0.01}
                    max={l.max_amount ?? undefined}
                    step={0.01}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-3 py-2.5 text-2xl font-bold focus:border-cyan-500 outline-none"
                  />
                  <span className="text-zinc-400">{l.currency_display ?? 'VFIDE'}</span>
                </div>
                {(l.min_amount !== null || l.max_amount !== null) && (
                  <div className="text-xs text-zinc-500 mt-2">
                    {l.min_amount !== null && <>Min {Number(l.min_amount).toFixed(2)}</>}
                    {l.min_amount !== null && l.max_amount !== null && ' · '}
                    {l.max_amount !== null && <>Max {Number(l.max_amount).toFixed(2)}</>}
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Email field if requested */}
          {l.collect_email && (
            <label className="block mb-4">
              <span className="text-xs text-zinc-400 mb-1 block">Your email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none"
              />
              <span className="text-xs text-zinc-500 mt-1 block">For the receipt</span>
            </label>
          )}

          {amountError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {amountError}
            </div>
          )}

          <button
            onClick={validateAndProceed}
            disabled={submitting}
            className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
          </button>

          <div className="mt-4 text-xs text-zinc-500 text-center">
            You&apos;ll connect your wallet on the next screen to complete the payment.
          </div>
        </div>

        {l.expires_at && (
          <div className="mt-3 text-xs text-zinc-500 text-center">
            This link expires {new Date(l.expires_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
