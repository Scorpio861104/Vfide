'use client'

import { getAllBadges, type BadgeMetadata } from '@/lib/badge-registry'
import { useBadgeNFTs, useProofScore } from '@/lib/vfide-hooks'
import { BadgeDisplay } from './BadgeDisplay'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface BadgeProgressProps {
  address?: `0x${string}`
  maxItems?: number
}

interface BadgeWithProgress extends BadgeMetadata {
  progress: number
  progressText: string
  isEarned: boolean
}

export function BadgeProgress({ address, maxItems = 5 }: BadgeProgressProps) {
  const { tokenIds } = useBadgeNFTs(address)
  const { score } = useProofScore(address)
  
  const earnedSet = new Set(tokenIds.map(id => id.toString()))
  
  // Calculate progress for each badge
  const badgesWithProgress: BadgeWithProgress[] = getAllBadges()
    .filter(badge => !earnedSet.has(badge.id))
    .map(badge => {
      const { progress, progressText } = calculateBadgeProgress(badge, score)
      return {
        ...badge,
        progress,
        progressText,
        isEarned: false,
      }
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, maxItems)
  
  if (badgesWithProgress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Badge Progress</CardTitle>
          <CardDescription>Track your progress toward earning badges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            You&apos;ve earned all available badges! 🎉
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge Progress</CardTitle>
        <CardDescription>Badges you&apos;re close to earning</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {badgesWithProgress.map(badge => (
          <div key={badge.id} className="flex items-center gap-4">
            <BadgeDisplay badgeId={badge.id} size="sm" className="shrink-0" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm truncate">{badge.displayName}</div>
                <div className="text-xs text-muted-foreground ml-2">+{badge.points}</div>
              </div>
              
              <Progress value={badge.progress} className="h-2 mb-1" />
              
              <div className="text-xs text-muted-foreground">{badge.progressText}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function calculateBadgeProgress(
  badge: BadgeMetadata,
  currentScore: number = 0
): { progress: number; progressText: string } {
  // This is a simplified version - you would implement actual logic based on badge requirements
  
  // Score-based badges
  if (badge.name === 'RISING_STAR' && currentScore < 400) {
    return {
      progress: (currentScore / 400) * 100,
      progressText: `${currentScore} / 400 ProofScore`,
    }
  }
  
  if (badge.name === 'TRUSTED_VETERAN' && currentScore < 600) {
    return {
      progress: (currentScore / 600) * 100,
      progressText: `${currentScore} / 600 ProofScore`,
    }
  }
  
  if (badge.name === 'LEGENDARY_SAGE' && currentScore < 800) {
    return {
      progress: (currentScore / 800) * 100,
      progressText: `${currentScore} / 800 ProofScore`,
    }
  }
  
  // Activity-based badges (would need actual data)
  if (badge.name === 'ACTIVE_PARTICIPANT') {
    return {
      progress: 25,
      progressText: '25 / 100 activities this month',
    }
  }
  
  if (badge.name === 'COMMUNITY_PILLAR') {
    return {
      progress: 15,
      progressText: '15 / 100 monthly activities for 3 months',
    }
  }
  
  // Trust-based badges
  if (badge.name === 'TRUST_BUILDER') {
    return {
      progress: 3,
      progressText: '3 / 10 positive endorsements received',
    }
  }
  
  if (badge.name === 'TRUSTED_ENDORSER') {
    return {
      progress: 40,
      progressText: '4 / 10 endorsements given',
    }
  }
  
  // Commerce badges
  if (badge.name === 'MERCHANT_VERIFIED') {
    return {
      progress: 0,
      progressText: 'Register as a merchant to start',
    }
  }
  
  if (badge.name === 'TRUSTED_MERCHANT') {
    return {
      progress: 20,
      progressText: '2 / 10 successful sales',
    }
  }
  
  // Default for other badges
  return {
    progress: Math.random() * 30, // Placeholder
    progressText: 'Keep participating to earn this badge',
  }
}
