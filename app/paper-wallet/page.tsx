'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Key } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';

import { GenerateTab } from './components/GenerateTab';
import { GuideTab } from './components/GuideTab';
import { useLocale } from '@/lib/locale/LocaleProvider';

type TabId = 'generate' | 'guide';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'generate', label: 'Generate', icon: Key      },
  { id: 'guide',    label: 'Guide',    icon: BookOpen },
];

export default function PaperWalletPage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabId>('generate');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>
      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Cold Storage</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent">Paper Wallet</span>
          </h1>
          <p className="text-white/50 text-lg mb-4">Generate cold storage backup wallets for maximum security.</p>
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            ⚠️ This page generates keys in your browser. If your browser, device, or this page&apos;s JavaScript is compromised, the keys are compromised. For real funds, use the offline paper-wallet bundle from a verified release and run it from local disk on an air-gapped machine.
          </div>
        </motion.div>
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'generate' && <GenerateTab />}
            {activeTab === 'guide'    && <GuideTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
