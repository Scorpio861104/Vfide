'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, motion } from 'framer-motion';
import { BarChart2, Clock, PlusCircle, Shield, Users, Vote } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';

import { CouncilTab } from './components/CouncilTab';
import { CreateTab } from './components/CreateTab';
import { HistoryTab } from './components/HistoryTab';
import { ProposalsTab } from './components/ProposalsTab';
import { StatsTab } from './components/StatsTab';

type TabId = 'proposals' | 'create' | 'council' | 'stats' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'proposals', label: 'Proposals', icon: Vote },
  { id: 'create',    label: 'Create',    icon: PlusCircle },
  { id: 'council',   label: 'Council',   icon: Users },
  { id: 'stats',     label: 'Stats',     icon: BarChart2 },
  { id: 'history',   label: 'History',   icon: Clock },
];

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('proposals');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live">
              <span className="badge-live-dot" />
              DAO Governance
            </span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Governance
                </span>
              </h1>
              <p className="text-white/50 text-lg">Shape the future of Vfide — propose, debate, vote.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-violet-400">247</div>
                <div className="text-xs text-white/40">Proposals</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-cyan-400">18</div>
                <div className="text-xs text-white/40">Active</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-emerald-400">89%</div>
                <div className="text-xs text-white/40">Pass Rate</div>
              </div>
            </div>
          </div>
        </motion.div>

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
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'proposals' && <ProposalsTab onCreateProposal={() => setActiveTab('create')} />}
            {activeTab === 'create'    && <CreateTab />}
            {activeTab === 'council'   && <CouncilTab />}
            {activeTab === 'stats'     && <StatsTab />}
            {activeTab === 'history'   && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
