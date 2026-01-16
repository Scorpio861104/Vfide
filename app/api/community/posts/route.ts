import { NextRequest, NextResponse } from 'next/server';

/**
 * Community Posts API
 * GET - Retrieve community posts
 * POST - Create a new post
 */

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorProofScore: number;
  content: string;
  mediaUrls?: string[];
  likes: number;
  comments: number;
  reposts: number;
  tips: number;
  createdAt: string;
  tags?: string[];
  isPinned?: boolean;
  isVerified?: boolean;
}

// In-memory store (use Redis/DB in production)
const postsStore: Post[] = [
  {
    id: 'post_1',
    authorId: '0x1234567890abcdef1234567890abcdef12345678',
    authorName: 'CryptoWhale',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=whale',
    authorProofScore: 8500,
    content: 'Just completed my 100th VFIDE transaction! The 0% merchant fees are incredible. Building trust in Web3 commerce one payment at a time. 🚀',
    likes: 142,
    comments: 23,
    reposts: 15,
    tips: 5,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ['VFIDE', 'Web3Commerce', 'ProofScore'],
    isVerified: true,
  },
  {
    id: 'post_2',
    authorId: '0xabcdef1234567890abcdef1234567890abcdef12',
    authorName: 'DeFiTrader',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=trader',
    authorProofScore: 7200,
    content: 'Pro tip: Stack your endorsements early! I went from 4000 to 7000 ProofScore in just 2 months by consistently endorsing quality users. Lower fees feel good. 💪',
    likes: 89,
    comments: 31,
    reposts: 22,
    tips: 3,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ['ProofScore', 'Tips', 'Endorsements'],
    isVerified: false,
  },
  {
    id: 'post_3',
    authorId: '0x9876543210fedcba9876543210fedcba98765432',
    authorName: 'MerchantDAO',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=merchant',
    authorProofScore: 9100,
    content: 'New governance proposal: Increase Sanctum charity allocation from 31.25% to 35%. Every fee helps someone in need. Vote now! 🗳️ #VFIDEGovernance',
    likes: 256,
    comments: 67,
    reposts: 45,
    tips: 12,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    tags: ['Governance', 'Sanctum', 'Charity'],
    isPinned: true,
    isVerified: true,
  },
  {
    id: 'post_4',
    authorId: '0xfedcba9876543210fedcba9876543210fedcba98',
    authorName: 'PayrollPro',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=payroll',
    authorProofScore: 6800,
    content: 'Streaming payments are a game changer! My employees love getting paid in real-time. No more waiting for payday. VFIDE payroll is the future of work. 💰⏰',
    likes: 178,
    comments: 42,
    reposts: 28,
    tips: 8,
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    tags: ['Streaming', 'Payroll', 'FutureOfWork'],
    isVerified: false,
  },
  {
    id: 'post_5',
    authorId: '0x1111222233334444555566667777888899990000',
    authorName: 'EscrowExpert',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=escrow',
    authorProofScore: 7800,
    content: 'Just used VFIDE escrow for a $50k freelance contract. 7-day auto-release worked perfectly. No disputes, no stress. This is how Web3 commerce should work! ✅',
    likes: 312,
    comments: 56,
    reposts: 67,
    tips: 15,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    tags: ['Escrow', 'Freelance', 'Success'],
    isVerified: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const tag = searchParams.get('tag');
    const authorId = searchParams.get('authorId');

    let filteredPosts = [...postsStore];

    // Filter by tag
    if (tag) {
      filteredPosts = filteredPosts.filter(post => 
        post.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      );
    }

    // Filter by author
    if (authorId) {
      filteredPosts = filteredPosts.filter(post => 
        post.authorId.toLowerCase() === authorId.toLowerCase()
      );
    }

    // Sort: pinned first, then by date
    filteredPosts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedPosts = filteredPosts.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      posts: paginatedPosts,
      pagination: {
        page,
        limit,
        total: filteredPosts.length,
        totalPages: Math.ceil(filteredPosts.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorId, authorName, content, mediaUrls, tags } = body;

    if (!authorId || !content) {
      return NextResponse.json(
        { error: 'authorId and content are required' },
        { status: 400 }
      );
    }

    const newPost: Post = {
      id: `post_${Date.now()}`,
      authorId,
      authorName: authorName || 'Anonymous',
      authorAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${authorId}`,
      authorProofScore: 5000, // In production: fetch from ProofScore contract
      content,
      mediaUrls: mediaUrls || [],
      likes: 0,
      comments: 0,
      reposts: 0,
      tips: 0,
      createdAt: new Date().toISOString(),
      tags: tags || [],
      isPinned: false,
      isVerified: false,
    };

    postsStore.unshift(newPost);

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
