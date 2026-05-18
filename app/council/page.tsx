'use client';

export const dynamic = 'force-dynamic';

import { lazy, Suspense, useState } from 'react';
import { Footer } from "@/components/layout/Footer";
import { CouncilElectionABI } from "@/lib/abis/future";
import { ZERO_ADDRESS } from "@/lib/contracts";
import { getFutureContractAddresses, isFutureFeaturesEnabled } from '@/lib/contracts/future-contracts';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Users, DollarSign, Vote, Crown } from "lucide-react";

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
  { id: 'overview' as const, label: 'Overview', icon: Users },
  { id: 'members' as const, label: 'Council Members', icon: Crown },
  { id: 'salary' as const, label: 'Salary Distribution', icon: DollarSign },
  { id: 'voting' as const, label: 'Member Voting', icon: Vote },
] as const;

function TabSkeleton() {
  return <div className="animate-pulse space-y-4"><div className="h-8 bg-white/5 rounded-lg w-1/3" /><div className="h-48 bg-white/5 rounded-2xl" /></div>;
}

export default function CouncilPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Contract reads (prefetch for child components)
  const { data: hash } = useWriteContract();
  useWaitForTransactionReceipt({ hash });

  useReadContract({ address: COUNCIL_ELECTION_ADDRESS, abi: CouncilElectionABI, functionName: 'getCouncilMembers', query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED } });
  useReadContract({ address: COUNCIL_ELECTION_ADDRESS, abi: CouncilElectionABI, functionName: 'getCandidates', query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED } });
  useReadContract({ address: COUNCIL_ELECTION_ADDRESS, abi: CouncilElectionABI, functionName: 'getElectionStatus', query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED } });

  return (
    <>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />
      </div>

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-full mb-4">
              <Crown className="w-4 h-4 text-indigo-400" /><span className="text-indigo-400 text-sm font-medium">Governance Council</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Council Management</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Governance council operations, member management, and salary distribution</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-2 mb-8">
            {TAB_CONFIG.map((tab) => (
              <motion.button key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-white/5 text-gray-400 hover:bg-indigo-500/10 hover:text-indigo-400'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </motion.button>
            ))}
          </motion.div>

          <Suspense fallback={<TabSkeleton />}>
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'members' && <MembersTab />}
                {activeTab === 'salary' && <SalaryTab isConnected={isConnected} />}
                {activeTab === 'voting' && <VotingTab isConnected={isConnected} />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}
