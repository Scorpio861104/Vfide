"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState, useEffect, useMemo } from "react";
import { useProofScore, useDAOProposals } from "@/lib/vfide-hooks";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Search, Vote, Users, Clock, ChevronRight, Sparkles, Crown, Lightbulb, MessageSquare, History, BarChart3, FileText, Plus } from "lucide-react";

// DAO Contract ABI
const DAO_ABI = [
  { name: 'propose', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'ptype', type: 'uint8' }, { name: 'target', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'description', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { name: 'vote', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }, { name: 'support', type: 'bool' }], outputs: [] },
  { name: 'finalize', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'withdrawProposal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'getActiveProposals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  { name: 'getProposalDetails', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'ptype', type: 'uint8' }, { name: 'proposer', type: 'address' }, { name: 'target', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'description', type: 'string' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'endsAt', type: 'uint256' }, { name: 'finalized', type: 'bool' }, { name: 'passed', type: 'bool' }] },
  { name: 'hasVoted', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getVotingPower', type: 'function', stateMutability: 'view', inputs: [{ name: 'voter', type: 'address' }], outputs: [{ name: 'basePower', type: 'uint256' }, { name: 'multiplier', type: 'uint256' }, { name: 'effectivePower', type: 'uint256' }, { name: 'fatiguePenalty', type: 'uint256' }] },
  { name: 'isEligible', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getVoterStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'voter', type: 'address' }], outputs: [{ name: 'totalVotes', type: 'uint256' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'lastVoteTime', type: 'uint256' }] },
] as const;

// Contract address from environment
const DAO_ADDRESS = (process.env.NEXT_PUBLIC_DAO_ADDRESS || '0xB75b08C5e42da4242e218C25B6A6B05d7BeF0728') as `0x${string}`;

type TabType = 'overview' | 'proposals' | 'create' | 'council' | 'suggestions' | 'discussions' | 'members' | 'history' | 'stats';

interface Proposal {
  id: number;
  type: string;
  title: string;
  author: string;
  timeLeft: string;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  voted: boolean;
  description?: string;
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
  useWaitForTransactionReceipt({ hash });

