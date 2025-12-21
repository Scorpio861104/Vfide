/**
 * Badge Registry - Frontend mirror of BadgeRegistry.sol
 * Maps badge IDs to display information
 */

import { keccak256, toBytes } from 'viem'

// Badge ID generator (matches Solidity keccak256)
export const getBadgeId = (name: string): `0x${string}` => {
  return keccak256(toBytes(name))
}

// Badge metadata type
export interface BadgeMetadata {
  id: `0x${string}`
  name: string
  displayName: string
  description: string
  category: string
  icon: string
  points: number
  duration: number // 0 = permanent, otherwise seconds
  isPermanent: boolean
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'
  earnRequirement: string
}

// Badge Registry
export const BADGE_REGISTRY: Record<string, BadgeMetadata> = {
  // Pioneer & Foundation
  PIONEER: {
    id: getBadgeId('PIONEER'),
    name: 'PIONEER',
    displayName: 'Pioneer',
    description: 'First 10,000 users who joined VFIDE and believed in integrity over wealth',
    category: 'Pioneer & Foundation',
    icon: '🏁',
    points: 30,
    duration: 0,
    isPermanent: true,
    rarity: 'Legendary',
    earnRequirement: 'Be among the first 10,000 users to join',
  },
  GENESIS_PRESALE: {
    id: getBadgeId('GENESIS_PRESALE'),
    name: 'GENESIS_PRESALE',
    displayName: 'Genesis Presale',
    description: 'Participated in the initial presale and supported VFIDE from day one',
    category: 'Pioneer & Foundation',
    icon: '💎',
    points: 40,
    duration: 0,
    isPermanent: true,
    rarity: 'Legendary',
    earnRequirement: 'Participate in the genesis presale',
  },
  FOUNDING_MEMBER: {
    id: getBadgeId('FOUNDING_MEMBER'),
    name: 'FOUNDING_MEMBER',
    displayName: 'Founding Member',
    description: 'Among the first 1,000 users to achieve elite status (800+ ProofScore)',
    category: 'Pioneer & Foundation',
    icon: '👑',
    points: 50,
    duration: 0,
    isPermanent: true,
    rarity: 'Mythic',
    earnRequirement: 'Be in the first 1,000 to reach 800+ ProofScore',
  },
  
  // Activity & Participation
  ACTIVE_TRADER: {
    id: getBadgeId('ACTIVE_TRADER'),
    name: 'ACTIVE_TRADER',
    displayName: 'Active Trader',
    description: 'Completed 50+ commerce transactions in 90 days',
    category: 'Activity & Participation',
    icon: '📊',
    points: 20,
    duration: 90 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Uncommon',
    earnRequirement: '50+ transactions in 90 days (min $50 each)',
  },
  GOVERNANCE_VOTER: {
    id: getBadgeId('GOVERNANCE_VOTER'),
    name: 'GOVERNANCE_VOTER',
    displayName: 'Governance Voter',
    description: 'Voted on 10+ DAO proposals',
    category: 'Activity & Participation',
    icon: '🗳️',
    points: 25,
    duration: 180 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Uncommon',
    earnRequirement: 'Vote on 10+ DAO proposals',
  },
  POWER_USER: {
    id: getBadgeId('POWER_USER'),
    name: 'POWER_USER',
    displayName: 'Power User',
    description: 'Engaged in all ecosystem features (voting, commerce, endorsements)',
    category: 'Activity & Participation',
    icon: '⚡',
    points: 40,
    duration: 90 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Rare',
    earnRequirement: 'Use 3+ different features (vote, trade, endorse)',
  },
  DAILY_CHAMPION: {
    id: getBadgeId('DAILY_CHAMPION'),
    name: 'DAILY_CHAMPION',
    displayName: 'Daily Champion',
    description: 'Made at least one transaction every day for 30 consecutive days',
    category: 'Activity & Participation',
    icon: '🔥',
    points: 15,
    duration: 30 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Common',
    earnRequirement: '30-day consecutive activity streak',
  },
  
  // Trust & Community
  TRUSTED_ENDORSER: {
    id: getBadgeId('TRUSTED_ENDORSER'),
    name: 'TRUSTED_ENDORSER',
    displayName: 'Trusted Endorser',
    description: 'Made 5+ good endorsements of users who maintained high trust',
    category: 'Trust & Community',
    icon: '🤝',
    points: 30,
    duration: 0,
    isPermanent: true,
    rarity: 'Rare',
    earnRequirement: '5+ endorsements of users who kept >700 score for 6+ months',
  },
  COMMUNITY_BUILDER: {
    id: getBadgeId('COMMUNITY_BUILDER'),
    name: 'COMMUNITY_BUILDER',
    displayName: 'Community Builder',
    description: 'Recruited 10+ users who each achieved meaningful participation',
    category: 'Trust & Community',
    icon: '🏗️',
    points: 35,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'Recruit 10 users who reach 600+ ProofScore',
  },
  MENTOR: {
    id: getBadgeId('MENTOR'),
    name: 'MENTOR',
    displayName: 'Mentor',
    description: 'Helped 5+ new users learn the system and reach governance threshold',
    category: 'Trust & Community',
    icon: '🎓',
    points: 30,
    duration: 365 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Rare',
    earnRequirement: 'Help 5 new users reach 540+ ProofScore',
  },
  
  // Commerce & Merchants
  VERIFIED_MERCHANT: {
    id: getBadgeId('VERIFIED_MERCHANT'),
    name: 'VERIFIED_MERCHANT',
    displayName: 'Verified Merchant',
    description: 'Completed 100+ successful transactions with zero disputes',
    category: 'Commerce & Merchants',
    icon: '✅',
    points: 40,
    duration: 365 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Rare',
    earnRequirement: '100+ transactions, 0 disputes, 700+ ProofScore',
  },
  ELITE_MERCHANT: {
    id: getBadgeId('ELITE_MERCHANT'),
    name: 'ELITE_MERCHANT',
    displayName: 'Elite Merchant',
    description: '1,000+ transactions with >$100k volume and near-perfect rating',
    category: 'Commerce & Merchants',
    icon: '⭐',
    points: 60,
    duration: 180 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Epic',
    earnRequirement: '1,000+ transactions, $100k+ volume, 4.8+ rating',
  },
  ZERO_DISPUTE: {
    id: getBadgeId('ZERO_DISPUTE'),
    name: 'ZERO_DISPUTE',
    displayName: 'Zero Dispute',
    description: '200+ transactions with perfect dispute-free record',
    category: 'Commerce & Merchants',
    icon: '🛡️',
    points: 25,
    duration: 180 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Rare',
    earnRequirement: '200+ transactions with 0 disputes',
  },
  
  // Security & Integrity
  FRAUD_HUNTER: {
    id: getBadgeId('FRAUD_HUNTER'),
    name: 'FRAUD_HUNTER',
    displayName: 'Fraud Hunter',
    description: 'Reported 3+ confirmed fraud cases, protecting the community',
    category: 'Security & Integrity',
    icon: '🕵️',
    points: 50,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'Report 3+ confirmed fraud cases (DAO verified)',
  },
  CLEAN_RECORD: {
    id: getBadgeId('CLEAN_RECORD'),
    name: 'CLEAN_RECORD',
    displayName: 'Clean Record',
    description: 'Maintained flawless behavior with zero negative events for 1 year',
    category: 'Security & Integrity',
    icon: '📜',
    points: 20,
    duration: 365 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Common',
    earnRequirement: '1 year with no punishments or disputes',
  },
  REDEMPTION: {
    id: getBadgeId('REDEMPTION'),
    name: 'REDEMPTION',
    displayName: 'Redemption',
    description: 'Recovered from past mistakes through sustained good behavior',
    category: 'Security & Integrity',
    icon: '🌟',
    points: 30,
    duration: 0,
    isPermanent: true,
    rarity: 'Rare',
    earnRequirement: '6+ months of good behavior after penalty',
  },
  GUARDIAN: {
    id: getBadgeId('GUARDIAN'),
    name: 'GUARDIAN',
    displayName: 'Guardian',
    description: 'Maintained elite trust status without dropping below 700 for 2+ years',
    category: 'Security & Integrity',
    icon: '🛡️👁️',
    points: 40,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'ProofScore never below 700 for 2+ years',
  },
  
  // Achievements & Milestones
  ELITE_ACHIEVER: {
    id: getBadgeId('ELITE_ACHIEVER'),
    name: 'ELITE_ACHIEVER',
    displayName: 'Elite Achiever',
    description: 'Reached ProofScore 900+ (top 5% of all users)',
    category: 'Achievements & Milestones',
    icon: '🏆',
    points: 50,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'Reach ProofScore 900+',
  },
  WHALE_SLAYER: {
    id: getBadgeId('WHALE_SLAYER'),
    name: 'WHALE_SLAYER',
    displayName: 'Whale Slayer',
    description: 'Won a DAO vote against a whale with 10x your token holdings',
    category: 'Achievements & Milestones',
    icon: '🐋⚔️',
    points: 25,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'Win DAO vote where opponent had 10x your tokens',
  },
  DIVERSIFICATION_MASTER: {
    id: getBadgeId('DIVERSIFICATION_MASTER'),
    name: 'DIVERSIFICATION_MASTER',
    displayName: 'Diversification Master',
    description: 'Participated in all ecosystem features',
    category: 'Achievements & Milestones',
    icon: '🎯',
    points: 30,
    duration: 0,
    isPermanent: true,
    rarity: 'Rare',
    earnRequirement: 'Use all features: DAO, commerce, vault, endorsements, badges',
  },
  
  // Education & Contribution
  EDUCATOR: {
    id: getBadgeId('EDUCATOR'),
    name: 'EDUCATOR',
    displayName: 'Educator',
    description: 'Created 5+ educational content pieces helping others learn VFIDE',
    category: 'Education & Contribution',
    icon: '👨‍🏫',
    points: 30,
    duration: 180 * 24 * 60 * 60,
    isPermanent: false,
    rarity: 'Rare',
    earnRequirement: 'Create 5+ guides/videos (DAO approved)',
  },
  CONTRIBUTOR: {
    id: getBadgeId('CONTRIBUTOR'),
    name: 'CONTRIBUTOR',
    displayName: 'Contributor',
    description: 'Made meaningful code, design, or content contribution to VFIDE',
    category: 'Education & Contribution',
    icon: '💻',
    points: 40,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'GitHub PR merged or DAO-approved contribution',
  },
  BUG_BOUNTY: {
    id: getBadgeId('BUG_BOUNTY'),
    name: 'BUG_BOUNTY',
    displayName: 'Bug Bounty',
    description: 'Reported a security vulnerability (points vary by severity)',
    category: 'Education & Contribution',
    icon: '🐛',
    points: 50,
    duration: 0,
    isPermanent: true,
    rarity: 'Epic',
    earnRequirement: 'Report security vulnerability (20-100 points by severity)',
  },
  TRANSLATOR: {
    id: getBadgeId('TRANSLATOR'),
    name: 'TRANSLATOR',
    displayName: 'Translator',
    description: 'Translated VFIDE documentation/UI to a new language',
    category: 'Education & Contribution',
    icon: '🌐',
    points: 25,
    duration: 0,
    isPermanent: true,
    rarity: 'Rare',
    earnRequirement: 'Complete translation package for new language',
  },
}

// Helper functions
export const getAllBadges = (): BadgeMetadata[] => {
  return Object.values(BADGE_REGISTRY)
}

export const getBadgeByName = (name: string): BadgeMetadata | undefined => {
  return BADGE_REGISTRY[name]
}

export const getBadgeById = (id: `0x${string}`): BadgeMetadata | undefined => {
  return getAllBadges().find(badge => badge.id === id)
}

export const getBadgesByCategory = (category: string): BadgeMetadata[] => {
  return getAllBadges().filter(badge => badge.category === category)
}

export const getBadgeCategories = (): string[] => {
  return Array.from(new Set(getAllBadges().map(badge => badge.category)))
}

export const formatDuration = (seconds: number): string => {
  if (seconds === 0) return 'Permanent'
  const days = Math.floor(seconds / (24 * 60 * 60))
  return `${days} days`
}
