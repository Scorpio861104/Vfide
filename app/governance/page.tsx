'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWriteContract } from 'wagmi';
import { DAOABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { ProposalsTab } from './components/ProposalsTab';
import { CreateTab } from './components/CreateTab';
import { CouncilTab } from './components/CouncilTab';
import { StatsTab } from './components/StatsTab';
import { HistoryTab } from './components/HistoryTab';

type TabId = 'proposals' | 'create' | 'council' | 'stats' | 'history';

const TAB_LABELS: Record<TabId, string> = { 'proposals': 'Proposals', 'create': 'Create Proposal', 'council': 'Council', 'stats': 'Stats', 'history': 'History' };
const TAB_IDS: TabId[] = ['proposals', 'create', 'council', 'stats', 'history'];

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('proposals');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const { writeContract } = useWriteContract();

  const handleVote = (proposalId: bigint, support: boolean) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DAO as `0x${string}`,
      abi: DAOABI as any,
      functionName: 'vote',
      args: [proposalId, support],
    });
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">Governance</h1>
          </motion.div>
          <p className="text-white/60 mb-8">Community proposals and voting</p>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white font-semibold"
            >
              Notifications
            </button>

            <div className="relative flex-1">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search proposals"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 pr-10 text-white placeholder:text-gray-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {showNotifications ? (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-gray-100">
              <div className="font-semibold">Urgent Notifications</div>
              <p className="text-sm text-gray-200 mt-1">Proposal deadlines and treasury review items appear here first.</p>
            </div>
          ) : null}

          <div role="tablist" aria-label="Governance navigation" className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map(id => (
              <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'proposals' && <ProposalsTab searchQuery={searchQuery} onVote={handleVote} />}
          {activeTab === 'create' && <CreateTab />}
          {activeTab === 'council' && <CouncilTab />}
          {activeTab === 'stats' && <StatsTab />}
          {activeTab === 'history' && <HistoryTab searchQuery={searchQuery} />}
        </div>
      </div>
      <Footer />
    </>
  );
}
