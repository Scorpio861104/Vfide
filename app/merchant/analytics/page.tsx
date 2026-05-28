'use client';

export const dynamic = 'force-dynamic';

import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { MerchantAnalytics } from '@/components/analytics/MerchantAnalytics';
import { useAccount } from 'wagmi';
import { BarChart3 } from 'lucide-react';

export default function MerchantAnalyticsPage() {
  const { address } = useAccount();

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto max-w-6xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Merchant Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-accent via-blue-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 size={32} className="text-accent" />Merchant Analytics
            </span>
          </h1>
          <p className="text-white/50">Revenue, order flow, and product performance for your storefront.</p>
        </motion.div>

        {address ? (
          <MerchantAnalytics merchantAddress={address} />
        ) : (
          <div className="glass-card-premium p-8">
            <h2 className="text-xl font-semibold text-white mb-2">Connect your merchant wallet</h2>
            <p className="text-white/40">Sign in with the wallet linked to your store to view live analytics.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
