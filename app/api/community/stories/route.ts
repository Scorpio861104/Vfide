import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface StoryRow {
  id: number;
  data: unknown;
  created_at: string;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
}

interface StoryItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'text' | 'image' | 'video';
  content: string;
  backgroundColor?: string;
  textColor?: string;
  caption?: string;
  createdAt: number;
  expiresAt: number;
  viewedBy: string[];
  reactions: Array<{ userId: string; emoji: string; timestamp: number }>;
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  try {
    const result = await query<StoryRow>(
      `SELECT a.id, a.data, a.created_at, u.wallet_address, u.username, u.avatar_url
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE a.activity_type IN ('story', 'social_story')
       ORDER BY a.created_at DESC
       LIMIT 100`
    );

    const stories = result.rows.map((row) => {
      const data: Record<string, unknown> =
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : {};
      const createdAt = data.createdAt ? Number(data.createdAt) : new Date(row.created_at).getTime();
      const expiresAt = data.expiresAt ? Number(data.expiresAt) : createdAt + 24 * 60 * 60 * 1000;

      const story: StoryItem = {
        id: data.id ?? `story-${row.id}`,
        userId: row.wallet_address,
        userName: row.username ?? row.wallet_address,
        userAvatar: row.avatar_url ?? undefined,
        type: data.type === 'image' || data.type === 'video' ? data.type : 'text',
        content: data.content ?? '',
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        caption: data.caption,
        createdAt,
        expiresAt,
        viewedBy: Array.isArray(data.viewedBy) ? data.viewedBy : [],
        reactions: Array.isArray(data.reactions) ? data.reactions : [],
      };

      return story;
    });

    const grouped = new Map<string, { userId: string; userName: string; userAvatar: string; stories: StoryItem[] }>();

    stories.forEach((story) => {
      const key = story.userId;
      const existing = grouped.get(key);
      if (existing) {
        existing.stories.push(story);
      } else {
        grouped.set(key, {
          userId: story.userId,
          userName: story.userName,
          userAvatar: story.userAvatar ?? '👤',
          stories: [story],
        });
      }
    });

    return NextResponse.json({
      stories: Array.from(grouped.values()),
    });
  } catch (error) {
    console.error('[Community Stories GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}
