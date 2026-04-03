'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useGamification } from '@/lib/gamification';
import { AchievementsTab } from './components/AchievementsTab';
import { PerksTab } from './components/PerksTab';
import { StatsTab } from './components/StatsTab';

type TabId = 'achievements' | 'perks' | 'stats';

const TAB_LABELS: Record<TabId, string> = {
  achievements: 'Achievements',
  perks: 'Level Perks',
  stats: 'Stats',
};
const TAB_IDS: TabId[] = ['achievements', 'perks', 'stats'];

export default function AchievementsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('achievements');
  const { address, isConnected } = useAccount();
  const { progress } = useGamification(address);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">Achievements</h1>
          </motion.div>
          <p className="text-white/60 mb-8">Track your progress and unlock rewards</p>

          {!isConnected || !progress ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">View Your Achievements</h2>
              <p className="text-gray-400">Connect your wallet to load your live XP, perks, and milestone history.</p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          ) : (
            <>
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

              {activeTab === 'achievements' && <AchievementsTab userAddress={address} />}
              {activeTab === 'perks' && <PerksTab />}
              {activeTab === 'stats' && <StatsTab userAddress={address} />}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