  // Read active proposals (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getActiveProposals',
  });

  // Read voting power (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getVotingPower',
    args: address ? [address] : undefined,
  });

  // Read voter stats (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getVoterStats',
    args: address ? [address] : undefined,
  });

  // Read eligibility (used in UI - keep for feature)
  useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'isEligible',
    args: address ? [address] : undefined,
  });

  // Vote handler (kept for future UI use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVote = (proposalId: number, support: boolean) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: 'vote',
      args: [BigInt(proposalId), support],
    });
  };

  // Finalize handler (kept for future UI use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFinalize = (proposalId: number) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: 'finalize',
      args: [BigInt(proposalId)],
    });
  };

  // Create proposal handler (kept for future UI use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePropose = (ptype: number, target: string, value: bigint, data: string, description: string) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: 'propose',
      args: [ptype, target as `0x${string}`, value, data as `0x${string}`, description],
    });
  };
  
  return (
    <>
      <GlobalNav />
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,240,255,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <main className="min-h-screen pt-20">
        {/* Hero Header */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 border-b border-white/10 backdrop-blur-xl bg-white/[0.02]"
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
              <div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-sm text-purple-300 mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  Decentralized Governance
                </motion.div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-2">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400">
                    DAO Governance
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-400">
                  Shape the future of the VFIDE ecosystem
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
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
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center font-bold animate-pulse">
                    3
                  </span>
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
                      Urgent Notifications
                    </span>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
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
          <div className="container mx-auto px-4">
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
                  cyan: isActive ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : 'hover:bg-cyan-500/10 hover:text-cyan-400',
                  emerald: isActive ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25' : 'hover:bg-emerald-500/10 hover:text-emerald-400',
                  amber: isActive ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' : 'hover:bg-amber-500/10 hover:text-amber-400',
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
        {activeTab === 'proposals' && <ProposalsTab searchQuery={searchQuery} />}
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
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Your Voting Power</div>
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <Vote className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              {address ? (
                <>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">{votingPower}</div>
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
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6"
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
              className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Your Participation</div>
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white">87%</div>
              <div className="text-gray-500 text-sm mt-1">12 of 14 votes</div>
              <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> Above average
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02, y: -2 }}
              className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-sm">Governance Fatigue</div>
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-amber-400">40%</div>
              <div className="text-gray-500 text-sm mt-1">Current: 506/845</div>
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> +42/day recovery
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20">
                <Clock className="w-5 h-5 text-red-400" />
              </div>
              Upcoming Voting Deadlines
            </h2>
            
            <div className="space-y-3">
              <DeadlineCard
                id={142}
                title="Treasury: Security Audit"
                hoursRemaining={5}
                voted={false}
              />
              <DeadlineCard
                id={141}
                title="Protocol: Multi-Chain"
                hoursRemaining={24}
                voted={false}
              />
              <DeadlineCard
                id={140}
                title="Fee Reduction to 0.20%"
                hoursRemaining={48}
                voted={true}
              />
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
      className={`flex items-center justify-between p-4 bg-gradient-to-r ${colors.bg} backdrop-blur-sm border ${colors.border} rounded-xl hover:shadow-lg ${colors.glow} transition-all`}
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

function ProposalsTab({ searchQuery }: { searchQuery: string }) {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [baseTime] = useState(() => Date.now());
  
  const filteredProposals = useMemo(() => {
    const now = baseTime;
    const proposals: Proposal[] = [
      { id: 140, type: 'PARAMETER', title: 'Reduce Merchant Fee to 0.20%', author: '0x742d...bEb', timeLeft: '2 days', endTime: now + 48 * 60 * 60 * 1000, forVotes: 12450, againstVotes: 5820, voted: false, description: 'This proposal aims to reduce the merchant transaction fee from 0.25% to 0.20% to increase competitiveness and merchant adoption.' },
      { id: 142, type: 'TREASURY', title: 'Allocate $50k for Security Audit', author: 'Council', timeLeft: '5 hours', endTime: now + 5 * 60 * 60 * 1000, forVotes: 18900, againstVotes: 1640, voted: false, description: 'Request treasury allocation of $50,000 to conduct comprehensive security audit by leading firm.' },
      { id: 141, type: 'UPGRADE', title: 'Enable Multi-Chain Support (Arbitrum)', author: '0x1a2b...3c4d', timeLeft: '1 day', endTime: now + 24 * 60 * 60 * 1000, forVotes: 9240, againstVotes: 7860, voted: false, description: 'Deploy VFIDE protocol on Arbitrum to expand ecosystem reach and reduce transaction costs.' }
    ];
    
    return proposals.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery);
      const matchesType = filterType === 'all' || p.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, filterType, baseTime]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#F5F3E8]">
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
                  }}
                  className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] text-[#00F0FF] rounded-lg font-bold hover:border-[#00F0FF] transition-colors"
                >
                  📊 Export CSV
                </button>
                <button className="px-6 py-2 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform">
                  Create Proposal
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'PARAMETER', 'TREASURY', 'UPGRADE'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                    filterType === type
                      ? 'bg-[#00F0FF] text-[#1A1A1D]'
                      : 'bg-[#1A1A1D] text-[#A0A0A5] hover:text-[#00F0FF]'
                  }`}
                >
                  {type === 'all' ? 'All' : type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredProposals.length === 0 ? (
              <div className="text-center py-12 text-[#A0A0A5]">
                No proposals found matching your search.
              </div>
            ) : null}
            {filteredProposals.map(prop => {
              const total = prop.forVotes + prop.againstVotes;
              const forPercent = Math.round((prop.forVotes / total) * 100);
              
              return (
                <div key={prop.id} className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#00F0FF] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="inline-block px-3 py-1 bg-[#00F0FF]/20 border border-[#00F0FF] rounded text-[#00F0FF] text-sm font-bold mb-2">
                        {prop.type}
                      </div>
                      <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">{prop.title}</h3>
                      <p className="text-[#A0A0A5] text-sm">Proposed by {prop.author} • Ends in {prop.timeLeft}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#F5F3E8]">#{prop.id}</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#50C878]">FOR: {prop.forVotes.toLocaleString()} votes ({forPercent}%)</span>
                      <span className="text-[#C41E3A]">AGAINST: {prop.againstVotes.toLocaleString()} votes ({100-forPercent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#2A2A2F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#50C878]" style={{ width: `${forPercent}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-[#A0A0A5]">
                      Quorum: {total.toLocaleString()} / 5,000 {total >= 5000 ? '✓' : '✗'}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#50C878]/90">
                      Vote FOR
                    </button>
                    <button className="flex-1 px-4 py-2 bg-[#C41E3A] text-[#F5F3E8] rounded-lg font-bold hover:bg-[#C41E3A]/90">
                      Vote AGAINST
                    </button>
                    <button
                      onClick={() => setSelectedProposal(prop)}
                      className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] text-[#A0A0A5] rounded-lg hover:text-[#00F0FF] hover:border-[#00F0FF]"
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
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#3A3A3F] flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-[#00F0FF]/20 border border-[#00F0FF] rounded text-[#00F0FF] text-sm font-bold mb-2">
                  {selectedProposal.type}
                </div>
                <h2 className="text-2xl font-bold text-[#F5F3E8]">#{selectedProposal.id}: {selectedProposal.title}</h2>
              </div>
              <button onClick={() => setSelectedProposal(null)} className="text-[#A0A0A5] hover:text-[#00F0FF] text-2xl">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <div className="text-[#A0A0A5] text-sm mb-1">Proposed by</div>
                <div className="text-[#F5F3E8] font-mono">{selectedProposal.author}</div>
              </div>
              
              <div>
                <div className="text-[#A0A0A5] text-sm mb-1">Time Remaining</div>
                <ProposalCountdown endTime={selectedProposal.endTime} />
              </div>
              
              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">Description</div>
                <div className="text-[#F5F3E8] bg-[#1A1A1D] p-4 rounded-lg">
                  {selectedProposal.description}
                </div>
              </div>
              
              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">Voting Results</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#50C878]">FOR: {selectedProposal.forVotes.toLocaleString()} votes</span>
                    <span className="text-[#C41E3A]">AGAINST: {selectedProposal.againstVotes.toLocaleString()} votes</span>
                  </div>
                  <div className="w-full h-3 bg-[#1A1A1D] rounded-full overflow-hidden">
                    <div className="h-full bg-[#50C878]" style={{ width: `${(selectedProposal.forVotes / (selectedProposal.forVotes + selectedProposal.againstVotes)) * 100}%` }} />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-6 py-3 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#50C878]/90">
                  Vote FOR
                </button>
                <button className="flex-1 px-6 py-3 bg-[#C41E3A] text-[#F5F3E8] rounded-lg font-bold hover:bg-[#C41E3A]/90">
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
  return <div className="text-[#00F0FF] font-bold text-lg">{timeLeft}</div>;
}

