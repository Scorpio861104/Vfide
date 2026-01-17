/**
 * Badge Eligibility Logic - Comprehensive badge requirements checking
 * This module handles all badge eligibility logic for the VFIDE platform
 */

import { BadgeMetadata } from './badge-registry'

export interface UserStats {
  proofScore: number
  totalTransactions: number
  totalVotes: number
  totalEndorsements: number
  accountAge: number // days since account creation
  consecutiveDays: number
  menteeCount: number
  isMentor: boolean
  isMerchant: boolean
  hasReportedBug: boolean
  hasReportedSecurity: boolean
  presaleParticipant: boolean
  accountNumber: number // What number user they were (for pioneer badges)
}

export interface EligibilityResult {
  eligible: boolean
  reason: string
  progress?: number // 0-100 percentage towards earning
  requirementsMet: string[]
  requirementsPending: string[]
}

/**
 * Check if user is eligible for a specific badge
 * This is the master eligibility function that handles all badge types
 */
export function checkBadgeEligibility(
  badge: BadgeMetadata,
  stats: UserStats
): EligibilityResult {
  const name = badge.name

  // Pioneer & Foundation badges
  if (name === 'PIONEER') {
    const eligible = stats.accountNumber <= 10000
    return {
      eligible,
      reason: eligible
        ? 'You were among the first 10,000 users!'
        : `You joined as user #${stats.accountNumber}`,
      progress: eligible ? 100 : 0,
      requirementsMet: eligible ? ['Early adopter'] : [],
      requirementsPending: eligible ? [] : ['Be in first 10,000 users'],
    }
  }

  if (name === 'GENESIS_PRESALE') {
    return {
      eligible: stats.presaleParticipant,
      reason: stats.presaleParticipant
        ? 'You participated in the genesis presale!'
        : 'Did not participate in presale',
      progress: stats.presaleParticipant ? 100 : 0,
      requirementsMet: stats.presaleParticipant ? ['Presale participation'] : [],
      requirementsPending: stats.presaleParticipant ? [] : ['Participate in presale'],
    }
  }

  if (name === 'FOUNDING_MEMBER') {
    const eligible = stats.accountNumber <= 1000 && stats.proofScore >= 8000
    const progress = stats.proofScore >= 8000 ? 100 : (stats.proofScore / 8000) * 100
    return {
      eligible,
      reason: eligible
        ? 'You achieved elite status early!'
        : `Need 8000+ score (current: ${stats.proofScore}) and be in first 1,000 users`,
      progress,
      requirementsMet: [
        ...(stats.accountNumber <= 1000 ? ['Early adopter'] : []),
        ...(stats.proofScore >= 8000 ? ['Elite score'] : []),
      ],
      requirementsPending: [
        ...(stats.accountNumber > 1000 ? ['Be in first 1,000 users'] : []),
        ...(stats.proofScore < 8000 ? [`Reach 8,000 score`] : []),
      ],
    }
  }

  // Activity & Participation badges
  if (name === 'ACTIVE_TRADER') {
    const eligible = stats.totalTransactions >= 50
    const progress = Math.min((stats.totalTransactions / 50) * 100, 100)
    return {
      eligible,
      reason: eligible
        ? 'You completed 50+ transactions!'
        : `${stats.totalTransactions}/50 transactions`,
      progress,
      requirementsMet: eligible ? ['50+ transactions'] : [],
      requirementsPending: eligible ? [] : [`Complete ${50 - stats.totalTransactions} more transactions`],
    }
  }

  if (name === 'GOVERNANCE_VOTER') {
    const eligible = stats.totalVotes >= 10
    const progress = Math.min((stats.totalVotes / 10) * 100, 100)
    return {
      eligible,
      reason: eligible ? 'You voted 10+ times!' : `${stats.totalVotes}/10 votes cast`,
      progress,
      requirementsMet: eligible ? ['10+ votes'] : [],
      requirementsPending: eligible ? [] : [`Cast ${10 - stats.totalVotes} more votes`],
    }
  }

  if (name === 'POWER_USER') {
    const featuresUsed = [
      stats.totalVotes > 0,
      stats.totalTransactions > 0,
      stats.totalEndorsements > 0,
    ].filter(Boolean).length
    const eligible = featuresUsed >= 3
    const progress = (featuresUsed / 3) * 100
    return {
      eligible,
      reason: eligible
        ? 'You used all major features!'
        : `${featuresUsed}/3 features used`,
      progress,
      requirementsMet: [
        ...(stats.totalVotes > 0 ? ['Voting'] : []),
        ...(stats.totalTransactions > 0 ? ['Trading'] : []),
        ...(stats.totalEndorsements > 0 ? ['Endorsing'] : []),
      ],
      requirementsPending: [
        ...(stats.totalVotes === 0 ? ['Vote on proposals'] : []),
        ...(stats.totalTransactions === 0 ? ['Make transactions'] : []),
        ...(stats.totalEndorsements === 0 ? ['Endorse users'] : []),
      ],
    }
  }

  if (name === 'DAILY_CHAMPION') {
    const eligible = stats.consecutiveDays >= 30
    const progress = Math.min((stats.consecutiveDays / 30) * 100, 100)
    return {
      eligible,
      reason: eligible
        ? '30-day streak achieved!'
        : `${stats.consecutiveDays}/30 consecutive days`,
      progress,
      requirementsMet: eligible ? ['30-day streak'] : [],
      requirementsPending: eligible ? [] : [`Continue ${30 - stats.consecutiveDays} more days`],
    }
  }

  // Trust & Community badges
  if (name === 'TRUSTED_ENDORSER') {
    const eligible = stats.totalEndorsements >= 5
    const progress = Math.min((stats.totalEndorsements / 5) * 100, 100)
    return {
      eligible,
      reason: eligible
        ? 'You made 5+ quality endorsements!'
        : `${stats.totalEndorsements}/5 endorsements`,
      progress,
      requirementsMet: eligible ? ['5+ endorsements'] : [],
      requirementsPending: eligible ? [] : [`Make ${5 - stats.totalEndorsements} more endorsements`],
    }
  }

  if (name === 'COMMUNITY_BUILDER') {
    const eligible = stats.menteeCount >= 10 && stats.isMentor
    const progress = stats.isMentor ? Math.min((stats.menteeCount / 10) * 100, 100) : 0
    return {
      eligible,
      reason: eligible
        ? 'You recruited 10+ successful mentees!'
        : stats.isMentor
        ? `${stats.menteeCount}/10 mentees recruited`
        : 'Must be a mentor first',
      progress,
      requirementsMet: [
        ...(stats.isMentor ? ['Is a mentor'] : []),
        ...(stats.menteeCount >= 10 ? ['10+ mentees'] : []),
      ],
      requirementsPending: [
        ...(! stats.isMentor ? ['Become a mentor'] : []),
        ...(stats.menteeCount < 10 ? [`Recruit ${10 - stats.menteeCount} more mentees`] : []),
      ],
    }
  }

  if (name === 'MENTOR_EXTRAORDINAIRE') {
    const eligible = stats.isMentor && stats.menteeCount >= 5
    const progress = stats.isMentor ? Math.min((stats.menteeCount / 5) * 100, 100) : 0
    return {
      eligible,
      reason: eligible
        ? 'You successfully mentored 5+ users!'
        : stats.isMentor
        ? `${stats.menteeCount}/5 mentees`
        : 'Must be a mentor first',
      progress,
      requirementsMet: [
        ...(stats.isMentor ? ['Is a mentor'] : []),
        ...(stats.menteeCount >= 5 ? ['5+ mentees'] : []),
      ],
      requirementsPending: [
        ...(!stats.isMentor ? ['Become a mentor'] : []),
        ...(stats.menteeCount < 5 ? [`Mentor ${5 - stats.menteeCount} more users`] : []),
      ],
    }
  }

  // Commerce & Merchants badges
  if (name === 'VERIFIED_MERCHANT') {
    const eligible = stats.isMerchant
    return {
      eligible,
      reason: eligible
        ? 'You are a registered merchant!'
        : 'Not yet registered as merchant',
      progress: eligible ? 100 : 0,
      requirementsMet: eligible ? ['Merchant registration'] : [],
      requirementsPending: eligible ? [] : ['Register as merchant (5,600+ score required)'],
    }
  }

  if (name === 'TRADE_MASTER') {
    const eligible = stats.totalTransactions >= 100
    const progress = Math.min((stats.totalTransactions / 100) * 100, 100)
    return {
      eligible,
      reason: eligible
        ? '100+ transactions completed!'
        : `${stats.totalTransactions}/100 transactions`,
      progress,
      requirementsMet: eligible ? ['100+ transactions'] : [],
      requirementsPending: eligible ? [] : [`Complete ${100 - stats.totalTransactions} more transactions`],
    }
  }

  if (name === 'WHALE') {
    // This would need actual transaction volume tracking
    // For now, use transaction count as proxy
    const eligible = stats.totalTransactions >= 200
    const progress = Math.min((stats.totalTransactions / 200) * 100, 100)
    return {
      eligible,
      reason: eligible
        ? 'High-volume trader!'
        : `${stats.totalTransactions}/200 transactions`,
      progress,
      requirementsMet: eligible ? ['200+ transactions'] : [],
      requirementsPending: eligible ? [] : [`Complete ${200 - stats.totalTransactions} more transactions`],
    }
  }

  // Security & Integrity badges
  if (name === 'GUARDIAN') {
    const eligible = stats.proofScore >= 9000
    const progress = (stats.proofScore / 9000) * 100
    return {
      eligible,
      reason: eligible
        ? 'Elite trust level achieved!'
        : `${stats.proofScore}/9,000 score`,
      progress,
      requirementsMet: eligible ? ['9,000+ score'] : [],
      requirementsPending: eligible ? [] : [`Earn ${9000 - stats.proofScore} more points`],
    }
  }

  if (name === 'SECURITY_RESEARCHER') {
    const eligible = stats.hasReportedSecurity
    return {
      eligible,
      reason: eligible
        ? 'You reported a security vulnerability!'
        : 'No security reports submitted',
      progress: eligible ? 100 : 0,
      requirementsMet: eligible ? ['Security report'] : [],
      requirementsPending: eligible ? [] : ['Report a security vulnerability'],
    }
  }

  // Achievements & Milestones
  if (name === 'ELITE_STATUS') {
    const eligible = stats.proofScore >= 8000
    const progress = (stats.proofScore / 8000) * 100
    return {
      eligible,
      reason: eligible ? 'Elite status achieved!' : `${stats.proofScore}/8,000 score`,
      progress,
      requirementsMet: eligible ? ['8,000+ score'] : [],
      requirementsPending: eligible ? [] : [`Earn ${8000 - stats.proofScore} more points`],
    }
  }

  if (name === 'COUNCIL_MEMBER') {
    const eligible = stats.proofScore >= 7000
    const progress = (stats.proofScore / 7000) * 100
    return {
      eligible,
      reason: eligible ? 'Council eligibility achieved!' : `${stats.proofScore}/7,000 score`,
      progress,
      requirementsMet: eligible ? ['7,000+ score'] : [],
      requirementsPending: eligible ? [] : [`Earn ${7000 - stats.proofScore} more points`],
    }
  }

  if (name === 'VETERAN') {
    const eligible = stats.accountAge >= 365
    const progress = Math.min((stats.accountAge / 365) * 100, 100)
    return {
      eligible,
      reason: eligible ? 'One year of membership!' : `${stats.accountAge}/365 days`,
      progress,
      requirementsMet: eligible ? ['1 year membership'] : [],
      requirementsPending: eligible ? [] : [`Continue ${365 - stats.accountAge} more days`],
    }
  }

  // Education & Contribution
  if (name === 'BUG_HUNTER') {
    const eligible = stats.hasReportedBug
    return {
      eligible,
      reason: eligible ? 'You reported a bug!' : 'No bugs reported yet',
      progress: eligible ? 100 : 0,
      requirementsMet: eligible ? ['Bug report'] : [],
      requirementsPending: eligible ? [] : ['Report a bug'],
    }
  }

  if (name === 'TRANSLATOR') {
    // This would need manual verification
    // For now, return as not automatically eligible
    return {
      eligible: false,
      reason: 'Translation contribution requires manual verification',
      progress: 0,
      requirementsMet: [],
      requirementsPending: ['Submit translation contribution'],
    }
  }

  // Default for any badges not explicitly handled
  return {
    eligible: false,
    reason: 'Eligibility criteria not yet implemented',
    progress: 0,
    requirementsMet: [],
    requirementsPending: ['Check back later'],
  }
}

/**
 * Get all badges user is eligible for
 */
export function getEligibleBadges(
  allBadges: BadgeMetadata[],
  stats: UserStats
): BadgeMetadata[] {
  return allBadges.filter(badge => {
    const result = checkBadgeEligibility(badge, stats)
    return result.eligible
  })
}

/**
 * Get badges with progress information
 */
export function getBadgesWithProgress(
  allBadges: BadgeMetadata[],
  stats: UserStats
): Array<{ badge: BadgeMetadata; eligibility: EligibilityResult }> {
  return allBadges.map(badge => ({
    badge,
    eligibility: checkBadgeEligibility(badge, stats),
  }))
}
