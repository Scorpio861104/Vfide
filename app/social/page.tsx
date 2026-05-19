'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BarChart2, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';

import { EngagementTab } from './components/EngagementTab';
import { GrowthTab } from './components/GrowthTab';
import { OverviewTab } from './components/OverviewTab';

type TabId = 'overview' | 'engagement' | 'growth';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',   icon: BarChart2 },
  { id: 'engagement', label: 'Engagement', icon: Users },
  { id: 'growth',     label: 'Growth',     icon: TrendingUp },
];

export default function SocialAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[550px] h-[550px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[450px] h-[450px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Community Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Social Analytics
            </span>
          </h1>
          <p className="text-white/50 text-lg">Community engagement metrics and growth insights.</p>
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
            {activeTab === 'overview'   && <OverviewTab />}
            {activeTab === 'engagement' && <EngagementTab />}
            {activeTab === 'growth'     && <GrowthTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
