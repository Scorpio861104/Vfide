'use client'

import { Footer } from '@/components/layout/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { keccak256, toBytes } from 'viem'
import { 
  Award, Shield, Star, CheckCircle, 
  Lock, Trophy, Zap, Heart,
  ShoppingBag, Crown, Gem, Loader2, Search
} from 'lucide-react'
import { 
  getBadgeCategories, 
  getAllBadges
} from '@/lib/badge-registry'
import { safeParseInt } from '@/lib/validation';

// Contract ABIs
const BADGE_NFT_ABI = [
  { name: 'mintBadge', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'badge', type: 'bytes32' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

const SEER_ABI = [
  { name: 'hasBadge', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'badge', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { name: 'score', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;

const BADGE_NFT_ADDRESS = (process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const SEER_ADDRESS = (process.env.NEXT_PUBLIC_SEER_ADDRESS || '0xD22944d47bAD4Bd5fF1A366393c4bdbc9250fd8E') as `0x${string}`;

// Category icons and colors
const categoryIcons: Record<string, React.ReactNode> = {
  'Pioneer & Foundation': <Crown className="w-5 h-5" />,
  'Activity & Participation': <Zap className="w-5 h-5" />,
  'Trust & Community': <Heart className="w-5 h-5" />,
  'Commerce & Merchants': <ShoppingBag className="w-5 h-5" />,
  'Security & Integrity': <Shield className="w-5 h-5" />,
  'Achievements & Milestones': <Trophy className="w-5 h-5" />,
  'Education & Contribution': <Star className="w-5 h-5" />,
}

const _categoryColors: Record<string, string> = {
  'Pioneer & Foundation': 'amber',
  'Activity & Participation': 'cyan',
  'Trust & Community': 'pink',
  'Commerce & Merchants': 'emerald',
  'Security & Integrity': 'purple',
  'Achievements & Milestones': 'orange',
  'Education & Contribution': 'blue',
}

const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Common: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', glow: '' },
  Uncommon: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  Rare: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  Epic: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  Legendary: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
  Mythic: { bg: 'bg-pink-500/20', border: 'border-pink-500/30', text: 'text-pink-400', glow: 'shadow-pink-500/30' },
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 100 } }
};

function GlassCard({ children, className = "", hover = true }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

type TabId = 'all' | 'earned' | 'available' | 'minted'

export default function BadgesPage() {
  const { address, isConnected: _isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mintingBadge, setMintingBadge] = useState<string | null>(null)

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: _isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Get current time once on component mount
  const [currentTime] = useState(() => Date.now())
  const allBadges = getAllBadges()
  const categories = getBadgeCategories()

  const { data: nftBalance } = useReadContract({
    address: BADGE_NFT_ADDRESS,
    abi: BADGE_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: _proofScore } = useReadContract({
    address: SEER_ADDRESS,
    abi: SEER_ABI,
    functionName: 'score',
    args: address ? [address] : undefined,
  });

  const handleMintBadge = async (badgeName: string) => {
    if (!address) return;
    setMintingBadge(badgeName);
    const badgeId = keccak256(toBytes(badgeName));
    writeContract({
      address: BADGE_NFT_ADDRESS,
      abi: BADGE_NFT_ABI,
      functionName: 'mintBadge',
      args: [badgeId],
    });
    if (isSuccess || !isPending) {
      setMintingBadge(null);
    }
  };

  // Mock user badges - using currentTime to avoid render-time Date.now() calls
  const mockUserBadges: Record<string, { earned: boolean; expiry?: number; minted: boolean; tokenId?: number }> = {
    PIONEER: { earned: true, minted: true, tokenId: 2847 },
    GENESIS_PRESALE: { earned: true, minted: false },
    ACTIVE_TRADER: { earned: true, expiry: currentTime + 60 * 24 * 60 * 60 * 1000, minted: false },
    GOVERNANCE_VOTER: { earned: false, minted: false },
    POWER_USER: { earned: false, minted: false },
    TRUSTED_ENDORSER: { earned: false, minted: false },
    VERIFIED_MERCHANT: { earned: false, minted: false },
    FOUNDING_MEMBER: { earned: false, minted: false },
  };

  const filteredBadges = allBadges.filter(badge => {
    const userBadge = mockUserBadges[badge.name]
    
    if (searchQuery && !badge.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !badge.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    if (selectedCategory && badge.category !== selectedCategory) return false
    
    switch (activeTab) {
      case 'earned': return userBadge?.earned
      case 'available': return !userBadge?.earned
      case 'minted': return userBadge?.minted
      default: return true
    }
  })

  const earnedCount = allBadges.filter(b => mockUserBadges[b.name]?.earned).length
  const mintedCount = safeParseInt(nftBalance?.toString(), 0) || allBadges.filter(b => mockUserBadges[b.name]?.minted).length
  const totalPoints = allBadges.filter(b => mockUserBadges[b.name]?.earned).reduce((sum, b) => sum + b.points, 0)

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All Badges', count: allBadges.length },
    { id: 'earned', label: 'Earned', count: earnedCount },
    { id: 'available', label: 'Available', count: allBadges.length - earnedCount },
    { id: 'minted', label: 'NFTs', count: mintedCount },
  ]

  return (
    <>
      
      <main className="min-h-screen bg-zinc-950 pt-20 relative">
        {/* Ambient Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-150 h-150 bg-amber-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-125 h-125 bg-purple-500/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        </div>

        {/* Hero */}
        <section className="py-12 border-b border-white/5 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/30 rounded-3xl mb-6 shadow-lg shadow-amber-500/20"
              >
                <Award className="w-10 h-10 text-amber-400" />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Badge Collection
              </h1>
              <p className="text-xl text-white/60">
                Earn badges through participation, build trust, and mint them as NFTs
              </p>
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-4xl mx-auto"
            >
              {[
                { label: 'Total Badges', value: allBadges.length, icon: Trophy, color: 'amber' },
                { label: 'Earned', value: earnedCount, icon: CheckCircle, color: 'emerald' },
                { label: 'NFTs Minted', value: mintedCount, icon: Gem, color: 'purple' },
                { label: 'Points', value: totalPoints.toLocaleString(), icon: Star, color: 'cyan' },
              ].map((stat) => (
                <motion.div key={stat.label} variants={itemVariants}>
                  <GlassCard className="p-4 text-center">
                    <stat.icon className={`w-6 h-6 mx-auto mb-2 ${
                      stat.color === 'amber' ? 'text-amber-400' :
                      stat.color === 'emerald' ? 'text-emerald-400' :
                      stat.color === 'purple' ? 'text-purple-400' :
                      'text-cyan-400'
                    }`} />
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-white/40 text-sm">{stat.label}</div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Filters & Search */}
        <section className="py-6 sticky top-20 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-3 sm:px-4">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label} ({tab.count})
                </motion.button>
              ))}
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  placeholder="Search badges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    !selectedCategory 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedCategory === cat 
                        ? 'bg-white/20 text-white' 
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {categoryIcons[cat]}
                    {cat.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Badge Grid */}
        <section className="py-8 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredBadges.map((badge) => {
                  const userBadge = mockUserBadges[badge.name]
                  const defaultRarity = { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', glow: '' }
                  const rarity = rarityColors[badge.rarity] ?? rarityColors.Common ?? defaultRarity
                  const isEarned = userBadge?.earned
                  const isMinted = userBadge?.minted
                  
                  return (
                    <motion.div
                      key={badge.name}
                      variants={itemVariants}
                      layout
                      className="group"
                    >
                      <GlassCard className={`p-5 h-full ${rarity.border} ${isEarned ? '' : 'opacity-60'}`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-2xl ${rarity.bg} ${rarity.glow ? `shadow-lg ${rarity.glow}` : ''}`}>
                            <Award className={`w-8 h-8 ${rarity.text}`} />
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${rarity.bg} ${rarity.text}`}>
                              {badge.rarity}
                            </span>
                            {isEarned && (
                              <span className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400">
                                ✓ Earned
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <h3 className="text-lg font-bold text-white mb-1">
                          {badge.name.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-white/60 text-sm mb-4 line-clamp-2">
                          {badge.description}
                        </p>

                        {/* Points */}
                        <div className="flex items-center gap-2 mb-4">
                          <Star className="text-amber-400" size={16} />
                          <span className="text-amber-400 font-bold">{badge.points} points</span>
                        </div>

                        {/* Category */}
                        <div className="flex items-center gap-2 text-white/40 text-xs mb-4">
                          {categoryIcons[badge.category]}
                          <span>{badge.category}</span>
                        </div>

                        {/* Action Button */}
                        {isEarned && !isMinted && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleMintBadge(badge.name)}
                            disabled={mintingBadge === badge.name}
                            className="w-full py-3 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
                          >
                            {mintingBadge === badge.name ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Gem size={18} />
                            )}
                            {mintingBadge === badge.name ? 'Minting...' : 'Mint as NFT'}
                          </motion.button>
                        )}

                        {isMinted && (
                          <div className="w-full py-3 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl font-bold flex items-center justify-center gap-2">
                            <Gem size={18} />
                            NFT #{userBadge?.tokenId}
                          </div>
                        )}

                        {!isEarned && (
                          <div className="w-full py-3 bg-white/5 text-white/40 rounded-xl font-medium flex items-center justify-center gap-2">
                            <Lock size={18} />
                            Not Yet Earned
                          </div>
                        )}
                      </GlassCard>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>

            {filteredBadges.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Badges Found</h3>
                <p className="text-white/60">Try adjusting your search or filters</p>
              </motion.div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
