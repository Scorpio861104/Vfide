'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import {
  Gift,
  Trophy,
  Vote,
  Droplets,
  GraduationCap,
  Users,
  Target,
  Star,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  Lock,
  Coins,
  RefreshCw,
  Loader2
} from 'lucide-react'

// Contract ABIs
const LIQUIDITY_INCENTIVES_ABI = [
  { name: 'stake', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'lpToken', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'unstake', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'lpToken', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'claimRewards', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'lpToken', type: 'address' }], outputs: [] },
  { name: 'compound', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'lpToken', type: 'address' }], outputs: [] },
  { name: 'pendingRewards', type: 'function', stateMutability: 'view', inputs: [{ name: 'lpToken', type: 'address' }, { name: 'user', type: 'address' }], outputs: [{ name: 'base', type: 'uint256' }, { name: 'withBonus', type: 'uint256' }] },
  { name: 'getUserStake', type: 'function', stateMutability: 'view', inputs: [{ name: 'lpToken', type: 'address' }, { name: 'user', type: 'address' }], outputs: [{ name: 'amount', type: 'uint256' }, { name: 'rewardDebt', type: 'uint256' }, { name: 'stakedAt', type: 'uint256' }, { name: 'unstakeRequestTime', type: 'uint256' }, { name: 'unstakeAmount', type: 'uint256' }] },
  { name: 'getPoolInfo', type: 'function', stateMutability: 'view', inputs: [{ name: 'lpToken', type: 'address' }], outputs: [{ name: 'name', type: 'string' }, { name: 'totalStaked', type: 'uint256' }, { name: 'rewardRate', type: 'uint256' }, { name: 'lastUpdate', type: 'uint256' }, { name: 'rewardPerTokenStored', type: 'uint256' }, { name: 'active', type: 'bool' }] },
  { name: 'getAllPools', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
] as const;

