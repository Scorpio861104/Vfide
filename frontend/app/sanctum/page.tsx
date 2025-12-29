"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Shield, DollarSign, Users, CheckCircle, Clock, AlertTriangle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast";

// SanctumVault ABI
const SANCTUM_VAULT_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'note', type: 'string' }], outputs: [] },
  { name: 'proposeDisbursement', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'charity', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'reason', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { name: 'approveDisbursement', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { name: 'executeDisbursement', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [] },
  { name: 'getBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'getCharityInfo', type: 'function', stateMutability: 'view', inputs: [{ name: 'charity', type: 'address' }], outputs: [{ name: 'approved', type: 'bool' }, { name: 'name', type: 'string' }, { name: 'category', type: 'string' }, { name: 'totalReceived', type: 'uint256' }] },
  { name: 'getCharityCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getDisbursement', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: 'charity', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'reason', type: 'string' }, { name: 'approvalCount', type: 'uint8' }, { name: 'executed', type: 'bool' }, { name: 'rejected', type: 'bool' }, { name: 'proposedAt', type: 'uint256' }] },
  { name: 'hasApproved', type: 'function', stateMutability: 'view', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'approver', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'approvedCharities', type: 'function', stateMutability: 'view', inputs: [{ name: 'index', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'nextProposalId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// SanctumVault not deployed on Base Sepolia testnet yet
// Contract addresses will be populated after mainnet deployment
const SANCTUM_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5') as `0x${string}`;

// Check if contracts are deployed
const IS_SANCTUM_DEPLOYED = SANCTUM_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000';

type TabType = 'overview' | 'charities' | 'disbursements' | 'donate' | 'history';

export default function SanctumPage() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [donateAmount, setDonateAmount] = useState('');
  const [donateNote, setDonateNote] = useState('');

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const successHandled = useRef(false);

  useEffect(() => {
    if (isSuccess && !successHandled.current) {
      toast({
        title: "Transaction Successful",
        description: "Your transaction has been confirmed.",
        variant: "default",
      });
      setTimeout(() => {
        setDonateAmount('');
        setDonateNote('');
      }, 0);
      successHandled.current = true;
    } else if (!isSuccess) {
      successHandled.current = false;
    }
  }, [isSuccess, toast]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sanctum Debug:', {
        address,
        isPending,
        isConfirming
      });
    }
  }, [address, isPending, isConfirming]);

  // Read vault balance (only if deployed)
  const { data: vaultBalance } = useReadContract({
    address: SANCTUM_VAULT_ADDRESS,
    abi: SANCTUM_VAULT_ABI,
    functionName: 'getBalance',
    args: [VFIDE_TOKEN_ADDRESS],
    query: { enabled: IS_SANCTUM_DEPLOYED },
  });

  // Read charity count (only if deployed)
  const { data: charityCount } = useReadContract({
    address: SANCTUM_VAULT_ADDRESS,
    abi: SANCTUM_VAULT_ABI,
    functionName: 'getCharityCount',
    query: { enabled: IS_SANCTUM_DEPLOYED },
  });

  // Read next proposal ID (to know how many exist)
  const { data: nextProposalId } = useReadContract({
    address: SANCTUM_VAULT_ADDRESS,
    abi: SANCTUM_VAULT_ABI,
    functionName: 'nextProposalId',
    query: { enabled: IS_SANCTUM_DEPLOYED },
  });

  // Handlers
  const handleDonate = () => {
    if (!IS_SANCTUM_DEPLOYED) return;
    if (!donateAmount || parseFloat(donateAmount) <= 0) return;
    writeContract({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SANCTUM_VAULT_ABI,
      functionName: 'deposit',
      args: [VFIDE_TOKEN_ADDRESS, parseUnits(donateAmount, 18), donateNote || 'Direct donation'],
    });
  };

  const handleApproveDisbursement = (proposalId: number) => {
    writeContract({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SANCTUM_VAULT_ABI,
      functionName: 'approveDisbursement',
      args: [BigInt(proposalId)],
    });
  };

  const handleExecuteDisbursement = (proposalId: number) => {
    writeContract({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SANCTUM_VAULT_ABI,
      functionName: 'executeDisbursement',
      args: [BigInt(proposalId)],
    });
  };

  return (
    <>
      <GlobalNav />
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,157,0.08),transparent_50%)]" />
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-full mb-4"
            >
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-pink-400 text-sm font-medium">Sanctum Charity Vault</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-400 to-red-400">
                The Sanctum
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A portion of all VFIDE transaction fees funds charitable causes. 
              Community-governed, transparent, and impactful.
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Total Donated', value: '125,000', unit: 'VFIDE', icon: Heart, gradient: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
              { label: 'Active Charities', value: '8', unit: '', icon: Users, gradient: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
              { label: 'Disbursements', value: '24', unit: 'completed', icon: CheckCircle, gradient: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
              { label: 'Fee Allocation', value: '~3%', unit: 'of fees', icon: DollarSign, gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
            ].map((stat, idx) => (
              <motion.div 
                key={idx} 
                whileHover={{ scale: 1.02, y: -2 }}
                className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-4 text-center`}
              >
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.text}`} />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
                {stat.unit && <div className="text-xs text-gray-500">{stat.unit}</div>}
              </motion.div>
            ))}
          </motion.div>

          {/* Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 mb-8 justify-center"
          >
            {[
              { id: 'overview' as const, label: 'Overview', icon: Shield },
              { id: 'charities' as const, label: 'Charities', icon: Users },
              { id: 'disbursements' as const, label: 'Disbursements', icon: DollarSign },
              { id: 'donate' as const, label: 'Donate', icon: Heart },
              { id: 'history' as const, label: 'History', icon: Clock },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/5 text-gray-400 hover:bg-pink-500/10 hover:text-pink-400'
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
              {activeTab === 'overview' && <OverviewTab vaultBalance={vaultBalance} />}
              {activeTab === 'charities' && <CharitiesTab charityCount={charityCount} />}
              {activeTab === 'disbursements' && (
                <DisbursementsTab 
                  isConnected={isConnected} 
                  onApprove={handleApproveDisbursement}
                  onExecute={handleExecuteDisbursement}
                  nextProposalId={nextProposalId}
                />
              )}
              {activeTab === 'donate' && (
                <DonateTab 
                  isConnected={isConnected} 
                  amount={donateAmount}
                  setAmount={setDonateAmount}
                  note={donateNote}
                  setNote={setDonateNote}
                  onDonate={handleDonate}
                />
              )}
              {activeTab === 'history' && <HistoryTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
      
      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 p-6 rounded-xl border border-white/10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
            <p className="text-white font-medium">Confirming Transaction...</p>
          </div>
        </div>
      )}
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

function OverviewTab({ vaultBalance }: { vaultBalance: unknown }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* How It Works */}
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-500/5">
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          How The Sanctum Works
        </h2>
        <div className="space-y-6">
          {[
            { step: '1', title: 'Fee Collection', desc: '10% of all VFIDE transaction fees flow to The Sanctum' },
            { step: '2', title: 'Charity Registration', desc: 'DAO approves vetted charitable organizations' },
            { step: '3', title: 'Proposal Creation', desc: 'Council members propose disbursements to charities' },
            { step: '4', title: 'Multi-Sig Approval', desc: 'Required approvers sign off on disbursement' },
            { step: '5', title: 'Execution', desc: 'Funds transferred transparently on-chain' },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-8 h-8 bg-pink-500/20 text-pink-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                {item.step}
              </div>
              <div>
                <div className="text-white font-bold">{item.title}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Governance */}
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Governance & Security</h2>
        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">Multi-Signature Required</span>
            </div>
            <p className="text-sm text-gray-400">
              All disbursements require approval from multiple trusted signers before execution.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-bold">DAO Oversight</span>
            </div>
            <p className="text-sm text-gray-400">
              Community votes on charity additions, removals, and major policy changes.
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold">Full Transparency</span>
            </div>
            <p className="text-sm text-gray-400">
              All donations and disbursements recorded permanently on-chain.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Current Balance */}
      <div className="lg:col-span-2 bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-2xl p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Current Sanctum Balance</div>
          <div className="text-5xl font-bold text-pink-400 mb-4">
            {vaultBalance ? `${parseFloat(formatUnits(vaultBalance as bigint, 18)).toLocaleString()} VFIDE` : 'Loading...'}
          </div>
          <div className="text-sm text-gray-400">Ready for disbursement to approved charities</div>
        </div>
      </div>
    </div>
  );
}

