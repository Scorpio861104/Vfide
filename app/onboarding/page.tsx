'use client';

export const dynamic = 'force-dynamic';

/**
 * /onboarding — lightweight setup launcher.
 *
 * Keep this page public and fast. The full wallet/vault wizard is intentionally
 * loaded only after the user chooses to continue into the wallet-enabled setup
 * flow, rather than during the anonymous landing page compile.
 */

import Link from 'next/link';
import { m as motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function OnboardingPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.08), transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.07), transparent 65%)', filter: 'blur(70px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

        <div className="container mx-auto max-w-3xl px-4 pt-16 pb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-premium p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/20 p-3">
                <Sparkles className="text-cyan-300" size={24} aria-hidden />
              </div>
              <div>
                <div className="badge-live mb-1 w-fit"><Sparkles size={10} /> Setup Wizard</div>
                <h1 className="text-2xl font-black text-white tracking-tight">Welcome to VFIDE</h1>
                <p className="text-sm text-zinc-400">
                  A guided setup for wallet connection, vault protection, trusted recovery, and secure payments.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-sm text-zinc-400">
                Start with a fast overview, then continue to the wallet-enabled setup page when you are ready to connect a wallet and configure your vault.
              </p>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-100">
                <p className="flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck size={16} aria-hidden /> What setup covers
                </p>
                <p className="mt-1 text-zinc-400">
                  Wallet connection, CardBound vault creation, spend protections, guardians, recovery, and payment readiness.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/setup"
                  className="btn-premium-primary flex items-center justify-center gap-2"
                >
                  Continue to Setup
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link
                  href="/docs"
                  className="btn-premium-ghost flex items-center justify-center gap-2"
                >
                  Read the Docs
                </Link>
              </div>

              <p className="text-xs text-zinc-500">
                Wallet actions only load on the setup flow, keeping this launcher quick and reliable on first visit.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
      <Footer />
    </>
  );
}
