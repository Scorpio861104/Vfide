'use client';

import Link from 'next/link';
import { ArrowRight, Scale, ShieldAlert, RotateCcw, MessagesSquare } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import PeerMediation from '@/components/merchant/disputes/PeerMediation';

export default function DisputesPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
              <Scale size={14} /> Uploaded disputes handoff
            </div>
            <h1 className="text-4xl font-bold">Disputes & mediation</h1>
            <p className="mt-3 max-w-3xl text-gray-400">This handoff page now routes to the repo’s existing appeals and merchant-resolution flows so dispute handling stays centralized.</p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-amber-300"><ShieldAlert size={18} /></div>
                <h2 className="text-xl font-semibold">Appeals Center</h2>
                <p className="mt-2 text-sm text-gray-400">Open the existing appeals workflow for escalation, review, and resolution tracking.</p>
                <Link href="/appeals" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  Open Appeals Center <ArrowRight size={14} />
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-cyan-300"><RotateCcw size={18} /></div>
                <h2 className="text-xl font-semibold">Merchant returns</h2>
                <p className="mt-2 text-sm text-gray-400">Use the new returns-and-exchanges workflow for order corrections before escalating to formal appeals.</p>
                <Link href="/merchant/returns" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                  Merchant Returns <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
              <div className="mb-2 flex items-center gap-2 text-purple-300"><MessagesSquare size={16} /> Mediation-first workflow</div>
              Start with merchant correction or peer review, then escalate into the formal appeal path only when needed.
            </div>

            <div className="mt-8">
              <PeerMediation />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
