'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, m } from 'framer-motion';
import { CheckCircle2, FileText, Lock, PlusCircle } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';

import { ActiveTab } from './components/ActiveTab';
import { CompletedTab } from './components/CompletedTab';
import { CreateTab } from './components/CreateTab';
import { DisputesTab } from './components/DisputesTab';

type TabId = 'active' | 'create' | 'completed' | 'disputes';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'active',    label: 'Active',    icon: Lock },
  { id: 'create',    label: 'Create',    icon: PlusCircle },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  { id: 'disputes',  label: 'Disputes',  icon: FileText },
];

export default function EscrowPage() {
  const [activeTab, setActiveTab] = useState<TabId>('active');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[550px] h-[550px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[450px] h-[450px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[350px] h-[350px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live">
              <span className="badge-live-dot" />
              Trustless Escrow
            </span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="bg-gradient-to-r from-accent via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Escrow
                </span>
              </h1>
              <p className="text-white/50 text-lg">Lock funds, define conditions, release on fulfillment.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-accent">$2.4M</div>
                <div className="text-xs text-white/40">Locked</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-emerald-400">1,847</div>
                <div className="text-xs text-white/40">Active</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-violet-400">99.1%</div>
                <div className="text-xs text-white/40">Settled</div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Sticky Tab Bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <m.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'active'    && <ActiveTab />}
            {activeTab === 'create'    && <CreateTab />}
            {activeTab === 'completed' && <CompletedTab />}
            {activeTab === 'disputes'  && <DisputesTab />}
          </m.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
