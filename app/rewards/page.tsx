'use client'

// Rewards & Staking Management System
import { Footer } from '@/components/layout/Footer'
import { safeParseFloat } from '@/lib/validation'
import { toast } from '@/lib/toast'
import { motion } from 'framer-motion'
import {
    CheckCircle2,
    Clock,
    Coins,
    Droplets,
    Gift,
    GraduationCap,
    Lock,
    RefreshCw,
    Sparkles,
    Star,
    Trophy,
    Users,
    Vote,
    Zap
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

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
  const [_stakeAmount, _setStakeAmount] = useState('')
  const [_selectedPool, _setSelectedPool] = useState<string | null>(null)
  const [claimingId, _setClaimingId] = useState<string | null>(null)
  

  


  

  // Contract write hooks
  const { writeContract, data: hash, isPending: _isPending } = useWriteContract();
  const { isLoading: _isConfirming, isSuccess: _isSuccess } = useWaitForTransactionReceipt({ hash });

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

  const { data: _remainingBudgets } = useReadContract({
    address: PROMOTIONAL_TREASURY_ADDRESS,
    abi: PROMOTIONAL_TREASURY_ABI,
    functionName: 'getRemainingBudgets',
    query: { enabled: IS_PROMO_DEPLOYED },
  });

  const { data: _isPromoActive } = useReadContract({
    address: PROMOTIONAL_TREASURY_ADDRESS,
    abi: PROMOTIONAL_TREASURY_ABI,
    functionName: 'isPromotionActive',
    query: { enabled: IS_PROMO_DEPLOYED },
  });

  // Read LP pools
  const { data: _allPools } = useReadContract({
    address: LIQUIDITY_INCENTIVES_ADDRESS,
    abi: LIQUIDITY_INCENTIVES_ABI,
    functionName: 'getAllPools',
    query: { enabled: IS_LIQUIDITY_DEPLOYED },
  });

  // Calculate totals from contract data with safe conversions
  const dutyClaimable = dutyPoints && rewardPerPoint && dutyClaimed
    ? safeParseFloat(formatUnits((dutyPoints * rewardPerPoint) - dutyClaimed, 18), 0)
    : 0;

  const promoTotalClaimed = userPromoStats ? safeParseFloat(formatUnits(userPromoStats[4], 18), 0) : 0;

  const totalClaimable = dutyClaimable; // Add other claimable amounts
  const totalEarned = promoTotalClaimed + (dutyClaimed ? safeParseFloat(formatUnits(dutyClaimed, 18), 0) : 0);

  // Claim handlers
  const handleClaimDuty = () => {
    writeContract({
      address: DUTY_DISTRIBUTOR_ADDRESS,
      abi: DUTY_DISTRIBUTOR_ABI,
      functionName: 'claimRewards',
    });
  };

  const _handleClaimEducation = (milestone: string) => {
    writeContract({
      address: PROMOTIONAL_TREASURY_ADDRESS,
      abi: PROMOTIONAL_TREASURY_ABI,
      functionName: 'claimEducationReward',
      args: [milestone],
    });
  };

  const _handleClaimMilestone = (milestone: string) => {
    writeContract({
      address: PROMOTIONAL_TREASURY_ADDRESS,
      abi: PROMOTIONAL_TREASURY_ABI,
      functionName: 'claimUserMilestone',
      args: [milestone],
    });
  };

  const _handleStake = (lpToken: string, amount: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'stake',
      args: [lpToken as `0x${string}`, parseUnits(amount, 18)],
    });
  };

  const _handleUnstake = (lpToken: string, amount: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'unstake',
      args: [lpToken as `0x${string}`, parseUnits(amount, 18)],
    });
  };

  const _handleClaimLPRewards = (lpToken: string) => {
    writeContract({
      address: LIQUIDITY_INCENTIVES_ADDRESS,
      abi: LIQUIDITY_INCENTIVES_ABI,
      functionName: 'claimRewards',
      args: [lpToken as `0x${string}`],
    });
  };

  const _handleCompound = (lpToken: string) => {
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
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(80,200,120,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
      </div>

      <main className="min-h-screen pt-20">
        {/* Header */}
        <motion.section 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 border-b border-white/10 backdrop-blur-xl bg-white/2"
        >
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <motion.div 
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-16 h-16 bg-linear-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/30"
                  >
                    <Gift className="w-8 h-8 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black">
                      <span className="bg-clip-text text-transparent bg-linear-to-r from-amber-400 via-yellow-400 to-orange-400">
                        Rewards Center
                      </span>
                    </h1>
                    <p className="text-xl text-gray-400">
                      Earn rewards for active participation in the VFIDE ecosystem
                    </p>
                  </div>
                </div>
              </div>
              
              {isConnected && (
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-linear-to-br from-emerald-500/10 to-green-500/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex-1 min-w-0"
                  >
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Total Claimable
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-400">{totalClaimable.toLocaleString()} VFIDE</div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-linear-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 flex-1 min-w-0"
                  >
                    <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      Total Earned
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-400">{totalEarned.toLocaleString()} VFIDE</div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Tab Navigation */}
        <section className="border-b border-white/5 backdrop-blur-sm bg-black/20 sticky top-16 z-40">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Gift, color: 'amber' },
                { id: 'duty' as const, label: 'Duty Rewards', icon: Vote, color: 'purple' },
                { id: 'promotional' as const, label: 'Promotional', icon: Trophy, color: 'emerald' },
                { id: 'liquidity' as const, label: 'LP Staking', icon: Droplets, color: 'cyan' },
                { id: 'referral' as const, label: 'Referrals', icon: Users, color: 'pink' },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                const colorMap: Record<string, string> = {
                  amber: isActive ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' : 'hover:bg-amber-500/10 hover:text-amber-400',
                  purple: isActive ? 'bg-linear-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25' : 'hover:bg-purple-500/10 hover:text-purple-400',
                  emerald: isActive ? 'bg-linear-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25' : 'hover:bg-emerald-500/10 hover:text-emerald-400',
                  cyan: isActive ? 'bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25' : 'hover:bg-cyan-500/10 hover:text-cyan-400',
                  pink: isActive ? 'bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25' : 'hover:bg-pink-500/10 hover:text-pink-400',
                };
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                      isActive ? colorMap[tab.color] : `bg-white/5 text-gray-400 ${colorMap[tab.color]}`
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          {activeTab === 'overview' && <OverviewTab isConnected={isConnected} totalClaimable={totalClaimable} dutyClaimable={dutyClaimable} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'duty' && <DutyRewardsTab isConnected={isConnected} dutyClaimable={dutyClaimable} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'promotional' && <PromotionalTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'liquidity' && <LiquidityTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
          {activeTab === 'referral' && <ReferralTab isConnected={isConnected} onClaim={handleClaim} claimingId={claimingId} />}
        </div>
      </main>

      <Footer />
    </>
  )
}

function OverviewTab({ isConnected, totalClaimable, dutyClaimable, onClaim, claimingId }: { 
  isConnected: boolean; 
  totalClaimable: number;
  dutyClaimable: number;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  // Dynamic reward sources - values come from contract reads in parent
  const rewardSources = [
    { id: 'duty', name: 'Governance Voting', amount: dutyClaimable, icon: Vote, color: '#00F0FF', description: 'Rewards for participating in DAO votes' },
    { id: 'promo', name: 'Promotional Rewards', amount: 0, icon: Trophy, color: '#FFD700', description: 'Education, milestones, and pioneer badges' },
    { id: 'lp', name: 'LP Staking', amount: 0, icon: Droplets, color: '#50C878', description: 'Liquidity provider incentives' },
    { id: 'referral', name: 'Referral Bonus', amount: 0, icon: Users, color: '#A78BFA', description: 'Rewards for inviting new users' },
  ]

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <Gift className="w-20 h-20 mx-auto mb-6 text-[#A0A0A5]" />
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F3E8] mb-4">Connect Wallet</h2>
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
        className="bg-linear-to-r from-[#FFD700]/20 to-[#50C878]/20 border border-[#FFD700]/50 rounded-2xl p-8 text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F5F3E8] mb-2">Your Rewards Are Ready!</h2>
        <p className="text-[#A0A0A5] mb-6">You have {totalClaimable.toLocaleString()} VFIDE available to claim</p>
        <button 
          onClick={() => onClaim('all')}
          disabled={claimingId === 'all'}
          className={`px-10 py-4 rounded-xl font-bold text-xl transition-all ${
            claimingId === 'all' 
              ? 'bg-[#3A3A3F] text-[#8A8A8F]' 
              : 'bg-linear-to-r from-[#FFD700] to-[#50C878] text-[#1A1A1D] hover:scale-105'
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
            className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 flex flex-col justify-between min-h-[180px]"
          >
            <div className="flex items-start gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${source.color}20` }}
              >
                <source.icon size={24} style={{ color: source.color }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#F5F3E8] truncate">{source.name}</h3>
                <p className="text-sm text-[#A0A0A5] line-clamp-2">{source.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[#A0A0A5] text-sm">Claimable</div>
                <div className="text-xl sm:text-2xl font-bold truncate" style={{ color: source.color }}>
                  {source.amount.toLocaleString()} VFIDE
                </div>
              </div>
              <button 
                onClick={() => onClaim(source.id)}
                disabled={claimingId === source.id || source.amount === 0}
                className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition-all shrink-0 ${
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
          ].map((item) => (
            <div key={item.title} className="p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F]">
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

function DutyRewardsTab({ isConnected, dutyClaimable, onClaim, claimingId }: {
  isConnected: boolean;
  dutyClaimable: number;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const { address } = useAccount();
  
  // Fetch voting history from API
  const [votingHistory, setVotingHistory] = useState<Array<{id: number; proposal: string; date: string; points: number; claimed: boolean}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch on mount - use useEffect instead of useState
  React.useEffect(() => {
    if (address) {
      setIsLoading(true);
      fetch(`/api/governance/votes/${address}`)
        .then(res => res.ok ? res.json() : { votes: [] })
        .then(data => setVotingHistory(data.votes || []))
        .catch(() => setVotingHistory([]))
        .finally(() => setIsLoading(false));
    }
  }, [address]);

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
        {[
          { label: 'Total Points', value: votingHistory.reduce((sum, v) => sum + v.points, 0), color: '#00F0FF', suffix: '' },
          { label: 'Claimable', value: dutyClaimable.toFixed(2), color: '#50C878', suffix: ' VFIDE' },
          { label: 'Votes (Month)', value: votingHistory.length, color: '#F5F3E8', suffix: '' },
          { label: 'Participation', value: votingHistory.length > 0 ? '100' : '0', color: '#FFD700', suffix: '%' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
            <div className="text-[#A0A0A5] text-sm mb-1">{stat.label}</div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {isLoading ? '...' : `${stat.value}${stat.suffix}`}
            </div>
          </div>
        ))}
      </div>

      {/* Claim Section */}
      <div className="bg-linear-to-r from-[#00F0FF]/20 to-[#0080FF]/20 border border-[#00F0FF]/50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-1">Governance Duty Rewards</h3>
            <p className="text-[#A0A0A5]">Receive VFIDE tokens for active DAO governance participation</p>
          </div>
          <button
            onClick={() => onClaim('duty')}
            disabled={claimingId === 'duty' || dutyClaimable <= 0}
            className="px-8 py-3 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D4E0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claimingId === 'duty' ? 'Claiming...' : `Claim ${dutyClaimable.toFixed(2)} VFIDE`}
          </button>
        </div>
      </div>

      {/* Voting History */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Recent Voting Activity</h3>
        {votingHistory.length === 0 ? (
          <p className="text-[#A0A0A5] text-center py-8">No voting history yet. Participate in governance to earn rewards!</p>
        ) : (
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
        )}
      </div>
    </div>
  )
}

function PromotionalTab({ isConnected, onClaim, claimingId }: {
  isConnected: boolean;
  onClaim: (id: string) => void;
  claimingId: string | null;
}) {
  const { address } = useAccount();
  const [promotionalRewards, setPromotionalRewards] = useState<Array<{
    id: string;
    name: string;
    amount: number;
    icon: React.ElementType;
    status: 'claimable' | 'locked' | 'claimed';
    desc: string;
    progress?: number;
  }>>([
    { id: 'pioneer', name: 'Pioneer Badge', amount: 500, icon: Star, status: 'locked', desc: 'Early adopter reward for joining before mainnet' },
    { id: 'education1', name: 'Complete Profile', amount: 100, icon: GraduationCap, status: 'locked', desc: 'Set up your vault and profile' },
    { id: 'education2', name: 'First Vote', amount: 100, icon: Vote, status: 'locked', desc: 'Participate in your first governance vote' },
    { id: 'education3', name: 'Guardian Setup', amount: 200, icon: Lock, status: 'locked', desc: 'Add at least 2 guardians to your vault', progress: 0 },
    { id: 'milestone1', name: '1,000 VFIDE Held', amount: 300, icon: Coins, status: 'locked', desc: 'Hold 1,000+ VFIDE for 30 days' },
  ]);
  const [budgetInfo, setBudgetInfo] = useState({ distributed: 0, total: 2000000 });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch promotional rewards status from API
  React.useEffect(() => {
    if (address) {
      setIsLoading(true);
      fetch(`/api/rewards/promotional/${address}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.rewards) {
            setPromotionalRewards(prev => prev.map(r => {
              const found = data.rewards.find((dr: { id: string }) => dr.id === r.id);
              return found ? { ...r, ...found } : r;
            }));
          }
          if (data?.budget) {
            setBudgetInfo(data.budget);
          }
        })
        .catch(() => {/* keep defaults */})
        .finally(() => setIsLoading(false));
    }
  }, [address]);

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
              <div 
                className="h-full bg-linear-to-r from-[#FFD700] to-[#FFA500] transition-all" 
                style={{ width: `${budgetInfo.total > 0 ? (budgetInfo.distributed / budgetInfo.total) * 100 : 0}%` }} 
              />
            </div>
          </div>
          <div className="text-[#F5F3E8] font-bold text-sm sm:text-base whitespace-nowrap">
            {isLoading ? '...' : `${(budgetInfo.distributed / 1000).toFixed(0)}K / ${(budgetInfo.total / 1000000).toFixed(0)}M VFIDE`}
          </div>
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
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('')
  const [isStaking, setIsStaking] = useState(false)
  const [_selectedPool, setSelectedPool] = useState<string | null>(null)
  const [pools, setPools] = useState<Array<{
    id: string;
    address: string;
    name: string;
    estimatedRate: number;
    tvl: string;
    yourStake: number;
    earned: number;
    multiplier: string;
  }>>([
    { id: 'vfide-eth', address: process.env.NEXT_PUBLIC_VFIDE_ETH_LP || '', name: 'VFIDE/ETH', estimatedRate: 0, tvl: '0', yourStake: 0, earned: 0, multiplier: '2x' },
    { id: 'vfide-usdc', address: process.env.NEXT_PUBLIC_VFIDE_USDC_LP || '', name: 'VFIDE/USDC', estimatedRate: 0, tvl: '0', yourStake: 0, earned: 0, multiplier: '1.5x' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();

  // Fetch pool data from API
  React.useEffect(() => {
    if (address) {
      setIsLoading(true);
      fetch(`/api/staking/pools?userAddress=${address}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.pools) {
            setPools(data.pools);
          }
        })
        .catch(() => {/* keep defaults */})
        .finally(() => setIsLoading(false));
    }
  }, [address]);

  const handleStake = async (lpTokenAddress: string) => {
    if (!stakeAmount || !lpTokenAddress) return
    setIsStaking(true)
    setSelectedPool(lpTokenAddress)
    try {
      // Stake LP tokens
      await writeContractAsync({
        address: LIQUIDITY_INCENTIVES_ADDRESS,
        abi: LIQUIDITY_INCENTIVES_ABI,
        functionName: 'stake',
        args: [lpTokenAddress as `0x${string}`, parseUnits(stakeAmount, 18)],
      });
      setStakeAmount('')
      toast.success('Staked successfully')
    } catch (error) {
      console.error('Staking failed:', error)
      toast.error('Staking failed. Please try again.')
    } finally {
      setIsStaking(false)
      setSelectedPool(null)
    }
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
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Quick Stake</h3>
          <button
            onClick={() => setStakeAmount('1000')}
            className="text-xs text-[#00F0FF] hover:text-[#00D4FF] font-bold"
          >
            MAX
          </button>
        </div>
        <div className="flex gap-4">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="LP Token Amount"
            className="flex-1 px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
          />
          <button
            onClick={() => handleStake(pools[0]?.address || '')}
            disabled={isStaking || !stakeAmount}
            className="px-8 py-3 bg-linear-to-r from-[#00F0FF] to-[#50C878] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform"
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
  const { address } = useAccount();
  const [copied, setCopied] = useState(false)
  const [referralStats, setReferralStats] = useState({
    code: '',
    totalReferrals: 0,
    activeReferrals: 0,
    earned: 0,
    claimable: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch referral data from API
  React.useEffect(() => {
    if (address) {
      setIsLoading(true);
      fetch(`/api/referrals/${address}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setReferralStats({
              code: data.code || `VFIDE-${address.slice(2, 8).toUpperCase()}`,
              totalReferrals: data.totalReferrals || 0,
              activeReferrals: data.activeReferrals || 0,
              earned: data.earned || 0,
              claimable: data.claimable || 0,
            });
          } else {
            // Generate code from address if no data
            setReferralStats(prev => ({
              ...prev,
              code: `VFIDE-${address.slice(2, 8).toUpperCase()}`,
            }));
          }
        })
        .catch(() => {
          setReferralStats(prev => ({
            ...prev,
            code: `VFIDE-${address.slice(2, 8).toUpperCase()}`,
          }));
        })
        .finally(() => setIsLoading(false));
    }
  }, [address]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      return
    } catch {
      // Ignore and try fallback
    }

    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)

      if (ok) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // If copying fails, do nothing.
    }
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
      {/* Referral Link Generator */}
      <div className="bg-linear-to-r from-[#A78BFA]/20 to-[#8B5CF6]/20 border border-[#A78BFA] rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#A78BFA] mb-4 text-center">Your Referral Link</h3>
        
        {/* Full Referral URL */}
        <div className="bg-[#1A1A1D] rounded-lg p-4 mb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <input 
              type="text"
              readOnly
              value={`https://vfide.app/join?ref=${referralStats.code}`}
              className="flex-1 bg-transparent text-[#F5F3E8] font-mono text-sm md:text-base focus:outline-none"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => copyToClipboard(`https://vfide.app/join?ref=${referralStats.code}`)}
                className="flex-1 md:flex-none px-4 py-2 bg-[#A78BFA] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#9061F9] transition-colors text-sm"
              >
                📋 {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button 
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on VFIDE - the future of trust-based payments! 0% processing fees, earn reputation, lower transfer fees. Use my referral link:')}&url=${encodeURIComponent(`https://vfide.app/join?ref=${referralStats.code}`)}`, '_blank')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-black border border-[#3A3A3F] rounded-lg text-white hover:bg-[#1A1A1D] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span className="text-sm font-bold">Share on X</span>
          </button>
          <button 
            onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(`https://vfide.app/join?ref=${referralStats.code}`)}&text=${encodeURIComponent('Join VFIDE - 0% payment processing fees!')}`, '_blank')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc] rounded-lg text-white hover:bg-[#0077b5] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span className="text-sm font-bold">Telegram</span>
          </button>
          <button 
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on VFIDE! 0% payment fees, earn reputation. https://vfide.app/join?ref=${referralStats.code}`)}`, '_blank')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] rounded-lg text-white hover:bg-[#20BD5C] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="text-sm font-bold">WhatsApp</span>
          </button>
          <button 
            onClick={() => {
              const _qrData = `https://vfide.app/join?ref=${referralStats.code}`;
              // Open QR code modal or generate inline
              alert('QR Code feature coming soon!');
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] hover:border-[#A78BFA] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            <span className="text-sm font-bold">QR Code</span>
          </button>
        </div>

        <p className="text-[#A0A0A5] text-center text-sm">Earn <span className="text-[#FFD700] font-bold">50 VFIDE</span> for each user who creates a vault using your link + <span className="text-[#50C878] font-bold">150 VFIDE</span> when they become a merchant!</p>
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
            className="px-10 py-4 bg-linear-to-r from-[#A78BFA] to-[#8B5CF6] text-white rounded-xl font-bold text-xl hover:scale-105 transition-transform"
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
