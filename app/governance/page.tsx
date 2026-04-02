'use client';

import { lazy, Suspense, useState, useEffect } from 'react';
import { Footer } from "@/components/layout/Footer";
import { DAOABI } from "@/lib/abis";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { useProofScore, useDAOProposals } from "@/lib/vfide-hooks";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Search, Vote, Clock, Sparkles, Crown, Lightbulb, MessageSquare, History, BarChart3, FileText, Plus, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { isAddress } from "viem";

import type { TabType } from './components/shared';

// ── Lazy-loaded tab components (code-split per tab) ─────────────────────────
const OverviewTab = lazy(() => import('./components/OverviewTab').then(m => ({ default: m.OverviewTab })));
const ProposalsTab = lazy(() => import('./components/ProposalsTab').then(m => ({ default: m.ProposalsTab })));
const CreateProposalTab = lazy(() => import('./components/CreateProposalTab').then(m => ({ default: m.CreateProposalTab })));
const CouncilTab = lazy(() => import('./components/CouncilTab').then(m => ({ default: m.CouncilTab })));
const SuggestionsTab = lazy(() => import('./components/SuggestionsTab').then(m => ({ default: m.SuggestionsTab })));
const DiscussionsTab = lazy(() => import('./components/DiscussionsTab').then(m => ({ default: m.DiscussionsTab })));
const MembersTab = lazy(() => import('./components/MembersTab').then(m => ({ default: m.MembersTab })));
const HistoryTab = lazy(() => import('./components/HistoryTab').then(m => ({ default: m.HistoryTab })));
const StatsTab = lazy(() => import('./components/StatsTab').then(m => ({ default: m.StatsTab })));

// ── Constants ───────────────────────────────────────────────────────────────
const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

const TAB_CONFIG = [
  { id: 'overview' as const, label: 'Overview', icon: BarChart3, color: 'cyan' },
  { id: 'proposals' as const, label: 'Proposals', icon: FileText, color: 'cyan' },
  { id: 'create' as const, label: 'Create Proposal', icon: Plus, color: 'emerald' },
  { id: 'council' as const, label: 'Council', icon: Crown, color: 'amber' },
  { id: 'suggestions' as const, label: 'Submit Idea', icon: Lightbulb, color: 'emerald' },
  { id: 'discussions' as const, label: 'Discussions', icon: MessageSquare, color: 'amber' },
  { id: 'members' as const, label: 'Members', icon: Users, color: 'cyan' },
  { id: 'history' as const, label: 'History', icon: History, color: 'cyan' },
  { id: 'stats' as const, label: 'Statistics', icon: BarChart3, color: 'cyan' },
] as const;

const COLOR_MAP: Record<string, { active: string; hover: string }> = {
  cyan: {
    active: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25',
    hover: 'hover:bg-cyan-500/10 hover:text-cyan-400',
  },
  emerald: {
    active: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25',
    hover: 'hover:bg-emerald-500/10 hover:text-emerald-400',
  },
  amber: {
    active: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25',
    hover: 'hover:bg-amber-500/10 hover:text-amber-400',
  },
};

// ── Loading fallback ────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-lg w-1/3" />
          <div className="h-48 bg-white/5 rounded-2xl" />
          <div className="h-48 bg-white/5 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

