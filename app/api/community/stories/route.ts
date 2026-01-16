import { NextRequest, NextResponse } from 'next/server';

/**
 * Community Stories API
 * GET - Retrieve active stories (24-hour ephemeral content)
 * POST - Create a new story
 */

interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorProofScore: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  viewCount: number;
  reactions: {
    fire: number;
    heart: number;
    rocket: number;
    clap: number;
  };
  createdAt: string;
  expiresAt: string;
  isViewed?: boolean;
}

// In-memory store (use Redis/DB in production)
const storiesStore: Story[] = [
  {
    id: 'story_1',
    authorId: '0x1234567890abcdef1234567890abcdef12345678',
    authorName: 'CryptoWhale',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=whale',
    authorProofScore: 8500,
    mediaUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400',
    mediaType: 'image',
    caption: 'Just hit 100 transactions! 🎉',
    viewCount: 234,
    reactions: { fire: 45, heart: 32, rocket: 28, clap: 19 },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 72000000).toISOString(),
  },
  {
    id: 'story_2',
    authorId: '0xabcdef1234567890abcdef1234567890abcdef12',
    authorName: 'DeFiTrader',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=trader',
    authorProofScore: 7200,
    mediaUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400',
    mediaType: 'image',
    caption: 'ProofScore grinding 💪',
    viewCount: 156,
    reactions: { fire: 22, heart: 18, rocket: 15, clap: 12 },
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    expiresAt: new Date(Date.now() + 68400000).toISOString(),
  },
  {
    id: 'story_3',
    authorId: '0x9876543210fedcba9876543210fedcba98765432',
    authorName: 'MerchantDAO',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=merchant',
    authorProofScore: 9100,
    mediaUrl: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400',
    mediaType: 'image',
    caption: 'New proposal live! Vote now 🗳️',
    viewCount: 412,
    reactions: { fire: 67, heart: 54, rocket: 43, clap: 38 },
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    expiresAt: new Date(Date.now() + 61200000).toISOString(),
  },
  {
    id: 'story_4',
    authorId: '0xfedcba9876543210fedcba9876543210fedcba98',
    authorName: 'PayrollPro',
    authorAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=payroll',
    authorProofScore: 6800,
    mediaUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
    mediaType: 'image',
    caption: 'Streaming payments are the future!',
    viewCount: 189,
    reactions: { fire: 34, heart: 28, rocket: 22, clap: 17 },
    createdAt: new Date(Date.now() - 21600000).toISOString(),
    expiresAt: new Date(Date.now() + 54000000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('authorId');
    const _viewerId = searchParams.get('viewerId'); // Reserved for view tracking

    // Filter out expired stories
    const now = new Date();
    let activeStories = storiesStore.filter(
      story => new Date(story.expiresAt) > now
    );

    // Filter by author if specified
    if (authorId) {
      activeStories = activeStories.filter(
        story => story.authorId.toLowerCase() === authorId.toLowerCase()
      );
    }

    // Sort by creation date (newest first)
    activeStories.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Group by author for story rings
    const groupedByAuthor = activeStories.reduce((acc, story) => {
      if (!acc[story.authorId]) {
        acc[story.authorId] = {
          authorId: story.authorId,
          authorName: story.authorName,
          authorAvatar: story.authorAvatar,
          authorProofScore: story.authorProofScore,
          stories: [],
          hasUnviewed: false,
        };
      }
      acc[story.authorId].stories.push(story);
      if (!story.isViewed) {
        acc[story.authorId].hasUnviewed = true;
      }
      return acc;
    }, {} as Record<string, { 
      authorId: string; 
      authorName: string; 
      authorAvatar?: string; 
      authorProofScore: number;
      stories: Story[]; 
      hasUnviewed: boolean;
    }>);

    return NextResponse.json({
      stories: activeStories,
      storyRings: Object.values(groupedByAuthor),
      total: activeStories.length,
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorId, authorName, mediaUrl, mediaType, caption } = body;

    if (!authorId || !mediaUrl) {
      return NextResponse.json(
        { error: 'authorId and mediaUrl are required' },
        { status: 400 }
      );
    }

    const newStory: Story = {
      id: `story_${Date.now()}`,
      authorId,
      authorName: authorName || 'Anonymous',
      authorAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${authorId}`,
      authorProofScore: 5000, // In production: fetch from ProofScore contract
      mediaUrl,
      mediaType: mediaType || 'image',
      caption,
      viewCount: 0,
      reactions: { fire: 0, heart: 0, rocket: 0, clap: 0 },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    storiesStore.unshift(newStory);

    return NextResponse.json({ story: newStory }, { status: 201 });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}
