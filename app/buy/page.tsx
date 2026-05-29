'use client';
import _dynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
const BuyTab = _dynamic(() => import('./components/BuyTab').then(m => ({ default: m.BuyTab })), { ssr: false });
import { HistoryTab } from './components/HistoryTab';
const SwapTab = _dynamic(() => import('./components/SwapTab').then(m => ({ default: m.SwapTab })), { ssr: false });
import { ShoppingCart, ArrowLeftRight, Clock } from 'lucide-react';

type TabId = 'buy' | 'swap' | 'history';

const TABS = [
  { id: 'buy' as const, label: 'Buy Crypto', icon: <ShoppingCart size={14} /> },
  { id: 'swap' as const, label: 'Swap', icon: <ArrowLeftRight size={14} /> },
  { id: 'history' as const, label: 'History', icon: <Clock size={14} /> },
];

export default function BuyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('buy');

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto max-w-5xl px-4">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />On-Ramp</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-accent via-accent to-violet-400 bg-clip-text text-transparent">
              Buy Crypto
            </span>
          </h1>
          <p className="text-white/50">Plan a VFIDE purchase, then execute via Uniswap on Base. Direct fiat on-ramp is a future release.</p>
        </m.div>

        {/* Sticky tab bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={activeTab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <m.div key={activeTab}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'buy' && <BuyTab />}
            {activeTab === 'swap' && <SwapTab />}
            {activeTab === 'history' && <HistoryTab />}
          </m.div>
        </AnimatePresence>
      </div>

      <Footer />
    </div>
    </LazyMotion>
  );
}
