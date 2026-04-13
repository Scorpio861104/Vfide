/**
 * About Page — Server Component (SSR)
 * 
 * NO 'use client'. Renders as static HTML.
 * Zero JS shipped to browser. Full SEO.
 * 
 * MIGRATION:
 * 1. Copy content from your existing app/about/page.tsx
 * 2. Remove 'use client' directive
 * 3. Remove framer-motion imports → use CSS animations
 * 4. Remove useAccount/wallet hooks → static content only
 * 5. Replace <motion.div> with plain <div> + CSS classes
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About VFIDE — Trust-Scored DeFi Payments',
  description: 'VFIDE is a payment protocol for the financially excluded. Zero merchant fees. Non-custodial vaults. Built for market sellers, remittance workers, and fair trade farmers.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      {/* Hero */}
      <section className="py-20 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
            Payment rails for the <span className="text-cyan-400">financially excluded</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            VFIDE is a trust-scored DeFi payment protocol. Zero merchant fees. 
            Non-custodial vaults with recovery and inheritance. 
            Built for the 1.4 billion adults without bank access.
          </p>
        </div>
      </section>

      <section className="py-16 border-b border-white/5">
        <div className="container mx-auto px-4 max-w-4xl grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/3 p-5">
            <h2 className="text-white font-semibold mb-2">Mission</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Build payments that work for market sellers, migrant families, and
              communities blocked by costly legacy rails.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-5">
            <h2 className="text-white font-semibold mb-2">Principles</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Non-custodial ownership, transparent trust signals, and governance-led
              upgrades form the baseline for protocol integrity.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-5">
            <h2 className="text-white font-semibold mb-2">Impact</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Lower friction for cross-border commerce and preserve value for
              merchants by minimizing avoidable payment fees.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-white mb-4">How VFIDE Works</h2>
          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>Users onboard with low-friction account options and receive a vault that keeps custody in user control.</p>
            <p>Trust and reputation signals reduce counterparty uncertainty without forcing centralized gatekeepers.</p>
            <p>Merchants accept multiple payment assets while settlement and reporting stay aligned to protocol rules.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
