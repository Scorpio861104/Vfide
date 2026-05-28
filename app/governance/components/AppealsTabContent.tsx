'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActiveTab } from '@/app/appeals/components/ActiveTab';
import { ResolvedTab } from '@/app/appeals/components/ResolvedTab';
import { SubmitTab } from '@/app/appeals/components/SubmitTab';
import { AlertCircle, PlusCircle, CheckCircle2 } from 'lucide-react';

type TabId = 'active' | 'submit' | 'resolved';

const TABS = [
  { id: 'active' as const, label: 'Active', icon: <AlertCircle size={14} /> },
  { id: 'submit' as const, label: 'Submit Appeal', icon: <PlusCircle size={14} /> },
  { id: 'resolved' as const, label: 'Resolved', icon: <CheckCircle2 size={14} /> },
];

export default function AppealsTabContent() {
  const [activeTab, setActiveTab] = useState<TabId>('submit');

  return (
    <div>
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto max-w-5xl px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Dispute Resolution</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              Appeals
            </span>
          </h1>
          <p className="text-white/50">Dispute review and trusted appeal handling for flagged actions.</p>
        </motion.div>

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
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'active' && <ActiveTab />}
            {activeTab === 'submit' && <SubmitTab />}
            {activeTab === 'resolved' && <ResolvedTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
