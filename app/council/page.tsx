'use client';

export const dynamic = 'force-dynamic';

import { lazy, Suspense, useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { CouncilElectionABI } from '@/lib/abis/future';
import { ZERO_ADDRESS } from '@/lib/contracts';
import { getFutureContractAddresses, isFutureFeaturesEnabled } from '@/lib/contracts/future-contracts';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, Vote, Crown } from 'lucide-react';

const OverviewTab = lazy(() => import('./components/OverviewTab').then(m => ({ default: m.OverviewTab })));
const MembersTab = lazy(() => import('./components/MembersTab').then(m => ({ default: m.MembersTab })));
const SalaryTab = lazy(() => import('./components/SalaryTab').then(m => ({ default: m.SalaryTab })));
const VotingTab = lazy(() => import('./components/VotingTab').then(m => ({ default: m.VotingTab })));

const COUNCIL_ELECTION_ADDRESS = isFutureFeaturesEnabled()
  ? getFutureContractAddresses().CouncilElection
  : ZERO_ADDRESS;
const IS_COUNCIL_ELECTION_DEPLOYED = COUNCIL_ELECTION_ADDRESS !== ZERO_ADDRESS;

type TabType = 'overview' | 'members' | 'salary' | 'voting';

const TAB_CONFIG = [
  { id: 'overview' as const, label: 'Overview', icon: <Users size={14} /> },
  { id: 'members' as const, label: 'Council Members', icon: <Crown size={14} /> },
  { id: 'salary' as const, label: 'Salary Distribution', icon: <DollarSign size={14} /> },
  { id: 'voting' as const, label: 'Member Voting', icon: <Vote size={14} /> },
];

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-white/5 rounded-lg w-1/3" />
      <div className="h-48 bg-white/5 rounded-2xl" />
    </div>
  );
}

export default function CouncilPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: hash } = useWriteContract();
  useWaitForTransactionReceipt({ hash });

  useReadContract({ address: COUNCIL_ELECTION_ADDRESS, abi: CouncilElectionABI, functionName: 'getCouncilMembers', query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED } });
  useReadContract({ address: COUNCIL_ELECTION_ADDRESS, abi: CouncilElectionABI, functionName: 'getCandidates', query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED } });
  useReadContract({ address: COUNCIL_ELECTION_ADDRESS, abi: CouncilElectionABI, functionName: 'getElectionStatus', query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED } });

  return (
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem] pb-16 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[700px] h-[700px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/2 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Governance Council</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Council Management
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">Governance council operations, member management, and salary distribution</p>
        </motion.div>

        {/* Sticky tab bar */}
        <div className="sticky top-[4.5rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none justify-center">
            {TAB_CONFIG.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={activeTab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <Suspense fallback={<TabSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}>
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'members' && <MembersTab />}
              {activeTab === 'salary' && <SalaryTab isConnected={isConnected} />}
              {activeTab === 'voting' && <VotingTab isConnected={isConnected} />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </div>

      <Footer />
    </div>
  );
}
