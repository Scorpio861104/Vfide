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

      {/* TODO: Migrate remaining sections from existing about/page.tsx */}
      {/* Remove 'use client', framer-motion, wallet hooks */}
      {/* Replace motion.div with CSS animate-fade-in, animate-slide-up classes */}
    </div>
  );
}
