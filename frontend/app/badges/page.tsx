/**
 * VFIDE Badge System Page
 * View earned badges, mint NFTs, track progress
 */

'use client'

import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { keccak256, toBytes } from 'viem'
import { 
  Award, Shield, Star, TrendingUp, CheckCircle, 
  Clock, Lock, Sparkles, Trophy, Target, Zap, Heart,
  ShoppingBag, Crown, Gem, Loader2
} from 'lucide-react'
import { 
  BADGE_REGISTRY, 
  getBadgeCategories, 
  getAllBadges,
  type BadgeMetadata 
} from '@/lib/badge-registry'

// VFIDEBadgeNFT ABI
const BADGE_NFT_ABI = [
  { name: 'mintBadge', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'badge', type: 'bytes32' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { name: 'mintBadges', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'badges', type: 'bytes32[]' }], outputs: [{ name: 'tokenIds', type: 'uint256[]' }] },
  { name: 'burnBadge', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [] },
  { name: 'userBadgeToken', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'badge', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { name: 'badgeMintCount', type: 'function', stateMutability: 'view', inputs: [{ name: 'badge', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { name: 'badgeNumber', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenBadge', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// Seer (VFIDETrust) ABI for checking badges
const SEER_ABI = [
  { name: 'hasBadge', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'badge', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { name: 'badgeExpiry', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'badge', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { name: 'score', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

// TODO: Replace with actual deployed addresses
const BADGE_NFT_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const SEER_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Category icons
const categoryIcons: Record<string, React.ReactNode> = {
  'Pioneer & Foundation': <Crown className="w-5 h-5" />,
  'Activity & Participation': <Zap className="w-5 h-5" />,
  'Trust & Community': <Heart className="w-5 h-5" />,
  'Commerce & Merchants': <ShoppingBag className="w-5 h-5" />,
  'Security & Integrity': <Shield className="w-5 h-5" />,
  'Achievements & Milestones': <Trophy className="w-5 h-5" />,
  'Education & Contribution': <Star className="w-5 h-5" />,
}

// Category colors
const categoryColors: Record<string, string> = {
  'Pioneer & Foundation': '#FFD700',
  'Activity & Participation': '#00F0FF',
  'Trust & Community': '#FF6B9D',
  'Commerce & Merchants': '#00FF88',
  'Security & Integrity': '#A78BFA',
  'Achievements & Milestones': '#FF9500',
  'Education & Contribution': '#00D4FF',
}

// Rarity colors
const rarityColors: Record<string, string> = {
  Common: '#8A8A8F',
  Uncommon: '#00FF88',
  Rare: '#00F0FF',
  Epic: '#A78BFA',
  Legendary: '#FFD700',
  Mythic: '#FF6B9D',
}

type TabId = 'all' | 'earned' | 'available' | 'minted'

export default function BadgesPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [mintingBadge, setMintingBadge] = useState<string | null>(null)

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Calculate current time once to avoid impure function calls during render
  const currentTime = useMemo(() => Date.now(), [])
  const oneWeekFromNow = useMemo(() => currentTime + 7 * 24 * 60 * 60 * 1000, [currentTime])

  const allBadges = getAllBadges()
  const categories = getBadgeCategories()

  // Read user's NFT balance
  const { data: nftBalance } = useReadContract({
    address: BADGE_NFT_ADDRESS,
    abi: BADGE_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read user's ProofScore
  const { data: proofScore } = useReadContract({
    address: SEER_ADDRESS,
    abi: SEER_ABI,
    functionName: 'score',
    args: address ? [address] : undefined,
  });

  // Handler to mint a badge as NFT
  const handleMintBadge = async (badgeName: string) => {
    if (!address) return;
    setMintingBadge(badgeName);
    
    // Convert badge name to bytes32 hash (matches contract's BadgeRegistry)
    const badgeId = keccak256(toBytes(badgeName));
    
    writeContract({
      address: BADGE_NFT_ADDRESS,
      abi: BADGE_NFT_ABI,
      functionName: 'mintBadge',
      args: [badgeId],
    });
    
    // Clear minting state after tx
    if (isSuccess || !isPending) {
      setMintingBadge(null);
    }
  };

  // Mock user badges for UI (TODO: Replace with contract reads for each badge)
  const mockUserBadges: Record<string, { earned: boolean; expiry?: number; minted: boolean; tokenId?: number }> = {
    PIONEER: { earned: true, minted: true, tokenId: 2847 },
    GENESIS_PRESALE: { earned: true, minted: false },
    ACTIVE_TRADER: { earned: true, expiry: Date.now() + 60 * 24 * 60 * 60 * 1000, minted: false },
    GOVERNANCE_VOTER: { earned: false, minted: false },
    POWER_USER: { earned: false, minted: false },
    TRUSTED_ENDORSER: { earned: false, minted: false },
    VERIFIED_MERCHANT: { earned: false, minted: false },
    FOUNDING_MEMBER: { earned: false, minted: false },
  };

  // Filter badges based on tab
  const filteredBadges = allBadges.filter(badge => {
    const userBadge = mockUserBadges[badge.name]
    
    if (selectedCategory && badge.category !== selectedCategory) return false
    
    switch (activeTab) {
      case 'earned':
        return userBadge?.earned
      case 'available':
        return !userBadge?.earned
      case 'minted':
        return userBadge?.minted
      default:
        return true
    }
  })

  // Stats
  const earnedCount = allBadges.filter(b => mockUserBadges[b.name]?.earned).length
  const mintedCount = Number(nftBalance ?? 0) || allBadges.filter(b => mockUserBadges[b.name]?.minted).length
  const totalPoints = allBadges
    .filter(b => mockUserBadges[b.name]?.earned)
    .reduce((sum, b) => sum + b.points, 0)

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All Badges', count: allBadges.length },
    { id: 'earned', label: 'Earned', count: earnedCount },
    { id: 'available', label: 'Available', count: allBadges.length - earnedCount },
    { id: 'minted', label: 'NFTs', count: mintedCount },
  ]

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-8 sm:py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#FFD700] to-[#FF9500] rounded-2xl mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#F5F3E8] mb-4">
                Badge Collection
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-[#A0A0A5]">
                Earn badges through actions, mint them as soulbound NFTs
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-8"
            >
              <div className="text-center p-4 bg-[#2A2A2F] rounded-xl border border-[#3A3A3F]">
                <p className="text-2xl sm:text-3xl font-bold text-[#00FF88]">{earnedCount}</p>
                <p className="text-xs sm:text-sm text-[#A0A0A5]">Earned</p>
              </div>
              <div className="text-center p-4 bg-[#2A2A2F] rounded-xl border border-[#3A3A3F]">
                <p className="text-2xl sm:text-3xl font-bold text-[#FFD700]">{mintedCount}</p>
                <p className="text-xs sm:text-sm text-[#A0A0A5]">NFTs Minted</p>
              </div>
              <div className="text-center p-4 bg-[#2A2A2F] rounded-xl border border-[#3A3A3F]">
                <p className="text-2xl sm:text-3xl font-bold text-[#00F0FF]">+{totalPoints}</p>
                <p className="text-xs sm:text-sm text-[#A0A0A5]">Score Boost</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tabs & Filters */}
        <div className="sticky top-16 z-40 bg-[#1A1A1D]/95 backdrop-blur border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${
                    activeTab === tab.id
                      ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50"
                      : "text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A2F]"
                  }`}
                >
                  {tab.label}
                  <span className="px-1.5 py-0.5 text-xs bg-[#3A3A3F] rounded">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  !selectedCategory
                    ? "bg-[#F5F3E8] text-[#1A1A1D]"
                    : "bg-[#2A2A2F] text-[#A0A0A5] hover:bg-[#3A3A3F]"
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? "text-[#1A1A1D]"
                      : "bg-[#2A2A2F] text-[#A0A0A5] hover:bg-[#3A3A3F]"
                  }`}
                  style={selectedCategory === category ? { backgroundColor: categoryColors[category] } : {}}
                >
                  {categoryIcons[category]}
                  <span className="hidden sm:inline">{category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Badge Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredBadges.map((badge, idx) => {
                  const userBadge = mockUserBadges[badge.name]
                  const isEarned = userBadge?.earned
                  const isMinted = userBadge?.minted
                  const expiry = userBadge?.expiry
                  const tokenId = userBadge?.tokenId

                  return (
                    <motion.div
                      key={badge.name}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`relative group rounded-xl border overflow-hidden transition-all ${
                        isEarned
                          ? 'bg-[#2A2A2F] border-[#3A3A3F] hover:border-[#FFD700]/50'
                          : 'bg-[#1F1F22] border-[#2A2A2F] opacity-60'
                      }`}
                    >
                      {/* Rarity Indicator */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: rarityColors[badge.rarity] }}
                      />

                      {/* Content */}
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{ 
                              backgroundColor: `${categoryColors[badge.category]}20`,
                              border: `1px solid ${categoryColors[badge.category]}40`
                            }}
                          >
                            {badge.icon}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ 
                                backgroundColor: `${rarityColors[badge.rarity]}20`,
                                color: rarityColors[badge.rarity]
                              }}
                            >
                              {badge.rarity}
                            </span>
                            {isEarned && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#00FF88]/20 text-[#00FF88] flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Earned
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name & Description */}
                        <h3 className="text-base font-bold text-[#F5F3E8] mb-1">
                          {badge.displayName}
                        </h3>
                        <p className="text-xs text-[#A0A0A5] mb-3 line-clamp-2">
                          {badge.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-3 mb-3 text-xs">
                          <div className="flex items-center gap-1 text-[#00F0FF]">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{badge.points} pts</span>
                          </div>
                          <div className="flex items-center gap-1 text-[#A0A0A5]">
                            {badge.isPermanent ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Permanent</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>{Math.floor(badge.duration / (24 * 60 * 60))}d</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Expiry Warning */}
                        {expiry && expiry < oneWeekFromNow && (
                          <div className="mb-3 p-2 rounded-lg bg-[#FF9500]/10 border border-[#FF9500]/30">
                            <p className="text-[10px] text-[#FF9500] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires in {Math.floor((expiry - currentTime) / (24 * 60 * 60 * 1000))} days
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {isEarned && !isMinted && (
                          <button
                            onClick={() => handleMintBadge(badge.name)}
                            disabled={mintingBadge === badge.name}
                            className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FF9500] text-[#1A1A1D] font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                          >
                            {mintingBadge === badge.name ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                >
                                  <Sparkles className="w-4 h-4" />
                                </motion.div>
                                Minting...
                              </>
                            ) : (
                              <>
                                <Gem className="w-4 h-4" />
                                Mint as NFT
                              </>
                            )}
                          </button>
                        )}

                        {isMinted && tokenId && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#A78BFA]/10 border border-[#A78BFA]/30">
                            <span className="text-xs text-[#A78BFA] font-medium">
                              NFT #{tokenId.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#A0A0A5]">Soulbound</span>
                          </div>
                        )}

                        {!isEarned && (
                          <div className="p-2 rounded-lg bg-[#2A2A2F] border border-[#3A3A3F]">
                            <p className="text-[10px] text-[#A0A0A5]">
                              <Target className="w-3 h-3 inline mr-1" />
                              {badge.earnRequirement}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {filteredBadges.length === 0 && (
              <div className="text-center py-16">
                <Award className="w-16 h-16 mx-auto text-[#3A3A3F] mb-4" />
                <p className="text-[#A0A0A5]">No badges found matching your filters</p>
              </div>
            )}
          </div>
        </section>

        {/* How it Works */}
        <section className="py-12 bg-[#0F0F12] border-t border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-bold text-[#F5F3E8] text-center mb-8">
              How Badges Work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-6 bg-[#1A1A1D] rounded-xl border border-[#3A3A3F]">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#00FF88]/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#00FF88]" />
                </div>
                <h3 className="text-lg font-bold text-[#F5F3E8] mb-2">1. Earn Through Actions</h3>
                <p className="text-sm text-[#A0A0A5]">
                  Complete activities like trading, voting, and helping others to earn badges automatically
                </p>
              </div>
              <div className="text-center p-6 bg-[#1A1A1D] rounded-xl border border-[#3A3A3F]">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#FFD700]/20 flex items-center justify-center">
                  <Gem className="w-6 h-6 text-[#FFD700]" />
                </div>
                <h3 className="text-lg font-bold text-[#F5F3E8] mb-2">2. Mint as NFT</h3>
                <p className="text-sm text-[#A0A0A5]">
                  Convert earned badges to soulbound NFTs - they cannot be transferred or sold
                </p>
              </div>
              <div className="text-center p-6 bg-[#1A1A1D] rounded-xl border border-[#3A3A3F]">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#00F0FF]/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#00F0FF]" />
                </div>
                <h3 className="text-lg font-bold text-[#F5F3E8] mb-2">3. Boost Your Score</h3>
                <p className="text-sm text-[#A0A0A5]">
                  Each badge adds points to your ProofScore, unlocking lower fees and more features
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
