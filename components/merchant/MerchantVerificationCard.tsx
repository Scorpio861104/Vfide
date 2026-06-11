'use client';

/**
 * MerchantVerificationCard (Wave 49-B) — the verification surface.
 *
 * Shows whether the business is verified, and if not, exactly what's left — in plain language a
 * non-technical owner understands ("2 of 3 payments received"). No gatekeeper: verification is
 * earned by real activity and granted automatically when the criteria are met. A "Check now" button
 * re-evaluates and grants it the moment the merchant qualifies.
 */

import { useMerchantVerification } from '@/hooks/useMerchantVerification';
import { BadgeCheck, CheckCircle2, Circle, Loader2 } from 'lucide-react';

export function MerchantVerificationCard() {
  const v = useMerchantVerification();

  if (v.loading) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6" aria-label="Verification">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Checking verification…
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7" aria-label="Verification">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${v.verified ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.04] text-zinc-400'}`}>
            <BadgeCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {v.verified ? 'Verified business' : 'Get verified'}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {v.verified
                ? 'Customers can see this is a real, active business.'
                : 'Show customers you’re a real, active business — earned, not bought.'}
            </p>
          </div>
        </div>
        {v.verified && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-1.5 text-sm font-medium text-emerald-300">
            <CheckCircle2 size={15} aria-hidden="true" /> Verified
          </span>
        )}
      </div>

      {!v.verified && (
        <>
          <ul className="mt-6 space-y-3">
            {v.criteria.map((c) => (
              <li key={c.id} className="flex items-start gap-3">
                {c.met
                  ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  : <Circle size={18} className="mt-0.5 shrink-0 text-zinc-600" aria-hidden="true" />}
                <span>
                  <span className={`block text-sm font-medium ${c.met ? 'text-zinc-200' : 'text-white'}`}>{c.label}</span>
                  <span className="text-xs text-zinc-500">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => { void v.check(); }}
            className="btn-premium btn-premium-ghost mt-6 text-sm"
          >
            {v.eligible ? 'Get verified now' : 'Check my progress'}
          </button>
          {v.eligible && (
            <p className="mt-2 text-xs text-emerald-300/90">You’ve met every requirement — tap to get verified.</p>
          )}
        </>
      )}
    </section>
  );
}
