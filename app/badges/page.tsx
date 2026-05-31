'use client';

import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion';
import { History, LayoutGrid, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';

import { AvailableTab } from './components/AvailableTab';
import { CollectionTab } from './components/CollectionTab';
import { HistoryTab } from './components/HistoryTab';
import { useLocale } from '@/lib/locale/LocaleProvider';

type TabId = 'collection' | 'available' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'collection', label: 'Collection', icon: LayoutGrid },
  { id: 'available',  label: 'Available',  icon: Sparkles   },
  { id: 'history',    label: 'History',    icon: History    },
];

export default function BadgesPage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabId>('collection');

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Reputation System</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Badges
            </span>
          </h1>
          <p className="text-white/50 text-lg">Earn badges through real activity — visible, verifiable, on-chain.</p>
        </m.div>

        {/* Sticky Tab Bar */}
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

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <m.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'collection' && <CollectionTab />}
            {activeTab === 'available'  && <AvailableTab />}
            {activeTab === 'history'    && <HistoryTab />}
          </m.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
    </LazyMotion>
  );
}
