import { NextRequest, NextResponse } from 'next/server';

/**
 * Community Trending Topics API
 * GET - Retrieve trending topics and hashtags
 */

interface TrendingTopic {
  id: string;
  tag: string;
  displayName: string;
  postCount: number;
  change24h: number; // percentage change
  category: 'governance' | 'commerce' | 'social' | 'tech' | 'general';
  isPromoted?: boolean;
}

interface TrendingUser {
  id: string;
  address: string;
  name: string;
  avatar?: string;
  proofScore: number;
  followersGained24h: number;
  isVerified: boolean;
}

// In-memory trending data (use Redis/analytics in production)
const trendingTopics: TrendingTopic[] = [
  {
    id: 'trend_1',
    tag: 'ProofScore',
    displayName: '#ProofScore',
    postCount: 1247,
    change24h: 45,
    category: 'tech',
  },
  {
    id: 'trend_2',
    tag: 'VFIDEGovernance',
    displayName: '#VFIDEGovernance',
    postCount: 892,
    change24h: 120,
    category: 'governance',
    isPromoted: true,
  },
  {
    id: 'trend_3',
    tag: 'StreamingPayments',
    displayName: '#StreamingPayments',
    postCount: 756,
    change24h: 35,
    category: 'commerce',
  },
  {
    id: 'trend_4',
    tag: 'Web3Commerce',
    displayName: '#Web3Commerce',
    postCount: 634,
    change24h: 22,
    category: 'commerce',
  },
  {
    id: 'trend_5',
    tag: 'Sanctum',
    displayName: '#Sanctum',
    postCount: 523,
    change24h: 67,
    category: 'social',
  },
  {
    id: 'trend_6',
    tag: 'MerchantMonday',
    displayName: '#MerchantMonday',
    postCount: 412,
    change24h: 200,
    category: 'commerce',
  },
  {
    id: 'trend_7',
    tag: 'EscrowSuccess',
    displayName: '#EscrowSuccess',
    postCount: 389,
    change24h: 15,
    category: 'commerce',
  },
  {
    id: 'trend_8',
    tag: 'DAOVoting',
    displayName: '#DAOVoting',
    postCount: 345,
    change24h: 88,
    category: 'governance',
  },
  {
    id: 'trend_9',
    tag: 'Headhunter',
    displayName: '#Headhunter',
    postCount: 298,
    change24h: 42,
    category: 'social',
  },
  {
    id: 'trend_10',
    tag: 'BadgeHunting',
    displayName: '#BadgeHunting',
    postCount: 267,
    change24h: 31,
    category: 'social',
  },
];

const trendingUsers: TrendingUser[] = [
  {
    id: 'user_1',
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'CryptoWhale',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=whale',
    proofScore: 8500,
    followersGained24h: 127,
    isVerified: true,
  },
  {
    id: 'user_2',
    address: '0x9876543210fedcba9876543210fedcba98765432',
    name: 'MerchantDAO',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=merchant',
    proofScore: 9100,
    followersGained24h: 98,
    isVerified: true,
  },
  {
    id: 'user_3',
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'DeFiTrader',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=trader',
    proofScore: 7200,
    followersGained24h: 76,
    isVerified: false,
  },
  {
    id: 'user_4',
    address: '0xfedcba9876543210fedcba9876543210fedcba98',
    name: 'PayrollPro',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=payroll',
    proofScore: 6800,
    followersGained24h: 54,
    isVerified: false,
  },
  {
    id: 'user_5',
    address: '0x1111222233334444555566667777888899990000',
    name: 'EscrowExpert',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=escrow',
    proofScore: 7800,
    followersGained24h: 43,
    isVerified: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'all'; // 'topics', 'users', 'all'

    let filteredTopics = [...trendingTopics];

    // Filter by category
    if (category) {
      filteredTopics = filteredTopics.filter(
        topic => topic.category === category
      );
    }

    // Sort by post count (most popular first)
    filteredTopics.sort((a, b) => b.postCount - a.postCount);

    // Limit results
    filteredTopics = filteredTopics.slice(0, limit);

    // Sort users by followers gained
    const sortedUsers = [...trendingUsers]
      .sort((a, b) => b.followersGained24h - a.followersGained24h)
      .slice(0, limit);

    const response: {
      topics?: TrendingTopic[];
      users?: TrendingUser[];
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (type === 'topics' || type === 'all') {
      response.topics = filteredTopics;
    }

    if (type === 'users' || type === 'all') {
      response.users = sortedUsers;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching trending:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}
