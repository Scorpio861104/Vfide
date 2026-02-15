'use client';

import { Footer } from "@/components/layout/Footer";
import { SanctumVaultABI } from "@/lib/abis";
import { useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Shield, DollarSign, Users, CheckCircle, Clock, AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import { safeParseFloat } from "@/lib/validation";

// SanctumVault address
const SANCTUM_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5') as `0x${string}`;

// Check if contracts are deployed
const IS_SANCTUM_DEPLOYED = SANCTUM_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000';

type TabType = 'overview' | 'charities' | 'disbursements' | 'donate' | 'history';

export default function SanctumPage() {
  const { address: _address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [donateAmount, _setDonateAmount] = useState('');
  const [donateNote, _setDonateNote] = useState('');

  // Contract write hooks
  const { writeContract, data: hash, isPending: _isPending } = useWriteContract();
  const { isLoading: _isConfirming, isSuccess: _isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read vault balance (only if deployed)
  const { data: _vaultBalance } = useReadContract({
    address: SANCTUM_VAULT_ADDRESS,
    abi: SanctumVaultABI,
    functionName: 'getBalance',
    args: [VFIDE_TOKEN_ADDRESS],
    query: { enabled: IS_SANCTUM_DEPLOYED },
  });

  // Read charity count (only if deployed)
  const { data: _charityCount } = useReadContract({
    address: SANCTUM_VAULT_ADDRESS,
    abi: SanctumVaultABI,
    functionName: 'getCharityCount',
    query: { enabled: IS_SANCTUM_DEPLOYED },
  });

  const { data: _disbursementCount } = useReadContract({
    address: SANCTUM_VAULT_ADDRESS,
    abi: SanctumVaultABI,
    functionName: 'disbursementCount',
    query: { enabled: IS_SANCTUM_DEPLOYED },
  });

  const charityCount = typeof _charityCount === 'bigint' ? Number(_charityCount) : 0;

  const charityIndices = useMemo(() => {
    return Array.from({ length: charityCount }, (_, index) => BigInt(index));
  }, [charityCount]);

  const { data: charityAddressReads } = useReadContracts({
    contracts: charityIndices.map((index) => ({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SanctumVaultABI,
      functionName: 'charityList',
      args: [index],
    })),
    query: { enabled: IS_SANCTUM_DEPLOYED && charityIndices.length > 0 },
  });

  const charityAddresses = (charityAddressReads ?? [])
    .map((read) => (read && read.status === 'success' ? read.result : null))
    .filter((addr): addr is `0x${string}` => typeof addr === 'string');

  const { data: charityInfoReads } = useReadContracts({
    contracts: charityAddresses.map((addr) => ({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SanctumVaultABI,
      functionName: 'charities',
      args: [addr],
    })),
    query: { enabled: IS_SANCTUM_DEPLOYED && charityAddresses.length > 0 },
  });

  const charities = charityAddresses.map((addr, idx) => {
    const read = charityInfoReads?.[idx];
    const info = read && read.status === 'success' ? read.result as {
      approved: boolean;
      name: string;
      category: string;
      approvedAt: bigint;
    } : null;

    return {
      address: addr,
      name: info?.name || addr,
      category: info?.category || 'unknown',
      verified: info?.approved ?? false,
    };
  });

  const disbursementTotal = typeof _disbursementCount === 'bigint' ? Number(_disbursementCount) : 0;
  const disbursementIds = useMemo(() => {
    return Array.from({ length: disbursementTotal }, (_, idx) => BigInt(idx + 1));
  }, [disbursementTotal]);

  const { data: disbursementReads } = useReadContracts({
    contracts: disbursementIds.map((id) => ({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SanctumVaultABI,
      functionName: 'getDisbursement',
      args: [id],
    })),
    query: { enabled: IS_SANCTUM_DEPLOYED && disbursementIds.length > 0 },
  });

  const disbursements = disbursementIds.map((id, idx) => {
    const read = disbursementReads?.[idx];
    const data = read && read.status === 'success' ? read.result as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      string,
      string,
      bigint,
      bigint,
      boolean,
      boolean,
      number
    ] : null;

    return data ? {
      id: Number(id),
      charity: data[0],
      token: data[1],
      amount: data[2],
      campaign: data[3],
      documentation: data[4],
      proposedAt: Number(data[5]),
      executedAt: Number(data[6]),
      executed: data[7],
      rejected: data[8],
      approvals: data[9],
    } : null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  // Handlers
  const _handleDonate = () => {
    if (!IS_SANCTUM_DEPLOYED) return;
    if (!donateAmount || safeParseFloat(donateAmount, 0) <= 0) return;
    writeContract({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SanctumVaultABI,
      functionName: 'deposit',
      args: [VFIDE_TOKEN_ADDRESS, parseUnits(donateAmount, 18), donateNote || 'Direct donation'],
    });
  };

  const _handleApproveDisbursement = (proposalId: number) => {
    writeContract({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SanctumVaultABI,
      functionName: 'approveDisbursement',
      args: [BigInt(proposalId)],
    });
  };

  const _handleExecuteDisbursement = (proposalId: number) => {
    writeContract({
      address: SANCTUM_VAULT_ADDRESS,
      abi: SanctumVaultABI,
      functionName: 'executeDisbursement',
      args: [BigInt(proposalId)],
    });
  };

  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,157,0.08),transparent_50%)]" />
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-full mb-4"
            >
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-pink-400 text-sm font-medium">Sanctum Charity Vault</span>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-pink-400 via-rose-400 to-red-400">
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
                className={`bg-linear-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-4 text-center`}
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
                      ? 'bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25'
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
              {activeTab === 'overview' && (
                <OverviewTab
                  vaultBalance={typeof _vaultBalance === 'bigint' ? _vaultBalance : undefined}
                />
              )}
              {activeTab === 'charities' && <CharitiesTab charities={charities} />}
              {activeTab === 'disbursements' && (
                <DisbursementsTab
                  isConnected={isConnected}
                  isDeployed={IS_SANCTUM_DEPLOYED}
                  disbursements={disbursements}
                  onApprove={_handleApproveDisbursement}
                  onExecute={_handleExecuteDisbursement}
                />
              )}
              {activeTab === 'donate' && <DonateTab isConnected={isConnected} />}
              {activeTab === 'history' && (
                <HistoryTab
                  isDeployed={IS_SANCTUM_DEPLOYED}
                  disbursements={disbursements}
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

function OverviewTab({ vaultBalance }: { vaultBalance: bigint | undefined }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
      {/* How It Works */}
      <GlassCard className="p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-linear-to-br from-pink-500/20 to-pink-500/5">
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
      <div className="lg:col-span-2 bg-linear-to-r from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-2xl p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Current Sanctum Balance</div>
          <div className="text-5xl font-bold text-pink-400 mb-4">
            {typeof vaultBalance === 'bigint'
              ? `${safeParseFloat(formatUnits(vaultBalance, 18), 0).toLocaleString()} VFIDE`
              : '—'}
          </div>
          <div className="text-sm text-gray-400">Ready for disbursement to approved charities</div>
        </div>
      </div>
    </div>
  );
}

function CharitiesTab({ charities }: { charities: Array<{ address: string; name: string; category: string; verified: boolean }> }) {

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-100">Approved Charities</h2>
        <div className="text-sm text-zinc-400">DAO-verified organizations</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {charities.length === 0 ? (
          <div className="text-center text-zinc-400 py-10">No approved charities on-chain.</div>
        ) : (
          charities.map((charity) => (
            <div key={charity.address} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-pink-500/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-100">{charity.name}</h3>
                    {charity.verified && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">{charity.category}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-1">{charity.address}</div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  {charity.verified ? 'active' : 'inactive'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-zinc-400">On-chain registry</div>
                </div>
                <button className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
                  View Details <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
        <p className="text-blue-400 text-sm">
          Want to propose a new charity? Submit a governance proposal in the DAO section.
        </p>
      </div>
    </div>
  );
}

function DisbursementsTab({
  isConnected,
  isDeployed,
  disbursements,
  onApprove,
  onExecute,
}: {
  isConnected: boolean;
  isDeployed: boolean;
  disbursements: Array<{
    id: number;
    charity: string;
    token: string;
    amount: bigint;
    campaign: string;
    documentation: string;
    proposedAt: number;
    executedAt: number;
    executed: boolean;
    rejected: boolean;
    approvals: number;
  }>;
  onApprove: (proposalId: number) => void;
  onExecute: (proposalId: number) => void;
}) {

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-100">Disbursement Proposals</h2>
        {isConnected && (
          <button className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold transition-colors">
            + New Proposal
          </button>
        )}
      </div>

      {disbursements.length === 0 ? (
        <div className="text-center text-zinc-400 py-10">
          {isDeployed ? 'No disbursement proposals available on-chain.' : 'SanctumVault not deployed on this network.'}
        </div>
      ) : (
        <div className="space-y-4">
          {disbursements.map((d) => (
            <div key={d.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <div className="text-zinc-100 font-bold text-lg">{d.campaign || 'Disbursement'}</div>
                  <div className="text-sm text-zinc-400">Proposal #{d.id} · {d.proposedAt ? new Date(d.proposedAt * 1000).toLocaleDateString() : '—'}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-1">Charity: {d.charity}</div>
                </div>
                <div className="text-2xl font-bold text-pink-400">{safeParseFloat(formatUnits(d.amount, 18), 0).toLocaleString()} VFIDE</div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-zinc-100 font-bold">{d.approvals}</div>
                    <div className="text-xs text-zinc-400">Approvals</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    d.executed ? 'bg-green-500/20 text-green-400' :
                    d.rejected ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {d.executed ? 'EXECUTED' : d.rejected ? 'REJECTED' : 'PENDING'}
                  </span>
                </div>
              </div>
              {!d.executed && !d.rejected && isConnected && (
                <div className="mt-4 pt-4 border-t border-zinc-700 flex gap-3">
                  <button
                    onClick={() => onApprove(d.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onExecute(d.id)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-bold"
                  >
                    Execute
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DonateTab({ isConnected }: { isConnected: boolean }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!isConnected) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-12 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 text-pink-400/50" />
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Connect to Donate</h2>
        <p className="text-zinc-400">Connect your wallet to make a direct donation to The Sanctum</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-8">
        <div className="text-center mb-8">
          <Heart className="w-12 h-12 mx-auto mb-4 text-pink-400" />
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Make a Donation</h2>
          <p className="text-zinc-400">Direct donations to The Sanctum charity fund</p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-zinc-400 text-sm">Amount (VFIDE)</label>
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
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm transition-colors"
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-2 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="In memory of... / For..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
            />
          </div>

          <button
            disabled={!amount || safeParseFloat(amount, 0) <= 0}
            className="w-full py-4 bg-linear-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all"
          >
            Donate {amount ? `${safeParseFloat(amount, 0).toLocaleString()} VFIDE` : ''}
          </button>

          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-400">
                Donations are permanent and non-refundable. Funds are distributed to DAO-approved charities only.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({
  isDeployed,
  disbursements,
}: {
  isDeployed: boolean;
  disbursements: Array<{
    id: number;
    charity: string;
    amount: bigint;
    proposedAt: number;
    executedAt: number;
    executed: boolean;
    rejected: boolean;
  }>;
}) {

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-100">Transaction History</h2>

      {disbursements.length === 0 ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-10 text-center text-zinc-400">
          {isDeployed ? 'No on-chain history available yet.' : 'SanctumVault not deployed on this network.'}
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900">
                  <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Type</th>
                  <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Details</th>
                  <th className="text-right text-zinc-400 text-sm font-medium px-6 py-4">Amount</th>
                  <th className="text-left text-zinc-400 text-sm font-medium px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A3A3F]">
                {disbursements.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-900/50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        tx.executed ? 'bg-green-500/20 text-green-400' :
                        tx.rejected ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {tx.executed ? 'EXECUTED' : tx.rejected ? 'REJECTED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-100">
                      To: {tx.charity}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={tx.executed ? 'text-red-400' : 'text-amber-400'}>
                        {safeParseFloat(formatUnits(tx.amount, 18), 0).toLocaleString()} VFIDE
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {tx.executedAt ? new Date(tx.executedAt * 1000).toLocaleDateString() : tx.proposedAt ? new Date(tx.proposedAt * 1000).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
