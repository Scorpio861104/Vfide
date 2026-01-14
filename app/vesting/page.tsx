"use client";

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { safeBigIntToNumber } from "@/lib/validation";
import { 
  Lock, 
  Unlock, 
  TrendingUp,
  CheckCircle,
  Calendar,
  Loader2,
  AlertTriangle,
  Info,
  Sparkles
} from "lucide-react";

// DevReserveVestingVault ABI
const DEV_RESERVE_VESTING_ABI = [
  {
    name: 'vested',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'claimable',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'claimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'getVestingStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalAllocation', type: 'uint256' },
      { name: 'vestedAmount', type: 'uint256' },
      { name: 'claimedAmount', type: 'uint256' },
      { name: 'claimableNow', type: 'uint256' },
      { name: 'currentMilestone', type: 'uint8' },
      { name: 'nextMilestoneTime', type: 'uint64' },
      { name: 'vestingComplete', type: 'bool' }
    ]
  },
  {
    name: 'getVestingSchedule',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'milestones',
        type: 'tuple[]',
        components: [
          { name: 'month', type: 'uint8' },
          { name: 'percentage', type: 'uint8' },
          { name: 'unlockTime', type: 'uint64' },
          { name: 'unlocked', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'claimsPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'beneficiary',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }]
  }
] as const;

// Contract address from environment
const DEV_RESERVE_VESTING_ADDRESS = (process.env.NEXT_PUBLIC_DEV_VAULT_ADDRESS || '0xFd26e4b02b55baA45A2421fFf0D47107CCE1D5E6') as `0x${string}`;

type TabType = 'overview' | 'schedule' | 'claim';

export default function VestingPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Read vesting status
  const { data: vestingStatus } = useReadContract({
    address: DEV_RESERVE_VESTING_ADDRESS,
    abi: DEV_RESERVE_VESTING_ABI,
    functionName: 'getVestingStatus',
  });

  // Read vesting schedule
  const { data: vestingSchedule } = useReadContract({
    address: DEV_RESERVE_VESTING_ADDRESS,
    abi: DEV_RESERVE_VESTING_ABI,
    functionName: 'getVestingSchedule',
  });

  // Read if claims are paused
  const { data: claimsPaused } = useReadContract({
    address: DEV_RESERVE_VESTING_ADDRESS,
    abi: DEV_RESERVE_VESTING_ABI,
    functionName: 'claimsPaused',
  });

  // Read beneficiary
  const { data: beneficiary } = useReadContract({
    address: DEV_RESERVE_VESTING_ADDRESS,
    abi: DEV_RESERVE_VESTING_ABI,
    functionName: 'beneficiary',
  });

  const isBeneficiary = address && beneficiary && address.toLowerCase() === beneficiary.toLowerCase();

  const colorMap = {
    overview: { gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/25', border: 'border-purple-500/30', bg: 'bg-purple-500/20' },
    schedule: { gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/25', border: 'border-cyan-500/30', bg: 'bg-cyan-500/20' },
    claim: { gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/25', border: 'border-emerald-500/30', bg: 'bg-emerald-500/20' }
  };

  return (
    <>
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-[#0D0D0F] pt-24 pb-16 relative overflow-hidden"
      >
        {/* Premium Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 rounded-full mb-4"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">Developer Reserve</span>
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Token <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-violet-400">Vesting</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Developer reserve tokens vest over 48 months with milestone-based unlocks.
            </p>
          </motion.div>

          {/* Stats Bar */}
          {vestingStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              {[
                { icon: Lock, color: 'purple', value: formatUnits(vestingStatus[0], 18).split('.')[0], label: 'Total Allocation' },
                { icon: Unlock, color: 'emerald', value: formatUnits(vestingStatus[1], 18).split('.')[0], label: 'Vested' },
                { icon: CheckCircle, color: 'cyan', value: formatUnits(vestingStatus[2], 18).split('.')[0], label: 'Claimed' },
                { icon: TrendingUp, color: 'amber', value: formatUnits(vestingStatus[3], 18).split('.')[0], label: 'Claimable Now', highlight: true }
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 text-center group`}
                >
                  <div className={`p-2 rounded-xl bg-${stat.color}-500/20 inline-block mb-2 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                  </div>
                  <div className={`text-2xl font-bold ${stat.highlight ? 'text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400' : 'text-white'}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Tabs */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mb-8 justify-center"
          >
            {[
              { id: 'overview' as const, label: 'Overview', icon: Info },
              { id: 'schedule' as const, label: 'Vesting Schedule', icon: Calendar },
              { id: 'claim' as const, label: 'Claim Tokens', icon: Unlock },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? `bg-linear-to-r ${colorMap[tab.id].gradient} text-white shadow-lg ${colorMap[tab.id].shadow}`
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </motion.button>
            ))}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && <OverviewTab key="overview" vestingStatus={vestingStatus} />}
            {activeTab === 'schedule' && <ScheduleTab key="schedule" schedule={vestingSchedule} />}
            {activeTab === 'claim' && (
              <ClaimTab 
                key="claim"
                isConnected={isConnected} 
                isBeneficiary={isBeneficiary || false}
                claimable={vestingStatus?.[3]}
                claimsPaused={claimsPaused || false}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}

function OverviewTab({ vestingStatus }: { vestingStatus?: readonly [bigint, bigint, bigint, bigint, number, bigint, boolean] }) {
  // Calculate percentages
  const totalAllocation = vestingStatus?.[0] || 0n;
  const vestedAmount = vestingStatus?.[1] || 0n;
  const vestedPercent = totalAllocation > 0n ? Number((vestedAmount * 100n) / totalAllocation) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      {/* Vesting Progress */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Vesting Progress</h2>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-bold">{vestedPercent}%</span>
          </div>
          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${vestedPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-linear-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-gray-400">Current Milestone</span>
            <span className="text-white font-bold">
              {vestingStatus ? `${vestingStatus[4]} / 48` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-gray-400">Next Unlock</span>
            <span className="text-white font-bold">
              {vestingStatus && vestingStatus[5] > 0n 
                ? new Date(safeBigIntToNumber(vestingStatus[5], 0) * 1000).toLocaleDateString()
                : 'Complete'}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-gray-400">Vesting Complete</span>
            <span className={`font-bold ${vestingStatus?.[6] ? 'text-emerald-400' : 'text-amber-400'}`}>
              {vestingStatus?.[6] ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6">How Vesting Works</h2>
        <div className="space-y-4">
          {[
            { title: 'Cliff Period', desc: '60-day cliff before first unlock begins', color: 'purple' },
            { title: 'Linear Vesting', desc: 'Tokens unlock bi-monthly over 36 months', color: 'cyan' },
            { title: 'Claim Anytime', desc: 'Claim vested tokens whenever convenient', color: 'emerald' },
            { title: 'Beneficiary Only', desc: 'Only designated beneficiary can claim', color: 'amber' },
            { title: 'Presale Sync', desc: 'Vesting starts from presale launch', color: 'violet' },
            { title: 'Pause Protection', desc: 'Claims can be paused for emergencies', color: 'rose' },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className={`p-1.5 rounded-lg bg-${item.color}-500/20`}>
                <CheckCircle className={`w-5 h-5 text-${item.color}-400`} />
              </div>
              <div>
                <div className="text-white font-bold">{item.title}</div>
                <div className="text-sm text-gray-400">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface Milestone {
  month: number;
  percentage: number;
  unlockTime: bigint;
  unlocked: boolean;
}

function ScheduleTab({ schedule }: { schedule?: readonly Milestone[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-8"
    >
      <h2 className="text-2xl font-bold text-white mb-6">Vesting Schedule</h2>
      
      {schedule && schedule.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3 rounded-l-xl">Month</th>
                <th className="text-right text-gray-400 text-sm font-medium px-4 py-3">Percentage</th>
                <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">Unlock Date</th>
                <th className="text-center text-gray-400 text-sm font-medium px-4 py-3 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {schedule.map((milestone, idx) => (
                <motion.tr 
                  key={idx} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-white font-bold">Month {milestone.month}</td>
                  <td className="px-4 py-3 text-right text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 font-bold">{milestone.percentage}%</td>
                  <td className="px-4 py-3 text-gray-400">
                    {Number(milestone.unlockTime) > 0 
                      ? new Date(Number(milestone.unlockTime) * 1000).toLocaleDateString()
                      : 'TBD'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      milestone.unlocked 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}>
                      {milestone.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <div className="p-4 rounded-2xl bg-white/5 inline-block mb-4">
            <Calendar className="w-12 h-12 opacity-50" />
          </div>
          <p>Loading vesting schedule...</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-purple-500/20">
            <Info className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-sm text-gray-400">
            <strong className="text-white">Dev Reserve Schedule:</strong> 25% of total supply allocated 
            to developer reserve. Tokens vest linearly over 36 months starting from presale launch, 
            with a 60-day cliff period. Unlocks occur bi-monthly (every 60 days).
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ClaimTab({ 
  isConnected, 
  isBeneficiary, 
  claimable,
  claimsPaused
}: { 
  isConnected: boolean; 
  isBeneficiary: boolean;
  claimable?: bigint;
  claimsPaused: boolean;
}) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleClaim = () => {
    writeContract({
      address: DEV_RESERVE_VESTING_ADDRESS,
      abi: DEV_RESERVE_VESTING_ABI,
      functionName: 'claim',
    });
  };

  const claimableAmount = claimable ? formatUnits(claimable, 18) : '0';
  const hasClaimable = claimable && claimable > 0n;

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-12 text-center"
      >
        <div className="p-4 rounded-2xl bg-purple-500/10 inline-block mb-4">
          <Lock className="w-12 h-12 text-purple-400/50" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to claim vested tokens</p>
      </motion.div>
    );
  }

  if (!isBeneficiary) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-12 text-center"
      >
        <div className="p-4 rounded-2xl bg-amber-500/10 inline-block mb-4">
          <AlertTriangle className="w-12 h-12 text-amber-400/50" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Not Authorized</h2>
        <p className="text-gray-400">Only the designated beneficiary can claim vested tokens</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-xl mx-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Claim Vested Tokens</h2>

        {/* Claimable Amount */}
        <div className="bg-linear-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-2xl p-6 mb-6 text-center">
          <div className="text-sm text-gray-400 mb-2">Available to Claim</div>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-400">
            {Number(claimableAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-gray-400">VFIDE</div>
        </div>

        {/* Warnings */}
        {claimsPaused && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">
                Claims are currently paused by the contract administrator.
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Tokens claimed successfully!</span>
            </div>
          </motion.div>
        )}

        {/* Claim Button */}
        <motion.button
          onClick={handleClaim}
          disabled={!hasClaimable || isPending || isConfirming || claimsPaused}
          whileHover={{ scale: hasClaimable && !isPending && !isConfirming && !claimsPaused ? 1.02 : 1 }}
          whileTap={{ scale: hasClaimable && !isPending && !isConfirming && !claimsPaused ? 0.98 : 1 }}
          className="w-full py-4 bg-linear-to-r from-purple-500 to-violet-500 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isPending ? 'Confirm in wallet...' : 'Processing...'}
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5" />
              Claim {hasClaimable ? Number(claimableAmount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} VFIDE
            </>
          )}
        </motion.button>

        {!hasClaimable && !claimsPaused && (
          <p className="text-center text-gray-400 text-sm mt-4">
            No tokens available to claim at this time
          </p>
        )}
      </div>
    </motion.div>
  );
}
