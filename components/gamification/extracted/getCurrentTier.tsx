'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function getCurrentTier(): ScoreTier {
  const score = getCurrentScore();
  const tiers: ScoreTier[] = [
    {
      name: 'Newcomer',
      minScore: 0,
      maxScore: 999,
      description: 'Just starting your ProofScore journey',
      benefits: ['Basic account features', 'Transaction history'],
      badge: '🌱',
      color: 'from-gray-400 to-gray-600',
      nextTierProgress: 0,
    },
    {
      name: 'Trusted Member',
      minScore: 1000,
      maxScore: 2999,
      description: 'Building a solid reputation',
      benefits: ['Enhanced features', 'Higher transaction limits', 'Community access'],
      badge: '⭐',
      color: 'from-blue-400 to-blue-600',
      nextTierProgress: 50,
    },
    {
      name: 'Verified User',
      minScore: 3000,
      maxScore: 4999,
      description: 'Verified and trusted member',
      benefits: ['Priority support', 'Advanced analytics', 'API access'],
      badge: '✅',
      color: 'from-green-400 to-green-600',
      nextTierProgress: 75,
    },
    {
      name: 'Elite Member',
      minScore: 5000,
      maxScore: 7499,
      description: 'Top-tier community member',
      benefits: ['Exclusive features', 'Governance voting', 'Custom integrations'],
      badge: '👑',
      color: 'from-purple-400 to-purple-600',
      nextTierProgress: 90,
    },
    {
      name: 'Legend',
      minScore: 7500,
      maxScore: 10000,
      description: 'The most trusted and active member',
      benefits: [
        'All features unlocked',
        'Custom support',
        'Revenue sharing',
        'Leadership position',
      ],
      badge: '🏆',
      color: 'from-yellow-400 to-orange-600',
      nextTierProgress: 78,
    },
  ];

  return tiers.find((t) => score >= t.minScore && score <= t.maxScore) ?? tiers[0]!;
}
