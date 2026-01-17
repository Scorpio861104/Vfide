'use client'

/**
 * Badge Progress Page - Complete badge tracking and progress dashboard
 * Shows all badges with eligibility, progress, and claiming interface
 */

import { Footer } from '@/components/layout/Footer'
import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useBadgeNFTs, useMintBadge } from '@/hooks/useBadgeHooks'
import { useProofScore } from '@/lib/vfide-hooks'
import { getAllBadges, getBadgeCategories } from '@/lib/badge-registry'
import { UserStats, getBadgesWithProgress, EligibilityResult } from '@/lib/badge-eligibility'
import { BadgeDisplay } from '@/components/badge/BadgeDisplay'
import { MetallicBadgeCard } from '@/components/badge/MetallicBadgeCard'
import { BadgeMetadata } from '@/lib/badge-registry'
import { 
  Award, 
  TrendingUp, 
  Lock, 
  CheckCircle,
  Sparkles,
} from 'lucide-react'

export default function BadgeProgressPage() {
  const { address } = useAccount()
  const { score } = useProofScore()
  const { tokenIds } = useBadgeNFTs(address)
  const { mintBadge, isMinting, isSuccess: mintSuccess } = useMintBadge()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [claimingBadgeId, setClaimingBadgeId] = useState<`0x${string}` | null>(null)

  // Mock user stats - in production, these would come from backend/blockchain
  const userStats: UserStats = useMemo(() => ({
    proofScore: score,
    totalTransactions: 15, // Mock value
    totalVotes: 5, // Mock value
    totalEndorsements: 2, // Mock value
    accountAge: 45, // Mock value
    consecutiveDays: 10, // Mock value
    menteeCount: 0,
    isMentor: false,
    isMerchant: false,
    hasReportedBug: false,
    hasReportedSecurity: false,
    presaleParticipant: false,
    accountNumber: 5432, // Mock value
  }), [score])

  const allBadges = getAllBadges()
  const categories = getBadgeCategories()
  
  const badgesWithProgress = useMemo(() => {
    return getBadgesWithProgress(allBadges, userStats)
  }, [allBadges, userStats])

  // Filter by category
  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return badgesWithProgress
    return badgesWithProgress.filter(item => item.badge.category === selectedCategory)
  }, [badgesWithProgress, selectedCategory])

  // Group badges
  const earnedBadgeIds = new Set(tokenIds.map(id => `0x${id.toString(16).padStart(64, '0')}`))
  
  const grouped = useMemo(() => {
    const earned = filteredBadges.filter(item => earnedBadgeIds.has(item.badge.id))
    const eligible = filteredBadges.filter(item => 
      !earnedBadgeIds.has(item.badge.id) && item.eligibility.eligible
    )
    const inProgress = filteredBadges.filter(item => 
      !earnedBadgeIds.has(item.badge.id) && 
      !item.eligibility.eligible && 
      item.eligibility.progress > 0
    )
    const locked = filteredBadges.filter(item => 
      !earnedBadgeIds.has(item.badge.id) && 
      !item.eligibility.eligible && 
      item.eligibility.progress === 0
    )
    
    return { earned, eligible, inProgress, locked }
  }, [filteredBadges, earnedBadgeIds])

  const handleClaim = (badgeId: `0x${string}`) => {
    if (!badgeId || !badgeId.startsWith('0x') || badgeId.length !== 66) {
      console.error('Invalid badge ID format')
      return
    }
    setClaimingBadgeId(badgeId)
    mintBadge(badgeId)
  }

  if (!address) {
    return (
      <>
        <main className="min-h-screen bg-[#1A1A1D] pt-20">
          <section className="py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8 text-center">
                <Award className="w-16 h-16 mx-auto mb-4 text-[#00F0FF]" />
                <p className="text-[#A0A0A5] text-lg">Connect your wallet to view badge progress</p>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-12 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-4">
                Badge Progress
              </h1>
              <p className="text-lg text-[#A0A0A5]">
                Track your achievements and earn badges to boost your ProofScore
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<CheckCircle className="w-6 h-6" />}
                label="Earned"
                value={grouped.earned.length}
                color="text-[#00FF88]"
              />
              <StatCard
                icon={<Sparkles className="w-6 h-6" />}
                label="Ready to Claim"
                value={grouped.eligible.length}
                color="text-[#00F0FF]"
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="In Progress"
                value={grouped.inProgress.length}
                color="text-[#FFD700]"
              />
              <StatCard
                icon={<Lock className="w-6 h-6" />}
                label="Locked"
                value={grouped.locked.length}
                color="text-[#A0A0A5]"
              />
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-6 border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <CategoryButton
                active={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                label="All Badges"
                count={badgesWithProgress.length}
              />
              {categories.map(category => {
                const count = badgesWithProgress.filter(b => b.badge.category === category).length
                return (
                  <CategoryButton
                    key={category}
                    active={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                    label={category}
                    count={count}
                  />
                )
              })}
            </div>
          </div>
        </section>

        {/* Badge Sections */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl space-y-8">
            
            {/* Ready to Claim */}
            {grouped.eligible.length > 0 && (
              <BadgeSection
                title="Ready to Claim"
                icon={<Sparkles className="w-6 h-6 text-[#00F0FF]" />}
                badges={grouped.eligible}
                earnedIds={earnedBadgeIds}
                onClaim={handleClaim}
                claimingId={claimingBadgeId}
                isMinting={isMinting}
                mintSuccess={mintSuccess}
                showProgress
              />
            )}

            {/* Earned */}
            {grouped.earned.length > 0 && (
              <BadgeSection
                title="Earned Badges"
                icon={<CheckCircle className="w-6 h-6 text-[#00FF88]" />}
                badges={grouped.earned}
                earnedIds={earnedBadgeIds}
                showProgress={false}
              />
            )}

            {/* In Progress */}
            {grouped.inProgress.length > 0 && (
              <BadgeSection
                title="In Progress"
                icon={<TrendingUp className="w-6 h-6 text-[#FFD700]" />}
                badges={grouped.inProgress}
                earnedIds={earnedBadgeIds}
                showProgress
              />
            )}

            {/* Locked */}
            {grouped.locked.length > 0 && (
              <BadgeSection
                title="Locked Badges"
                icon={<Lock className="w-6 h-6 text-[#A0A0A5]" />}
                badges={grouped.locked}
                earnedIds={earnedBadgeIds}
                showProgress
                isLocked
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-[#F5F3E8]">{value}</div>
      <div className="text-sm text-[#A0A0A5]">{label}</div>
    </div>
  )
}

function CategoryButton({ active, onClick, label, count }: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold transition-colors ${
        active
          ? 'bg-[#00F0FF] text-[#1A1A1D]'
          : 'bg-[#2A2A2F] text-[#A0A0A5] hover:bg-[#3A3A3F] hover:text-[#F5F3E8]'
      }`}
    >
      {label} ({count})
    </button>
  )
}

function BadgeSection({ 
  title, 
  icon, 
  badges, 
  earnedIds, 
  onClaim,
  claimingId,
  isMinting,
  mintSuccess,
  showProgress = false,
  isLocked = false
}: {
  title: string
  icon: React.ReactNode
  badges: Array<{ badge: BadgeMetadata; eligibility: EligibilityResult }>
  earnedIds: Set<string>
  onClaim?: (id: `0x${string}`) => void
  claimingId?: `0x${string}` | null
  isMinting?: boolean
  mintSuccess?: boolean
  showProgress?: boolean
  isLocked?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-2xl font-bold text-[#F5F3E8]">{title}</h2>
        <span className="text-[#A0A0A5]">({badges.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {badges.map(({ badge, eligibility }) => (
          <MetallicBadgeCard
            key={badge.id}
            badge={badge}
            eligibility={eligibility}
            isEarned={earnedIds.has(badge.id)}
            onClaim={onClaim ? () => onClaim(badge.id) : undefined}
            isClaiming={isMinting && claimingId === badge.id}
          />
        ))}
      </div>
    </div>
  )
}
