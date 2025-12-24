"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { 
  Lock, 
  Unlock, 
  Clock, 
  TrendingUp,
  CheckCircle,
  Calendar,
  Loader2,
  AlertTriangle,
  Info
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

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[#0D0D0F] pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-4">
              <Lock className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">Developer Reserve</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-4">
              Token Vesting
            </h1>
            <p className="text-[#A0A0A5] text-lg max-w-2xl mx-auto">
              Developer reserve tokens vest over 48 months with milestone-based unlocks.
            </p>
          </div>

          {/* Stats Bar */}
          {vestingStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <Lock className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-[#F5F3E8]">
                  {formatUnits(vestingStatus[0], 18).split('.')[0]}
                </div>
                <div className="text-xs text-[#A0A0A5]">Total Allocation</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <Unlock className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <div className="text-2xl font-bold text-[#F5F3E8]">
                  {formatUnits(vestingStatus[1], 18).split('.')[0]}
                </div>
                <div className="text-xs text-[#A0A0A5]">Vested</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold text-[#F5F3E8]">
                  {formatUnits(vestingStatus[2], 18).split('.')[0]}
                </div>
                <div className="text-xs text-[#A0A0A5]">Claimed</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-2xl font-bold text-[#00F0FF]">
                  {formatUnits(vestingStatus[3], 18).split('.')[0]}
                </div>
                <div className="text-xs text-[#A0A0A5]">Claimable Now</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {[
              { id: 'overview' as const, label: 'Overview', icon: Info },
              { id: 'schedule' as const, label: 'Vesting Schedule', icon: Calendar },
              { id: 'claim' as const, label: 'Claim Tokens', icon: Unlock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-[#2A2A2F] text-[#A0A0A5] hover:bg-[#3A3A3F]'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab vestingStatus={vestingStatus} />}
          {activeTab === 'schedule' && <ScheduleTab schedule={vestingSchedule} />}
          {activeTab === 'claim' && (
            <ClaimTab 
              isConnected={isConnected} 
              isBeneficiary={isBeneficiary || false}
              claimable={vestingStatus?.[3]}
              claimsPaused={claimsPaused || false}
            />
          )}
        </div>
      </main>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Vesting Progress */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Vesting Progress</h2>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#A0A0A5]">Progress</span>
            <span className="text-[#F5F3E8] font-bold">{vestedPercent}%</span>
          </div>
          <div className="w-full h-4 bg-[#1A1A1D] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${vestedPercent}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-[#1A1A1D] rounded-lg">
            <span className="text-[#A0A0A5]">Current Milestone</span>
            <span className="text-[#F5F3E8] font-bold">
              {vestingStatus ? `${vestingStatus[4]} / 48` : '-'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#1A1A1D] rounded-lg">
            <span className="text-[#A0A0A5]">Next Unlock</span>
            <span className="text-[#F5F3E8] font-bold">
              {vestingStatus && vestingStatus[5] > 0n 
                ? new Date(Number(vestingStatus[5]) * 1000).toLocaleDateString()
                : 'Complete'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#1A1A1D] rounded-lg">
            <span className="text-[#A0A0A5]">Vesting Complete</span>
            <span className={`font-bold ${vestingStatus?.[6] ? 'text-green-400' : 'text-yellow-400'}`}>
              {vestingStatus?.[6] ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">How Vesting Works</h2>
        <div className="space-y-4">
          {[
            { title: 'Cliff Period', desc: '60-day cliff before first unlock begins' },
            { title: 'Linear Vesting', desc: 'Tokens unlock bi-monthly over 36 months' },
            { title: 'Claim Anytime', desc: 'Claim vested tokens whenever convenient' },
            { title: 'Beneficiary Only', desc: 'Only designated beneficiary can claim' },
            { title: 'Presale Sync', desc: 'Vesting starts from presale launch' },
            { title: 'Pause Protection', desc: 'Claims can be paused for emergencies' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-[#1A1A1D] rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-[#F5F3E8] font-bold">{item.title}</div>
                <div className="text-sm text-[#A0A0A5]">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
      <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Vesting Schedule</h2>
      
      {schedule && schedule.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1A1A1D]">
                <th className="text-left text-[#A0A0A5] text-sm font-medium px-4 py-3">Month</th>
                <th className="text-right text-[#A0A0A5] text-sm font-medium px-4 py-3">Percentage</th>
                <th className="text-left text-[#A0A0A5] text-sm font-medium px-4 py-3">Unlock Date</th>
                <th className="text-center text-[#A0A0A5] text-sm font-medium px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3A3A3F]">
              {schedule.map((milestone, idx) => (
                <tr key={idx} className="hover:bg-[#1A1A1D]/50">
                  <td className="px-4 py-3 text-[#F5F3E8] font-bold">Month {milestone.month}</td>
                  <td className="px-4 py-3 text-right text-[#00F0FF] font-bold">{milestone.percentage}%</td>
                  <td className="px-4 py-3 text-[#A0A0A5]">
                    {Number(milestone.unlockTime) > 0 
                      ? new Date(Number(milestone.unlockTime) * 1000).toLocaleDateString()
                      : 'TBD'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      milestone.unlocked 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {milestone.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-[#A0A0A5]">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Loading vesting schedule...</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-sm text-[#A0A0A5]">
            <strong className="text-[#F5F3E8]">Dev Reserve Schedule:</strong> 25% of total supply allocated 
            to developer reserve. Tokens vest linearly over 36 months starting from presale launch, 
            with a 60-day cliff period. Unlocks occur bi-monthly (every 60 days).
          </div>
        </div>
      </div>
    </div>
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
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-12 text-center">
        <Lock className="w-16 h-16 mx-auto mb-4 text-purple-400/50" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect your wallet to claim vested tokens</p>
      </div>
    );
  }

  if (!isBeneficiary) {
    return (
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-12 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-400/50" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">Not Authorized</h2>
        <p className="text-[#A0A0A5]">Only the designated beneficiary can claim vested tokens</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6 text-center">Claim Vested Tokens</h2>

        {/* Claimable Amount */}
        <div className="bg-[#1A1A1D] rounded-xl p-6 mb-6 text-center">
          <div className="text-sm text-[#A0A0A5] mb-2">Available to Claim</div>
          <div className="text-4xl font-bold text-[#00F0FF]">
            {Number(claimableAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[#A0A0A5]">VFIDE</div>
        </div>

        {/* Warnings */}
        {claimsPaused && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
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
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-bold">Tokens claimed successfully!</span>
            </div>
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={!hasClaimable || isPending || isConfirming || claimsPaused}
          className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
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
        </button>

        {!hasClaimable && !claimsPaused && (
          <p className="text-center text-[#A0A0A5] text-sm mt-4">
            No tokens available to claim at this time
          </p>
        )}
      </div>
    </div>
  );
}
