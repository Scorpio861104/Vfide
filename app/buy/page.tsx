'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { BuyTab } from './components/BuyTab';
import { HistoryTab } from './components/HistoryTab';
import { SwapTab } from './components/SwapTab';

type TabId = 'buy' | 'swap' | 'history';

const TAB_LABELS: Record<TabId, string> = { buy: 'Buy', swap: 'Swap', history: 'History' };
const TAB_IDS: TabId[] = ['buy', 'swap', 'history'];

export default function BuyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('buy');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Buy Crypto
          </h1>
          <p className="mb-8 text-white/60">Purchase VFIDE through trusted on-ramp partners or swap from an existing wallet.</p>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'buy' && <BuyTab />}
          {activeTab === 'swap' && <SwapTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
