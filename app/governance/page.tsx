'use client';

import { Footer } from "@/components/layout/Footer";
import { DAOABI, CouncilElectionABI, SeerABI } from "@/lib/abis";
import { useState, useEffect, useMemo } from "react";
import { useProofScore, useDAOProposals } from "@/lib/vfide-hooks";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import type { Abi } from "viem";
import { isAddress } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Search, Vote, Users, Clock, Sparkles, Crown, Lightbulb, MessageSquare, History, BarChart3, FileText, Plus } from "lucide-react";
import { sanitizeString } from "@/lib/validation";
import { useCopyWithId } from "@/lib/hooks/useCopyToClipboard";
import { formatAddress } from "@/lib/utils";

// Contract address from environment
const DAO_ADDRESS = (process.env.NEXT_PUBLIC_DAO_ADDRESS || '0xB75b08C5e42da4242e218C25B6A6B05d7BeF0728') as `0x${string}`;
const COUNCIL_ELECTION_ADDRESS = (process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const SEER_ADDRESS = (process.env.NEXT_PUBLIC_SEER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const IS_COUNCIL_ELECTION_DEPLOYED = COUNCIL_ELECTION_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_SEER_DEPLOYED = SEER_ADDRESS !== '0x0000000000000000000000000000000000000000';

type TabType = 'overview' | 'proposals' | 'create' | 'council' | 'suggestions' | 'discussions' | 'members' | 'history' | 'stats';

interface Proposal {
  id: number;
  type: string;
  title: string;
  author: string;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  voted: boolean;
  description?: string;
}

function formatTimeLeft(endTimeMs: number) {
  const now = Date.now();
  const diff = endTimeMs - now;
  if (diff <= 0) return 'Ended';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m`;
}

function useCountdown(endTime: number) {
  const [timeLeft, setTimeLeft] = useState("");
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (days > 0) {
        setTimeLeft(`${days}d ${remainingHours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h`);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        setTimeLeft(`${minutes}m`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [endTime]);
  
  return timeLeft;
}

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const { address } = useAccount();
  const { score } = useProofScore();
  const { proposalCount } = useDAOProposals();

  // Contract write hooks
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  const [lastAction, setLastAction] = useState('');

  // Handle transaction success without setState in effect
  useEffect(() => {
    if (isSuccess && lastAction) {
      // Action succeeded, clear after a delay
      const timer = setTimeout(() => setLastAction(''), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isSuccess, lastAction]);

  // Read active proposals (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getActiveProposals',
  });

  // Read voting power (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getVotingPower',
    args: address ? [address] : undefined,
  });

  // Read voter stats (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getVoterStats',
    args: address ? [address] : undefined,
  });

  // Read eligibility (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'isEligible',
    args: address ? [address] : undefined,
  });

  // Vote handler - wired to ProposalsTab buttons
  const handleVote = (proposalId: number, support: boolean) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'vote',
      args: [BigInt(proposalId), support],
    });
  };

  // Finalize handler (kept for future UI use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFinalize = (proposalId: number) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'finalize',
      args: [BigInt(proposalId)],
    });
  };

  // Create proposal handler (kept for future UI use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePropose = (ptype: number, target: string, value: bigint, data: string, description: string) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'propose',
      args: [ptype, target as `0x${string}`, value, data as `0x${string}`, description],
    });
  };
  
  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,240,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
      </div>

      <main className="min-h-screen pt-20">
        {/* Hero Header */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 border-b border-white/10 backdrop-blur-xl bg-white/2"
        >
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-sm text-purple-300 mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  Decentralized Governance
                </motion.div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-2">
                  <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-cyan-400 to-emerald-400">
                    DAO Governance
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400">
                  Shape the future of the VFIDE ecosystem
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-3 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-white/10 transition-all"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-400" />
                </motion.button>
              </div>
            </div>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 max-w-md ml-auto shadow-2xl"
                >
                  <h3 className="font-bold text-white mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      Notifications
                    </span>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </h3>
                  <div className="text-sm text-center py-4 text-gray-500">
                    No active notifications
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
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3, color: 'cyan' },
                { id: 'proposals', label: 'Proposals', icon: FileText, color: 'cyan' },
                { id: 'create', label: 'Create Proposal', icon: Plus, color: 'emerald' },
                { id: 'council', label: 'Council', icon: Crown, color: 'amber' },
                { id: 'suggestions', label: 'Submit Idea', icon: Lightbulb, color: 'emerald' },
                { id: 'discussions', label: 'Discussions', icon: MessageSquare, color: 'amber' },
                { id: 'members', label: 'Members', icon: Users, color: 'cyan' },
                { id: 'history', label: 'History', icon: History, color: 'cyan' },
                { id: 'stats', label: 'Statistics', icon: BarChart3, color: 'cyan' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const colorMap: Record<string, string> = {
                  cyan: isActive ? 'bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : 'hover:bg-cyan-500/10 hover:text-cyan-400',
                  emerald: isActive ? 'bg-linear-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25' : 'hover:bg-emerald-500/10 hover:text-emerald-400',
                  amber: isActive ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' : 'hover:bg-amber-500/10 hover:text-amber-400',
                };
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                      isActive ? colorMap[tab.color] : `bg-white/5 text-gray-400 ${colorMap[tab.color]}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {activeTab === 'overview' && <OverviewTab score={score} proposalCount={proposalCount} />}
        {activeTab === 'proposals' && <ProposalsTab searchQuery={searchQuery} onVote={handleVote} />}
        {activeTab === 'create' && <CreateProposalTab />}
        {activeTab === 'council' && <CouncilTab />}
        {activeTab === 'suggestions' && <SuggestionsTab />}
        {activeTab === 'discussions' && <DiscussionsTab searchQuery={searchQuery} />}
        {activeTab === 'members' && <MembersTab searchQuery={searchQuery} />}
        {activeTab === 'history' && <HistoryTab searchQuery={searchQuery} />}
        {activeTab === 'stats' && <StatsTab />}
      </main>

      <Footer />
    </>
  );
}

function OverviewTab({ score, proposalCount }: { score?: number; proposalCount?: number }) {
  const { address } = useAccount();
  const votingPower = score || 0;
  
  return (
    <>
      <section className="py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-linear-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Your Voting Power</div>
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <Vote className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              {address ? (
                <>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-blue-400">{votingPower}</div>
                  <div className="text-gray-500 text-sm mt-1">Based on ProofScore</div>
                  <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Eligible to vote
                  </div>
                </>
              ) : (
                <div className="text-lg text-gray-500">Connect wallet</div>
              )}
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-linear-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Active Proposals</div>
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">{proposalCount || 0}</div>
              <div className="text-emerald-400 text-sm mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> On-chain data
              </div>
              <div className="mt-3 text-xs text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Vote to participate
              </div>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-linear-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Your Participation</div>
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              {address ? (
                <>
                  <div className="text-3xl font-bold text-white">&mdash;</div>
                  <div className="text-gray-500 text-sm mt-1">Connect to view</div>
                </>
              ) : (
                <div className="text-lg text-gray-500">Connect wallet</div>
              )}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-linear-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Governance Fatigue</div>
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              {address ? (
                <>
                  <div className="text-3xl font-bold text-amber-400">&mdash;</div>
                  <div className="text-gray-500 text-sm mt-1">Connect to view</div>
                </>
              ) : (
                <div className="text-lg text-gray-500">Connect wallet</div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-linear-to-br from-red-500/20 to-orange-500/20">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              Upcoming Voting Deadlines
            </h2>

            <div className="text-center py-8 text-gray-500">
              No active proposals with upcoming deadlines
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

function DeadlineCard({ id, title, hoursRemaining, voted }: { id: number; title: string; hoursRemaining: number; voted: boolean }) {
  const [endTime] = useState(() => Date.now() + hoursRemaining * 60 * 60 * 1000);
  const timeLeft = useCountdown(endTime);
  
  const urgency = hoursRemaining < 12 ? 'urgent' : hoursRemaining < 48 ? 'warning' : 'normal';
  const colorMap = {
    urgent: { border: 'border-red-500/50', bg: 'from-red-500/10 to-red-500/5', text: 'text-red-400', glow: 'shadow-red-500/20' },
    warning: { border: 'border-amber-500/50', bg: 'from-amber-500/10 to-amber-500/5', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    normal: { border: 'border-emerald-500/50', bg: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  };
  const colors = colorMap[urgency];
  
  return (
    <motion.div 
      whileHover={{ scale: 1.01, x: 4 }}
      className={`flex items-center justify-between p-4 bg-linear-to-r ${colors.bg} backdrop-blur-sm border ${colors.border} rounded-xl hover:shadow-lg ${colors.glow} transition-all`}
    >
      <div>
        <div className="text-white font-bold">{title}</div>
        <div className="text-gray-500 text-sm">Proposal #{id}</div>
      </div>
      <div className="text-right">
        <div className={`font-bold text-lg ${colors.text}`}>{timeLeft} left</div>
        <div className={`text-sm flex items-center gap-1 justify-end ${voted ? 'text-emerald-400' : 'text-gray-500'}`}>
          {voted ? (
            <>
              <Sparkles className="w-3 h-3" /> Voted FOR
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" /> Not voted
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProposalsTab({ searchQuery, onVote }: { searchQuery: string; onVote: (proposalId: number, support: boolean) => void }) {
  const { address } = useAccount();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const { data: activeProposalIds } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getActiveProposals',
  });

  const proposalIds = useMemo(
    () => (Array.isArray(activeProposalIds) ? activeProposalIds : []),
    [activeProposalIds]
  );

  const { data: proposalDetails } = useReadContracts({
    contracts: proposalIds.map((id) => ({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'getProposalDetails',
      args: [id],
    })),
    query: { enabled: proposalIds.length > 0 },
  });

  const { data: votedResults } = useReadContracts({
    contracts: address
      ? proposalIds.map((id) => ({
          address: DAO_ADDRESS,
          abi: DAOABI,
          functionName: 'hasVoted',
          args: [id, address],
        }))
      : [],
    query: { enabled: proposalIds.length > 0 && !!address },
  });

  const proposals = useMemo(() => {
    if (!proposalDetails || proposalIds.length === 0) return [];

    return proposalIds
      .map((id, idx) => {
        const details = proposalDetails[idx]?.result as
          | [string, bigint, string, bigint, string, bigint, bigint, bigint, bigint, boolean, boolean]
          | undefined;

        if (!details) return null;

        const [proposer, ptype, , , description, , endTime, forVotes, againstVotes] = details;

        const title = description?.split('\n')[0]?.slice(0, 120) || `Proposal #${id.toString()}`;
        const type =
          Number(ptype) === 1
            ? 'TREASURY'
            : Number(ptype) === 2
              ? 'UPGRADE'
              : Number(ptype) === 3
                ? 'SECURITY'
                : 'GENERIC';

        return {
          id: Number(id),
          type,
          title,
          author: proposer,
          endTime: Number(endTime) * 1000,
          forVotes: Number(forVotes),
          againstVotes: Number(againstVotes),
          voted: Boolean(votedResults?.[idx]?.result),
          description,
        } as Proposal;
      })
      .filter(Boolean) as Proposal[];
  }, [proposalDetails, proposalIds, votedResults]);
  
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery);
      const matchesType = filterType === 'all' || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType, proposals]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-zinc-100">
                Active Proposals ({filteredProposals.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const csv = 'ID,Type,Title,For Votes,Against Votes\n' + 
                      filteredProposals.map(p => `${p.id},${p.type},"${p.title}",${p.forVotes},${p.againstVotes}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'proposals.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400 transition-colors"
                >
                  📊 Export CSV
                </button>
                <button className="px-6 py-2 bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform">
                  Create Proposal
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'GENERIC', 'TREASURY', 'UPGRADE', 'SECURITY'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                    filterType === type
                      ? 'bg-cyan-400 text-zinc-900'
                      : 'bg-zinc-900 text-zinc-400 hover:text-cyan-400'
                  }`}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                No proposals found matching your search.
              </div>
            ) : null}
            {filteredProposals.map(prop => {
              const total = prop.forVotes + prop.againstVotes;
              const forPercent = Math.round((prop.forVotes / total) * 100);
              
              return (
                <div key={prop.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 hover:border-cyan-400 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">
                        {prop.type}
                      </div>
                      <h3 className="text-xl font-bold text-zinc-100 mb-2">{prop.title}</h3>
                      <p className="text-zinc-400 text-sm">Proposed by {prop.author} • Ends in {formatTimeLeft(prop.endTime)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-zinc-100">#{prop.id}</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-emerald-500">FOR: {prop.forVotes.toLocaleString()} votes ({forPercent}%)</span>
                      <span className="text-red-600">AGAINST: {prop.againstVotes.toLocaleString()} votes ({100-forPercent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${forPercent}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      Quorum: {total.toLocaleString()} / 5,000 {total >= 5000 ? '✓' : '✗'}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => onVote(prop.id, true)}
                      className="flex-1 px-4 py-2 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90"
                    >
                      Vote FOR
                    </button>
                    <button 
                      onClick={() => onVote(prop.id, false)}
                      className="flex-1 px-4 py-2 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90"
                    >
                      Vote AGAINST
                    </button>
                    <button
                      onClick={() => setSelectedProposal(prop)}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-lg hover:text-cyan-400 hover:border-cyan-400"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProposal(null)}>
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded text-cyan-400 text-sm font-bold mb-2">
                  {selectedProposal.type}
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">#{selectedProposal.id}: {selectedProposal.title}</h2>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="text-zinc-400 hover:text-cyan-400 text-2xl">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <div className="text-zinc-400 text-sm mb-1">Proposed by</div>
                <div className="text-zinc-100 font-mono">{selectedProposal.author}</div>
              </div>
              
              <div>
                <div className="text-zinc-400 text-sm mb-1">Time Remaining</div>
                <ProposalCountdown endTime={selectedProposal.endTime} />
              </div>
              
              <div>
                <div className="text-zinc-400 text-sm mb-2">Description</div>
                <div className="text-zinc-100 bg-zinc-900 p-4 rounded-lg">
                  {selectedProposal.description}
                </div>
              </div>
              
              <div>
                <div className="text-zinc-400 text-sm mb-2">Voting Results</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-500">FOR: {selectedProposal.forVotes.toLocaleString()} votes</span>
                    <span className="text-red-600">AGAINST: {selectedProposal.againstVotes.toLocaleString()} votes</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(selectedProposal.forVotes / (selectedProposal.forVotes + selectedProposal.againstVotes)) * 100}%` }} />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => { onVote(selectedProposal.id, true); setSelectedProposal(null); }}
                  className="flex-1 px-6 py-3 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-emerald-500/90"
                >
                  Vote FOR
                </button>
                <button 
                  onClick={() => { onVote(selectedProposal.id, false); setSelectedProposal(null); }}
                  className="flex-1 px-6 py-3 bg-red-600 text-zinc-100 rounded-lg font-bold hover:bg-red-600/90"
                >
                  Vote AGAINST
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ProposalCountdown({ endTime }: { endTime: number }) {
  const timeLeft = useCountdown(endTime);
  return <div className="text-cyan-400 font-bold text-lg">{timeLeft}</div>;
}

function MembersTab({ searchQuery }: { searchQuery: string }) {
  const [sortBy] = useState<'score' | 'votes' | 'participation'>('score');
  
  const filteredMembers = useMemo(() => {
    const members: Array<{ address: string; score: number; votes: number; participation: number; fatigue: number; lastVote: string }> = [];
    
    const filtered = members.filter(m => 
      searchQuery === '' || m.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (sortBy === 'score') return filtered.sort((a, b) => b.score - a.score);
    if (sortBy === 'votes') return filtered.sort((a, b) => b.votes - a.votes);
    if (sortBy === 'participation') return filtered.sort((a, b) => b.participation - a.participation);
    return filtered;
  }, [searchQuery, sortBy]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-zinc-100">
                DAO Members & Voting Activity
              </h2>
              <button
                onClick={() => {
                  const csv = 'Address,Score,Votes,Participation,Fatigue\n' + 
                    filteredMembers.map(m => `${m.address},${m.score},${m.votes},${m.participation},${m.fatigue}`).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'members.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400"
                disabled={filteredMembers.length === 0}
              >
                📊 Export CSV
              </button>
            </div>
            
            {filteredMembers.length === 0 ? (
              <div className="mt-6">
                <div className="text-center text-zinc-400 py-10">
                  Member analytics require an indexer. No on-chain member roster is available yet.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-zinc-400 border-b border-zinc-700">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4 text-right">Score</th>
                      <th className="py-3 px-4 text-right">Votes</th>
                      <th className="py-3 px-4 text-right">Participation</th>
                      <th className="py-3 px-4 text-right">Fatigue</th>
                      <th className="py-3 px-4 text-right">Last Vote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.address} className="border-b border-zinc-800">
                        <td className="py-4 px-4 text-zinc-100 font-mono text-xs sm:text-sm">
                          {member.address}
                        </td>
                        <td className="py-4 px-4 text-right text-zinc-300">{member.score}</td>
                        <td className="py-4 px-4 text-right text-zinc-300">{member.votes}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={member.participation > 70 ? 'text-emerald-400' : 'text-zinc-400'}>
                            {member.participation}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={member.fatigue > 40 ? 'text-orange-500' : 'text-zinc-400'}>
                            {member.fatigue}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-zinc-400 text-sm">{member.lastVote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-zinc-900 rounded-lg">
            <h3 className="text-lg font-bold text-zinc-100 mb-3">Governance Fatigue Explanation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-400">
              <div>
                <div className="text-cyan-400 font-bold mb-1">How it Works</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Each vote costs 5% fatigue</li>
                  <li>Fatigue reduces your effective voting power</li>
                  <li>Recovers 5% per day (natural restoration)</li>
                  <li>Prevents spam voting</li>
                </ul>
              </div>
              <div>
                <div className="text-cyan-400 font-bold mb-1">Example</div>
                <div className="space-y-1">
                  <div>ProofScore: 800 → Voting Power: 800</div>
                  <div>After 1 vote: 5% fatigue → Power: 760</div>
                  <div>After 5 votes: 25% fatigue → Power: 600</div>
                  <div>After 1 day rest: 20% fatigue → Power: 640</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HistoryTab({ searchQuery }: { searchQuery: string }) {
  const { address } = useAccount();
  const { data: voterHistory } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getVoterHistory',
    args: address ? [address] : undefined,
  });

  const historyIds = useMemo(() => (Array.isArray(voterHistory) ? voterHistory : []), [voterHistory]);

  const { data: historyDetails } = useReadContracts({
    contracts: historyIds.map((id) => ({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'getProposalDetails',
      args: [id],
    })),
    query: { enabled: historyIds.length > 0 },
  });

  const { data: historyStatuses } = useReadContracts({
    contracts: historyIds.map((id) => ({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'getProposalStatus',
      args: [id],
    })),
    query: { enabled: historyIds.length > 0 },
  });

  const filteredHistory = useMemo(() => {
    const history = historyIds
      .map((id, idx) => {
        const details = historyDetails?.[idx]?.result as
          | [string, bigint, string, bigint, string, bigint, bigint, bigint, bigint, boolean, boolean]
          | undefined;
        const status = historyStatuses?.[idx]?.result as [string, boolean, boolean, bigint] | undefined;
        if (!details) return null;

        const [, , , , description, , endTime] = details;
        const title = description?.split('\n')[0]?.slice(0, 120) || `Proposal #${id.toString()}`;
        const date = endTime ? new Date(Number(endTime) * 1000).toLocaleDateString() : 'Unknown';
        const result = status?.[0] ?? 'Unknown';

        return {
          id: Number(id),
          title,
          date,
          result,
        };
      })
      .filter(Boolean) as { id: number; title: string; date: string; result: string }[];

    return history.filter((h) =>
      searchQuery === '' ||
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.id.toString().includes(searchQuery)
    );
  }, [historyIds, historyDetails, historyStatuses, searchQuery]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-100">
              Your Voting History ({filteredHistory.length})
            </h2>
            <button
              onClick={() => {
                const csv = 'ID,Title,Date,Result\n' + 
                  filteredHistory.map(h => `${h.id},"${h.title}","${h.date}","${h.result}"`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'voting-history.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg font-bold hover:border-cyan-400"
            >
              📊 Export CSV
            </button>
          </div>
          
          <div className="space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                No voting history found matching your search.
              </div>
            ) : null}
            {filteredHistory.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg hover:border hover:border-zinc-700">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-zinc-400 text-sm">#{item.id}</span>
                    <span className="text-zinc-100 font-bold">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-500">Vote recorded</span>
                    <span className="text-zinc-400">{item.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${item.result.includes('Executed') || item.result.includes('Queued') || item.result.includes('Ended') ? 'text-emerald-500' : item.result.includes('Failed') || item.result.includes('Rejected') ? 'text-red-600' : 'text-orange-500'}`}>
                    {item.result}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsTab() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">
              DAO Statistics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Proposals</span>
                <span className="text-zinc-100 font-bold text-2xl">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Passed Proposals</span>
                <span className="text-emerald-500 font-bold text-2xl">128 (82%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Rejected Proposals</span>
                <span className="text-red-600 font-bold text-2xl">28 (18%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Active Members</span>
                <span className="text-zinc-100 font-bold text-2xl">247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Average Participation</span>
                <span className="text-zinc-100 font-bold text-2xl">73%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Votes Cast</span>
                <span className="text-zinc-100 font-bold text-2xl">4,234</span>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">
              Proposal Categories
            </h2>
            <div className="space-y-4">
              {[
                { name: 'Parameter Changes', count: 42, percent: 27 },
                { name: 'Treasury Allocations', count: 38, percent: 24 },
                { name: 'Protocol Upgrades', count: 31, percent: 20 },
                { name: 'Council Elections', count: 24, percent: 15 },
                { name: 'Emergency Actions', count: 12, percent: 8 },
                { name: 'Other', count: 9, percent: 6 }
              ].map(cat => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-100">{cat.name}</span>
                    <span className="text-zinc-400">{cat.count} ({cat.percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">
              Recent Pass/Fail Rate
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-zinc-400 text-sm mb-2">Last 30 Days</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-emerald-500 rounded flex items-center justify-center text-zinc-900 font-bold">
                    18 Passed
                  </div>
                  <div className="w-20 h-12 bg-red-600 rounded flex items-center justify-center text-zinc-100 font-bold">
                    4 Failed
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-zinc-400 text-sm mb-2">Last 90 Days</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-emerald-500 rounded flex items-center justify-center text-zinc-900 font-bold">
                    52 Passed
                  </div>
                  <div className="w-20 h-12 bg-red-600 rounded flex items-center justify-center text-zinc-100 font-bold">
                    11 Failed
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-zinc-400 text-sm mb-2">All Time</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-emerald-500 rounded flex items-center justify-center text-zinc-900 font-bold">
                    128 Passed
                  </div>
                  <div className="w-20 h-12 bg-red-600 rounded flex items-center justify-center text-zinc-100 font-bold">
                    28 Failed
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">
              Top Voters (This Month)
            </h2>
            <div className="space-y-3">
              {[
                { rank: 1, address: '0x742d...bEb', votes: 18, score: 945 },
                { rank: 2, address: '0x1a2b...3c4d', votes: 17, score: 892 },
                { rank: 3, address: '0x5e6f...7g8h', votes: 16, score: 845 },
                { rank: 4, address: '0x9i0j...1k2l', votes: 15, score: 823 },
                { rank: 5, address: '0x3m4n...5o6p', votes: 14, score: 801 }
              ].map(voter => (
                <div key={voter.rank} className="flex items-center justify-between p-3 bg-zinc-900 rounded">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      voter.rank === 1 ? 'bg-amber-400 text-zinc-900' :
                      voter.rank === 2 ? 'bg-zinc-400 text-zinc-900' :
                      voter.rank === 3 ? 'bg-amber-600 text-zinc-900' :
                      'bg-zinc-700 text-zinc-400'
                    }`}>
                      {voter.rank}
                    </div>
                    <div>
                      <div className="text-zinc-100 font-mono text-sm">{voter.address}</div>
                      <div className="text-zinc-400 text-xs">Score: {voter.score}</div>
                    </div>
                  </div>
                  <div className="text-cyan-400 font-bold">{voter.votes} votes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// SUGGESTIONS TAB - Anyone can submit ideas
// ============================================

interface SuggestionComment {
  id: number;
  author: string;
  authorScore: number;
  content: string;
  timestamp: string;
  likes: number;
}

interface Suggestion {
  id: number;
  title: string;
  description: string;
  category: string;
  author: string;
  authorScore: number;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  comments: SuggestionComment[];
  status: 'new' | 'reviewing' | 'approved' | 'rejected' | 'implemented';
  votedBy: string[]; // Track who voted to prevent double voting
}

// Threshold for auto-promotion to official proposal
const PROMOTION_THRESHOLD = 50;

function SuggestionsTab() {
  const { address, isConnected } = useAccount();
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const { copiedId, copyWithId } = useCopyWithId();
  const [newSuggestion, setNewSuggestion] = useState({
    title: '',
    description: '',
    category: 'feature'
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewing' | 'approved'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular');

  const storageKey = `vfide_governance_suggestions_${address ?? 'public'}`;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const stored = localStorage.getItem(storageKey);
      const nextSuggestions = !stored
        ? []
        : (() => {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
          })();
      timer = setTimeout(() => {
        setSuggestions(nextSuggestions);
      }, 0);
      if (!stored) {
        return;
      }
    } catch {
      timer = setTimeout(() => {
        setSuggestions([]);
      }, 0);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [storageKey]);

  const persistSuggestions = (updated: Suggestion[]) => {
    setSuggestions(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const handleSubmit = () => {
    if (!newSuggestion.title.trim() || !newSuggestion.description.trim()) return;
    
    // Sanitize user inputs to prevent XSS
    const sanitizedTitle = sanitizeString(newSuggestion.title, 100);
    const sanitizedDescription = sanitizeString(newSuggestion.description, 2000);
    
    const suggestion: Suggestion = {
      id: suggestions.length + 1,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: newSuggestion.category,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
      authorScore: 500,
      timestamp: 'Just now',
      upvotes: 0,
      downvotes: 0,
      comments: [],
      status: 'new',
      votedBy: []
    };
    
    persistSuggestions([suggestion, ...suggestions]);
    setNewSuggestion({ title: '', description: '', category: 'feature' });
    setShowSubmitForm(false);
  };

  const handleVote = (id: number, isUpvote: boolean) => {
    const voterKey = address || 'anonymous';
    persistSuggestions(suggestions.map(s => {
      if (s.id !== id) return s;
      // Prevent double voting (in production, this would be on-chain)
      if (s.votedBy.includes(voterKey)) {
        return s; // Already voted
      }
      const newScore = s.upvotes - s.downvotes + (isUpvote ? 1 : -1);
      // Auto-promote to reviewing if hits threshold
      const newStatus = s.status === 'new' && newScore >= PROMOTION_THRESHOLD ? 'reviewing' : s.status;
      return {
        ...s,
        upvotes: s.upvotes + (isUpvote ? 1 : 0),
        downvotes: s.downvotes + (isUpvote ? 0 : 1),
        votedBy: [...s.votedBy, voterKey],
        status: newStatus
      };
    }));
  };

  const handleAddComment = (suggestionId: number) => {
    if (!newComment.trim()) return;
    
    // Sanitize comment input to prevent XSS
    const sanitizedComment = sanitizeString(newComment, 500);
    
    persistSuggestions(suggestions.map(s => {
      if (s.id !== suggestionId) return s;
      const comment: SuggestionComment = {
        id: s.comments.length + 1,
        author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
        authorScore: 500,
        content: sanitizedComment,
        timestamp: 'Just now',
        likes: 0
      };
      return { ...s, comments: [...s.comments, comment] };
    }));
    setNewComment('');
  };

  const handleShare = (suggestion: Suggestion) => {
    const shareUrl = `${window.location.origin}/governance?suggestion=${suggestion.id}`;
    copyWithId(String(suggestion.id), shareUrl);
  };

  const filteredSuggestions = suggestions
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => sortBy === 'popular' ? (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes) : 0);

  const statusColors = {
    new: 'bg-cyan-400/20 text-cyan-400 border-cyan-400',
    reviewing: 'bg-amber-400/20 text-amber-400 border-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-500 border-emerald-500',
    rejected: 'bg-red-600/20 text-red-600 border-red-600',
    implemented: 'bg-purple-500/20 text-purple-500 border-purple-500'
  };

  const categoryIcons: Record<string, string> = {
    feature: '🚀',
    economics: '💰',
    security: '🛡️',
    governance: '⚖️',
    other: '💡'
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Header with Submit Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">💡 Community Suggestions</h2>
            <p className="text-zinc-400">Anyone can submit ideas. Reach {PROMOTION_THRESHOLD}+ votes to become an official proposal!</p>
          </div>
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="px-6 py-3 bg-linear-to-r from-emerald-500 to-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all"
          >
            {showSubmitForm ? '✕ Cancel' : '+ Submit Idea'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search suggestions..."
              className="w-full md:w-96 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Submit Form */}
        {showSubmitForm && (
          <div className="bg-zinc-800 border border-emerald-500 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">📝 Submit Your Idea</h3>
            
            {!isConnected && (
              <div className="bg-amber-400/20 border border-amber-400 rounded-lg p-4 mb-4">
                <p className="text-amber-400">⚠️ Connect your wallet to submit suggestions with your identity. Anonymous submissions are also allowed.</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Title *</label>
                <input
                  type="text"
                  value={newSuggestion.title}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                  placeholder="Brief, descriptive title for your idea..."
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-emerald-500 focus:outline-none"
                  maxLength={100}
                />
                <div className="text-right text-xs text-zinc-400 mt-1">{newSuggestion.title.length}/100</div>
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Category</label>
                <select
                  value={newSuggestion.category}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="feature">🚀 New Feature</option>
                  <option value="economics">💰 Token Economics</option>
                  <option value="security">🛡️ Security</option>
                  <option value="governance">⚖️ Governance</option>
                  <option value="other">💡 Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Description *</label>
                <textarea
                  value={newSuggestion.description}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                  placeholder="Explain your idea in detail. What problem does it solve? How would it work?"
                  rows={5}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-emerald-500 focus:outline-none resize-none"
                  maxLength={2000}
                />
                <div className="text-right text-xs text-zinc-400 mt-1">{newSuggestion.description.length}/2000</div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newSuggestion.title.trim() || !newSuggestion.description.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 Submit Suggestion
                </button>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-3 bg-zinc-700 text-zinc-400 font-bold rounded-lg hover:text-zinc-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'new', 'reviewing', 'approved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  filter === f
                    ? 'bg-cyan-400 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:text-cyan-400'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
          >
            <option value="popular">🔥 Most Popular</option>
            <option value="recent">🕐 Most Recent</option>
          </select>
        </div>

        {/* Suggestions List */}
        <div className="space-y-4">
          {filteredSuggestions.map(suggestion => {
            const score = suggestion.upvotes - suggestion.downvotes;
            const progressToPromotion = Math.min(100, (score / PROMOTION_THRESHOLD) * 100);
            const hasVoted = suggestion.votedBy.includes(address || 'anonymous');
            const isExpanded = expandedId === suggestion.id;
            
            return (
              <div key={suggestion.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all">
                <div className="flex gap-4">
                  {/* Vote Column */}
                  <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
                    <button
                      onClick={() => handleVote(suggestion.id, true)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted 
                          ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' 
                          : 'bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500'
                      }`}
                    >
                      ▲
                    </button>
                    <div className={`text-lg font-bold ${
                      score > 0 ? 'text-emerald-500' : score < 0 ? 'text-red-600' : 'text-zinc-400'
                    }`}>
                      {score}
                    </div>
                    <button
                      onClick={() => handleVote(suggestion.id, false)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted 
                          ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' 
                          : 'bg-zinc-900 hover:bg-red-600/20 text-zinc-400 hover:text-red-600'
                      }`}
                    >
                      ▼
                    </button>
                    {hasVoted && <span className="text-zinc-400 text-xs">voted</span>}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded border ${statusColors[suggestion.status]}`}>
                        {suggestion.status.toUpperCase()}
                      </span>
                      <span className="text-lg">{categoryIcons[suggestion.category]}</span>
                      <span className="text-zinc-400 text-sm">{suggestion.category}</span>
                      {suggestion.status === 'new' && score > 0 && (
                        <span className="text-xs text-amber-400">
                          🎯 {Math.round(progressToPromotion)}% to proposal
                        </span>
                      )}
                    </div>
                    
                    {/* Progress bar for new suggestions */}
                    {suggestion.status === 'new' && score > 0 && (
                      <div className="w-full h-1 bg-zinc-700 rounded-full mb-3 overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${progressToPromotion}%` }}
                        />
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{suggestion.title}</h3>
                    <p className={`text-zinc-400 mb-4 ${isExpanded ? '' : 'line-clamp-2'}`}>{suggestion.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-zinc-400">
                        by <span className="text-cyan-400 font-mono">{suggestion.author}</span>
                        <span className="text-emerald-500 ml-1">(Score: {suggestion.authorScore})</span>
                      </span>
                      <span className="text-zinc-400">• {suggestion.timestamp}</span>
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                        className="text-zinc-400 hover:text-cyan-400 transition-all"
                      >
                        💬 {suggestion.comments.length} comments {isExpanded ? '▲' : '▼'}
                      </button>
                      <button 
                        onClick={() => handleShare(suggestion)}
                        className="text-zinc-400 hover:text-cyan-400 transition-all"
                      >
                        {copiedId === suggestion.id ? '✓ Copied!' : '🔗 Share'}
                      </button>
                    </div>
                    
                    {/* Expanded Comments Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <div className="space-y-3 mb-4">
                          {suggestion.comments.length === 0 ? (
                            <p className="text-zinc-400 text-sm italic">No comments yet. Be the first!</p>
                          ) : (
                            suggestion.comments.map(comment => (
                              <div key={comment.id} className="bg-zinc-900 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-cyan-400 font-mono">{comment.author}</span>
                                    <span className="text-emerald-500 text-xs">(Score: {comment.authorScore})</span>
                                    <span className="text-zinc-400">• {comment.timestamp}</span>
                                  </div>
                                  <button className="text-zinc-400 hover:text-red-600 text-xs">❤️ {comment.likes}</button>
                                </div>
                                <p className="text-zinc-100 text-sm">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {/* Add Comment */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            maxLength={500}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(suggestion.id)}
                          />
                          <button
                            onClick={() => handleAddComment(suggestion.id)}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <div className="text-4xl mb-4">💡</div>
            <p>No suggestions found. Be the first to submit an idea!</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================
// DISCUSSIONS TAB - Community forum
// ============================================

interface Discussion {
  id: number;
  title: string;
  author: string;
  authorScore: number;
  timestamp: string;
  replies: number;
  views: number;
  lastReply: string;
  isPinned: boolean;
  category: 'general' | 'proposals' | 'support' | 'ideas' | 'announcements';
  preview: string;
}

interface Reply {
  id: number;
  author: string;
  authorScore: number;
  content: string;
  timestamp: string;
  likes: number;
}

function DiscussionsTab({ searchQuery }: { searchQuery: string }) {
  const { address, isConnected } = useAccount();
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'general' });
  const [newReply, setNewReply] = useState('');
  const [category, setCategory] = useState<'all' | Discussion['category']>('all');
  
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  const [replies, setReplies] = useState<Reply[]>([]);

  const discussionsKey = `vfide_governance_discussions_${address ?? 'public'}`;
  const repliesKey = `vfide_governance_discussion_replies_${address ?? 'public'}`;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const defer = (callback: () => void) => {
      const timer = setTimeout(callback, 0);
      timers.push(timer);
    };

    try {
      const stored = localStorage.getItem(discussionsKey);
      const parsedDiscussions = stored ? (JSON.parse(stored) as Discussion[]) : [];
      defer(() => setDiscussions(parsedDiscussions));
    } catch {
      defer(() => setDiscussions([]));
    }

    try {
      const storedReplies = localStorage.getItem(repliesKey);
      const parsedReplies = storedReplies ? (JSON.parse(storedReplies) as Reply[]) : [];
      defer(() => setReplies(parsedReplies));
    } catch {
      defer(() => setReplies([]));
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [discussionsKey, repliesKey]);

  const persistDiscussions = (updated: Discussion[]) => {
    setDiscussions(updated);
    try {
      localStorage.setItem(discussionsKey, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const persistReplies = (updated: Reply[]) => {
    setReplies(updated);
    try {
      localStorage.setItem(repliesKey, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  const handleNewThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim()) return;
    
    // Sanitize user inputs to prevent XSS
    const sanitizedTitle = sanitizeString(newThread.title, 100);
    const sanitizedContent = sanitizeString(newThread.content, 2000);
    
    const thread: Discussion = {
      id: discussions.length + 1,
      title: sanitizedTitle,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
      authorScore: 500,
      timestamp: 'Just now',
      replies: 0,
      views: 1,
      lastReply: '-',
      isPinned: false,
      category: newThread.category as Discussion['category'],
      preview: sanitizedContent.slice(0, 150) + '...'
    };
    
    persistDiscussions([thread, ...discussions]);
    setNewThread({ title: '', content: '', category: 'general' });
    setShowNewThread(false);
  };

  const handleReply = () => {
    if (!newReply.trim()) return;
    
    // Sanitize reply content to prevent XSS
    const sanitizedReply = sanitizeString(newReply, 1000);
    
    const reply: Reply = {
      id: replies.length + 1,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
      authorScore: 500,
      content: sanitizedReply,
      timestamp: 'Just now',
      likes: 0
    };
    
    persistReplies([...replies, reply]);
    setNewReply('');
    
    // Update discussion reply count
    if (selectedDiscussion) {
      persistDiscussions(discussions.map(d => 
        d.id === selectedDiscussion.id 
          ? { ...d, replies: d.replies + 1, lastReply: 'Just now' }
          : d
      ));
    }
  };

  const categoryColors = {
    general: 'bg-zinc-400/20 text-zinc-400 border-zinc-400',
    proposals: 'bg-cyan-400/20 text-cyan-400 border-cyan-400',
    support: 'bg-amber-400/20 text-amber-400 border-amber-400',
    ideas: 'bg-emerald-500/20 text-emerald-500 border-emerald-500',
    announcements: 'bg-purple-500/20 text-purple-500 border-purple-500'
  };

  const filteredDiscussions = discussions
    .filter(d => category === 'all' || d.category === category)
    .filter(d => !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  // Discussion Detail View
  if (selectedDiscussion) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <button
            onClick={() => setSelectedDiscussion(null)}
            className="mb-4 text-cyan-400 hover:underline flex items-center gap-2"
          >
            ← Back to Discussions
          </button>
          
          {/* Thread Header */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              {selectedDiscussion.isPinned && <span className="text-amber-400">📌</span>}
              <span className={`px-2 py-1 text-xs rounded border ${categoryColors[selectedDiscussion.category]}`}>
                {selectedDiscussion.category.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-4">{selectedDiscussion.title}</h1>
            <p className="text-zinc-400 mb-4">{selectedDiscussion.preview}</p>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span>by <span className="text-cyan-400 font-mono">{selectedDiscussion.author}</span></span>
              <span>• {selectedDiscussion.timestamp}</span>
              <span>• 👁 {selectedDiscussion.views} views</span>
            </div>
          </div>
          
          {/* Replies */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-zinc-100">💬 {replies.length} Replies</h2>
            {replies.map(reply => (
              <div key={reply.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-mono">{reply.author}</span>
                    <span className="text-emerald-500 text-xs">(Score: {reply.authorScore})</span>
                    <span className="text-zinc-400 text-sm">• {reply.timestamp}</span>
                  </div>
                  <button className="text-zinc-400 hover:text-cyan-400 text-sm">
                    ❤️ {reply.likes}
                  </button>
                </div>
                <p className="text-zinc-100">{reply.content}</p>
              </div>
            ))}
          </div>
          
          {/* Reply Form */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-zinc-100 mb-4">Reply to this discussion</h3>
            {!isConnected && (
              <div className="bg-amber-400/20 border border-amber-400 rounded-lg p-3 mb-4 text-sm text-amber-400">
                ⚠️ Connect your wallet to reply with your identity
              </div>
            )}
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none resize-none mb-4"
            />
            <button
              onClick={handleReply}
              disabled={!newReply.trim()}
              className="px-6 py-3 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              💬 Post Reply
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Discussions List View
  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">💬 Community Discussions</h2>
            <p className="text-zinc-400">Discuss proposals, share ideas, and connect with the community.</p>
          </div>
          <button
            onClick={() => setShowNewThread(!showNewThread)}
            className="px-6 py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all"
          >
            {showNewThread ? '✕ Cancel' : '+ New Discussion'}
          </button>
        </div>

        {/* New Thread Form */}
        {showNewThread && (
          <div className="bg-zinc-800 border border-cyan-400 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">📝 Start a New Discussion</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-zinc-400 text-sm mb-2">Title *</label>
                  <input
                    type="text"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    placeholder="Discussion topic..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-zinc-400 text-sm mb-2">Category</label>
                  <select
                    value={newThread.category}
                    onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="proposals">Proposals</option>
                    <option value="support">Support</option>
                    <option value="ideas">Ideas</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Content *</label>
                <textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="What would you like to discuss?"
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>
              
              <button
                onClick={handleNewThread}
                disabled={!newThread.title.trim() || !newThread.content.trim()}
                className="px-6 py-3 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                🚀 Start Discussion
              </button>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['all', 'announcements', 'proposals', 'general', 'ideas', 'support'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-cyan-400 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-cyan-400'
              }`}
            >
              {cat === 'all' ? '📋 All' : 
               cat === 'announcements' ? '📢 Announcements' :
               cat === 'proposals' ? '📜 Proposals' :
               cat === 'general' ? '💬 General' :
               cat === 'ideas' ? '💡 Ideas' : '🆘 Support'}
            </button>
          ))}
        </div>

        {/* Discussions List */}
        <div className="space-y-3">
          {filteredDiscussions.map(discussion => (
            <div
              key={discussion.id}
              onClick={() => setSelectedDiscussion(discussion)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-cyan-400/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.isPinned && <span className="text-amber-400">📌</span>}
                    <span className={`px-2 py-1 text-xs rounded border ${categoryColors[discussion.category]}`}>
                      {discussion.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-1 hover:text-cyan-400 transition-colors">
                    {discussion.title}
                  </h3>
                  <p className="text-zinc-400 text-sm line-clamp-1 mb-2">{discussion.preview}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span>by <span className="text-cyan-400">{discussion.author}</span></span>
                    <span>• {discussion.timestamp}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-cyan-400 font-bold">{discussion.replies}</div>
                  <div className="text-zinc-400 text-xs">replies</div>
                  <div className="text-zinc-400 text-xs mt-1">👁 {discussion.views}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDiscussions.length === 0 && (
          <div className="text-center py-12 text-zinc-400">
            <div className="text-4xl mb-4">💬</div>
            <p>No discussions found. Start a new conversation!</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ========== CREATE PROPOSAL TAB ==========
  function CreateProposalTab() {
    const { isConnected } = useAccount();
  const { score } = useProofScore();
  const [proposalType, setProposalType] = useState<'parameter' | 'treasury' | 'upgrade' | 'other'>('parameter');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetContract: '',
    calldata: '',
    treasuryAmount: '',
    treasuryRecipient: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiredScore = 100; // Minimum ProofScore to create proposals
  const canCreate = (score || 0) >= requiredScore;

  // Get writeContract hook for proposal submission
  const { writeContractAsync } = useWriteContract();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !isConnected) return;
    
    // Sanitize form data to prevent XSS
    const sanitizedTitle = sanitizeString(formData.title, 100);
    const sanitizedDescription = sanitizeString(formData.description, 2000);
    
    // Map proposal type to contract enum
    const ptypeMap: Record<string, number> = {
      'parameter': 0,
      'treasury': 1,
      'upgrade': 2,
      'other': 3
    };
    const ptype = ptypeMap[proposalType] ?? 3;
    
    // Set target and value based on proposal type
    let target: `0x${string}` = '0x0000000000000000000000000000000000000000';
    let value = 0n;
    let calldata: `0x${string}` = '0x';

    if (proposalType === 'treasury') {
      if (!formData.treasuryRecipient) {
        alert('Treasury recipient is required.');
        return;
      }
      target = formData.treasuryRecipient as `0x${string}`;
      value = formData.treasuryAmount
        ? BigInt(Math.floor(parseFloat(formData.treasuryAmount) * 1e18))
        : 0n;
    }

    if (proposalType === 'parameter' || proposalType === 'upgrade') {
      if (formData.targetContract) {
        if (!isAddress(formData.targetContract)) {
          alert('Target contract address is invalid.');
          return;
        }
        target = formData.targetContract as `0x${string}`;
      }
      if (formData.calldata) {
        if (!formData.calldata.startsWith('0x')) {
          alert('Calldata must be hex prefixed with 0x.');
          return;
        }
        calldata = formData.calldata as `0x${string}`;
      }
    }
    
    setIsSubmitting(true);
    try {
      await writeContractAsync({
        address: DAO_ADDRESS,
        abi: DAOABI,
        functionName: 'propose',
        args: [ptype, target, value, calldata, `${sanitizedTitle}\n\n${sanitizedDescription}`],
      });
      alert('Proposal submitted! It will appear in Active Proposals after confirmation.');
      // Reset form
      setFormData({ title: '', description: '', targetContract: '', calldata: '', treasuryAmount: '', treasuryRecipient: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        alert('Failed to submit proposal: ' + message.slice(0, 100));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Connect Wallet</h2>
            <p className="text-zinc-400">You need to connect your wallet to create proposals</p>
          </div>
        </div>
      </section>
    );
  }

  if (!canCreate) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="bg-zinc-800 border border-red-600 rounded-xl p-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Insufficient ProofScore</h2>
            <p className="text-zinc-400 mb-4">
              You need at least <span className="text-cyan-400 font-bold">{requiredScore} ProofScore</span> to create proposals.
            </p>
            <p className="text-zinc-400">
              Your current score: <span className="text-amber-400 font-bold">{score || 0}</span>
            </p>
            <div className="mt-6 text-sm text-zinc-400">
              Increase your score by holding VFIDE, being active, and maintaining good standing.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-3">
            ✏️ Create New Proposal
          </h2>

          {/* Proposal Type Selection */}
          <div className="mb-6">
            <label className="block text-zinc-400 text-sm mb-3">Proposal Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'parameter' as const, label: 'Parameter Change', icon: '⚙️' },
                { id: 'treasury' as const, label: 'Treasury Spend', icon: '💰' },
                { id: 'upgrade' as const, label: 'Contract Upgrade', icon: '🔧' },
                { id: 'other' as const, label: 'Other', icon: '📋' },
              ].map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setProposalType(type.id)}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    proposalType === type.id
                      ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-cyan-400/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-bold">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-zinc-400 text-sm mb-2">Proposal Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Reduce burn fee from 2% to 1.5%"
                required
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-zinc-400 text-sm mb-2">Full Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the proposal in detail. Include motivation, expected impact, and any relevant data..."
                required
                rows={6}
                maxLength={2000}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none resize-none"
              />
            </div>

            {/* Treasury-specific fields */}
            {proposalType === 'treasury' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Amount (VFIDE) *</label>
                  <input
                    type="number"
                    value={formData.treasuryAmount}
                    onChange={(e) => setFormData({...formData, treasuryAmount: e.target.value})}
                    placeholder="10000"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Recipient Address *</label>
                  <input
                    type="text"
                    value={formData.treasuryRecipient}
                    onChange={(e) => setFormData({...formData, treasuryRecipient: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Technical fields for parameter/upgrade */}
            {(proposalType === 'parameter' || proposalType === 'upgrade') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Target Contract Address</label>
                  <input
                    type="text"
                    value={formData.targetContract}
                    onChange={(e) => setFormData({...formData, targetContract: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Calldata (hex)</label>
                  <input
                    type="text"
                    value={formData.calldata}
                    onChange={(e) => setFormData({...formData, calldata: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    Leave empty for text-only proposals. For technical proposals, encode the function call.
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <h4 className="text-amber-400 font-bold mb-2">📋 Proposal Guidelines</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>• Voting period: 7 days</li>
                <li>• Quorum requirement: 10% of total voting power</li>
                <li>• Execution delay: 48 hours after passing (Timelock)</li>
                <li>• You can withdraw your proposal before any votes are cast</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.description}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                isSubmitting || !formData.title || !formData.description
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 hover:scale-[1.02]'
              }`}
            >
              {isSubmitting ? '⏳ Submitting...' : '🚀 Submit Proposal'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ========== COUNCIL TAB ==========
function CouncilTab() {
  const { isConnected, address } = useAccount();
  const { score } = useProofScore();
  const { writeContractAsync } = useWriteContract();
  const [activeSection, setActiveSection] = useState<'members' | 'candidates' | 'register'>('members');
  const [isRegistering, setIsRegistering] = useState(false);
  const [candidateStatement, setCandidateStatement] = useState('');

  const { data: councilMembersData } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'getCouncilMembers',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: candidatesData } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'getCandidates',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: electionStatusData } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'getElectionStatus',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: registrationData } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'canRegister',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  const registrationInfo = Array.isArray(registrationData)
    ? registrationData
    : undefined;
  const requiredScoreToRun = registrationInfo ? Number(registrationInfo[3]) : 7000;
  const canRun = registrationInfo ? Boolean(registrationInfo[0]) : (score || 0) >= requiredScoreToRun;

  const councilMemberAddresses = Array.isArray(councilMembersData)
    ? (councilMembersData as `0x${string}`[])
    : [];
  const candidateAddresses = Array.isArray(candidatesData)
    ? (candidatesData as `0x${string}`[])
    : [];

  const { data: councilScoreData } = useReadContracts({
    contracts: councilMemberAddresses.map((member) => ({
      address: SEER_ADDRESS,
      abi: SeerABI as Abi,
      functionName: 'getScore',
      args: [member],
    })),
    query: { enabled: IS_SEER_DEPLOYED && councilMemberAddresses.length > 0 },
  });

  const { data: candidateScoreData } = useReadContracts({
    contracts: candidateAddresses.map((candidate) => ({
      address: SEER_ADDRESS,
      abi: SeerABI as Abi,
      functionName: 'getScore',
      args: [candidate],
    })),
    query: { enabled: IS_SEER_DEPLOYED && candidateAddresses.length > 0 },
  });

  const councilMembers = useMemo(
    () =>
      councilMemberAddresses.map((member, index) => {
        const scoreValue = councilScoreData?.[index]?.result;
        const parsedScore = typeof scoreValue === 'bigint' ? Number(scoreValue) : Number(scoreValue ?? 0);
        return {
          address: member,
          name: formatAddress(member),
          score: parsedScore,
          term: 'Current Term',
          votes: 0,
          status: 'Active',
        };
      }),
    [councilMemberAddresses, councilScoreData]
  );

  const candidates = useMemo(
    () =>
      candidateAddresses.map((candidate, index) => {
        const scoreValue = candidateScoreData?.[index]?.result;
        const parsedScore = typeof scoreValue === 'bigint' ? Number(scoreValue) : Number(scoreValue ?? 0);
        return {
          address: candidate,
          name: formatAddress(candidate),
          score: parsedScore,
          statement: 'Registered on-chain candidate',
          votes: 0,
        };
      }),
    [candidateAddresses, candidateScoreData]
  );

  const [statusTimestamp, setStatusTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusTimestamp(Date.now());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  const electionStatus = useMemo(() => {
    const tuple = Array.isArray(electionStatusData) ? electionStatusData : undefined;
    const termEnd = tuple ? Number(tuple[2]) * 1000 : 0;
    const daysLeft = tuple ? Number(tuple[3]) : 0;
    const phase = termEnd > statusTimestamp ? 'Active' : 'Ended';
    return {
      phase,
      daysLeft,
      nextElection: termEnd ? new Date(termEnd).toLocaleDateString() : 'TBD',
      totalCandidates: tuple ? Number(tuple[4]) : candidates.length,
      currentTerm: 0,
    };
  }, [electionStatusData, candidates.length, statusTimestamp]);

  const handleRegister = async () => {
    if (!canRun || !candidateStatement) return;
    
    // Sanitize candidate statement to prevent XSS
    const sanitizedStatement = sanitizeString(candidateStatement, 500);
    
    setIsRegistering(true);
    
    try {
      if (!IS_COUNCIL_ELECTION_DEPLOYED) {
        alert('CouncilElection contract not deployed. Please try again later.');
        setIsRegistering(false);
        return;
      }

      await writeContractAsync({
        address: COUNCIL_ELECTION_ADDRESS,
        abi: CouncilElectionABI,
        functionName: 'register',
      });
      alert(`Registration submitted! Statement: ${sanitizedStatement}`);
      } catch (_err) {
      alert('Registration failed. Please try again.');
    }
    setIsRegistering(false);
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Election Status Banner */}
        <div className="bg-linear-to-r from-amber-400/20 to-orange-500/20 border border-amber-400 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-amber-400 mb-1">👑 Council Election - Term {electionStatus.currentTerm + 1}</h2>
              <p className="text-zinc-100">
                Phase: <span className="text-cyan-400 font-bold">{electionStatus.phase}</span> • 
                {electionStatus.daysLeft} days remaining
              </p>
            </div>
            <div className="text-right">
              <div className="text-zinc-400 text-sm">Total Candidates</div>
              <div className="text-3xl font-bold text-zinc-100">{electionStatus.totalCandidates}</div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'members' as const, label: '👑 Current Council', count: councilMembers.length },
            { id: 'candidates' as const, label: '🎯 Candidates', count: candidates.length },
            { id: 'register' as const, label: '✋ Run for Council', count: null },
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-3 rounded-lg font-bold whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-amber-400 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-amber-400'
              }`}
            >
              {section.label}
              {section.count !== null && (
                <span className="ml-2 px-2 py-0.5 bg-zinc-900 rounded-full text-xs">{section.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Current Council Members */}
        {activeSection === 'members' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">Current Council (Term {electionStatus.currentTerm})</h3>
            <div className="grid gap-4">
              {councilMembers.length === 0 ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center text-zinc-400">
                  No council members available.
                </div>
              ) : (
                councilMembers.map((member, idx) => (
                  <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-400/20 rounded-full flex items-center justify-center text-2xl">
                          {idx === 0 ? '👑' : '⭐'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-100 font-bold text-lg">{member.name}</span>
                            {idx === 0 && <span className="px-2 py-0.5 bg-amber-400 text-zinc-900 rounded text-xs font-bold">LEAD</span>}
                          </div>
                          <div className="text-zinc-400 text-sm font-mono">{member.address}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <div className="text-zinc-400">ProofScore</div>
                          <div className="text-cyan-400 font-bold">{member.score}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">Votes Received</div>
                          <div className="text-emerald-500 font-bold">{member.votes.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">Status</div>
                          <div className="text-emerald-500 font-bold capitalize">{member.status}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Candidates */}
        {activeSection === 'candidates' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">Election Candidates</h3>
            {electionStatus.phase !== 'Voting' && (
              <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4 mb-4">
                <p className="text-orange-500">⚠️ Voting is not currently active. Next election: {electionStatus.nextElection}</p>
              </div>
            )}
            <div className="grid gap-4">
              {candidates.length === 0 ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center text-zinc-400">
                  No candidates available.
                </div>
              ) : (
                candidates.map((candidate, idx) => (
                  <div key={idx} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-zinc-100 font-bold text-lg">{candidate.name}</span>
                          <span className="text-cyan-400 text-sm">Score: {candidate.score}</span>
                        </div>
                        <p className="text-zinc-400 text-sm mb-2">&quot;{candidate.statement}&quot;</p>
                        <div className="text-zinc-400 text-xs font-mono">{candidate.address}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-zinc-400 text-sm">Current Votes</div>
                          <div className="text-emerald-500 font-bold text-xl">{candidate.votes.toLocaleString()}</div>
                        </div>
                        {electionStatus.phase === 'Voting' && isConnected && (
                          <button className="px-6 py-3 bg-emerald-500 text-zinc-900 rounded-lg font-bold hover:bg-green-500 transition-colors">
                            Vote
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Register as Candidate */}
        {activeSection === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-zinc-100 mb-6">✋ Run for Council</h3>
              
              {!isConnected ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔒</div>
                  <p className="text-zinc-400">Connect your wallet to register as a candidate</p>
                </div>
              ) : !canRun ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-zinc-400 mb-4">
                    You need at least <span className="text-amber-400 font-bold">{requiredScoreToRun} ProofScore</span> to run for council.
                  </p>
                  <p className="text-zinc-400">Your score: {score || 0}</p>
                </div>
              ) : electionStatus.phase !== 'Registration' && electionStatus.phase !== 'Voting' ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-zinc-400">Registration is not currently open.</p>
                  <p className="text-zinc-400 mt-2">Next election: {electionStatus.nextElection}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                    <h4 className="text-amber-400 font-bold mb-2">📋 Requirements</h4>
                    <ul className="text-sm text-zinc-400 space-y-1">
                      <li>✓ ProofScore ≥ {requiredScoreToRun} <span className="text-emerald-500">(You: {score || 0})</span></li>
                      <li>✓ No active blacklist flags</li>
                      <li>✓ Wallet connected for at least 30 days</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">Your Campaign Statement *</label>
                    <textarea
                      value={candidateStatement}
                      onChange={(e) => setCandidateStatement(e.target.value)}
                      placeholder="Why should voters choose you? What will you focus on as a council member?"
                      rows={4}
                      maxLength={500}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-amber-400 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-zinc-400 mt-1">{candidateStatement.length}/500 characters</p>
                  </div>

                  <button
                    onClick={handleRegister}
                    disabled={isRegistering || !candidateStatement}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      isRegistering || !candidateStatement
                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                        : 'bg-linear-to-r from-amber-400 to-orange-500 text-zinc-900 hover:scale-[1.02]'
                    }`}
                  >
                    {isRegistering ? '⏳ Registering...' : '👑 Register as Candidate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
