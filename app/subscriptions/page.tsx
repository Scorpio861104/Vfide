'use client';

import { Footer } from '@/components/layout/Footer';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { STUB_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

export default function Page() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(STUB_TRANSLATIONS, locale);
  return (
    <LazyMotion features={domAnimation}>
      <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="container mx-auto max-w-2xl px-4 py-20 relative z-10">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card-premium p-10 text-center"
          >
            <div className="text-6xl mb-6" aria-hidden="true">🔄</div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 mb-5">
              <Clock size={10} /> In development · Post-testnet
            </div>
            <h1 className="text-3xl font-black text-white mb-3">Recurring Subscriptions</h1>
            <p className="text-zinc-400 mb-2 text-sm font-medium">Set up and manage subscription billing for your customers.</p>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">The SubscriptionManager contract is finalised but deployment is deferred to V1.1 to keep the mainnet surface area minimal. Merchants can set up subscription products from their portal today.</p>

            <div className="text-left bg-zinc-900/50 rounded-xl p-5 mb-8">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">What to expect</p>
              <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>Weekly, monthly, quarterly, and annual billing plans</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>Subscribers can pause, cancel, or upgrade at any time</li>
                <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>Merchant dashboard showing MRR, churn, and renewal forecasts</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/merchant/subscriptions"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-zinc-900 font-bold rounded-xl transition-colors text-sm"
              >
                Configure subscriptions (merchant) <ArrowRight size={14} />
              </Link>
              <Link href="/merchant"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl transition-colors text-sm"
              >
                Go back
              </Link>
            </div>
          </m.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
