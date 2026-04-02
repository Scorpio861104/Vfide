'use client';

import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Store } from 'lucide-react';

import { ComparisonRow } from './components/ComparisonRow';
import { Step } from './components/Step';

export default function MerchantPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        {/* Hero */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-6xl text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-bold text-white mb-6">
              Zero fees. <span className="text-cyan-400">Seriously.</span>
            </motion.h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Every other platform takes a cut. VFIDE doesn&apos;t. Your customers pay a small trust fee — you keep 100%.
            </p>
            <Link href="/merchant/setup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform">
              <Store size={22} /> Set up your store <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16 border-y border-white/5">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold text-white text-center mb-8">The fee comparison</h2>
            <div className="space-y-2">
              <ComparisonRow platform="Square" fee="2.6% + $0.10" color="blue" />
              <ComparisonRow platform="Stripe" fee="2.9% + $0.30" color="purple" />
              <ComparisonRow platform="PayPal" fee="3.49% + $0.49" color="blue" />
              <ComparisonRow platform="Etsy" fee="6.5%" color="orange" />
              <ComparisonRow platform="VFIDE" fee="0% merchant fee" color="cyan" highlight />
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Live in under 2 minutes</h2>
            <div className="space-y-6">
              <Step number={1} title="Name your store" description="Pick a name and category for your business" />
              <Step number={2} title="Add products" description="Snap a photo or enter details manually" />
              <Step number={3} title="Go live" description="Share your link — start accepting payments instantly" />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