const DUTY_DISTRIBUTOR_ABI = [
  { name: 'claimRewards', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'points', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'claimed', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'rewardPerPoint', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

const PROMOTIONAL_TREASURY_ABI = [
  { name: 'claimEducationReward', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'milestone', type: 'string' }], outputs: [] },
  { name: 'claimUserMilestone', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'milestone', type: 'string' }], outputs: [] },
  { name: 'claimReferralTransactionBonus', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'referee', type: 'address' }], outputs: [] },
  { name: 'getUserStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'educationClaimed', type: 'uint256' }, { name: 'referralClaimed', type: 'uint256' }, { name: 'milestoneClaimed', type: 'uint256' }, { name: 'merchantClaimed', type: 'uint256' }, { name: 'totalClaimed', type: 'uint256' }] },
  { name: 'getRemainingBudgets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'pioneer', type: 'uint256' }, { name: 'education', type: 'uint256' }, { name: 'referral', type: 'uint256' }, { name: 'milestone', type: 'uint256' }, { name: 'merchant', type: 'uint256' }] },
  { name: 'isPromotionActive', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const;

// Contract addresses from environment (these contracts not deployed to testnet yet)
const LIQUIDITY_INCENTIVES_ADDRESS = (process.env.NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const DUTY_DISTRIBUTOR_ADDRESS = (process.env.NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const PROMOTIONAL_TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_PROMOTIONAL_TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// Check if contracts are deployed (not zero address)
const IS_LIQUIDITY_DEPLOYED = LIQUIDITY_INCENTIVES_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_DUTY_DEPLOYED = DUTY_DISTRIBUTOR_ADDRESS !== '0x0000000000000000000000000000000000000000';
const IS_PROMO_DEPLOYED = PROMOTIONAL_TREASURY_ADDRESS !== '0x0000000000000000000000000000000000000000';

type TabId = 'overview' | 'duty' | 'promotional' | 'liquidity' | 'referral'

export default function RewardsPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [stakeAmount, setStakeAmount] = useState('')
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read duty points
  const { data: dutyPoints } = useReadContract({
    address: DUTY_DISTRIBUTOR_ADDRESS,
    abi: DUTY_DISTRIBUTOR_ABI,
    functionName: 'points',
    args: address ? [address] : undefined,
    query: { enabled: IS_DUTY_DEPLOYED && !!address },
  });

  const { data: dutyClaimed } = useReadContract({
    address: DUTY_DISTRIBUTOR_ADDRESS,
    abi: DUTY_DISTRIBUTOR_ABI,
    functionName: 'claimed',
    args: address ? [address] : undefined,
    query: { enabled: IS_DUTY_DEPLOYED && !!address },
  });

  const { data: rewardPerPoint } = useReadContract({
    address: DUTY_DISTRIBUTOR_ADDRESS,
    abi: DUTY_DISTRIBUTOR_ABI,
    functionName: 'rewardPerPoint',
    query: { enabled: IS_DUTY_DEPLOYED },
  });

  // Read promotional stats
  const { data: userPromoStats } = useReadContract({
    address: PROMOTIONAL_TREASURY_ADDRESS,
    abi: PROMOTIONAL_TREASURY_ABI,
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    query: { enabled: IS_PROMO_DEPLOYED && !!address },
  });

  const { data: remainingBudgets } = useReadContract({
    address: PROMOTIONAL_TREASURY_ADDRESS,
    abi: PROMOTIONAL_TREASURY_ABI,
    functionName: 'getRemainingBudgets',
    query: { enabled: IS_PROMO_DEPLOYED },
  });

  const { data: isPromoActive } = useReadContract({
    address: PROMOTIONAL_TREASURY_ADDRESS,
    abi: PROMOTIONAL_TREASURY_ABI,
    functionName: 'isPromotionActive',
    query: { enabled: IS_PROMO_DEPLOYED },
  });

  // Read LP pools
  const { data: allPools } = useReadContract({
    address: LIQUIDITY_INCENTIVES_ADDRESS,
    abi: LIQUIDITY_INCENTIVES_ABI,
    functionName: 'getAllPools',
    query: { enabled: IS_LIQUIDITY_DEPLOYED },
  });

  // Calculate totals from contract data
  const dutyClaimable = dutyPoints && rewardPerPoint && dutyClaimed
    ? Number(formatUnits((dutyPoints * rewardPerPoint) - dutyClaimed, 18))
    : 0;

  const promoTotalClaimed = userPromoStats ? Number(formatUnits(userPromoStats[4], 18)) : 0;

  const totalClaimable = dutyClaimable; // Add other claimable amounts
  const totalEarned = promoTotalClaimed + (dutyClaimed ? Number(formatUnits(dutyClaimed, 18)) : 0);

  // Claim handlers
  const handleClaimDuty = () => {
    writeContract({
      address: DUTY_DISTRIBUTOR_ADDRESS,
      abi: DUTY_DISTRIBUTOR_ABI,
      functionName: 'claimRewards',
    });
  };

  const handleClaimEducation = (milestone: string) => {
    writeContract({
      address: PROMOTIONAL_TREASURY_ADDRESS,
      abi: PROMOTIONAL_TREASURY_ABI,
      functionName: 'claimEducationReward',
      args: [milestone],
    });
  };

  const handleClaimMilestone = (milestone: string) => {
    writeContract({
      address: PROMOTIONAL_TREASURY_ADDRESS,
      abi: PROMOTIONAL_TREASURY_ABI,
      functionName: 'claimUserMilestone',
      args: [milestone],
    });
  };

  const handleStake = (lpToken: string, amount: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'stake',
      args: [lpToken as `0x${string}`, parseUnits(amount, 18)],
    });
  };

  const handleUnstake = (lpToken: string, amount: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'unstake',
      args: [lpToken as `0x${string}`, parseUnits(amount, 18)],
    });
  };

  const handleClaimLPRewards = (lpToken: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'claimRewards',
      args: [lpToken as `0x${string}`],
    });
  };

  const handleCompound = (lpToken: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'compound',
      args: [lpToken as `0x${string}`],
    });
  };

  // Generic claim handler for different reward types
  const handleClaim = (id: string) => {
    switch (id) {
      case 'duty':
      case 'all':
        handleClaimDuty();
        break;
      // Add other reward types as needed
    }
  };

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-2xl flex items-center justify-center">
                    <Gift className="w-8 h-8 text-[#1A1A1D]" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8]">
                      Rewards Center
                    </h1>
                    <p className="text-xl text-[#A0A0A5]">
                      Receive rewards for active participation in the VFIDE ecosystem
                    </p>
                  </div>
                </div>
              </div>
              
              {isConnected && (
                <div className="flex gap-4">
                  <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 min-w-[160px]">
                    <div className="text-[#A0A0A5] text-sm mb-1">Total Claimable</div>
                    <div className="text-2xl font-bold text-[#50C878]">{totalClaimable.toLocaleString()} VFIDE</div>
                  </div>
                  <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 min-w-[160px]">
                    <div className="text-[#A0A0A5] text-sm mb-1">Total Earned</div>
                    <div className="text-2xl font-bold text-[#FFD700]">{totalEarned.toLocaleString()} VFIDE</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-[#1A1A1D] border-b border-[#3A3A3F] sticky top-20 z-40">
          <div className="container mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Gift },
                { id: 'duty' as const, label: 'Duty Rewards', icon: Vote },
                { id: 'promotional' as const, label: 'Promotional', icon: Trophy },
                { id: 'liquidity' as const, label: 'LP Staking', icon: Droplets },
                { id: 'referral' as const, label: 'Referrals', icon: Users },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#FFD700] text-[#1A1A1D]'
                      : 'bg-transparent text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A2F]'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          {activeTab === 'overview' && <OverviewTab isConnected={isConnected} totalClaimable={totalClaimable} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'duty' && <DutyRewardsTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'promotional' && <PromotionalTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'liquidity' && <LiquidityTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'referral' && <ReferralTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
        </div>
      </main>

      <Footer />
    </>
  )
}

function OverviewTab({ isConnected, totalClaimable, onClaim, claimingId }: { 
  isConnected: boolean; 
  totalClaimable: number;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const rewardSources = [
    { id: 'duty', name: 'Governance Voting', amount: 450.25, icon: Vote, color: '#00F0FF', description: 'Rewards for participating in DAO votes' },
    { id: 'promo', name: 'Promotional Rewards', amount: 1200.00, icon: Trophy, color: '#FFD700', description: 'Education, milestones, and pioneer badges' },
    { id: 'lp', name: 'LP Staking', amount: 847.25, icon: Droplets, color: '#50C878', description: 'Liquidity provider incentives' },
    { id: 'referral', name: 'Referral Bonus', amount: 350.00, icon: Users, color: '#A78BFA', description: 'Rewards for inviting new users' },
  ]

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Gift className="w-20 h-20 mx-auto mb-6 text-[#A0A0A5]" />
        <h2 className="text-3xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5] text-lg">Connect your wallet to view and claim your rewards</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Claim All Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#FFD700]/20 to-[#50C878]/20 border border-[#FFD700]/50 rounded-2xl p-8 text-center"
      >
        <h2 className="text-3xl font-bold text-[#F5F3E8] mb-2">Your Rewards Are Ready!</h2>
        <p className="text-[#A0A0A5] mb-6">You have {totalClaimable.toLocaleString()} VFIDE available to claim</p>
        <button 
          onClick={() => onClaim('all')}
          disabled={claimingId === 'all'}
          className={`px-10 py-4 rounded-xl font-bold text-xl transition-all ${
            claimingId === 'all' 
              ? 'bg-[#3A3A3F] text-[#8A8A8F]' 
              : 'bg-gradient-to-r from-[#FFD700] to-[#50C878] text-[#1A1A1D] hover:scale-105'
          }`}
        >
          {claimingId === 'all' ? (
            <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={20} /> Claiming...</span>
          ) : (
            `Claim All (${totalClaimable.toLocaleString()} VFIDE)`
          )}
        </button>
      </motion.div>

      {/* Reward Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rewardSources.map((source, idx) => (
          <motion.div
            key={source.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${source.color}20` }}
                >
                  <source.icon size={24} style={{ color: source.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F5F3E8]">{source.name}</h3>
                  <p className="text-sm text-[#A0A0A5]">{source.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#A0A0A5] text-sm">Claimable</div>
                <div className="text-2xl font-bold" style={{ color: source.color }}>{source.amount.toLocaleString()} VFIDE</div>
              </div>
              <button 
                onClick={() => onClaim(source.id)}
                disabled={claimingId === source.id || source.amount === 0}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${
                  source.amount === 0
                    ? 'bg-[#3A3A3F] text-[#8A8A8F] cursor-not-allowed'
                    : claimingId === source.id
                      ? 'bg-[#3A3A3F] text-[#8A8A8F]'
                      : 'bg-[#50C878] text-[#1A1A1D] hover:bg-[#45B069]'
                }`}
              >
                {claimingId === source.id ? 'Claiming...' : 'Claim'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How Rewards Work */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
          <Zap className="text-[#FFD700]" size={24} />
          How Rewards Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Vote, title: 'Vote on Proposals', desc: 'Earn duty points for each governance vote' },
            { icon: GraduationCap, title: 'Complete Tasks', desc: 'Educational rewards for learning VFIDE' },
            { icon: Droplets, title: 'Provide Liquidity', desc: 'Stake LP tokens for variable protocol rewards' },
            { icon: Users, title: 'Refer Friends', desc: 'One-time bonus when referrals purchase' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F]">
              <item.icon className="text-[#00F0FF] mb-2" size={24} />
              <h4 className="text-[#F5F3E8] font-bold text-sm mb-1">{item.title}</h4>
              <p className="text-[#A0A0A5] text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DutyRewardsTab({ isConnected, onClaim, claimingId }: {
  isConnected: boolean;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const dutyStats = {
    totalPoints: 1250,
    claimable: 450.25,
    votesThisMonth: 8,
    participationRate: 92,
  }

  const votingHistory = [
    { id: 1, proposal: 'Reduce burn fee to 1.5%', date: 'Dec 15, 2025', points: 50, claimed: true },
    { id: 2, proposal: 'Treasury allocation Q1 2026', date: 'Dec 12, 2025', points: 50, claimed: false },
    { id: 3, proposal: 'Multi-chain expansion', date: 'Dec 8, 2025', points: 75, claimed: false },
    { id: 4, proposal: 'Security audit funding', date: 'Dec 5, 2025', points: 50, claimed: false },
  ]

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Vote className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect to view your governance duty rewards</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Total Points</div>
          <div className="text-2xl font-bold text-[#00F0FF]">{dutyStats.totalPoints}</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Claimable</div>
          <div className="text-2xl font-bold text-[#50C878]">{dutyStats.claimable} VFIDE</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Votes (Month)</div>
          <div className="text-2xl font-bold text-[#F5F3E8]">{dutyStats.votesThisMonth}</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Participation</div>
          <div className="text-2xl font-bold text-[#FFD700]">{dutyStats.participationRate}%</div>
        </div>
      </div>

      {/* Claim Section */}
      <div className="bg-gradient-to-r from-[#00F0FF]/20 to-[#0080FF]/20 border border-[#00F0FF]/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-1">Governance Duty Rewards</h3>
            <p className="text-[#A0A0A5]">Receive VFIDE tokens for active DAO governance participation</p>
          </div>
          <button
            onClick={() => onClaim('duty')}
            disabled={claimingId === 'duty'}
            className="px-8 py-3 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D4E0] transition-colors"
          >
            {claimingId === 'duty' ? 'Claiming...' : `Claim ${dutyStats.claimable} VFIDE`}
          </button>
        </div>
      </div>

      {/* Voting History */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Recent Voting Activity</h3>
        <div className="space-y-3">
          {votingHistory.map((vote) => (
            <div key={vote.id} className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F]">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vote.claimed ? 'bg-[#50C878]/20' : 'bg-[#FFD700]/20'}`}>
                  {vote.claimed ? <CheckCircle2 className="text-[#50C878]" size={20} /> : <Clock className="text-[#FFD700]" size={20} />}
                </div>
                <div>
                  <div className="text-[#F5F3E8] font-bold">{vote.proposal}</div>
                  <div className="text-[#A0A0A5] text-sm">{vote.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#00F0FF] font-bold">+{vote.points} pts</div>
                <div className={`text-xs ${vote.claimed ? 'text-[#50C878]' : 'text-[#FFD700]'}`}>
                  {vote.claimed ? 'Claimed' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PromotionalTab({ isConnected, onClaim, claimingId }: {
  isConnected: boolean;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const promotionalRewards = [
    { id: 'pioneer', name: 'Pioneer Badge', amount: 500, icon: Star, status: 'claimable', desc: 'Early adopter reward for joining before mainnet' },
    { id: 'education1', name: 'Complete Profile', amount: 100, icon: GraduationCap, status: 'claimable', desc: 'Set up your vault and profile' },
    { id: 'education2', name: 'First Vote', amount: 100, icon: Vote, status: 'claimable', desc: 'Participate in your first governance vote' },
    { id: 'education3', name: 'Guardian Setup', amount: 200, icon: Lock, status: 'locked', desc: 'Add at least 2 guardians to your vault', progress: 50 },
    { id: 'milestone1', name: '1,000 VFIDE Held', amount: 300, icon: Coins, status: 'claimed', desc: 'Hold 1,000+ VFIDE for 30 days' },
  ]

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect to view promotional rewards</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Budget Info */}
      <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#FFD700] mb-2">Promotional Treasury Budget</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-[#3A3A3F] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500]" style={{ width: '35%' }} />
            </div>
          </div>
          <div className="text-[#F5F3E8] font-bold">700K / 2M VFIDE distributed</div>
        </div>
      </div>

      {/* Rewards List */}
      <div className="space-y-4">
        {promotionalRewards.map((reward) => (
          <div 
            key={reward.id} 
            className={`bg-[#2A2A2F] border rounded-xl p-6 ${
              reward.status === 'claimable' ? 'border-[#50C878]' : 
              reward.status === 'claimed' ? 'border-[#3A3A3F] opacity-60' : 'border-[#3A3A3F]'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  reward.status === 'claimable' ? 'bg-[#50C878]/20' :
                  reward.status === 'claimed' ? 'bg-[#3A3A3F]' : 'bg-[#FFD700]/20'
                }`}>
                  <reward.icon size={28} className={
                    reward.status === 'claimable' ? 'text-[#50C878]' :
                    reward.status === 'claimed' ? 'text-[#8A8A8F]' : 'text-[#FFD700]'
                  } />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-[#F5F3E8]">{reward.name}</h4>
                    {reward.status === 'claimed' && (
                      <span className="px-2 py-0.5 bg-[#50C878]/20 text-[#50C878] text-xs rounded-full">Claimed</span>
                    )}
                  </div>
                  <p className="text-[#A0A0A5] text-sm">{reward.desc}</p>
                  {reward.status === 'locked' && reward.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-2 bg-[#3A3A3F] rounded-full w-48 overflow-hidden">
                        <div className="h-full bg-[#FFD700]" style={{ width: `${reward.progress}%` }} />
                      </div>
                      <div className="text-xs text-[#A0A0A5] mt-1">{reward.progress}% complete</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#FFD700]">{reward.amount} VFIDE</div>
                </div>
                {reward.status === 'claimable' && (
                  <button
                    onClick={() => onClaim(reward.id)}
                    disabled={claimingId === reward.id}
                    className="px-6 py-3 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#45B069] transition-colors"
                  >
                    {claimingId === reward.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}
                {reward.status === 'locked' && (
                  <div className="px-6 py-3 bg-[#3A3A3F] text-[#8A8A8F] rounded-lg font-bold">
                    <Lock size={16} className="inline mr-1" /> Locked
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiquidityTab({ isConnected, onClaim, claimingId }: {
  isConnected: boolean;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const [stakeAmount, setStakeAmount] = useState('')
  const [isStaking, setIsStaking] = useState(false)

  const pools = [
    { id: 'vfide-eth', name: 'VFIDE/ETH', estimatedRate: 42.5, tvl: '2.4M', yourStake: 1250.50, earned: 347.25, multiplier: '2x' },
    { id: 'vfide-usdc', name: 'VFIDE/USDC', estimatedRate: 28.3, tvl: '1.8M', yourStake: 0, earned: 0, multiplier: '1.5x' },
  ]

  const handleStake = async () => {
    if (!stakeAmount) return
    setIsStaking(true)
    await new Promise(r => setTimeout(r, 2000))
    setIsStaking(false)
    setStakeAmount('')
    alert('Staked successfully!')
  }

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Droplets className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect to stake LP tokens for variable protocol rewards (not guaranteed)</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Info Banner */}
      <div className="bg-[#50C878]/10 border border-[#50C878] rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#50C878] mb-2 flex items-center gap-2">
          <Droplets size={20} /> Liquidity Mining
        </h3>
        <p className="text-[#F5F3E8]">
          Provide liquidity to VFIDE trading pairs and receive variable protocol rewards. Rewards require active staking participation and are not guaranteed.
        </p>
        <p className="text-[#A0A0A5] text-sm mt-2">
          *Estimated rates are variable and not guaranteed. Rates depend on pool activity, total staked amount, and protocol allocations. Past rates do not predict future results.
        </p>
      </div>

      {/* Pools */}
      <div className="space-y-4">
        {pools.map((pool) => (
          <div key={pool.id} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#50C878]/20 rounded-xl flex items-center justify-center">
                  <Droplets className="text-[#50C878]" size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-bold text-[#F5F3E8]">{pool.name}</h4>
                    <span className="px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] text-xs font-bold rounded">{pool.multiplier}</span>
                  </div>
                  <div className="text-[#A0A0A5] text-sm">TVL: ${pool.tvl}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-[#A0A0A5] text-sm">Est. Rate*</div>
                  <div className="text-2xl font-bold text-[#50C878]">{pool.estimatedRate}%</div>
                </div>
                <div>
                  <div className="text-[#A0A0A5] text-sm">Your Stake</div>
                  <div className="text-xl font-bold text-[#F5F3E8]">{pool.yourStake.toLocaleString()} LP</div>
                </div>
                <div>
                  <div className="text-[#A0A0A5] text-sm">Earned</div>
                  <div className="text-xl font-bold text-[#FFD700]">{pool.earned.toLocaleString()} VFIDE</div>
                </div>
              </div>

              <div className="flex gap-2">
                {pool.earned > 0 && (
                  <button
                    onClick={() => onClaim(pool.id)}
                    disabled={claimingId === pool.id}
                    className="px-4 py-2 bg-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#45B069] transition-colors"
                  >
                    {claimingId === pool.id ? 'Claiming...' : 'Claim'}
                  </button>
                )}
                <button className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D4E0] transition-colors">
                  Stake
                </button>
                {pool.yourStake > 0 && (
                  <button className="px-4 py-2 border border-[#A0A0A5] text-[#A0A0A5] rounded-lg font-bold hover:border-[#F5F3E8] hover:text-[#F5F3E8] transition-colors">
                    Unstake
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stake Form */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Quick Stake</h3>
        <div className="flex gap-4">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="LP Token Amount"
            className="flex-1 px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
          />
          <button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount}
            className="px-8 py-3 bg-gradient-to-r from-[#00F0FF] to-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform"
          >
            {isStaking ? 'Staking...' : 'Stake LP'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReferralTab({ isConnected, onClaim, claimingId }: {
  isConnected: boolean;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const referralStats = {
    code: 'VFIDE-X7K9M2',
    totalReferrals: 12,
    activeReferrals: 8,
    earned: 1450.00,
    claimable: 350.00,
  }

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Users className="w-16 h-16 mx-auto mb-4 text-[#A0A0A5]" />
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
        <p className="text-[#A0A0A5]">Connect to view your referral rewards</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Referral Code */}
      <div className="bg-gradient-to-r from-[#A78BFA]/20 to-[#8B5CF6]/20 border border-[#A78BFA] rounded-xl p-6 text-center">
        <h3 className="text-lg font-bold text-[#A78BFA] mb-2">Your Referral Code</h3>
        <div className="flex items-center justify-center gap-4 mb-4">
          <code className="text-3xl font-bold text-[#F5F3E8] bg-[#1A1A1D] px-6 py-3 rounded-lg">{referralStats.code}</code>
          <button 
            onClick={() => navigator.clipboard.writeText(referralStats.code)}
            className="px-4 py-3 bg-[#A78BFA] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#9061F9] transition-colors"
          >
            Copy
          </button>
        </div>
        <p className="text-[#A0A0A5]">Share this code. Earn 50 VFIDE for each user who makes their first purchase using your code.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Total Referrals</div>
          <div className="text-2xl font-bold text-[#F5F3E8]">{referralStats.totalReferrals}</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Active Users</div>
          <div className="text-2xl font-bold text-[#50C878]">{referralStats.activeReferrals}</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Total Earned</div>
          <div className="text-2xl font-bold text-[#FFD700]">{referralStats.earned.toLocaleString()} VFIDE</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
          <div className="text-[#A0A0A5] text-sm mb-1">Claimable</div>
          <div className="text-2xl font-bold text-[#50C878]">{referralStats.claimable.toLocaleString()} VFIDE</div>
        </div>
      </div>

      {/* Claim */}
      {referralStats.claimable > 0 && (
        <div className="bg-[#2A2A2F] border border-[#50C878] rounded-xl p-6 text-center">
          <button
            onClick={() => onClaim('referral')}
            disabled={claimingId === 'referral'}
            className="px-10 py-4 bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] text-white rounded-xl font-bold text-xl hover:scale-105 transition-transform"
          >
            {claimingId === 'referral' ? 'Claiming...' : `Claim ${referralStats.claimable} VFIDE`}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">How Referrals Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] text-center">
            <div className="text-3xl mb-2">1️⃣</div>
            <h4 className="text-[#F5F3E8] font-bold mb-1">Share Your Code</h4>
            <p className="text-[#A0A0A5] text-sm">Give friends your unique referral code</p>
          </div>
          <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] text-center">
            <div className="text-3xl mb-2">2️⃣</div>
            <h4 className="text-[#F5F3E8] font-bold mb-1">They Join</h4>
            <p className="text-[#A0A0A5] text-sm">Friend creates a vault using your code</p>
          </div>
          <div className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F] text-center">
            <div className="text-3xl mb-2">3️⃣</div>
            <h4 className="text-[#F5F3E8] font-bold mb-1">Receive Rewards</h4>
            <p className="text-[#A0A0A5] text-sm">Get 50 VFIDE when they become active</p>
          </div>
        </div>
      </div>
    </div>
  )
}
