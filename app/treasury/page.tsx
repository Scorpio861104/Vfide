'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Globe, Heart, Landmark, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';

import { EcosystemTab } from './components/EcosystemTab';
import { OverviewTab } from './components/OverviewTab';
import { RevenueTab } from './components/RevenueTab';
import { SanctumTab } from './components/SanctumTab';
import { VestingTab } from './components/VestingTab';

const TABS = [
  { id: 'overview',   label: 'Overview',  icon: Landmark   },
  { id: 'sanctum',    label: 'Sanctum',   icon: Heart      },
  { id: 'ecosystem',  label: 'Ecosystem', icon: Globe      },
  { id: 'revenue',    label: 'Revenue',   icon: TrendingUp },
  { id: 'vesting',    label: 'Vesting',   icon: Clock      },
] as const;

type TabId = typeof TABS[number]['id'];

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Protocol Treasury</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">
                  Treasury
                </span>
              </h1>
              <p className="text-white/50 text-lg">Protocol funds, fee distribution, and ecosystem health.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-emerald-400">$4.7M</div>
                <div className="text-xs text-white/40">Total Value</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-cyan-400">$124K</div>
                <div className="text-xs text-white/40">Monthly Rev</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-amber-400">18mo</div>
                <div className="text-xs text-white/40">Runway</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sticky Tab Bar */}
        <div className="sticky top-[4.5rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
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
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'overview'  && <OverviewTab />}
            {activeTab === 'sanctum'   && <SanctumTab isConnected={isConnected} />}
            {activeTab === 'ecosystem' && <EcosystemTab isConnected={isConnected} />}
            {activeTab === 'revenue'   && <RevenueTab />}
            {activeTab === 'vesting'   && <VestingTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
