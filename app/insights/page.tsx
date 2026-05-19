'use client';

export const dynamic = 'force-dynamic';

import { motion } from 'framer-motion';
import { BarChart3, TrendingUp } from 'lucide-react';
import FinancialDashboard from '@/components/FinancialDashboard';
import { Footer } from '@/components/layout/Footer';

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem] pb-16 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Financial Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 size={32} className="text-cyan-400" />Insight Command
            </span>
          </h1>
          <p className="text-white/50 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" />
            Track treasury, revenue, and token momentum in real time.
          </p>
        </motion.div>

        <FinancialDashboard />
      </div>

      <Footer />
    </div>
  );
}
