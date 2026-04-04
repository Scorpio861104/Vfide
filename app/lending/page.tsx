'use client';

import Link from 'next/link';
import { ArrowRight, Banknote, ShieldCheck, Zap, HandCoins } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

const lendingModes = [
  {
    title: 'Trust-based lanes',
    description: 'Use the existing Flashlight simulator and server-backed lane flow for borrower/lender/arbiter coordination.',
    href: '/flashlight',
    cta: 'Open Flashlight Simulator',
    icon: HandCoins,
  },
  {
    title: 'Flash liquidity tools',
    description: 'Use the current flash-loan workspace for instant-liquidity concepts, history, and workflow tabs.',
    href: '/flashloans',
    cta: 'View Flash Loans',
    icon: Zap,
  },
];

export default function LendingPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              <Banknote size={14} /> Uploaded lending handoff
            </div>
            <h1 className="text-4xl font-bold">P2P Lending</h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              The uploaded lending concept is now routed into VFIDE’s existing loan flows so borrowers, lenders, and flash-liquidity tools stay in one place.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {lendingModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <div key={mode.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-cyan-300"><Icon size={18} /></div>
                    <h2 className="text-xl font-semibold text-white">{mode.title}</h2>
                    <p className="mt-2 text-sm text-gray-400">{mode.description}</p>
                    <Link href={mode.href} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white">
                      {mode.cta} <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="mb-2 flex items-center gap-2 text-emerald-300"><ShieldCheck size={16} /> Safety model</div>
              <p className="text-sm text-gray-300">Borrower/lender protections, dispute states, and lane simulation already exist in the repo, so this page acts as the clean entry point for the uploaded lending handoff.</p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
