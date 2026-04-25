'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GenerateTab } from './components/GenerateTab';
import { GuideTab } from './components/GuideTab';

type TabId = 'generate' | 'guide';

const TAB_LABELS: Record<TabId, string> = { 'generate': 'Generate', 'guide': 'Guide' };
const TAB_IDS: TabId[] = ['generate', 'guide'];

export default function PaperWalletPage() {
  const [activeTab, setActiveTab] = useState<TabId>('generate');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2">Paper Wallet</motion.h1>
          <p className="text-white/60 mb-8">Generate cold storage backup</p>

          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            This page generates keys in your browser. If your browser, device, or this page&apos;s JavaScript is compromised, the keys are compromised. For real funds, use the offline paper-wallet bundle from a verified release and run it from local disk on an air-gapped machine.
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map(id => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'generate' && <GenerateTab />}
          {activeTab === 'guide' && <GuideTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