// ── Page component ──────────────────────────────────────────────────────────
export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { address } = useAccount();
  const { score } = useProofScore();
  const { proposalCount } = useDAOProposals();

  // ── Contract reads ──────────────────────────────────────────────────────
  const { data: activeProposalIds } = useReadContract({
    address: DAO_ADDRESS, abi: DAOABI, functionName: 'getActiveProposals',
  });

  const { data: votingPowerData } = useReadContract({
    address: DAO_ADDRESS, abi: DAOABI, functionName: 'getVotingPower',
    args: address ? [address] : undefined,
  });

  const { data: voterStats } = useReadContract({
    address: DAO_ADDRESS, abi: DAOABI, functionName: 'getVoterStats',
    args: address ? [address] : undefined,
  });

  const { data: isEligible } = useReadContract({
    address: DAO_ADDRESS, abi: DAOABI, functionName: 'isEligible',
    args: address ? [address] : undefined,
  });

  // ── Contract writes ─────────────────────────────────────────────────────
  const { writeContract, writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) { toast.success('Transaction confirmed!'); }
  }, [isSuccess]);

  const handleVote = (proposalId: bigint, support: boolean) => {
    if (DAO_ADDRESS === ZERO_ADDRESS) { toast.error('DAO contract is not configured in this environment.'); return; }
    writeContract({ address: DAO_ADDRESS, abi: DAOABI, functionName: 'vote', args: [proposalId, support] });
  };

  const handleFinalize = (proposalId: bigint) => {
    if (DAO_ADDRESS === ZERO_ADDRESS) { toast.error('DAO contract is not configured in this environment.'); return; }
    writeContract({ address: DAO_ADDRESS, abi: DAOABI, functionName: 'finalize', args: [proposalId] });
  };

  const handlePropose = async (targets: `0x${string}`[], values: bigint[], calldatas: `0x${string}`[], description: string) => {
    if (DAO_ADDRESS === ZERO_ADDRESS) { toast.error('DAO contract is not configured in this environment.'); return; }
    const target = targets[0] || ZERO_ADDRESS;
    if (target !== ZERO_ADDRESS && !isAddress(target)) { toast.error('Proposal target must be a valid address.'); return; }
    await writeContractAsync({
      address: DAO_ADDRESS, abi: DAOABI, functionName: 'propose',
      args: [0, target, values[0] || 0n, calldatas[0] || '0x' as `0x${string}`, description],
    });
  };

  // ── Derived state ───────────────────────────────────────────────────────
  const daoDeployed = DAO_ADDRESS !== ZERO_ADDRESS;
  const canPropose = (score || 0) >= 100;

  // Council data (placeholder — replace with on-chain reads when CouncilElection is deployed)
  const councilMembers = [
    { name: 'Council Member 1', address: '0x742d...bEb', role: 'Lead', tenure: '6 months', attendance: 98, votesCast: 42 },
    { name: 'Council Member 2', address: '0x1a2b...3c4d', role: 'Member', tenure: '6 months', attendance: 94, votesCast: 38 },
    { name: 'Council Member 3', address: '0x5e6f...7g8h', role: 'Member', tenure: '3 months', attendance: 91, votesCast: 31 },
  ];

  return (
    <>
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,240,255,0.08),transparent_50%)]" />
      </div>

      <div className="min-h-screen pt-20">
        {/* Hero Header */}
        <motion.section initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="py-12 border-b border-white/10 backdrop-blur-xl bg-white/2">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-sm text-purple-300 mb-4 ring-effect">
                  <Sparkles className="w-4 h-4" /> Decentralized Governance
                </motion.div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-2">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400">DAO Governance</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400">Shape the future of the VFIDE ecosystem</p>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-zinc-500 mt-3">
                  <span>Propose</span><span className="text-cyan-400">→</span><span>Vote</span><span className="text-cyan-400">→</span><span>Build</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" placeholder="Search proposals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/10 transition-all" aria-label="Notifications">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center font-bold animate-pulse">3</span>
                </motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 max-w-md ml-auto shadow-2xl">
                  <h3 className="font-bold text-white mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Bell className="w-4 h-4 text-cyan-400" /> Urgent Notifications</span>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="text-red-400 font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> 5 hours left</div>
                      <div className="text-gray-300">Security Audit proposal needs your vote</div>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <div className="text-amber-400 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" /> Quorum alert</div>
                      <div className="text-gray-300">Multi-Chain proposal at 85% quorum</div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="text-emerald-400 font-bold flex items-center gap-1"><Vote className="w-3 h-3" /> Vote confirmed</div>
                      <div className="text-gray-300">Your vote on Proposal #140 recorded</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Tab Navigation */}
        <section className="py-4 border-b border-white/5 backdrop-blur-sm bg-black/20 sticky top-16 z-40">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Governance sections">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const colors = COLOR_MAP[tab.color];
                return (
                  <motion.button key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} role="tab" aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${isActive ? colors.active : `bg-white/5 text-gray-400 ${colors.hover}`}`}>
                    <Icon className="w-4 h-4" /> {tab.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tab Content — each lazy-loaded and code-split */}
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'overview' && <OverviewTab score={score} proposalCount={proposalCount} votingPowerData={votingPowerData as readonly bigint[] | undefined} voterStats={voterStats} isEligible={isEligible as boolean | undefined} />}
          {activeTab === 'proposals' && <ProposalsTab searchQuery={searchQuery} activeProposalIds={activeProposalIds as readonly bigint[] | undefined} onVote={handleVote} onFinalize={handleFinalize} />}
          {activeTab === 'create' && <CreateProposalTab DAO_DEPLOYED={daoDeployed} canPropose={canPropose} isCreating={isWritePending} onPropose={handlePropose} />}
          {activeTab === 'council' && <CouncilTab councilMembers={councilMembers} terms={['Term 1', 'Term 2', 'Term 3']} currentTerm="Term 3" epochData={[{ epoch: 1, participation: 87, avgDecisionTime: '2.3 days', emergencyActions: 0 }, { epoch: 2, participation: 91, avgDecisionTime: '1.8 days', emergencyActions: 1 }]} electionEvents={[{ title: 'Q2 2026 Election', date: 'June 1, 2026', type: 'Upcoming', link: '#' }]} electionStats={[{ label: 'Voter Turnout', value: '73%', change: '+5%' }, { label: 'Candidates', value: '12', change: '+3' }]} />}
          {activeTab === 'suggestions' && <SuggestionsTab />}
          {activeTab === 'discussions' && <DiscussionsTab searchQuery={searchQuery} />}
          {activeTab === 'members' && <MembersTab searchQuery={searchQuery} />}
          {activeTab === 'history' && <HistoryTab searchQuery={searchQuery} />}
          {activeTab === 'stats' && <StatsTab />}
        </Suspense>
      </div>

      <Footer />
    </>
  );
}
