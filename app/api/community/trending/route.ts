import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface PostRow {
  id: number;
  data: unknown;
  description: string | null;
}

const extractTags = (content: string): string[] => {
  const matches = content.match(/#[\w-]+/g) ?? [];
  return matches.map((tag) => tag.toLowerCase());
};

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  try {
    const result = await query<PostRow>(
      `SELECT id, data, description
       FROM activities
       WHERE activity_type IN ('social_post', 'post', 'community_post')
       ORDER BY created_at DESC
       LIMIT 200`
    );

    const tagCounts = new Map<string, number>();

    result.rows.forEach((row) => {
      const data: Record<string, unknown> =
        row.data && typeof row.data === 'object' && !Array.isArray(row.data)
          ? (row.data as Record<string, unknown>)
          : {};
      const tags = Array.isArray(data.tags)
        ? data.tags
        : extractTags(typeof data.content === 'string' ? data.content : (row.description ?? ''));
      tags.forEach((tag: string) => {
        const normalized = tag.startsWith('#') ? tag : `#${tag}`;
        tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
      });
    });

    const topics = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, posts], index) => ({
        id: `trend-${index + 1}`,
        tag,
        posts,
        trending: 'stable' as const,
      }));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('[Community Trending GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch trending topics' }, { status: 500 });
  }
}
