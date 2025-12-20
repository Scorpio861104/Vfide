'use client'

import { useUserBadges, useBadgeNFTs } from '@/lib/vfide-hooks'
import { getBadgeById, getAllBadges, getBadgesByCategory, getBadgeCategories } from '@/lib/badge-registry'
import { BadgeDisplay } from './BadgeDisplay'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'

export interface BadgeGalleryProps {
  address?: `0x${string}`
  showAll?: boolean
  compact?: boolean
}

export function BadgeGallery({ address, showAll = false, compact = false }: BadgeGalleryProps) {
  const { badgeIds, isLoading: loadingBadges } = useUserBadges(address)
  const { count: nftCount } = useBadgeNFTs(address)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const categories = getBadgeCategories()
  
  // Get badges to display
  const allBadges = getAllBadges()
  const earnedBadges = badgeIds.map(id => getBadgeById(id)).filter(Boolean)
  
  const badgesToDisplay = showAll 
    ? selectedCategory === 'all' 
      ? allBadges 
      : getBadgesByCategory(selectedCategory)
    : earnedBadges
  
  const earnedSet = new Set(badgeIds)
  
  if (loadingBadges) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!showAll && badgesToDisplay.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto mb-4 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
        <div className="text-lg font-semibold mb-2">No Badges Yet</div>
        <div className="text-sm text-muted-foreground">
          Start participating to earn your first badge!
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{earnedBadges.length} Badges Earned</div>
            <div className="text-sm text-muted-foreground">
              {nftCount} minted as NFTs
            </div>
          </div>
          
          {showAll && (
            <div className="text-sm text-muted-foreground">
              {earnedBadges.length} / {allBadges.length} collected
            </div>
          )}
        </div>
      )}
      
      {/* Category Tabs */}
      {showAll && (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({allBadges.length})</TabsTrigger>
            {categories.map(category => {
              const categoryBadges = getBadgesByCategory(category)
              const earnedInCategory = categoryBadges.filter(b => earnedSet.has(b.id)).length
              return (
                <TabsTrigger key={category} value={category}>
                  {category} ({earnedInCategory}/{categoryBadges.length})
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      )}
      
      {/* Badge Grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
        {badgesToDisplay.map(badge => {
          if (!badge) return null
          const isEarned = earnedSet.has(badge.id)
          
          return (
            <div
              key={badge.id}
              className={`relative ${!isEarned && showAll ? 'opacity-40 grayscale' : ''}`}
            >
              <BadgeDisplay
                badgeId={badge.id}
                size={compact ? 'sm' : 'md'}
                showPoints={!compact}
                className="w-full"
              />
              
              {!isEarned && showAll && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#A0A0A5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Total Points */}
      {!compact && (
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Badge Points:</span>
            <span className="text-xl font-bold">
              +{earnedBadges.filter(b => b).reduce((sum, badge) => sum + (badge?.points || 0), 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
