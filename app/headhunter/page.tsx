'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, m } from 'framer-motion';
import { Activity, LayoutDashboard, Trophy } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';

import { ActivityTab } from './components/ActivityTab';
import { DashboardTab } from './components/DashboardTab';
import { LeaderboardTab } from './components/LeaderboardTab';

type TabId = 'dashboard' | 'leaderboard' | 'activity';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy          },
  { id: 'activity',    label: 'Activity',    icon: Activity        },
];

export default function HeadhunterPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

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
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Referral Bounties</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-accent bg-clip-text text-transparent">Headhunter</span>
          </h1>
          <p className="text-white/50 text-lg">Recruit users, earn bounties, and climb the referral leaderboard.</p>
        </m.div>
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
          <m.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'dashboard'   && <DashboardTab />}
            {activeTab === 'leaderboard' && <LeaderboardTab />}
            {activeTab === 'activity'    && <ActivityTab />}
          </m.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