function CharitiesTab({ charityCount }: { charityCount: unknown }) {
  const charities = [
    { name: 'Save the Children', category: 'Children', verified: true, totalReceived: 25000, status: 'active' },
    { name: 'Doctors Without Borders', category: 'Healthcare', verified: true, totalReceived: 18000, status: 'active' },
    { name: 'Ocean Cleanup', category: 'Environment', verified: true, totalReceived: 15000, status: 'active' },
    { name: 'Code.org', category: 'Education', verified: true, totalReceived: 12000, status: 'active' },
    { name: 'World Wildlife Fund', category: 'Wildlife', verified: true, totalReceived: 10000, status: 'active' },
    { name: 'Habitat for Humanity', category: 'Housing', verified: true, totalReceived: 8000, status: 'active' },
    { name: 'Water.org', category: 'Water Access', verified: true, totalReceived: 7000, status: 'active' },
    { name: 'Khan Academy', category: 'Education', verified: true, totalReceived: 5000, status: 'active' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#F5F3E8]">Approved Charities</h2>
        <div className="text-sm text-[#A0A0A5]">
          {charityCount ? `${(charityCount as bigint).toString()} DAO-verified organizations` : 'DAO-verified organizations'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charities.map((charity, idx) => (
          <div key={idx} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 hover:border-pink-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#F5F3E8]">{charity.name}</h3>
                  {charity.verified && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <div className="text-sm text-[#A0A0A5]">{charity.category}</div>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                {charity.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-pink-400">{charity.totalReceived.toLocaleString()}</div>
                <div className="text-xs text-[#A0A0A5]">VFIDE received</div>
              </div>
              <button className="text-[#00F0FF] text-sm hover:underline flex items-center gap-1">
                View Details <ExternalLink size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
        <p className="text-blue-400 text-sm">
          Want to propose a new charity? Submit a governance proposal in the DAO section.
        </p>
      </div>
    </div>
  );
}

function DisbursementsTab({ isConnected, onApprove, onExecute }: { 
  isConnected: boolean;
  onApprove: (id: number) => void;
  onExecute: (id: number) => void;
}) {
  const disbursements = [
    { id: 1, charity: 'Save the Children', amount: 5000, status: 'executed', approvals: '3/3', date: '2025-12-15' },
    { id: 2, charity: 'Doctors Without Borders', amount: 3000, status: 'pending', approvals: '2/3', date: '2025-12-18' },
    { id: 3, charity: 'Ocean Cleanup', amount: 4000, status: 'executed', approvals: '3/3', date: '2025-12-10' },
    { id: 4, charity: 'Code.org', amount: 2500, status: 'executed', approvals: '3/3', date: '2025-12-05' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#F5F3E8]">Disbursement Proposals</h2>
        {isConnected && (
          <button className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold transition-colors">
            + New Proposal
          </button>
        )}
      </div>

      <div className="space-y-4">
        {disbursements.map((d) => (
          <div key={d.id} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <div className="text-[#F5F3E8] font-bold text-lg">{d.charity}</div>
                <div className="text-sm text-[#A0A0A5]">Proposal #{d.id} · {d.date}</div>
              </div>
              <div className="text-2xl font-bold text-pink-400">{d.amount.toLocaleString()} VFIDE</div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[#F5F3E8] font-bold">{d.approvals}</div>
                  <div className="text-xs text-[#A0A0A5]">Approvals</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  d.status === 'executed' ? 'bg-green-500/20 text-green-400' :
                  d.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {d.status.toUpperCase()}
                </span>
              </div>
            </div>
            {d.status === 'pending' && isConnected && (
              <div className="mt-4 pt-4 border-t border-[#3A3A3F] flex gap-3">
                <button 
                  onClick={() => onApprove(d.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold"
                >
                  Approve
                </button>
                <button 
                  onClick={() => onExecute(d.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                >
                  Execute
                </button>
                <button className="px-4 py-2 bg-[#3A3A3F] hover:bg-[#4A4A4F] text-[#F5F3E8] rounded-lg text-sm font-bold">
                  View Details
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonateTab({ isConnected, amount, setAmount, note, setNote, onDonate }: { 
  isConnected: boolean;
  amount: string;
  setAmount: (val: string) => void;
  note: string;
  setNote: (val: string) => void;
  onDonate: () => void;
}) {
  if (!isConnected) {
    return (
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-12 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 text-pink-400/50" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">Connect to Donate</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to make a direct donation to The Sanctum</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
        <div className="text-center mb-8">
          <Heart className="w-12 h-12 mx-auto mb-4 text-pink-400" />
          <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">Make a Donation</h2>
          <p className="text-[#A0A0A5]">Direct donations to The Sanctum charity fund</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[#A0A0A5] text-sm">Amount (VFIDE)</label>
              <button
                onClick={() => setAmount('10000')}
                className="text-xs text-pink-400 hover:text-pink-300 font-bold"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-3 text-[#F5F3E8] placeholder-[#505055] focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="flex-1 py-2 bg-[#1A1A1D] hover:bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] text-sm transition-colors"
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[#A0A0A5] text-sm mb-2 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="In memory of... / For..."
              className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-4 py-3 text-[#F5F3E8] placeholder-[#505055] focus:border-pink-500 focus:outline-none"
            />
          </div>

          <button
            onClick={onDonate}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all"
          >
            Donate {amount ? `${parseFloat(amount).toLocaleString()} VFIDE` : ''}
          </button>

          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div className="text-sm text-[#A0A0A5]">
                Donations are permanent and non-refundable. Funds are distributed to DAO-approved charities only.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryTab() {
  const history = [
    { type: 'disbursement', charity: 'Save the Children', amount: 5000, date: '2025-12-15', txHash: '0x1234...5678' },
    { type: 'donation', donor: '0xABC...123', amount: 1000, date: '2025-12-14', txHash: '0x2345...6789' },
    { type: 'fee_deposit', source: 'Transaction Fees', amount: 2500, date: '2025-12-13', txHash: '0x3456...7890' },
    { type: 'disbursement', charity: 'Ocean Cleanup', amount: 4000, date: '2025-12-10', txHash: '0x4567...8901' },
    { type: 'donation', donor: '0xDEF...456', amount: 500, date: '2025-12-08', txHash: '0x5678...9012' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#F5F3E8]">Transaction History</h2>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1A1A1D]">
                <th className="text-left text-[#A0A0A5] text-sm font-medium px-6 py-4">Type</th>
                <th className="text-left text-[#A0A0A5] text-sm font-medium px-6 py-4">Details</th>
                <th className="text-right text-[#A0A0A5] text-sm font-medium px-6 py-4">Amount</th>
                <th className="text-left text-[#A0A0A5] text-sm font-medium px-6 py-4">Date</th>
                <th className="text-left text-[#A0A0A5] text-sm font-medium px-6 py-4">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3F]">
              {history.map((tx, idx) => (
                <tr key={idx} className="hover:bg-[#1A1A1D]/50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      tx.type === 'disbursement' ? 'bg-green-500/20 text-green-400' :
                      tx.type === 'donation' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {tx.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#F5F3E8]">
                    {tx.type === 'disbursement' ? `To: ${tx.charity}` :
                     tx.type === 'donation' ? `From: ${tx.donor}` :
                     tx.source}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={tx.type === 'disbursement' ? 'text-red-400' : 'text-green-400'}>
                      {tx.type === 'disbursement' ? '-' : '+'}{tx.amount.toLocaleString()} VFIDE
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#A0A0A5]">{tx.date}</td>
                  <td className="px-6 py-4">
                    <a href="#" className="text-[#00F0FF] hover:underline text-sm">
                      {tx.txHash}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
