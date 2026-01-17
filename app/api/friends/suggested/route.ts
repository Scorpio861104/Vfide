import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateQueryParams, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/lib/logger.service';

/**
 * Suggested Friends API - PostgreSQL Database
 * GET - Get friend suggestions based on ProofScore, mutual connections, and activity
 */

interface UserRow {
  id: number;
  wallet_address: string;
  username: string | null;
  avatar_url: string | null;
  proof_score: number;
  bio: string | null;
  is_verified: boolean;
  mutual_count: number;
}

interface SuggestedUser {
  id: string;
  address: string;
  name: string;
  avatar: string;
  proofScore: number;
  bio: string | null;
  mutualFriends: number;
  mutualBadges: string[];
  isVerified: boolean;
  isFollowing: boolean;
  reason: 'high_score' | 'mutual_friends' | 'similar_activity' | 'same_badges' | 'trending';
  commonTags: string[];
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`friends:suggested:${clientId}`, { maxRequests: 60, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const reason = searchParams.get('reason');
    const minScore = parseInt(searchParams.get('minScore') || '0');

    // Validate pagination
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get the requesting user's ID if provided
    let requestingUserId: number | null = null;
    if (userId) {
      const userResult = await query<{ id: number }>(
        'SELECT id FROM users WHERE LOWER(wallet_address) = $1',
        [userId.toLowerCase()]
      );
      if (userResult.rows.length > 0) {
        const userRow = userResult.rows[0];
        if (userRow) {
          requestingUserId = userRow.id;
        }
      }
    }

    // Build query for suggested users
    // Exclude users already friends with the requesting user
    let queryText = `
      SELECT 
        u.id,
        u.wallet_address,
        COALESCE(u.username, CONCAT('User_', SUBSTRING(u.wallet_address, 1, 8))) as username,
        u.avatar_url,
        COALESCE(u.proof_score, 0) as proof_score,
        u.bio,
        COALESCE(u.is_verified, false) as is_verified,
        COALESCE(mutual.mutual_count, 0) as mutual_count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as mutual_count
        FROM friends f1
        JOIN friends f2 ON f1.friend_id = f2.friend_id
        WHERE f1.user_id = $1 
          AND f2.user_id = u.id 
          AND f1.status = 'accepted' 
          AND f2.status = 'accepted'
      ) mutual ON true
      WHERE u.id != COALESCE($1, 0)
    `;
    
    const params: (number | string | null)[] = [requestingUserId];
    let paramIndex = 2;

    // Exclude existing friends
    if (requestingUserId) {
      queryText += ` AND u.id NOT IN (
        SELECT friend_id FROM friends WHERE user_id = $1 AND status = 'accepted'
      )`;
    }

    // Filter by minimum ProofScore
    if (minScore > 0) {
      params.push(minScore);
      queryText += ` AND COALESCE(u.proof_score, 0) >= $${paramIndex++}`;
    }

    // Order by verified, mutual friends, then ProofScore
    queryText += ` ORDER BY u.is_verified DESC, mutual.mutual_count DESC, u.proof_score DESC`;
    
    params.push(limit);
    queryText += ` LIMIT $${paramIndex}`;

    const result = await query<UserRow>(queryText, params);

    // Get badges for suggested users
    const userIds = result.rows.map(r => r.id);
    const badgesMap: Record<number, string[]> = {};
    
    if (userIds.length > 0) {
      const badgesResult = await query<{ user_id: number; badge_name: string }>(
        `SELECT ub.user_id, b.name as badge_name 
         FROM user_badges ub 
         JOIN badges b ON ub.badge_id = b.id 
         WHERE ub.user_id = ANY($1)`,
        [userIds]
      );
      
      badgesResult.rows.forEach(row => {
        if (!badgesMap[row.user_id]) {
          badgesMap[row.user_id] = [];
        }
        const badgeName = row.badge_name;
        if (badgeName) {
          badgesMap[row.user_id]!.push(badgeName);
        }
      });
    }

    // Check if requesting user is following any suggested users
    let followingSet: Set<number> = new Set();
    if (requestingUserId && userIds.length > 0) {
      const followingResult = await query<{ friend_id: number }>(
        `SELECT friend_id FROM friends WHERE user_id = $1 AND friend_id = ANY($2) AND status = 'pending'`,
        [requestingUserId, userIds]
      );
      followingSet = new Set(followingResult.rows.map(r => r.friend_id));
    }

    // Determine reason for suggestion
    const determineReason = (row: UserRow): SuggestedUser['reason'] => {
      if (reason) return reason as SuggestedUser['reason'];
      if (row.mutual_count > 5) return 'mutual_friends';
      if (row.proof_score >= 8000) return 'high_score';
      const badges = badgesMap[row.id];
      if (badges && badges.length > 3) return 'same_badges';
      if (row.is_verified) return 'trending';
      return 'similar_activity';
    };

    const suggestions: SuggestedUser[] = result.rows.map(row => ({
      id: `suggested_${row.id}`,
      address: row.wallet_address,
      name: row.username || `User_${row.wallet_address.substring(0, 8)}`,
      avatar: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.wallet_address}`,
      proofScore: row.proof_score,
      bio: row.bio,
      mutualFriends: row.mutual_count,
      mutualBadges: badgesMap[row.id] || [],
      isVerified: row.is_verified,
      isFollowing: followingSet.has(row.id),
      reason: determineReason(row),
      commonTags: [], // Would need post analysis for real tags
    }));

    // Filter by reason if specified
    const filteredSuggestions = reason
      ? suggestions.filter(s => s.reason === reason)
      : suggestions;

    return NextResponse.json({
      suggestions: filteredSuggestions,
      total: filteredSuggestions.length,
      forUser: userId || 'anonymous',
    });
  } catch (error) {
    apiLogger.error('Failed to fetch friend suggestions', { error });
    return NextResponse.json(
      { error: 'Failed to fetch friend suggestions' },
      { status: 500 }
    );
  }
}
