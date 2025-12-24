"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { formatUnits } from "viem";
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
  Loader2
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

// Contract addresses (CouncilElection and CouncilSalary not deployed to testnet yet)
const COUNCIL_ELECTION_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;
const COUNCIL_SALARY_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`;

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
  });

  // Read candidates
  const { data: candidates } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'getCandidates',
  });

  // Read election status
  const { data: electionStatus } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'getElectionStatus',
  });

  // Read if user is candidate
  const { data: isCandidate } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'isCandidate',
    args: address ? [address] : undefined,
  });

  // Read if user is council member
  const { data: isCouncilMember } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'isCouncilMember',
    args: address ? [address] : undefined,
  });

  // Read claimable salary
  const { data: claimableSalary } = useReadContract({
    address: COUNCIL_SALARY_ADDRESS,
    abi: COUNCIL_SALARY_ABI,
    functionName: 'getClaimable',
    args: address ? [address] : undefined,
  });

  // Read can register
  const { data: canRegisterResult } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS,
    abi: COUNCIL_ELECTION_ABI,
    functionName: 'canRegister',
    args: address ? [address] : undefined,
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
      <main className="min-h-screen bg-[#0D0D0F] pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-4">
              Council Management
            </h1>
            <p className="text-[#A0A0A5] text-lg max-w-2xl mx-auto">
              Governance council operations, member management, and salary distribution
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#00F0FF] text-[#0D0D0F]'
                    : 'bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#F5F3E8]'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'salary' && <SalaryTab isConnected={isConnected} />}
          {activeTab === 'voting' && <VotingTab isConnected={isConnected} />}
        </div>
      </main>
      <Footer />
    </>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-8 text-center">
        <Users className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-[#F5F3E8] mb-4">VFIDE Governance Council</h2>
        <p className="text-[#A0A0A5] max-w-2xl mx-auto">
          The Council manages day-to-day protocol operations, reviews proposals, and ensures 
          the smooth functioning of the VFIDE ecosystem. Members are elected by token holders.
        </p>
      </div>

      {/* Council Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-[#00F0FF]">12</div>
          <div className="text-sm text-[#A0A0A5]">Council Seats</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-green-400">--</div>
          <div className="text-sm text-[#A0A0A5]">Active Members</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-yellow-400">365</div>
          <div className="text-sm text-[#A0A0A5]">Days Term Length</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">120d</div>
          <div className="text-sm text-[#A0A0A5]">Pay Interval</div>
        </div>
      </div>

      {/* Responsibilities */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Council Responsibilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <Shield className="text-cyan-400 flex-shrink-0" size={24} />
            <div>
              <h4 className="text-[#F5F3E8] font-bold mb-1">Protocol Security</h4>
              <p className="text-[#A0A0A5] text-sm">Monitor and respond to security incidents, manage emergency controls</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Vote className="text-purple-400 flex-shrink-0" size={24} />
            <div>
              <h4 className="text-[#F5F3E8] font-bold mb-1">Proposal Review</h4>
              <p className="text-[#A0A0A5] text-sm">Review and recommend DAO proposals before community voting</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <DollarSign className="text-green-400 flex-shrink-0" size={24} />
            <div>
              <h4 className="text-[#F5F3E8] font-bold mb-1">Treasury Oversight</h4>
              <p className="text-[#A0A0A5] text-sm">Approve multi-sig transactions and manage fund allocations</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <TrendingUp className="text-yellow-400 flex-shrink-0" size={24} />
            <div>
              <h4 className="text-[#F5F3E8] font-bold mb-1">Ecosystem Growth</h4>
              <p className="text-[#A0A0A5] text-sm">Drive partnerships, integrations, and community expansion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Info */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Smart Contracts</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
            <div>
              <div className="text-[#F5F3E8] font-bold">CouncilManager</div>
              <div className="text-xs text-[#A0A0A5]">Daily score checks and payment distribution</div>
            </div>
            <span className="text-green-400 text-xs font-bold">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
            <div>
              <div className="text-[#F5F3E8] font-bold">CouncilSalary</div>
              <div className="text-xs text-[#A0A0A5]">Salary distribution and removal voting</div>
            </div>
            <span className="text-green-400 text-xs font-bold">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
            <div>
              <div className="text-[#F5F3E8] font-bold">CouncilElection</div>
              <div className="text-xs text-[#A0A0A5]">Election cycles and candidate registration</div>
            </div>
            <span className="text-green-400 text-xs font-bold">Active</span>
          </div>
        </div>
      </div>
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
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Current Council Members</h3>
        <div className="space-y-4">
          {members.map((member, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg ${
                member.status === 'vacant' ? 'bg-[#1A1A1D]/50 border border-dashed border-[#3A3A3F]' : 'bg-[#1A1A1D]'
              }`}
            >
              <div className="flex items-center gap-4 mb-3 md:mb-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  member.status === 'vacant' 
                    ? 'bg-[#2A2A2F] text-[#505055]' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                } font-bold`}>
                  {member.status === 'vacant' ? '?' : idx + 1}
                </div>
                <div>
                  <div className="text-[#F5F3E8] font-bold">{member.name}</div>
                  <div className="text-xs text-[#A0A0A5]">{member.address}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  member.role === 'Chair' 
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : member.role === 'Open'
                    ? 'bg-gray-500/20 text-gray-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {member.role}
                </span>
                {member.status !== 'vacant' && (
                  <>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                      Score: {member.proofScore}
                    </span>
                    <span className="text-xs text-[#A0A0A5]">
                      <Calendar size={12} className="inline mr-1" />
                      {member.joinedDays} days
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Score Check */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <TrendingUp className="text-cyan-400" size={24} />
          <div>
            <h3 className="text-xl font-bold text-[#F5F3E8]">Daily Score Verification</h3>
            <p className="text-[#A0A0A5] text-sm">CouncilManager checks member ProofScores daily</p>
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#A0A0A5]">Last Check</span>
            <span className="text-[#F5F3E8]">Today, 00:00 UTC</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#A0A0A5]">Members Passing</span>
            <span className="text-green-400">12 / 12</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#A0A0A5]">Minimum Required Score</span>
            <span className="text-[#00F0FF]">7000 (70%)</span>
          </div>
        </div>
      </div>
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
      <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 border border-green-500/30 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <DollarSign className="w-12 h-12 text-green-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">Council Salary System</h2>
            <p className="text-[#A0A0A5]">Fee-funded compensation for eligible council members</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">Variable</div>
            <div className="text-sm text-[#A0A0A5]">Funded by ecosystem fees</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-[#F5F3E8]">120 Days</div>
            <div className="text-sm text-[#A0A0A5]">Distribution Interval</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">Equal</div>
            <div className="text-sm text-[#A0A0A5]">Split among eligible</div>
          </div>
        </div>
      </div>

      {/* Distribution History */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Distribution History</h3>
        <div className="space-y-3">
          {salaryHistory.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg">
              <div className="flex items-center gap-4">
                <Calendar className="text-[#A0A0A5]" size={20} />
                <div>
                  <div className="text-[#F5F3E8] font-bold">{entry.period}</div>
                  <div className="text-xs text-[#A0A0A5]">{entry.recipients} recipients</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold">{entry.amount}</div>
                <div className="text-xs text-green-400">
                  <CheckCircle size={12} className="inline mr-1" />
                  Distributed
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger Distribution (Admin) */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Distribute Salary</h3>
        <p className="text-[#A0A0A5] text-sm mb-4">
          Keeper can trigger monthly salary distribution on or after the 1st of each month.
        </p>
        <div className="bg-[#1A1A1D] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[#A0A0A5]">Next Distribution Available</span>
            <span className="text-[#00F0FF] font-bold">January 1, 2026</span>
          </div>
        </div>
        <button 
          className="w-full bg-[#3A3A3F] text-[#707075] font-bold py-3 rounded-lg cursor-not-allowed"
          disabled
        >
          Distribution Not Available Yet
        </button>
      </div>
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
      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Vote className="w-12 h-12 text-red-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">Member Removal Voting</h2>
            <p className="text-[#A0A0A5]">Council members can vote to remove underperforming members</p>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400 text-sm font-bold">Vote Threshold: &gt;50% (7/12)</p>
          <p className="text-[#A0A0A5] text-sm">At least 7 council members must vote for removal</p>
        </div>
      </div>

      {/* Active Removal Votes */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Active Removal Votes</h3>
        {removalVotes.length > 0 ? (
          <div className="space-y-4">
            {removalVotes.map((vote, idx) => (
              <div key={idx} className="p-4 bg-[#1A1A1D] rounded-lg border border-red-500/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-[#F5F3E8] font-bold">{vote.targetName}</div>
                    <div className="text-xs text-[#A0A0A5]">{vote.target}</div>
                  </div>
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                    Removal Vote
                  </span>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-[#A0A0A5] mb-2">Reason:</div>
                  <p className="text-[#F5F3E8] text-sm bg-[#0D0D0F] p-3 rounded-lg">{vote.reason}</p>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[#A0A0A5]">Votes:</span>
                    <span className="text-[#00F0FF] font-bold">{vote.votesFor}/{vote.votesNeeded}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#A0A0A5]">
                    <Clock size={14} />
                    {vote.deadline} remaining
                  </div>
                </div>
                <div className="h-2 bg-[#0D0D0F] rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                    style={{ width: `${(vote.votesFor / vote.votesNeeded) * 100}%` }}
                  />
                </div>
                {isConnected ? (
                  <div className="flex gap-3">
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors">
                      Vote For Removal
                    </button>
                    <button className="flex-1 bg-[#3A3A3F] hover:bg-[#4A4A4F] text-[#F5F3E8] font-bold py-2 rounded-lg transition-colors">
                      Abstain
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-[#A0A0A5] text-sm">Connect wallet to vote</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-[#A0A0A5]">No active removal votes</p>
          </div>
        )}
      </div>

      {/* Initiate Removal (Council Only) */}
      {isConnected && (
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Initiate Member Removal</h3>
          <p className="text-[#A0A0A5] text-sm mb-4">
            Council members can propose removal of another member who fails to meet requirements.
          </p>
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-sm text-[#A0A0A5] mb-2 block">Target Member Address</label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-3 text-[#F5F3E8] placeholder-[#505055] focus:border-[#00F0FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-[#A0A0A5] mb-2 block">Reason for Removal</label>
              <textarea
                placeholder="Describe why this member should be removed..."
                rows={3}
                className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-3 text-[#F5F3E8] placeholder-[#505055] focus:border-[#00F0FF] focus:outline-none resize-none"
              />
            </div>
          </div>
          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
            <AlertTriangle size={18} />
            Propose Removal
          </button>
        </div>
      )}
    </div>
  );
}
