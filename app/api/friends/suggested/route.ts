import { NextRequest, NextResponse } from 'next/server';

/**
 * Suggested Friends API
 * GET - Get friend suggestions based on ProofScore, mutual connections, and activity
 */

interface SuggestedUser {
  id: string;
  address: string;
  name: string;
  avatar?: string;
  proofScore: number;
  bio?: string;
  mutualFriends: number;
  mutualBadges: string[];
  isVerified: boolean;
  isFollowing: boolean;
  reason: 'high_score' | 'mutual_friends' | 'similar_activity' | 'same_badges' | 'trending';
  commonTags?: string[];
}

// In-memory suggestions (use ML/graph analysis in production)
const suggestedUsers: SuggestedUser[] = [
  {
    id: 'suggested_1',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'CryptoWhale',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=whale',
    proofScore: 8500,
    bio: 'Building the future of decentralized payments. 100+ VFIDE transactions.',
    mutualFriends: 12,
    mutualBadges: ['Pioneer', 'Trusted Endorser', 'Governance Voter'],
    isVerified: true,
    isFollowing: false,
    reason: 'high_score',
    commonTags: ['Web3Commerce', 'ProofScore'],
  },
  {
    id: 'suggested_2',
    address: '0x9876543210fedcba9876543210fedcba98765432',
    name: 'MerchantDAO',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=merchant',
    proofScore: 9100,
    bio: 'DAO contributor. Helping shape VFIDE governance one proposal at a time.',
    mutualFriends: 8,
    mutualBadges: ['Council Member', 'Verified Merchant'],
    isVerified: true,
    isFollowing: false,
    reason: 'mutual_friends',
    commonTags: ['Governance', 'DAO'],
  },
  {
    id: 'suggested_3',
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'DeFiTrader',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=trader',
    proofScore: 7200,
    bio: 'Trading and staking enthusiast. Learning the VFIDE ecosystem.',
    mutualFriends: 5,
    mutualBadges: ['Active Trader', 'Daily Champion'],
    isVerified: false,
    isFollowing: false,
    reason: 'similar_activity',
    commonTags: ['Trading', 'Staking'],
  },
  {
    id: 'suggested_4',
    address: '0xfedcba9876543210fedcba9876543210fedcba98',
    name: 'PayrollPro',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=payroll',
    proofScore: 6800,
    bio: 'HR tech innovator. Using VFIDE for real-time salary streaming.',
    mutualFriends: 3,
    mutualBadges: ['Power User'],
    isVerified: false,
    isFollowing: false,
    reason: 'same_badges',
    commonTags: ['Streaming', 'Payroll'],
  },
  {
    id: 'suggested_5',
    address: '0x1111222233334444555566667777888899990000',
    name: 'EscrowExpert',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=escrow',
    proofScore: 7800,
    bio: 'Freelance consultant. Trust VFIDE escrow for all my contracts.',
    mutualFriends: 7,
    mutualBadges: ['Community Builder', 'Trusted Endorser'],
    isVerified: true,
    isFollowing: false,
    reason: 'trending',
    commonTags: ['Escrow', 'Freelance'],
  },
  {
    id: 'suggested_6',
    address: '0x2222333344445555666677778888999900001111',
    name: 'BadgeCollector',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=badge',
    proofScore: 6500,
    bio: 'Collecting all the badges. 15+ achievements unlocked!',
    mutualFriends: 4,
    mutualBadges: ['Badge Hunter', 'Streak Master'],
    isVerified: false,
    isFollowing: false,
    reason: 'same_badges',
    commonTags: ['Badges', 'Achievements'],
  },
  {
    id: 'suggested_7',
    address: '0x3333444455556666777788889999000011112222',
    name: 'HeadhunterKing',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=headhunter',
    proofScore: 7100,
    bio: 'Top 10 referrer last quarter. Building the VFIDE army.',
    mutualFriends: 15,
    mutualBadges: ['Headhunter Elite', 'Community Builder'],
    isVerified: true,
    isFollowing: false,
    reason: 'mutual_friends',
    commonTags: ['Referrals', 'Community'],
  },
  {
    id: 'suggested_8',
    address: '0x4444555566667777888899990000111122223333',
    name: 'SanctumDonor',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=sanctum',
    proofScore: 8200,
    bio: 'Proud supporter of Sanctum charity fund. Every fee helps!',
    mutualFriends: 6,
    mutualBadges: ['Philanthropist', 'Governance Voter'],
    isVerified: true,
    isFollowing: false,
    reason: 'high_score',
    commonTags: ['Charity', 'Sanctum'],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const reason = searchParams.get('reason');
    const minScore = parseInt(searchParams.get('minScore') || '0');

    let suggestions = [...suggestedUsers];

    // Filter by reason if specified
    if (reason) {
      suggestions = suggestions.filter(user => user.reason === reason);
    }

    // Filter by minimum ProofScore
    if (minScore > 0) {
      suggestions = suggestions.filter(user => user.proofScore >= minScore);
    }

    // Sort by: verified first, then by mutual friends, then by ProofScore
    suggestions.sort((a, b) => {
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      if (a.mutualFriends !== b.mutualFriends) return b.mutualFriends - a.mutualFriends;
      return b.proofScore - a.proofScore;
    });

    // Limit results
    suggestions = suggestions.slice(0, limit);

    return NextResponse.json({
      suggestions,
      total: suggestions.length,
      forUser: userId || 'anonymous',
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friend suggestions' },
      { status: 500 }
    );
  }
}
