'use client'

import { getBadgeById } from '@/lib/badge-registry'
import { cn } from '@/lib/utils'

export interface BadgeDisplayProps {
  badgeId: `0x${string}`
  size?: 'sm' | 'md' | 'lg'
  showPoints?: boolean
  showDescription?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-16 h-16 text-2xl',
  md: 'w-24 h-24 text-4xl',
  lg: 'w-32 h-32 text-5xl',
}

const rarityColors = {
  Common: 'from-gray-400 to-gray-600',
  Uncommon: 'from-green-400 to-green-600',
  Rare: 'from-blue-400 to-blue-600',
  Epic: 'from-purple-400 to-purple-600',
  Legendary: 'from-yellow-400 to-yellow-600',
}

export function BadgeDisplay({
  badgeId,
  size = 'md',
  showPoints = false,
  showDescription = false,
  className,
}: BadgeDisplayProps) {
  const badge = getBadgeById(badgeId)
  
  if (!badge) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg bg-muted', sizeClasses[size], className)}>
        <span className="text-muted-foreground text-xl">?</span>
      </div>
    )
  }
  
  return (
    <div className={cn('group relative', className)}>
      {/* Badge Icon */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl',
          sizeClasses[size],
          rarityColors[badge.rarity as keyof typeof rarityColors]
        )}
      >
        <span className="drop-shadow-lg">{badge.icon}</span>
        
        {/* Rarity Indicator */}
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/80 text-white rounded-full">
          {badge.rarity[0]}
        </div>
      </div>
      
      {/* Badge Info */}
      <div className="mt-2 text-center">
        <div className="font-semibold text-sm">{badge.displayName}</div>
        
        {showPoints && (
          <div className="text-xs text-muted-foreground">
            +{badge.points} points
          </div>
        )}
        
        {showDescription && (
          <div className="mt-1 text-xs text-muted-foreground max-w-[200px]">
            {badge.description}
          </div>
        )}
      </div>
      
      {/* Hover Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 w-64">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{badge.icon}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">{badge.displayName}</div>
              <div className="text-xs text-muted-foreground capitalize">{badge.rarity}</div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            {badge.description}
          </div>
          
          <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
            <span className="text-muted-foreground">Points:</span>
            <span className="font-semibold">+{badge.points}</span>
          </div>
          
          {!badge.isPermanent && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-semibold">{badge.duration / (60 * 60 * 24)} days</span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            <span className="font-semibold">How to earn:</span>
            <div className="mt-1">{badge.earnRequirement}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
