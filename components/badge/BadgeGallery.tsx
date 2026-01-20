'use client'

import { useBadgeNFTs } from '@/lib/vfide-hooks'
import { getBadgeById, getAllBadges, getBadgesByCategory, getBadgeCategories } from '@/lib/badge-registry'
import { BadgeDisplay } from './BadgeDisplay'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactionSounds } from '@/hooks/useTransactionSounds'
import { Trophy, Lock, Sparkles, Star, Zap } from 'lucide-react'

export interface BadgeGalleryProps {
  address?: `0x${string}`
  showAll?: boolean
  compact?: boolean
}

export function BadgeGallery({ address, showAll = false, compact = false }: BadgeGalleryProps) {
  const { tokenIds, isLoading: loadingBadges } = useBadgeNFTs(address)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)
  const [_newlyEarned, _setNewlyEarned] = useState<Set<string>>(new Set())
  const { playSuccess: _playSuccess, playNotification } = useTransactionSounds()
  
  const categories = getBadgeCategories()
  
  // Get badges to display
  const allBadges = getAllBadges()
  const earnedBadges = tokenIds
    .map(id => {
      const badgeIdHex = `0x${BigInt(id).toString(16)}` as `0x${string}`;
      return getBadgeById(badgeIdHex);
    })
    .filter(Boolean)
  const nftCount = tokenIds.length
  
  const badgesToDisplay = showAll 
    ? selectedCategory === 'all' 
      ? allBadges 
      : getBadgesByCategory(selectedCategory)
    : earnedBadges
  
  const earnedSet = new Set(tokenIds.map(id => `0x${BigInt(id).toString(16)}`))
  
  // Total points with animation
  const totalPoints = useMemo(() => 
    earnedBadges.filter(b => b).reduce((sum, badge) => sum + (badge?.points || 0), 0),
    [earnedBadges]
  )

  // Rarity colors
  const getRarityGlow = (points: number) => {
    if (points >= 500) return 'shadow-[0_0_30px_rgba(255,215,0,0.6)]' // Legendary
    if (points >= 200) return 'shadow-[0_0_20px_rgba(168,85,247,0.5)]' // Epic
    if (points >= 100) return 'shadow-[0_0_15px_rgba(59,130,246,0.4)]' // Rare
    return 'shadow-[0_0_10px_rgba(34,197,94,0.3)]' // Common
  }

  const getRarityBorder = (points: number) => {
    if (points >= 500) return 'border-yellow-500/50'
    if (points >= 200) return 'border-purple-500/50'
    if (points >= 100) return 'border-blue-500/50'
    return 'border-green-500/50'
  }

  // Play sound on hover for rare badges
  const handleBadgeHover = (badge: { id: string; points?: number }) => {
    setHoveredBadge(badge.id)
    if (badge.points && badge.points >= 200) {
      playNotification()
    }
  }
  
  if (loadingBadges) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-yellow-500"
        />
      </div>
    )
  }
  
  if (!showAll && badgesToDisplay.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400" />
        </motion.div>
        <div className="text-lg font-semibold mb-2 text-gray-100">No Badges Yet</div>
        <div className="text-sm text-gray-400">
          Start participating to earn your first badge!
        </div>
      </motion.div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {!compact && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-2xl bg-linear-to-r from-zinc-900 to-zinc-900 border border-zinc-800"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Trophy className="w-6 h-6 text-black" />
            </div>
            <div>
              <motion.div 
                key={earnedBadges.length}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-gray-100"
              >
                {earnedBadges.length} Badges Earned
              </motion.div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                {nftCount} minted as NFTs
              </div>
            </div>
          </div>
          
          {showAll && (
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-500">{earnedBadges.length} / {allBadges.length}</div>
              <div className="text-xs text-gray-500">collected</div>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Category Tabs */}
      {showAll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={selectedCategory} onValueChange={(val) => {
            setSelectedCategory(val)
            playNotification()
          }}>
            <TabsList className="w-full justify-start overflow-x-auto bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              <TabsTrigger value="all" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black rounded-lg">
                All ({allBadges.length})
              </TabsTrigger>
              {categories.map(category => {
                const categoryBadges = getBadgesByCategory(category)
                const earnedInCategory = categoryBadges.filter(b => earnedSet.has(b.id)).length
                return (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black rounded-lg"
                  >
                    {category} ({earnedInCategory}/{categoryBadges.length})
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </motion.div>
      )}
      
      {/* Badge Grid */}
      <motion.div 
        layout
        className={`grid gap-4 ${compact ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}
      >
        <AnimatePresence mode="popLayout">
          {badgesToDisplay.map((badge, index) => {
            if (!badge) return null
            const isEarned = earnedSet.has(badge.id)
            const isHovered = hoveredBadge === badge.id
            const points = badge.points || 0
            
            return (
              <motion.div
                key={badge.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ 
                  opacity: isEarned || !showAll ? 1 : 0.4, 
                  scale: 1, 
                  y: 0,
                  filter: isEarned || !showAll ? 'grayscale(0)' : 'grayscale(1)'
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.03,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                whileHover={{ 
                  scale: 1.05,
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                onHoverStart={() => handleBadgeHover(badge)}
                onHoverEnd={() => setHoveredBadge(null)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  isEarned 
                    ? `${getRarityBorder(points)} ${isHovered ? getRarityGlow(points) : ''}`
                    : 'border-zinc-800'
                }`}
              >
                <BadgeDisplay
                  badgeId={badge.id}
                  size={compact ? 'sm' : 'md'}
                  showPoints={!compact}
                  className="w-full"
                />
                
                {/* Locked overlay */}
                {!isEarned && showAll && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-gray-500" />
                    </div>
                  </motion.div>
                )}

                {/* Rarity indicator */}
                {isEarned && points >= 200 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-1 right-1"
                  >
                    {points >= 500 ? (
                      <div className="w-6 h-6 rounded-full bg-linear-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                        <Star className="w-3 h-3 text-black fill-black" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                        <Zap className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Shimmer effect on hover */}
                {isHovered && isEarned && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
      
      {/* Total Points */}
      {!compact && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-6 border-t border-zinc-800"
        >
          <div className="flex items-center justify-between p-4 rounded-xl bg-linear-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-sm text-gray-400">Total Badge Points</span>
            </div>
            <motion.span 
              key={totalPoints}
              initial={{ scale: 1.3, color: '#FFD700' }}
              animate={{ scale: 1, color: '#FFFFFF' }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold"
            >
              +{totalPoints.toLocaleString()}
            </motion.span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
