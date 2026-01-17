'use client'

/**
 * BadgeClaiming - Shows eligible badges and allows users to claim them
 * Phase 3 implementation: Badge auto-awarding UI
 */

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useMintBadge, useCanMintBadge, useBadgeNFTs } from '@/hooks/useBadgeHooks'
import { useProofScore } from '@/lib/vfide-hooks'
import { getAllBadges, BadgeMetadata } from '@/lib/badge-registry'
import { BadgeDisplay } from './BadgeDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Check, Lock } from 'lucide-react'

export function BadgeClaiming() {
  const { address } = useAccount()
  const { score } = useProofScore()
  const { tokenIds } = useBadgeNFTs(address)
  const { mintBadge, isMinting, isSuccess } = useMintBadge()
  const [claimingBadgeId, setClaimingBadgeId] = useState<`0x${string}` | null>(null)

  const allBadges = getAllBadges()
  const earnedBadgeIds = new Set(tokenIds.map(id => `0x${BigInt(id).toString(16)}`))

  // Filter badges into categories
  const eligibleBadges = allBadges.filter(badge => {
    if (earnedBadgeIds.has(badge.id)) return false
    return checkEligibility(badge, score)
  })

  const lockedBadges = allBadges.filter(badge => {
    if (earnedBadgeIds.has(badge.id)) return false
    return !checkEligibility(badge, score)
  })

  const handleClaim = (badgeId: `0x${string}`) => {
    setClaimingBadgeId(badgeId)
    mintBadge(badgeId)
  }

  if (!address) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Connect your wallet to claim badges</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Eligible Badges */}
      {eligibleBadges.length > 0 && (
        <Card className="border-[#00F0FF]/30 bg-[#00F0FF]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#00F0FF]">
              <Sparkles className="w-5 h-5" />
              Ready to Claim ({eligibleBadges.length})
            </CardTitle>
            <CardDescription>
              You've met the requirements for these badges!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {eligibleBadges.map(badge => (
                <EligibleBadgeCard
                  key={badge.id}
                  badge={badge}
                  onClaim={() => handleClaim(badge.id)}
                  isClaiming={isMinting && claimingBadgeId === badge.id}
                  claimed={isSuccess && claimingBadgeId === badge.id}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Locked Badges ({lockedBadges.length})
            </CardTitle>
            <CardDescription>
              Keep participating to unlock these badges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {lockedBadges.slice(0, 12).map(badge => (
                <LockedBadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EligibleBadgeCard({ 
  badge, 
  onClaim, 
  isClaiming, 
  claimed 
}: { 
  badge: BadgeMetadata
  onClaim: () => void
  isClaiming: boolean
  claimed: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-[#2A2A2F] border border-[#00F0FF]/30 rounded-lg">
      <BadgeDisplay badgeId={badge.id} size="sm" />
      <div className="text-center">
        <div className="text-sm font-bold text-[#F5F3E8]">{badge.displayName}</div>
        <div className="text-xs text-[#A0A0A5] mb-2">+{badge.points} points</div>
      </div>
      <Button
        onClick={onClaim}
        disabled={isClaiming || claimed}
        size="sm"
        className="w-full"
      >
        {claimed ? (
          <>
            <Check className="w-4 h-4 mr-1" />
            Claimed
          </>
        ) : isClaiming ? (
          'Claiming...'
        ) : (
          'Claim'
        )}
      </Button>
    </div>
  )
}

function LockedBadgeCard({ badge }: { badge: BadgeMetadata }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg opacity-60">
      <div className="relative">
        <BadgeDisplay badgeId={badge.id} size="sm" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <Lock className="w-6 h-6 text-[#A0A0A5]" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-bold text-[#A0A0A5]">{badge.displayName}</div>
        <div className="text-xs text-[#707075]">{badge.earnRequirement}</div>
      </div>
    </div>
  )
}

/**
 * Simple eligibility check based on ProofScore
 * In a production system, this would query the blockchain for actual eligibility
 */
function checkEligibility(badge: BadgeMetadata, userScore: number): boolean {
  // Simple heuristic based on badge points and user score
  // For demonstration purposes - actual eligibility should come from smart contract
  
  const requirement = badge.earnRequirement.toLowerCase()
  
  // ProofScore-based badges
  if (requirement.includes('7,000') || requirement.includes('7000')) {
    return userScore >= 7000
  }
  if (requirement.includes('8,000') || requirement.includes('8000') || requirement.includes('elite')) {
    return userScore >= 8000
  }
  
  // Activity-based badges - would need backend tracking
  // For now, mark as not eligible (locked)
  if (requirement.includes('transaction') || 
      requirement.includes('vote') || 
      requirement.includes('days') ||
      requirement.includes('first')) {
    return false // Requires backend tracking
  }
  
  // Default: show as potentially eligible for manual claiming
  // In production, this should always check the smart contract
  return false
}
