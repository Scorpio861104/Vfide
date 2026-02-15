'use client';

import { Footer } from "@/components/layout/Footer";
import { CouncilElectionABI, CouncilSalaryABI, SeerABI } from "@/lib/abis";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  DollarSign, 
  Shield, 
  Vote,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  Crown,
  Sparkles
} from "lucide-react";

// Contract addresses from environment
const COUNCIL_ELECTION_ADDRESS = (process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const COUNCIL_SALARY_ADDRESS = (process.env.NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const SEER_ADDRESS = (process.env.NEXT_PUBLIC_SEER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Check if contracts are deployed (not zero address)
const IS_COUNCIL_ELECTION_DEPLOYED = COUNCIL_ELECTION_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_COUNCIL_SALARY_DEPLOYED = COUNCIL_SALARY_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_SEER_DEPLOYED = SEER_ADDRESS !== '0x0000000000000000000000000000000000000000';

type TabType = 'overview' | 'members' | 'salary' | 'voting';

export default function CouncilPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Contract write hooks
  const { writeContract, data: hash, isPending: _isPending } = useWriteContract();
  const { isLoading: _isConfirming, isSuccess: _isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read council members
  const { data: _councilMembers } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'getCouncilMembers',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: _councilSize } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'councilSize',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: _minCouncilScore } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'minCouncilScore',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: _termEnd } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'termEnd',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  const { data: _termSeconds } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'termSeconds',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  // Read candidates
  const { data: _candidates } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'getCandidates',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  // Read election status
  const { data: _electionStatus } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'getElectionStatus',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  // Read if user is candidate
  const { data: _isCandidate } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'isCandidate',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  // Read if user is council member
  const { data: _isCouncilMember } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'isCouncilMember',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  // Read claimable salary
  const { data: _claimableSalary } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: CouncilSalaryABI,
    functionName: 'getClaimable',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED && !!address },
  });

  const { data: _lastPayTime } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: CouncilSalaryABI,
    functionName: 'lastPayTime',
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED },
  });

  const { data: _payInterval } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: CouncilSalaryABI,
    functionName: 'payInterval',
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED },
  });

  const { data: _minScoreToPay } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: CouncilSalaryABI,
    functionName: 'minScoreToPay',
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED },
  });

  const { data: _complianceMode } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: CouncilSalaryABI,
    functionName: 'complianceMode',
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED },
  });

  const { data: _currentTerm } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: CouncilSalaryABI,
    functionName: 'currentTerm',
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED },
  });

  // Read can register
  const { data: _canRegisterResult } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: CouncilElectionABI,
    functionName: 'canRegister',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  // Handlers
  const _handleRegister = () => {
    writeContract({
      address: COUNCIL_ELECTION_ADDRESS,
      abi: CouncilElectionABI,
      functionName: 'register',
    });
  };

  const _handleUnregister = () => {
    writeContract({
      address: COUNCIL_ELECTION_ADDRESS,
      abi: CouncilElectionABI,
      functionName: 'unregister',
    });
  };

  const _handleClaimSalary = () => {
    writeContract({
      address: COUNCIL_SALARY_ADDRESS,
      abi: CouncilSalaryABI,
      functionName: 'claimSalary',
    });
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Users },
    { id: 'members' as const, label: 'Council Members', icon: Crown },
    { id: 'salary' as const, label: 'Salary Distribution', icon: DollarSign },
    { id: 'voting' as const, label: 'Member Voting', icon: Vote },
  ];

  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-16"
      >
        <div className="container mx-auto px-3 sm:px-4">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-full mb-4"
            >
              <Crown className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-400 text-sm font-medium">Governance Council</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400">
                Council Management
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Governance council operations, member management, and salary distribution
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    isActive
                      ? 'bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                      : 'bg-white/5 text-gray-400 hover:bg-indigo-500/10 hover:text-indigo-400'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <OverviewTab
                  councilSize={typeof _councilSize === 'bigint' ? Number(_councilSize) : undefined}
                  councilMembers={Array.isArray(_councilMembers) ? _councilMembers.length : undefined}
                  termSeconds={typeof _termSeconds === 'bigint' ? Number(_termSeconds) : undefined}
                  payInterval={typeof _payInterval === 'bigint' ? Number(_payInterval) : undefined}
                />
              )}
              {activeTab === 'members' && (
                <MembersTab
                  councilMembers={_councilMembers as `0x${string}`[] | undefined}
                  councilSize={typeof _councilSize === 'bigint' ? Number(_councilSize) : undefined}
                  minCouncilScore={typeof _minCouncilScore === 'bigint' ? Number(_minCouncilScore) : undefined}
                  termEnd={typeof _termEnd === 'bigint' ? Number(_termEnd) : undefined}
                />
              )}
              {activeTab === 'salary' && (
                <SalaryTab
                  isConnected={isConnected}
                  claimable={typeof _claimableSalary === 'bigint' ? _claimableSalary : undefined}
                  lastPayTime={typeof _lastPayTime === 'bigint' ? Number(_lastPayTime) : undefined}
                  payInterval={typeof _payInterval === 'bigint' ? Number(_payInterval) : undefined}
                  minScoreToPay={typeof _minScoreToPay === 'bigint' ? Number(_minScoreToPay) : undefined}
                  complianceMode={typeof _complianceMode === 'boolean' ? _complianceMode : undefined}
                />
              )}
              {activeTab === 'voting' && (
                <VotingTab
                  isConnected={isConnected}
                  currentTerm={typeof _currentTerm === 'bigint' ? Number(_currentTerm) : undefined}
                  councilSize={typeof _councilSize === 'bigint' ? Number(_councilSize) : undefined}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}

// GlassCard component
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function OverviewTab({
  councilSize,
  councilMembers,
  termSeconds,
  payInterval,
}: {
  councilSize?: number;
  councilMembers?: number;
  termSeconds?: number;
  payInterval?: number;
}) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <GlassCard className="p-8 text-center bg-linear-to-br from-indigo-500/10 to-purple-500/5">
        <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 inline-block mb-4">
          <Users className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-indigo-400 to-purple-400">VFIDE Governance Council</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          The Council manages day-to-day protocol operations, reviews proposals, and ensures 
          the smooth functioning of the VFIDE ecosystem. Members are elected by token holders.
        </p>
      </GlassCard>

      {/* Council Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          {
            value: typeof councilSize === 'number' ? councilSize.toString() : '—',
            label: 'Council Seats',
            gradient: 'from-cyan-500/20 to-blue-500/10',
            border: 'border-cyan-500/20',
            text: 'text-cyan-400',
          },
          {
            value: typeof councilMembers === 'number' ? councilMembers.toString() : '—',
            label: 'Active Members',
            gradient: 'from-emerald-500/20 to-green-500/10',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400',
          },
          {
            value: typeof termSeconds === 'number' ? Math.round(termSeconds / 86400).toString() : '—',
            label: 'Days Term Length',
            gradient: 'from-amber-500/20 to-orange-500/10',
            border: 'border-amber-500/20',
            text: 'text-amber-400',
          },
          {
            value: typeof payInterval === 'number' ? `${Math.round(payInterval / 86400)}d` : '—',
            label: 'Pay Interval',
            gradient: 'from-purple-500/20 to-pink-500/10',
            border: 'border-purple-500/20',
            text: 'text-purple-400',
          },
        ].map((stat, _idx) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`bg-linear-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-6 text-center`}
          >
            <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Responsibilities */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-indigo-500/20 to-indigo-500/5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          Council Responsibilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Shield, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20', title: 'Protocol Security', desc: 'Monitor and respond to security incidents, manage emergency controls' },
            { icon: Vote, color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/20', title: 'Proposal Review', desc: 'Review and recommend DAO proposals before community voting' },
            { icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', title: 'Treasury Oversight', desc: 'Approve multi-sig transactions and manage fund allocations' },
            { icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/20', title: 'Ecosystem Growth', desc: 'Drive partnerships, integrations, and community expansion' },
          ].map((item, _idx) => (
            <motion.div 
              key={item.title}
              whileHover={{ scale: 1.02 }}
              className={`flex items-start gap-4 p-4 rounded-xl bg-linear-to-br ${item.bg} border ${item.border}`}
            >
              <item.icon className={`${item.color} shrink-0`} size={24} />
              <div>
                <h4 className="text-white font-bold mb-1">{item.title}</h4>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Contracts Info */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Smart Contracts</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-bold">CouncilManager</div>
              <div className="text-xs text-gray-400">Daily score checks and payment distribution</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-bold">CouncilSalary</div>
              <div className="text-xs text-gray-400">Salary distribution and removal voting</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">Active</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-bold">CouncilElection</div>
              <div className="text-xs text-gray-400">Election cycles and candidate registration</div>
            </div>
            <span className="text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">Active</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function MembersTab({
  councilMembers,
  councilSize,
  minCouncilScore,
  termEnd,
}: {
  councilMembers?: `0x${string}`[];
  councilSize?: number;
  minCouncilScore?: number;
  termEnd?: number;
}) {
  const membersList = councilMembers ?? [];
  const { data: scoreReads } = useReadContracts({
    contracts: membersList.map((member) => ({
      address: SEER_ADDRESS,
      abi: SeerABI,
      functionName: 'getScore',
      args: [member],
    })),
    query: { enabled: IS_SEER_DEPLOYED && membersList.length > 0 },
  });

  const scores = (scoreReads ?? []).map((read) => (read && read.status === 'success' ? Number(read.result as bigint) : null));

  const members = (councilMembers ?? []).map((address, idx) => ({
    address,
    name: `Council Member ${idx + 1}`,
    role: idx === 0 ? 'Chair' : 'Member',
    status: 'active' as const,
    score: scores[idx] ?? null,
  }));

  const vacantCount = Math.max((councilSize ?? 0) - members.length, 0);
  const vacants = Array.from({ length: vacantCount }).map((_, idx) => ({
    address: '—',
    name: `Vacant Seat ${idx + 1}`,
    role: 'Open',
    status: 'vacant' as const,
  }));

  const displayMembers = [...members, ...vacants];
  const termEndsLabel = termEnd ? new Date(termEnd * 1000).toLocaleDateString() : '—';
  return (
    <div className="space-y-8">
      {/* Members List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-indigo-500/20 to-indigo-500/5">
            <Crown className="w-5 h-5 text-indigo-400" />
          </div>
          Current Council Members
        </h3>
        <div className="space-y-4">
          {displayMembers.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No council members found.</div>
          ) : (
            displayMembers.map((member, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.005, x: 4 }}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl ${
                member.status === 'vacant' 
                  ? 'bg-white/5 border border-dashed border-white/20' 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-4 mb-3 md:mb-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  member.status === 'vacant' 
                    ? 'bg-white/5 border border-white/10 text-gray-500' 
                    : 'bg-linear-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                } font-bold`}>
                  {member.status === 'vacant' ? '?' : idx + 1}
                </div>
                <div>
                  <div className="text-white font-bold">{member.name}</div>
                  <div className="text-xs text-gray-400 font-mono truncate max-w-[120px] sm:max-w-[200px]">{member.address}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  member.role === 'Chair' 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : member.role === 'Open'
                    ? 'bg-white/5 text-gray-400 border-white/10'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                }`}>
                  {member.role}
                </span>
                {member.status !== 'vacant' && (
                  <>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                      Score: {member.score ?? '—'}
                    </span>
                    <span className="text-xs text-gray-400">
                      <Calendar size={12} className="inline mr-1" />
                      Term ends: {termEndsLabel}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )))
          }
        </div>
      </motion.div>

      {/* Daily Score Check */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 rounded-xl bg-linear-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
            <TrendingUp className="text-cyan-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Daily Score Verification</h3>
            <p className="text-gray-400 text-sm">CouncilManager checks member ProofScores daily</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Council Seats</span>
            <span className="text-white">{members.length} / {councilSize ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Minimum Required Score</span>
            <span className="text-cyan-400 font-semibold">{minCouncilScore ?? '—'} (0-10000 scale)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SalaryTab({
  isConnected: _isConnected,
  claimable,
  lastPayTime,
  payInterval,
  minScoreToPay,
  complianceMode,
}: {
  isConnected: boolean;
  claimable?: bigint;
  lastPayTime?: number;
  payInterval?: number;
  minScoreToPay?: number;
  complianceMode?: boolean;
}) {
  const lastPayLabel = lastPayTime ? new Date(lastPayTime * 1000).toLocaleDateString() : '—';
  const nextPayLabel = lastPayTime && payInterval
    ? new Date((lastPayTime + payInterval) * 1000).toLocaleDateString()
    : '—';
  const claimableLabel = typeof claimable === 'bigint' ? `${Number(claimable) / 1e18}` : '—';

  return (
    <div className="space-y-8">
      {/* Salary Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 p-4 sm:p-6 md:p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-linear-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Council Salary System</h2>
            <p className="text-gray-400">Fee-funded compensation for eligible council members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: 'Variable', label: 'Funded by ecosystem fees', gradient: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
            { value: '120 Days', label: 'Distribution Interval', gradient: 'from-white/10 to-white/5', border: 'border-white/10', text: 'text-white' },
            { value: 'Equal', label: 'Split among eligible', gradient: 'from-cyan-500/20 to-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-400' },
          ].map((stat) => (
            <div key={stat.label} className={`bg-linear-to-br ${stat.gradient} border ${stat.border} rounded-xl p-4`}>
              <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Distribution History */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Distribution History</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <Calendar className="text-gray-400" size={20} />
              </div>
              <div>
                <div className="text-white font-bold">Last Distribution</div>
                <div className="text-xs text-gray-400">{lastPayLabel}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-bold">Variable (fees collected)</div>
              <div className="text-xs text-emerald-400">
                <CheckCircle size={12} className="inline mr-1" />
                {complianceMode ? 'Paused (Compliance Mode)' : 'Recorded'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Trigger Distribution (Admin) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Distribute Salary</h3>
        <p className="text-gray-400 text-sm mb-4">
          Keeper can trigger monthly salary distribution on or after the 1st of each month.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Next Distribution Available</span>
            <span className="text-cyan-400 font-bold">{nextPayLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Minimum Score to Pay</span>
            <span className="text-white">{minScoreToPay ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Your Claimable</span>
            <span className="text-emerald-400 font-bold">{claimableLabel} VFIDE</span>
          </div>
        </div>
        <button 
          className="w-full bg-white/5 text-gray-500 font-bold py-3 rounded-xl border border-white/10 cursor-not-allowed"
          disabled
        >
          {complianceMode ? 'Distribution Disabled (Compliance Mode)' : 'Distribution Not Available Yet'}
        </button>
      </motion.div>
    </div>
  );
}

function VotingTab({ isConnected, currentTerm, councilSize }: { isConnected: boolean; currentTerm?: number; councilSize?: number }) {

  return (
    <div className="space-y-8">
      {/* Voting Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-red-500/10 to-orange-500/5 backdrop-blur-xl border border-red-500/20 p-4 sm:p-6 md:p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-linear-to-br from-red-500/20 to-red-500/5 border border-red-500/20">
            <Vote className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Member Removal Voting</h2>
            <p className="text-gray-400">Council members can vote to remove underperforming members</p>
          </div>
        </div>
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 text-sm font-bold">Vote Threshold: &gt;50% ({councilSize ? `${Math.floor(councilSize / 2) + 1}/${councilSize}` : '—'})</p>
          <p className="text-gray-400 text-sm">Term #{currentTerm ?? '—'} · Council removal votes are term-scoped</p>
        </div>
      </motion.div>

      {/* Active Removal Votes */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Active Removal Votes</h3>
        <div className="text-center py-8">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-block mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-gray-400">No active removal votes available on-chain.</p>
        </div>
      </motion.div>

      {/* Initiate Removal (Council Only) */}
      {isConnected && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Initiate Member Removal</h3>
          <p className="text-gray-400 text-sm mb-4">
            Council members can propose removal of another member who fails to meet requirements.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg p-3 mb-4">
            Removal initiation is not exposed on-chain. Use a DAO proposal for governance actions.
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Target Member Address</label>
              <input
                type="text"
                placeholder="0x..."
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Reason for Removal</label>
              <textarea
                placeholder="Describe why this member should be removed..."
                rows={3}
                maxLength={500}
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled
            className="w-full bg-white/5 text-gray-500 font-bold py-3 rounded-xl border border-white/10 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <AlertTriangle size={18} />
            Propose Removal (Unavailable)
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
