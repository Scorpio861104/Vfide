'use client';

import { Footer } from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { STUB_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

export default function Page() {
  const [locale] = useLocale();
  const copy = pickLocaleCopy(STUB_TRANSLATIONS, locale);
  return (
    <>
      <div className=&quot;min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden text-white&quot;>
        <div className=&quot;pointer-events-none absolute inset-0 overflow-hidden&quot; aria-hidden=&quot;true&quot;>
          <div className=&quot;absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]&quot;
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className=&quot;grid-pattern pointer-events-none absolute inset-0 opacity-20&quot; aria-hidden=&quot;true&quot; />
        <div className=&quot;container mx-auto max-w-2xl px-4 py-20 relative z-10&quot;>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className=&quot;glass-card-premium p-10 text-center&quot;
          >
            <div className=&quot;text-6xl mb-6&quot; aria-hidden=&quot;true&quot;>🤖</div>
            <div className=&quot;inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 mb-5&quot;>
              <Clock size={10} /> In development · Post-testnet
            </div>
            <h1 className=&quot;text-3xl font-black text-white mb-3&quot;>VFIDE Agent</h1>
            <p className=&quot;text-zinc-400 mb-2 text-sm font-medium&quot;>AI-powered payment automation and smart alerts.</p>
            <p className=&quot;text-zinc-500 text-sm leading-relaxed mb-8&quot;>The VFIDE Agent automates routine financial tasks — sweep dust balances, auto-top-up Guardians, alert on unusual activity — using on-chain triggers and your ProofScore profile.</p>
            <div className=&quot;text-left bg-zinc-900/50 rounded-xl p-5 mb-8&quot;>
              <p className=&quot;text-xs text-zinc-500 uppercase tracking-widest mb-3&quot;>What to expect</p>
              <ul className=&quot;space-y-2&quot;>
                <li className=&quot;flex items-start gap-2 text-sm text-zinc-300&quot;><span className=&quot;text-cyan-400 mt-0.5&quot;>→</span>Natural-language commands: &ldquo;send $50 to Ana every Monday&rdquo;</li>
                <li className=&quot;flex items-start gap-2 text-sm text-zinc-300&quot;><span className=&quot;text-cyan-400 mt-0.5&quot;>→</span>On-chain triggers and alerts based on your vault activity</li>
                <li className=&quot;flex items-start gap-2 text-sm text-zinc-300&quot;><span className=&quot;text-cyan-400 mt-0.5&quot;>→</span>Privacy-preserving: agent never holds keys or custody</li>
              </ul>
            </div>
            <div className=&quot;flex flex-col sm:flex-row gap-3 justify-center&quot;>
              <Link href=&quot;/dashboard&quot;
                className=&quot;inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors text-sm&quot;
              >
                Back to dashboard <ArrowRight size={14} />
              </Link>
              <Link href=&quot;/&quot;
                className=&quot;inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl transition-colors text-sm&quot;
              >
                Go back
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
