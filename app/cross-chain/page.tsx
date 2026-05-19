'use client';

import CrossChainTransfer from '@/components/CrossChainTransfer';
import { Footer } from '@/components/layout/Footer';
import { ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CrossChainPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="badge-live mb-4">
              <ArrowLeftRight size={12} /> Cross-Chain Bridge
            </div>
            <h1 className="sr-only">Cross-Chain Transfer</h1>
          </motion.div>
          <CrossChainTransfer />
        </div>
      </div>
      <Footer />
    </>
  );
}
