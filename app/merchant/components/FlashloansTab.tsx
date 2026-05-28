'use client';
/**
 * FlashloansTab — inline tab shell for /merchant?tab=flashloans.
 * Re-uses the existing /flashloans component tree via dynamic imports.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Info, Users, Zap } from 'lucide-react';
import nextDynamic from 'next/dynamic';

const BorrowTab         = nextDynamic(() => import('@/app/flashloans/components/BorrowTab').then(m => ({ default: m.BorrowTab })),               { ssr: false });
const LendersTab        = nextDynamic(() => import('@/app/flashloans/components/LendersTab').then(m => ({ default: m.LendersTab })),             { ssr: false });
const BorrowInfoTab     = nextDynamic(() => import('@/app/flashloans/components/BorrowInfoTab').then(m => ({ default: m.BorrowInfoTab })),       { ssr: false });
const HistoryTab        = nextDynamic(() => import('@/app/flashloans/components/HistoryTab').then(m => ({ default: m.HistoryTab })),             { ssr: false });

type TabId = 'borrow' | 'lenders' | 'info' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'borrow',  label: 'Borrow',   icon: Zap     },
  { id: 'lenders', label: 'Lenders',  icon: Users   },
  { id: 'info',    label: 'Info',     icon: Info    },
  { id: 'history', label: 'History',  icon: History },
];

export function FlashloansTab() {
  const [activeTab, setActiveTab] = useState<TabId>('borrow');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Flashloans P2P</h2>
        <p className="text-zinc-400 text-sm">Uncollateralised liquidity for atomic operations</p>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/8 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-selected={activeTab === id}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap -mb-px
              ${activeTab === id
                ? 'text-accent border-b-2 border-accent bg-accent/8'
                : 'text-zinc-400 hover:text-white border-b-2 border-transparent'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'borrow'  && <BorrowTab />}
          {activeTab === 'lenders' && <LendersTab />}
          {activeTab === 'info'    && <BorrowInfoTab />}
          {activeTab === 'history' && <HistoryTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
