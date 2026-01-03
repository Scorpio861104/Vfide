"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Award, 
  DollarSign, 
  Clock, 
  Shield, 
  Vote,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  Crown,
  Loader2,
  Sparkles
} from "lucide-react";

// CouncilElection ABI
const COUNCIL_ELECTION_ABI = [
  { name: 'register', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unregister', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'getCandidates', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'getCouncilMembers', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
  { name: 'isCandidate', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'isCouncilMember', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'canRegister', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'eligible', type: 'bool' }, { name: 'reason', type: 'string' }] },
  { name: 'canServeNextTerm', type: 'function', stateMutability: 'view', inputs: [{ name: 'member', type: 'address' }], outputs: [{ name: 'eligible', type: 'bool' }, { name: 'termsServed', type: 'uint8' }, { name: 'cooldownEnds', type: 'uint64' }] },
  { name: 'getElectionStatus', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'councilSize', type: 'uint8' }, { name: 'minScore', type: 'uint16' }, { name: 'termLength', type: 'uint64' }, { name: 'refreshPeriod', type: 'uint64' }, { name: 'lastRefresh', type: 'uint64' }, { name: 'candidateCount', type: 'uint256' }] },
  { name: 'getActualCouncilSize', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// CouncilSalary ABI
const COUNCIL_SALARY_ABI = [
  { name: 'claimSalary', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'getClaimable', type: 'function', stateMutability: 'view', inputs: [{ name: 'member', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'salaryPerMonth', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'lastClaim', type: 'function', stateMutability: 'view', inputs: [{ name: 'member', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// Contract addresses from environment (CouncilElection and CouncilSalary not deployed to testnet yet)
const COUNCIL_ELECTION_ADDRESS = (process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const COUNCIL_SALARY_ADDRESS = (process.env.NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Check if contracts are deployed (not zero address)
const IS_COUNCIL_ELECTION_DEPLOYED = COUNCIL_ELECTION_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_COUNCIL_SALARY_DEPLOYED = COUNCIL_SALARY_ADDRESS !== '0x0000000000000000000000000000000000000000';

type TabType = 'overview' | 'members' | 'salary' | 'voting';

export default function CouncilPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read council members
  const { data: councilMembers } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'getCouncilMembers',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  // Read candidates
  const { data: candidates } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'getCandidates',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  // Read election status
  const { data: electionStatus } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'getElectionStatus',
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED },
  });

  // Read if user is candidate
  const { data: isCandidate } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'isCandidate',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  // Read if user is council member
  const { data: isCouncilMember } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'isCouncilMember',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  // Read claimable salary
  const { data: claimableSalary } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: COUNCIL_SALARY_ABI,
    functionName: 'getClaimable',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_SALARY_DEPLOYED && !!address },
  });

  // Read can register
  const { data: canRegisterResult } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'canRegister',
    args: address ? [address] : undefined,
    query: { enabled: IS_COUNCIL_ELECTION_DEPLOYED && !!address },
  });

  // Handlers
  const handleRegister = () => {
    writeContract({
      address: COUNCIL_ELECTION_ADDRESS,
      abi: COUNCIL_ELECTION_ABI,
      functionName: 'register',
    });
  };

  const handleUnregister = () => {
    writeContract({
      address: COUNCIL_ELECTION_ADDRESS,
      abi: COUNCIL_ELECTION_ABI,
      functionName: 'unregister',
    });
  };

  const handleClaimSalary = () => {
    writeContract({
      address: COUNCIL_SALARY_ADDRESS,
      abi: COUNCIL_SALARY_ABI,
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
      <GlobalNav />
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-16"
      >
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-full mb-4"
            >
              <Crown className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-400 text-sm font-medium">Governance Council</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
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
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
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
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'members' && <MembersTab />}
              {activeTab === 'salary' && <SalaryTab isConnected={isConnected} />}
              {activeTab === 'voting' && <VotingTab isConnected={isConnected} />}
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
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <GlassCard className="p-8 text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 inline-block mb-4">
          <Users className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">VFIDE Governance Council</h2>
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
          { value: '12', label: 'Council Seats', gradient: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
          { value: '--', label: 'Active Members', gradient: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
          { value: '365', label: 'Days Term Length', gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
          { value: '120d', label: 'Pay Interval', gradient: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-6 text-center`}
          >
            <div className={`text-3xl font-bold ${stat.text}`}>{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Responsibilities */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
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
          ].map((item, idx) => (
            <motion.div 
              key={item.title}
              whileHover={{ scale: 1.02 }}
              className={`flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br ${item.bg} border ${item.border}`}
            >
              <item.icon className={`${item.color} flex-shrink-0`} size={24} />
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

function MembersTab() {
  const members = [
    { 
      address: '0x1234...5678', 
      name: 'Council Member 1',
      role: 'Chair',
      proofScore: 95,
      joinedDays: 180,
      status: 'active'
    },
    { 
      address: '0x2345...6789', 
      name: 'Council Member 2',
      role: 'Secretary',
      proofScore: 88,
      joinedDays: 120,
      status: 'active'
    },
    { 
      address: '0x3456...7890', 
      name: 'Council Member 3',
      role: 'Treasury Lead',
      proofScore: 92,
      joinedDays: 90,
      status: 'active'
    },
    { 
      address: '0x4567...8901', 
      name: 'Council Member 4',
      role: 'Tech Lead',
      proofScore: 85,
      joinedDays: 60,
      status: 'active'
    },
    { 
      address: '0x5678...9012', 
      name: 'Council Member 5',
      role: 'Community Lead',
      proofScore: 78,
      joinedDays: 45,
      status: 'active'
    },
    { 
      address: '0x6789...0123', 
      name: 'Council Member 6',
      role: 'Member',
      proofScore: 72,
      joinedDays: 30,
      status: 'active'
    },
    { 
      address: '—', 
      name: 'Vacant Seat',
      role: 'Open',
      proofScore: 0,
      joinedDays: 0,
      status: 'vacant'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Members List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
            <Crown className="w-5 h-5 text-indigo-400" />
          </div>
          Current Council Members
        </h3>
        <div className="space-y-4">
          {members.map((member, idx) => (
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
                    : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                } font-bold`}>
                  {member.status === 'vacant' ? '?' : idx + 1}
                </div>
                <div>
                  <div className="text-white font-bold">{member.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{member.address}</div>
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
                      Score: {member.proofScore}
                    </span>
                    <span className="text-xs text-gray-400">
                      <Calendar size={12} className="inline mr-1" />
                      {member.joinedDays} days
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Daily Score Check */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20">
            <TrendingUp className="text-cyan-400" size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Daily Score Verification</h3>
            <p className="text-gray-400 text-sm">CouncilManager checks member ProofScores daily</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Last Check</span>
            <span className="text-white">Today, 00:00 UTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Members Passing</span>
            <span className="text-emerald-400 font-semibold">12 / 12</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Minimum Required Score</span>
            <span className="text-cyan-400 font-semibold">7000 (70%)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SalaryTab({ isConnected }: { isConnected: boolean }) {
  // Salary is NOT fixed - funded by ecosystem fees, distributed every 120 days
  const salaryHistory = [
    { period: 'Period 1 (Days 1-120)', amount: 'Variable (fees collected)', recipients: 12, status: 'pending' },
  ];

  return (
    <div className="space-y-8">
      {/* Salary Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20">
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
          ].map((stat, idx) => (
            <div key={idx} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-xl p-4`}>
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
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Distribution History</h3>
        <div className="space-y-3">
          {salaryHistory.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Calendar className="text-gray-400" size={20} />
                </div>
                <div>
                  <div className="text-white font-bold">{entry.period}</div>
                  <div className="text-xs text-gray-400">{entry.recipients} recipients</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold">{entry.amount}</div>
                <div className="text-xs text-emerald-400">
                  <CheckCircle size={12} className="inline mr-1" />
                  Distributed
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trigger Distribution (Admin) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Distribute Salary</h3>
        <p className="text-gray-400 text-sm mb-4">
          Keeper can trigger monthly salary distribution on or after the 1st of each month.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Next Distribution Available</span>
            <span className="text-cyan-400 font-bold">January 1, 2026</span>
          </div>
        </div>
        <button 
          className="w-full bg-white/5 text-gray-500 font-bold py-3 rounded-xl border border-white/10 cursor-not-allowed"
          disabled
        >
          Distribution Not Available Yet
        </button>
      </motion.div>
    </div>
  );
}

function VotingTab({ isConnected }: { isConnected: boolean }) {
  const removalVotes = [
    {
      target: '0x9876...5432',
      targetName: 'Council Member X',
      reason: 'ProofScore dropped below threshold for 30 days',
      votesFor: 4,
      votesNeeded: 5,
      deadline: '2 days',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Voting Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 backdrop-blur-xl border border-red-500/20 p-8"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20">
            <Vote className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Member Removal Voting</h2>
            <p className="text-gray-400">Council members can vote to remove underperforming members</p>
          </div>
        </div>
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 text-sm font-bold">Vote Threshold: &gt;50% (7/12)</p>
          <p className="text-gray-400 text-sm">At least 7 council members must vote for removal</p>
        </div>
      </motion.div>

      {/* Active Removal Votes */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold text-white mb-6">Active Removal Votes</h3>
        {removalVotes.length > 0 ? (
          <div className="space-y-4">
            {removalVotes.map((vote, idx) => (
              <div key={idx} className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-white font-bold">{vote.targetName}</div>
                    <div className="text-xs text-gray-400 font-mono">{vote.target}</div>
                  </div>
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold">
                    Removal Vote
                  </span>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Reason:</div>
                  <p className="text-white text-sm bg-white/5 border border-white/10 p-3 rounded-xl">{vote.reason}</p>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Votes:</span>
                    <span className="text-cyan-400 font-bold">{vote.votesFor}/{vote.votesNeeded}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={14} />
                    {vote.deadline} remaining
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(vote.votesFor / vote.votesNeeded) * 100}%` }}
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                  />
                </div>
                {isConnected ? (
                  <div className="flex gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-2 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
                    >
                      Vote For Removal
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-white/5 border border-white/10 text-white font-bold py-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      Abstain
                    </motion.button>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm">Connect wallet to vote</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-block mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-gray-400">No active removal votes</p>
          </div>
        )}
      </motion.div>

      {/* Initiate Removal (Council Only) */}
      {isConnected && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
        >
          <h3 className="text-xl font-bold text-white mb-4">Initiate Member Removal</h3>
          <p className="text-gray-400 text-sm mb-4">
            Council members can propose removal of another member who fails to meet requirements.
          </p>
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Target Member Address</label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Reason for Removal</label>
              <textarea
                placeholder="Describe why this member should be removed..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle size={18} />
            Propose Removal
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