function MembersTab({ searchQuery }: { searchQuery: string }) {
  const [sortBy, setSortBy] = useState<'score' | 'votes' | 'participation'>('score');
  
  const filteredMembers = useMemo(() => {
    const members = [
      { address: '0x742d...bEb', score: 945, votes: 28, participation: 98, fatigue: 15, lastVote: '2 hours ago' },
      { address: '0x1a2b...3c4d', score: 892, votes: 26, participation: 91, fatigue: 25, lastVote: '5 hours ago' },
      { address: '0x5e6f...7g8h', score: 845, votes: 24, participation: 87, fatigue: 40, lastVote: '1 day ago' },
      { address: '0x9i0j...1k2l', score: 823, votes: 22, participation: 82, fatigue: 10, lastVote: '12 hours ago' },
      { address: '0x3m4n...5o6p', score: 801, votes: 21, participation: 78, fatigue: 50, lastVote: '3 days ago' },
      { address: '0x7q8r...9s0t', score: 789, votes: 19, participation: 75, fatigue: 30, lastVote: '18 hours ago' },
      { address: '0x1u2v...3w4x', score: 756, votes: 18, participation: 71, fatigue: 20, lastVote: '6 hours ago' },
      { address: '0x5y6z...7a8b', score: 734, votes: 16, participation: 68, fatigue: 35, lastVote: '2 days ago' }
    ];
    
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
      <div className="container mx-auto px-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-[#F5F3E8]">
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
                }}
                className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] text-[#00F0FF] rounded-lg font-bold hover:border-[#00F0FF]"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[{ key: 'score', label: 'By Score' }, { key: 'votes', label: 'By Votes' }, { key: 'participation', label: 'By Participation' }].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key as typeof sortBy)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      sortBy === key
                        ? 'bg-[#00F0FF] text-[#1A1A1D]'
                        : 'bg-[#1A1A1D] text-[#A0A0A5] hover:text-[#00F0FF]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-[#A0A0A5] text-sm">Total: {filteredMembers.length} members</div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#3A3A3F]">
                  <th className="text-left py-3 px-4 text-[#A0A0A5] text-sm">Member</th>
                  <th className="text-right py-3 px-4 text-[#A0A0A5] text-sm">ProofScore</th>
                  <th className="text-right py-3 px-4 text-[#A0A0A5] text-sm">Total Votes</th>
                  <th className="text-right py-3 px-4 text-[#A0A0A5] text-sm">Participation</th>
                  <th className="text-right py-3 px-4 text-[#A0A0A5] text-sm">Fatigue</th>
                  <th className="text-right py-3 px-4 text-[#A0A0A5] text-sm">Last Vote</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, idx) => (
                  <tr key={member.address} className="border-b border-[#3A3A3F] hover:bg-[#1A1A1D] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {idx === 2 && <span className="text-[#00F0FF]">👤</span>}
                        <span className="text-[#F5F3E8] font-mono text-sm">{member.address}</span>
                        {idx === 2 && <span className="text-[#00F0FF] text-xs">(You)</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-[#00F0FF] font-bold">{member.score}</span>
                    </td>
                    <td className="py-4 px-4 text-right text-[#F5F3E8]">{member.votes}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={member.participation >= 85 ? 'text-[#50C878]' : 'text-[#A0A0A5]'}>
                        {member.participation}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={member.fatigue > 40 ? 'text-[#FFA500]' : 'text-[#A0A0A5]'}>
                        {member.fatigue}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-[#A0A0A5] text-sm">{member.lastVote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 p-4 bg-[#1A1A1D] rounded-lg">
            <h3 className="text-lg font-bold text-[#F5F3E8] mb-3">Governance Fatigue Explanation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#A0A0A5]">
              <div>
                <div className="text-[#00F0FF] font-bold mb-1">How it Works</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Each vote costs 5% fatigue</li>
                  <li>Fatigue reduces your effective voting power</li>
                  <li>Recovers 5% per day (natural restoration)</li>
                  <li>Prevents spam voting</li>
                </ul>
              </div>
              <div>
                <div className="text-[#00F0FF] font-bold mb-1">Example</div>
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
  const filteredHistory = useMemo(() => {
    const history = [
      { id: 140, title: 'Fee Reduction', vote: 'FOR', date: '2 hours ago', result: 'Pending', power: 845 },
      { id: 139, title: 'Council Election Q4', vote: 'FOR', date: '1 day ago', result: 'Passed ✓', power: 845 },
      { id: 138, title: 'Token Burn Proposal', vote: 'AGAINST', date: '3 days ago', result: 'Rejected ✗', power: 845 },
      { id: 137, title: 'Audit Budget Increase', vote: 'FOR', date: '5 days ago', result: 'Passed ✓', power: 823 },
      { id: 136, title: 'Guardian Node Changes', vote: 'FOR', date: '7 days ago', result: 'Passed ✓', power: 823 },
      { id: 135, title: 'Treasury Allocation', vote: 'FOR', date: '10 days ago', result: 'Passed ✓', power: 801 },
      { id: 134, title: 'Protocol Upgrade v2.1', vote: 'FOR', date: '12 days ago', result: 'Passed ✓', power: 801 },
      { id: 133, title: 'Fee Structure Change', vote: 'AGAINST', date: '15 days ago', result: 'Rejected ✗', power: 789 }
    ];
    
    return history.filter(h => 
      searchQuery === '' || 
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.id.toString().includes(searchQuery)
    );
  }, [searchQuery]);

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#F5F3E8]">
              Your Voting History ({filteredHistory.length})
            </h2>
            <button
              onClick={() => {
                const csv = 'ID,Title,Vote,Date,Result,Power\n' + 
                  filteredHistory.map(h => `${h.id},"${h.title}",${h.vote},"${h.date}","${h.result}",${h.power}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'voting-history.csv';
                a.click();
              }}
              className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] text-[#00F0FF] rounded-lg font-bold hover:border-[#00F0FF]"
            >
              📊 Export CSV
            </button>
          </div>
          
          <div className="space-y-3">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-[#A0A0A5]">
                No voting history found matching your search.
              </div>
            ) : null}
            {filteredHistory.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg hover:border hover:border-[#3A3A3F]">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[#A0A0A5] text-sm">#{item.id}</span>
                    <span className="text-[#F5F3E8] font-bold">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={item.vote === 'FOR' ? 'text-[#50C878]' : 'text-[#C41E3A]'}>
                      Voted {item.vote}
                    </span>
                    <span className="text-[#A0A0A5]">{item.date}</span>
                    <span className="text-[#A0A0A5]">Power used: {item.power}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${item.result.includes('Passed') ? 'text-[#50C878]' : item.result.includes('Rejected') ? 'text-[#C41E3A]' : 'text-[#FFA500]'}`}>
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
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">
              DAO Statistics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A5]">Total Proposals</span>
                <span className="text-[#F5F3E8] font-bold text-2xl">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A5]">Passed Proposals</span>
                <span className="text-[#50C878] font-bold text-2xl">128 (82%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A5]">Rejected Proposals</span>
                <span className="text-[#C41E3A] font-bold text-2xl">28 (18%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A5]">Active Members</span>
                <span className="text-[#F5F3E8] font-bold text-2xl">247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A5]">Average Participation</span>
                <span className="text-[#F5F3E8] font-bold text-2xl">73%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0A5]">Total Votes Cast</span>
                <span className="text-[#F5F3E8] font-bold text-2xl">4,234</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">
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
                    <span className="text-[#F5F3E8]">{cat.name}</span>
                    <span className="text-[#A0A0A5]">{cat.count} ({cat.percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00F0FF]" style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">
              Recent Pass/Fail Rate
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">Last 30 Days</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-[#50C878] rounded flex items-center justify-center text-[#1A1A1D] font-bold">
                    18 Passed
                  </div>
                  <div className="w-20 h-12 bg-[#C41E3A] rounded flex items-center justify-center text-[#F5F3E8] font-bold">
                    4 Failed
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">Last 90 Days</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-[#50C878] rounded flex items-center justify-center text-[#1A1A1D] font-bold">
                    52 Passed
                  </div>
                  <div className="w-20 h-12 bg-[#C41E3A] rounded flex items-center justify-center text-[#F5F3E8] font-bold">
                    11 Failed
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-[#A0A0A5] text-sm mb-2">All Time</div>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-[#50C878] rounded flex items-center justify-center text-[#1A1A1D] font-bold">
                    128 Passed
                  </div>
                  <div className="w-20 h-12 bg-[#C41E3A] rounded flex items-center justify-center text-[#F5F3E8] font-bold">
                    28 Failed
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">
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
                <div key={voter.rank} className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      voter.rank === 1 ? 'bg-[#FFD700] text-[#1A1A1D]' :
                      voter.rank === 2 ? 'bg-[#C0C0C0] text-[#1A1A1D]' :
                      voter.rank === 3 ? 'bg-[#CD7F32] text-[#1A1A1D]' :
                      'bg-[#3A3A3F] text-[#A0A0A5]'
                    }`}>
                      {voter.rank}
                    </div>
                    <div>
                      <div className="text-[#F5F3E8] font-mono text-sm">{voter.address}</div>
                      <div className="text-[#A0A0A5] text-xs">Score: {voter.score}</div>
                    </div>
                  </div>
                  <div className="text-[#00F0FF] font-bold">{voter.votes} votes</div>
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
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [newSuggestion, setNewSuggestion] = useState({
    title: '',
    description: '',
    category: 'feature'
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: 1,
      title: "Add multi-chain support for Arbitrum",
      description: "Expand VFIDE to Arbitrum for lower gas fees and faster transactions. This would make the platform more accessible to users who prefer L2 solutions.",
      category: "feature",
      author: "0x742d...bEb",
      authorScore: 847,
      timestamp: "2 hours ago",
      upvotes: 45,
      downvotes: 3,
      comments: [
        { id: 1, author: "0x1a2b...3c4d", authorScore: 723, content: "This would be amazing for reducing gas costs!", timestamp: "1 hour ago", likes: 5 },
        { id: 2, author: "0x5e6f...7g8h", authorScore: 912, content: "Have we considered Optimism as well?", timestamp: "45 min ago", likes: 3 }
      ],
      status: "reviewing",
      votedBy: []
    },
    {
      id: 2,
      title: "Implement recurring payment subscriptions",
      description: "Allow merchants to set up recurring payments for subscription-based services. Users could authorize monthly charges with customizable limits.",
      category: "feature",
      author: "0x1a2b...3c4d",
      authorScore: 723,
      timestamp: "5 hours ago",
      upvotes: 38,
      downvotes: 5,
      comments: [
        { id: 1, author: "0x9i0j...1k2l", authorScore: 654, content: "Essential for SaaS integrations!", timestamp: "3 hours ago", likes: 8 }
      ],
      status: "new",
      votedBy: []
    },
    {
      id: 3,
      title: "Create a merchant referral program",
      description: "Incentivize merchants to bring other merchants to the platform with a referral bonus system. Could be 0.1% of referred merchant's volume for first 6 months.",
      category: "economics",
      author: "0x5e6f...7g8h",
      authorScore: 912,
      timestamp: "1 day ago",
      upvotes: 67,
      downvotes: 8,
      comments: [
        { id: 1, author: "0x742d...bEb", authorScore: 847, content: "Great for viral growth! Maybe cap it at 1 year?", timestamp: "20 hours ago", likes: 12 },
        { id: 2, author: "0x1a2b...3c4d", authorScore: 723, content: "Should we require KYC for referrers?", timestamp: "18 hours ago", likes: 4 }
      ],
      status: "approved",
      votedBy: []
    },
    {
      id: 4,
      title: "Mobile app for vault management",
      description: "Build a dedicated mobile app for managing vaults, viewing ProofScore, and quick payments. PWA would be acceptable as first version.",
      category: "feature",
      author: "0x9i0j...1k2l",
      authorScore: 654,
      timestamp: "2 days ago",
      upvotes: 89,
      downvotes: 2,
      comments: [
        { id: 1, author: "0x5e6f...7g8h", authorScore: 912, content: "PWA first makes sense. React Native later?", timestamp: "1 day ago", likes: 15 }
      ],
      status: "implemented",
      votedBy: []
    }
  ]);
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewing' | 'approved'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular');

  const handleSubmit = () => {
    if (!newSuggestion.title.trim() || !newSuggestion.description.trim()) return;
    
    const suggestion: Suggestion = {
      id: suggestions.length + 1,
      title: newSuggestion.title,
      description: newSuggestion.description,
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
    
    setSuggestions([suggestion, ...suggestions]);
    setNewSuggestion({ title: '', description: '', category: 'feature' });
    setShowSubmitForm(false);
  };

  const handleVote = (id: number, isUpvote: boolean) => {
    const voterKey = address || 'anonymous';
    setSuggestions(suggestions.map(s => {
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
    setSuggestions(suggestions.map(s => {
      if (s.id !== suggestionId) return s;
      const comment: SuggestionComment = {
        id: s.comments.length + 1,
        author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
        authorScore: 500,
        content: newComment,
        timestamp: 'Just now',
        likes: 0
      };
      return { ...s, comments: [...s.comments, comment] };
    }));
    setNewComment('');
  };

  const handleShare = async (suggestion: Suggestion) => {
    const shareUrl = `${window.location.origin}/governance?suggestion=${suggestion.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(suggestion.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers - open share dialog
      window.open(shareUrl, '_blank');
    }
  };

  const filteredSuggestions = suggestions
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => sortBy === 'popular' ? (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes) : 0);

  const statusColors = {
    new: 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]',
    reviewing: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]',
    approved: 'bg-[#50C878]/20 text-[#50C878] border-[#50C878]',
    rejected: 'bg-[#C41E3A]/20 text-[#C41E3A] border-[#C41E3A]',
    implemented: 'bg-[#9B59B6]/20 text-[#9B59B6] border-[#9B59B6]'
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
      <div className="container mx-auto px-4">
        {/* Header with Submit Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">💡 Community Suggestions</h2>
            <p className="text-[#A0A0A5]">Anyone can submit ideas. Reach {PROMOTION_THRESHOLD}+ votes to become an official proposal!</p>
          </div>
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="px-6 py-3 bg-gradient-to-r from-[#50C878] to-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all"
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
              className="w-full md:w-96 px-4 py-3 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A5] hover:text-[#F5F3E8]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Submit Form */}
        {showSubmitForm && (
          <div className="bg-[#2A2A2F] border border-[#50C878] rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">📝 Submit Your Idea</h3>
            
            {!isConnected && (
              <div className="bg-[#FFD700]/20 border border-[#FFD700] rounded-lg p-4 mb-4">
                <p className="text-[#FFD700]">⚠️ Connect your wallet to submit suggestions with your identity. Anonymous submissions are also allowed.</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Title *</label>
                <input
                  type="text"
                  value={newSuggestion.title}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                  placeholder="Brief, descriptive title for your idea..."
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#50C878] focus:outline-none"
                  maxLength={100}
                />
                <div className="text-right text-xs text-[#A0A0A5] mt-1">{newSuggestion.title.length}/100</div>
              </div>
              
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Category</label>
                <select
                  value={newSuggestion.category}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#50C878] focus:outline-none"
                >
                  <option value="feature">🚀 New Feature</option>
                  <option value="economics">💰 Token Economics</option>
                  <option value="security">🛡️ Security</option>
                  <option value="governance">⚖️ Governance</option>
                  <option value="other">💡 Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Description *</label>
                <textarea
                  value={newSuggestion.description}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                  placeholder="Explain your idea in detail. What problem does it solve? How would it work?"
                  rows={5}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#50C878] focus:outline-none resize-none"
                  maxLength={2000}
                />
                <div className="text-right text-xs text-[#A0A0A5] mt-1">{newSuggestion.description.length}/2000</div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newSuggestion.title.trim() || !newSuggestion.description.trim()}
                  className="flex-1 py-3 bg-[#50C878] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 Submit Suggestion
                </button>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-3 bg-[#3A3A3F] text-[#A0A0A5] font-bold rounded-lg hover:text-[#F5F3E8] transition-all"
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
                    ? 'bg-[#00F0FF] text-[#1A1A1D]'
                    : 'bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#00F0FF]'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
            className="px-4 py-2 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#F5F3E8]"
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
              <div key={suggestion.id} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#50C878]/50 transition-all">
                <div className="flex gap-4">
                  {/* Vote Column */}
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <button
                      onClick={() => handleVote(suggestion.id, true)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted 
                          ? 'bg-[#1A1A1D] text-[#3A3A3F] cursor-not-allowed' 
                          : 'bg-[#1A1A1D] hover:bg-[#50C878]/20 text-[#A0A0A5] hover:text-[#50C878]'
                      }`}
                    >
                      ▲
                    </button>
                    <div className={`text-lg font-bold ${
                      score > 0 ? 'text-[#50C878]' : score < 0 ? 'text-[#C41E3A]' : 'text-[#A0A0A5]'
                    }`}>
                      {score}
                    </div>
                    <button
                      onClick={() => handleVote(suggestion.id, false)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted 
                          ? 'bg-[#1A1A1D] text-[#3A3A3F] cursor-not-allowed' 
                          : 'bg-[#1A1A1D] hover:bg-[#C41E3A]/20 text-[#A0A0A5] hover:text-[#C41E3A]'
                      }`}
                    >
                      ▼
                    </button>
                    {hasVoted && <span className="text-[#A0A0A5] text-xs">voted</span>}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded border ${statusColors[suggestion.status]}`}>
                        {suggestion.status.toUpperCase()}
                      </span>
                      <span className="text-lg">{categoryIcons[suggestion.category]}</span>
                      <span className="text-[#A0A0A5] text-sm">{suggestion.category}</span>
                      {suggestion.status === 'new' && score > 0 && (
                        <span className="text-xs text-[#FFD700]">
                          🎯 {Math.round(progressToPromotion)}% to proposal
                        </span>
                      )}
                    </div>
                    
                    {/* Progress bar for new suggestions */}
                    {suggestion.status === 'new' && score > 0 && (
                      <div className="w-full h-1 bg-[#3A3A3F] rounded-full mb-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#50C878] to-[#00F0FF] transition-all duration-500"
                          style={{ width: `${progressToPromotion}%` }}
                        />
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">{suggestion.title}</h3>
                    <p className={`text-[#A0A0A5] mb-4 ${isExpanded ? '' : 'line-clamp-2'}`}>{suggestion.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-[#A0A0A5]">
                        by <span className="text-[#00F0FF] font-mono">{suggestion.author}</span>
                        <span className="text-[#50C878] ml-1">(Score: {suggestion.authorScore})</span>
                      </span>
                      <span className="text-[#A0A0A5]">• {suggestion.timestamp}</span>
                      <button 
                        onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                        className="text-[#A0A0A5] hover:text-[#00F0FF] transition-all"
                      >
                        💬 {suggestion.comments.length} comments {isExpanded ? '▲' : '▼'}
                      </button>
                      <button 
                        onClick={() => handleShare(suggestion)}
                        className="text-[#A0A0A5] hover:text-[#00F0FF] transition-all"
                      >
                        {copiedId === suggestion.id ? '✓ Copied!' : '🔗 Share'}
                      </button>
                    </div>
                    
                    {/* Expanded Comments Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#3A3A3F]">
                        <div className="space-y-3 mb-4">
                          {suggestion.comments.length === 0 ? (
                            <p className="text-[#A0A0A5] text-sm italic">No comments yet. Be the first!</p>
                          ) : (
                            suggestion.comments.map(comment => (
                              <div key={comment.id} className="bg-[#1A1A1D] rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[#00F0FF] font-mono">{comment.author}</span>
                                    <span className="text-[#50C878] text-xs">(Score: {comment.authorScore})</span>
                                    <span className="text-[#A0A0A5]">• {comment.timestamp}</span>
                                  </div>
                                  <button className="text-[#A0A0A5] hover:text-[#C41E3A] text-xs">❤️ {comment.likes}</button>
                                </div>
                                <p className="text-[#F5F3E8] text-sm">{comment.content}</p>
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
                            className="flex-1 px-3 py-2 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(suggestion.id)}
                          />
                          <button
                            onClick={() => handleAddComment(suggestion.id)}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
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
          <div className="text-center py-12 text-[#A0A0A5]">
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
  
  const [discussions, setDiscussions] = useState<Discussion[]>([
    {
      id: 1,
      title: "📢 VFIDE v2.0 Launch Discussion",
      author: "VFIDE Team",
      authorScore: 1000,
      timestamp: "2 hours ago",
      replies: 47,
      views: 1250,
      lastReply: "10 min ago",
      isPinned: true,
      category: "announcements",
      preview: "We're excited to announce the upcoming v2.0 release! This thread is for community discussion about the new features..."
    },
    {
      id: 2,
      title: "Best practices for merchant onboarding",
      author: "0x742d...bEb",
      authorScore: 847,
      timestamp: "5 hours ago",
      replies: 23,
      views: 456,
      lastReply: "1 hour ago",
      isPinned: false,
      category: "general",
      preview: "I've been helping onboard local merchants in my area. Here are some tips that have worked well for me..."
    },
    {
      id: 3,
      title: "Proposal #142 Discussion: Multi-Chain Expansion",
      author: "0x1a2b...3c4d",
      authorScore: 723,
      timestamp: "1 day ago",
      replies: 89,
      views: 2340,
      lastReply: "30 min ago",
      isPinned: true,
      category: "proposals",
      preview: "Let's discuss the pros and cons of expanding to Arbitrum and Optimism as outlined in Proposal #142..."
    },
    {
      id: 4,
      title: "Help: Vault recovery process",
      author: "0x5e6f...7g8h",
      authorScore: 312,
      timestamp: "3 days ago",
      replies: 12,
      views: 234,
      lastReply: "6 hours ago",
      isPinned: false,
      category: "support",
      preview: "I need help understanding the vault recovery process. My guardian says they can't see the approval button..."
    },
    {
      id: 5,
      title: "Idea: Gamification of ProofScore building",
      author: "0x9i0j...1k2l",
      authorScore: 654,
      timestamp: "1 week ago",
      replies: 34,
      views: 567,
      lastReply: "2 days ago",
      isPinned: false,
      category: "ideas",
      preview: "What if we added achievements and milestones to make building ProofScore more engaging? Here's my proposal..."
    }
  ]);

  const [replies, setReplies] = useState<Reply[]>([
    { id: 1, author: "0x742d...bEb", authorScore: 847, content: "Great idea! I especially like the multi-chain support concept. This would really help with gas fees.", timestamp: "1 hour ago", likes: 12 },
    { id: 2, author: "0x1a2b...3c4d", authorScore: 723, content: "I agree, but we need to consider the security implications carefully. Let's not rush this.", timestamp: "45 min ago", likes: 8 },
    { id: 3, author: "0x5e6f...7g8h", authorScore: 912, content: "Has anyone done a cost analysis? What would the deployment costs look like on Arbitrum?", timestamp: "30 min ago", likes: 5 },
  ]);

  const handleNewThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim()) return;
    
    const thread: Discussion = {
      id: discussions.length + 1,
      title: newThread.title,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
      authorScore: 500,
      timestamp: 'Just now',
      replies: 0,
      views: 1,
      lastReply: '-',
      isPinned: false,
      category: newThread.category as Discussion['category'],
      preview: newThread.content.slice(0, 150) + '...'
    };
    
    setDiscussions([thread, ...discussions]);
    setNewThread({ title: '', content: '', category: 'general' });
    setShowNewThread(false);
  };

  const handleReply = () => {
    if (!newReply.trim()) return;
    
    const reply: Reply = {
      id: replies.length + 1,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
      authorScore: 500,
      content: newReply,
      timestamp: 'Just now',
      likes: 0
    };
    
    setReplies([...replies, reply]);
    setNewReply('');
    
    // Update discussion reply count
    if (selectedDiscussion) {
      setDiscussions(discussions.map(d => 
        d.id === selectedDiscussion.id 
          ? { ...d, replies: d.replies + 1, lastReply: 'Just now' }
          : d
      ));
    }
  };

  const categoryColors = {
    general: 'bg-[#A0A0A5]/20 text-[#A0A0A5] border-[#A0A0A5]',
    proposals: 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]',
    support: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]',
    ideas: 'bg-[#50C878]/20 text-[#50C878] border-[#50C878]',
    announcements: 'bg-[#9B59B6]/20 text-[#9B59B6] border-[#9B59B6]'
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
            className="mb-4 text-[#00F0FF] hover:underline flex items-center gap-2"
          >
            ← Back to Discussions
          </button>
          
          {/* Thread Header */}
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              {selectedDiscussion.isPinned && <span className="text-[#FFD700]">📌</span>}
              <span className={`px-2 py-1 text-xs rounded border ${categoryColors[selectedDiscussion.category]}`}>
                {selectedDiscussion.category.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#F5F3E8] mb-4">{selectedDiscussion.title}</h1>
            <p className="text-[#A0A0A5] mb-4">{selectedDiscussion.preview}</p>
            <div className="flex items-center gap-4 text-sm text-[#A0A0A5]">
              <span>by <span className="text-[#00F0FF] font-mono">{selectedDiscussion.author}</span></span>
              <span>• {selectedDiscussion.timestamp}</span>
              <span>• 👁 {selectedDiscussion.views} views</span>
            </div>
          </div>
          
          {/* Replies */}
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#F5F3E8]">💬 {replies.length} Replies</h2>
            {replies.map(reply => (
              <div key={reply.id} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#00F0FF] font-mono">{reply.author}</span>
                    <span className="text-[#50C878] text-xs">(Score: {reply.authorScore})</span>
                    <span className="text-[#A0A0A5] text-sm">• {reply.timestamp}</span>
                  </div>
                  <button className="text-[#A0A0A5] hover:text-[#00F0FF] text-sm">
                    ❤️ {reply.likes}
                  </button>
                </div>
                <p className="text-[#F5F3E8]">{reply.content}</p>
              </div>
            ))}
          </div>
          
          {/* Reply Form */}
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#F5F3E8] mb-4">Reply to this discussion</h3>
            {!isConnected && (
              <div className="bg-[#FFD700]/20 border border-[#FFD700] rounded-lg p-3 mb-4 text-sm text-[#FFD700]">
                ⚠️ Connect your wallet to reply with your identity
              </div>
            )}
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none resize-none mb-4"
            />
            <button
              onClick={handleReply}
              disabled={!newReply.trim()}
              className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
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
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">💬 Community Discussions</h2>
            <p className="text-[#A0A0A5]">Discuss proposals, share ideas, and connect with the community.</p>
          </div>
          <button
            onClick={() => setShowNewThread(!showNewThread)}
            className="px-6 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all"
          >
            {showNewThread ? '✕ Cancel' : '+ New Discussion'}
          </button>
        </div>

        {/* New Thread Form */}
        {showNewThread && (
          <div className="bg-[#2A2A2F] border border-[#00F0FF] rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">📝 Start a New Discussion</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[#A0A0A5] text-sm mb-2">Title *</label>
                  <input
                    type="text"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    placeholder="Discussion topic..."
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-[#A0A0A5] text-sm mb-2">Category</label>
                  <select
                    value={newThread.category}
                    onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="proposals">Proposals</option>
                    <option value="support">Support</option>
                    <option value="ideas">Ideas</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Content *</label>
                <textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="What would you like to discuss?"
                  rows={5}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none resize-none"
                />
              </div>
              
              <button
                onClick={handleNewThread}
                disabled={!newThread.title.trim() || !newThread.content.trim()}
                className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
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
                  ? 'bg-[#00F0FF] text-[#1A1A1D]'
                  : 'bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#00F0FF]'
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
              className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 hover:border-[#00F0FF]/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.isPinned && <span className="text-[#FFD700]">📌</span>}
                    <span className={`px-2 py-1 text-xs rounded border ${categoryColors[discussion.category]}`}>
                      {discussion.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F5F3E8] mb-1 hover:text-[#00F0FF] transition-colors">
                    {discussion.title}
                  </h3>
                  <p className="text-[#A0A0A5] text-sm line-clamp-1 mb-2">{discussion.preview}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#A0A0A5]">
                    <span>by <span className="text-[#00F0FF]">{discussion.author}</span></span>
                    <span>• {discussion.timestamp}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-[#00F0FF] font-bold">{discussion.replies}</div>
                  <div className="text-[#A0A0A5] text-xs">replies</div>
                  <div className="text-[#A0A0A5] text-xs mt-1">👁 {discussion.views}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDiscussions.length === 0 && (
          <div className="text-center py-12 text-[#A0A0A5]">
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
  const { address, isConnected } = useAccount();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !isConnected) return;
    
    setIsSubmitting(true);
    // In production: call DAO.propose(targets, values, calldatas, description)
    await new Promise(r => setTimeout(r, 2000));
    setIsSubmitting(false);
    alert('Proposal submitted! It will appear in Active Proposals after confirmation.');
  };

  if (!isConnected) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
            <p className="text-[#A0A0A5]">You need to connect your wallet to create proposals</p>
          </div>
        </div>
      </section>
    );
  }

  if (!canCreate) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="bg-[#2A2A2F] border border-[#C41E3A] rounded-xl p-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Insufficient ProofScore</h2>
            <p className="text-[#A0A0A5] mb-4">
              You need at least <span className="text-[#00F0FF] font-bold">{requiredScore} ProofScore</span> to create proposals.
            </p>
            <p className="text-[#A0A0A5]">
              Your current score: <span className="text-[#FFD700] font-bold">{score || 0}</span>
            </p>
            <div className="mt-6 text-sm text-[#8A8A8F]">
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
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
          <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6 flex items-center gap-3">
            ✏️ Create New Proposal
          </h2>

          {/* Proposal Type Selection */}
          <div className="mb-6">
            <label className="block text-[#A0A0A5] text-sm mb-3">Proposal Type</label>
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
                      ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                      : 'bg-[#1A1A1D] border-[#3A3A3F] text-[#A0A0A5] hover:border-[#00F0FF]/50'
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
              <label className="block text-[#A0A0A5] text-sm mb-2">Proposal Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Reduce burn fee from 2% to 1.5%"
                required
                className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[#A0A0A5] text-sm mb-2">Full Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the proposal in detail. Include motivation, expected impact, and any relevant data..."
                required
                rows={6}
                className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none resize-none"
              />
            </div>

            {/* Treasury-specific fields */}
            {proposalType === 'treasury' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#A0A0A5] text-sm mb-2">Amount (VFIDE) *</label>
                  <input
                    type="number"
                    value={formData.treasuryAmount}
                    onChange={(e) => setFormData({...formData, treasuryAmount: e.target.value})}
                    placeholder="10000"
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#A0A0A5] text-sm mb-2">Recipient Address *</label>
                  <input
                    type="text"
                    value={formData.treasuryRecipient}
                    onChange={(e) => setFormData({...formData, treasuryRecipient: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Technical fields for parameter/upgrade */}
            {(proposalType === 'parameter' || proposalType === 'upgrade') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[#A0A0A5] text-sm mb-2">Target Contract Address</label>
                  <input
                    type="text"
                    value={formData.targetContract}
                    onChange={(e) => setFormData({...formData, targetContract: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[#A0A0A5] text-sm mb-2">Calldata (hex)</label>
                  <input
                    type="text"
                    value={formData.calldata}
                    onChange={(e) => setFormData({...formData, calldata: e.target.value})}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-[#8A8A8F] mt-1">
                    Leave empty for text-only proposals. For technical proposals, encode the function call.
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg p-4">
              <h4 className="text-[#FFD700] font-bold mb-2">📋 Proposal Guidelines</h4>
              <ul className="text-sm text-[#A0A0A5] space-y-1">
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
                  ? 'bg-[#3A3A3F] text-[#8A8A8F] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] hover:scale-[1.02]'
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
  const [activeSection, setActiveSection] = useState<'members' | 'candidates' | 'register'>('members');
  const [isRegistering, setIsRegistering] = useState(false);
  const [candidateStatement, setCandidateStatement] = useState('');

  const requiredScoreToRun = 7000; // Minimum ProofScore to run for council (70% on 0-10000 scale)
  const canRun = (score || 0) >= requiredScoreToRun;

  // Mock council data - in production, read from CouncilElection contract
  // Council has 12 seats, 365-day terms, 7000 min ProofScore to run
  const councilMembers = [
    { address: '0x1a2b...3c4d', name: 'CryptoSage', score: 8500, term: 'Term 1', votes: 45200, status: 'active' },
    { address: '0x5e6f...7g8h', name: 'VaultMaster', score: 8200, term: 'Term 1', votes: 38500, status: 'active' },
    { address: '0x9i0j...1k2l', name: 'DeFiWhale', score: 8100, term: 'Term 1', votes: 32100, status: 'active' },
    { address: '0xmnop...qrst', name: 'TokenNinja', score: 7950, term: 'Term 1', votes: 28900, status: 'active' },
    { address: '0xuvwx...yz12', name: 'ChainGuard', score: 7800, term: 'Term 1', votes: 25400, status: 'active' },
    { address: '0x3456...7890', name: 'TrustBuilder', score: 7750, term: 'Term 1', votes: 23100, status: 'active' },
    { address: '0xabcd...ef01', name: 'ProofKeeper', score: 7680, term: 'Term 1', votes: 21800, status: 'active' },
    { address: '0x2345...6789', name: 'ScoreMaxer', score: 7550, term: 'Term 1', votes: 19500, status: 'active' },
    { address: '0xbcde...f012', name: 'VaultSentry', score: 7420, term: 'Term 1', votes: 18200, status: 'active' },
    { address: '0xcdef...0123', name: 'TrustWarden', score: 7350, term: 'Term 1', votes: 17100, status: 'active' },
    { address: '0xdef0...1234', name: 'ChainSage', score: 7280, term: 'Term 1', votes: 15800, status: 'active' },
    { address: '0xef01...2345', name: 'ProofMaster', score: 7150, term: 'Term 1', votes: 14500, status: 'active' },
  ];

  const candidates = [
    { address: '0xabc1...def2', name: 'RisingStar', score: 520, statement: 'I will focus on merchant adoption and reducing fees.', votes: 12500 },
    { address: '0xghi3...jkl4', name: 'NewVoice', score: 480, statement: 'Community first! More transparency in treasury.', votes: 8200 },
    { address: '0xmno5...pqr6', name: 'TechBuilder', score: 445, statement: 'Improve smart contract security and auditing.', votes: 5800 },
  ];

  const electionStatus = {
    phase: 'Voting', // 'Registration' | 'Voting' | 'Cooldown'
    daysLeft: 12,
    nextElection: 'Jan 15, 2026',
    totalCandidates: candidates.length,
    currentTerm: 1,
  };

  const handleRegister = async () => {
    if (!canRun || !candidateStatement) return;
    setIsRegistering(true);
    // In production: call CouncilElection.register(statement)
    await new Promise(r => setTimeout(r, 2000));
    setIsRegistering(false);
    alert('Registration submitted! You are now a council candidate.');
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {/* Election Status Banner */}
        <div className="bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700] rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#FFD700] mb-1">👑 Council Election - Term {electionStatus.currentTerm + 1}</h2>
              <p className="text-[#F5F3E8]">
                Phase: <span className="text-[#00F0FF] font-bold">{electionStatus.phase}</span> • 
                {electionStatus.daysLeft} days remaining
              </p>
            </div>
            <div className="text-right">
              <div className="text-[#A0A0A5] text-sm">Total Candidates</div>
              <div className="text-3xl font-bold text-[#F5F3E8]">{electionStatus.totalCandidates}</div>
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
                  ? 'bg-[#FFD700] text-[#1A1A1D]'
                  : 'bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#FFD700]'
              }`}
            >
              {section.label}
              {section.count !== null && (
                <span className="ml-2 px-2 py-0.5 bg-[#1A1A1D] rounded-full text-xs">{section.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Current Council Members */}
        {activeSection === 'members' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Current Council (Term {electionStatus.currentTerm})</h3>
            <div className="grid gap-4">
              {councilMembers.map((member, idx) => (
                <div key={idx} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#FFD700]/20 rounded-full flex items-center justify-center text-2xl">
                        {idx === 0 ? '👑' : '⭐'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#F5F3E8] font-bold text-lg">{member.name}</span>
                          {idx === 0 && <span className="px-2 py-0.5 bg-[#FFD700] text-[#1A1A1D] rounded text-xs font-bold">LEAD</span>}
                        </div>
                        <div className="text-[#A0A0A5] text-sm font-mono">{member.address}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <div className="text-[#A0A0A5]">ProofScore</div>
                        <div className="text-[#00F0FF] font-bold">{member.score}</div>
                      </div>
                      <div>
                        <div className="text-[#A0A0A5]">Votes Received</div>
                        <div className="text-[#50C878] font-bold">{member.votes.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[#A0A0A5]">Status</div>
                        <div className="text-[#50C878] font-bold capitalize">{member.status}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidates */}
        {activeSection === 'candidates' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Election Candidates</h3>
            {electionStatus.phase !== 'Voting' && (
              <div className="bg-[#FFA500]/20 border border-[#FFA500] rounded-lg p-4 mb-4">
                <p className="text-[#FFA500]">⚠️ Voting is not currently active. Next election: {electionStatus.nextElection}</p>
              </div>
            )}
            <div className="grid gap-4">
              {candidates.map((candidate, idx) => (
                <div key={idx} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[#F5F3E8] font-bold text-lg">{candidate.name}</span>
                        <span className="text-[#00F0FF] text-sm">Score: {candidate.score}</span>
                      </div>
                      <p className="text-[#A0A0A5] text-sm mb-2">&quot;{candidate.statement}&quot;</p>
                      <div className="text-[#A0A0A5] text-xs font-mono">{candidate.address}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[#A0A0A5] text-sm">Current Votes</div>
                        <div className="text-[#50C878] font-bold text-xl">{candidate.votes.toLocaleString()}</div>
                      </div>
                      {electionStatus.phase === 'Voting' && isConnected && (
                        <button className="px-6 py-3 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#45B069] transition-colors">
                          Vote
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Register as Candidate */}
        {activeSection === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
              <h3 className="text-2xl font-bold text-[#F5F3E8] mb-6">✋ Run for Council</h3>
              
              {!isConnected ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔒</div>
                  <p className="text-[#A0A0A5]">Connect your wallet to register as a candidate</p>
                </div>
              ) : !canRun ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-[#A0A0A5] mb-4">
                    You need at least <span className="text-[#FFD700] font-bold">{requiredScoreToRun} ProofScore</span> to run for council.
                  </p>
                  <p className="text-[#8A8A8F]">Your score: {score || 0}</p>
                </div>
              ) : electionStatus.phase !== 'Registration' && electionStatus.phase !== 'Voting' ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-[#A0A0A5]">Registration is not currently open.</p>
                  <p className="text-[#8A8A8F] mt-2">Next election: {electionStatus.nextElection}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg p-4">
                    <h4 className="text-[#FFD700] font-bold mb-2">📋 Requirements</h4>
                    <ul className="text-sm text-[#A0A0A5] space-y-1">
                      <li>✓ ProofScore ≥ {requiredScoreToRun} <span className="text-[#50C878]">(You: {score || 0})</span></li>
                      <li>✓ No active blacklist flags</li>
                      <li>✓ Wallet connected for at least 30 days</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-[#A0A0A5] text-sm mb-2">Your Campaign Statement *</label>
                    <textarea
                      value={candidateStatement}
                      onChange={(e) => setCandidateStatement(e.target.value)}
                      placeholder="Why should voters choose you? What will you focus on as a council member?"
                      rows={4}
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#FFD700] focus:outline-none resize-none"
                    />
                    <p className="text-xs text-[#8A8A8F] mt-1">{candidateStatement.length}/500 characters</p>
                  </div>

                  <button
                    onClick={handleRegister}
                    disabled={isRegistering || !candidateStatement}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      isRegistering || !candidateStatement
                        ? 'bg-[#3A3A3F] text-[#8A8A8F] cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1A1A1D] hover:scale-[1.02]'
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
