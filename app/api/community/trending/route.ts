import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Community Trending Topics API - PostgreSQL Database
 * GET - Retrieve trending topics and hashtags from database
 */

interface TrendingTopicRow {
  id: number;
  tag: string;
  post_count: number;
  engagement_score: number;
  category: string;
  is_promoted: boolean;
  updated_at: string;
}

interface TrendingUserRow {
  id: number;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  proof_score: number;
  is_verified: boolean;
  follower_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'all'; // 'topics', 'users', 'all'

    const response: {
      topics?: {
        id: string;
        tag: string;
        displayName: string;
        postCount: number;
        change24h: number;
        category: string;
        isPromoted: boolean;
      }[];
      users?: {
        id: string;
        address: string;
        name: string;
        avatar: string;
        proofScore: number;
        followersGained24h: number;
        isVerified: boolean;
      }[];
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    // Get trending topics
    if (type === 'topics' || type === 'all') {
      let topicsQuery = `
        SELECT 
          id,
          tag,
          post_count,
          engagement_score,
          COALESCE(category, 'general') as category,
          COALESCE(is_promoted, false) as is_promoted,
          updated_at
        FROM trending_topics
        WHERE 1=1
      `;
      const topicsParams: (string | number)[] = [];
      let paramIndex = 1;

      if (category) {
        topicsParams.push(category);
        topicsQuery += ` AND category = $${paramIndex++}`;
      }

      topicsQuery += ` ORDER BY is_promoted DESC, engagement_score DESC, post_count DESC`;
      topicsParams.push(limit);
      topicsQuery += ` LIMIT $${paramIndex}`;

      const topicsResult = await query<TrendingTopicRow>(topicsQuery, topicsParams);

      response.topics = topicsResult.rows.map(row => ({
        id: `trend_${row.id}`,
        tag: row.tag,
        displayName: `#${row.tag}`,
        postCount: row.post_count,
        change24h: Math.round(row.engagement_score), // Use engagement as change indicator
        category: row.category as 'governance' | 'commerce' | 'social' | 'tech' | 'general',
        isPromoted: row.is_promoted,
      }));

      // If no trending topics in DB, compute from community_posts
      if (response.topics.length === 0) {
        const computedResult = await query<{ tag: string; post_count: string }>(
          `SELECT UNNEST(tags) as tag, COUNT(*) as post_count
           FROM community_posts
           WHERE created_at > NOW() - INTERVAL '7 days'
           GROUP BY UNNEST(tags)
           ORDER BY post_count DESC
           LIMIT $1`,
          [limit]
        );

        response.topics = computedResult.rows.map((row, idx) => ({
          id: `trend_computed_${idx}`,
          tag: row.tag,
          displayName: `#${row.tag}`,
          postCount: parseInt(row.post_count),
          change24h: 0,
          category: 'general' as const,
          isPromoted: false,
        }));
      }
    }

    // Get trending users (by ProofScore and activity)
    if (type === 'users' || type === 'all') {
      const usersResult = await query<TrendingUserRow>(
        `SELECT 
          u.id,
          u.wallet_address,
          COALESCE(u.username, CONCAT('User_', SUBSTRING(u.wallet_address, 1, 8))) as username,
          u.avatar_url,
          COALESCE(u.proof_score, 0) as proof_score,
          COALESCE(u.is_verified, false) as is_verified,
          COUNT(DISTINCT f.id) as follower_count
        FROM users u
        LEFT JOIN friends f ON f.friend_id = u.id AND f.status = 'accepted'
        GROUP BY u.id, u.wallet_address, u.username, u.avatar_url, u.proof_score, u.is_verified
        ORDER BY u.proof_score DESC, follower_count DESC
        LIMIT $1`,
        [limit]
      );

      response.users = usersResult.rows.map(row => ({
        id: `user_${row.id}`,
        address: row.wallet_address,
        name: row.username || `User_${row.wallet_address.substring(0, 8)}`,
        avatar: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.wallet_address}`,
        proofScore: row.proof_score,
        followersGained24h: row.follower_count, // Approximate with total followers
        isVerified: row.is_verified,
      }));
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
