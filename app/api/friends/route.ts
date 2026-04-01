import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const DEFAULT_FRIENDS_LIMIT = 50;
const MAX_FRIENDS_LIMIT = 200;
const MAX_FRIENDS_OFFSET = 10000;
const ALLOWED_FRIENDSHIP_STATUS = new Set(['pending', 'accepted', 'blocked', 'rejected']);

const createFriendRequestSchema = z.object({
  from: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid from address format',
  }),
  to: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid to address format',
  }),
});

const updateFriendRequestSchema = z.object({
  friendshipId: z.coerce.number().int().positive(),
  status: z.enum(['accepted', 'rejected']),
  userAddress: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid userAddress format',
  }),
});

interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_address?: string;
  user_username?: string;
  user_avatar?: string;
  friend_address?: string;
  friend_username?: string;
  friend_avatar?: string;
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseNonNegativeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

/**
 * GET /api/friends?address=xxx&status=accepted
 * Get user's friends list or friend requests
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const status = searchParams.get('status') || 'accepted';
    const rawLimit = searchParams.get('limit');
    const rawOffset = searchParams.get('offset');
    const parsedLimit = rawLimit === null ? DEFAULT_FRIENDS_LIMIT : parsePositiveInteger(rawLimit);
    const parsedOffset = rawOffset === null ? 0 : parseNonNegativeInteger(rawOffset);

    if (parsedLimit === null || parsedOffset === null) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(parsedLimit, MAX_FRIENDS_LIMIT);
    const offset = Math.min(parsedOffset, MAX_FRIENDS_OFFSET);

    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = normalizeAddress(address);

    if (!ALLOWED_FRIENDSHIP_STATUS.has(status)) {
      return NextResponse.json(
        { error: 'Invalid status parameter' },
        { status: 400 }
      );
    }

    // Verify the requesting user is accessing their own friends list
    if (authenticatedAddress !== normalizedAddress) {
      return NextResponse.json(
        { error: 'You can only view your own friends list' },
        { status: 403 }
      );
    }

    // Get friendships with user details
    const result = await query<Friendship>(
      `SELECT 
        f.*,
        u1.wallet_address as user_address,
        u1.username as user_username,
        u1.avatar_url as user_avatar,
        u2.wallet_address as friend_address,
        u2.username as friend_username,
        u2.avatar_url as friend_avatar
       FROM friendships f
       JOIN users u1 ON f.user_id = u1.id
       JOIN users u2 ON f.friend_id = u2.id
       WHERE (u1.wallet_address = $1 OR u2.wallet_address = $1)
         AND f.status = $2
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $4`,
      [normalizedAddress, status, limit, offset]
    );

    return NextResponse.json({
      friends: result.rows,
      count: result.rows.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Friends GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/friends
 * Send friend request
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getClient();
  
  try {
    let body: z.infer<typeof createFriendRequestSchema>;
    try {
      const rawBody = await request.json();
      const parsed = createFriendRequestSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { from, to } = body;
    const fromAddress = normalizeAddress(from);
    const toAddress = normalizeAddress(to);

    // Verify the request is from the authenticated user
    if (authenticatedAddress !== fromAddress) {
      return NextResponse.json(
        { error: 'You can only send friend requests from your own address' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Get user IDs
    const fromResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [fromAddress]
    );

    const toResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [toAddress]
    );

    if (fromResult.rows.length === 0 || toResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const fromId = fromResult.rows[0].id;
    const toId = toResult.rows[0].id;

    // Check if already friends or request exists
    const existingResult = await client.query(
      `SELECT * FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) 
          OR (user_id = $2 AND friend_id = $1)`,
      [fromId, toId]
    );

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Friendship already exists or pending' },
        { status: 400 }
      );
    }

    // Create friend request
    const requestResult = await client.query(
      `INSERT INTO friendships (user_id, friend_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [fromId, toId]
    );

    // Create notification for recipient
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'friend_request', 'New Friend Request', $2, $3)`,
      [
        toId,
        `${from} sent you a friend request`,
        JSON.stringify({ friendshipId: requestResult.rows[0].id, from, to })
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      friendship: requestResult.rows[0],
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Friends POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * PATCH /api/friends
 * Accept or reject friend request
 */
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getClient();
  
  try {
    let body: z.infer<typeof updateFriendRequestSchema>;
    try {
      const rawBody = await request.json();
      const parsed = updateFriendRequestSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body' },
          { status: 400 }
        );
      }
      body = parsed.data;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { friendshipId, status, userAddress } = body;
    const friendshipIdValue = friendshipId;
    const statusValue = status;
    const normalizedUserAddress = normalizeAddress(userAddress);

    await client.query('BEGIN');

    // Get user ID
    const userResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [normalizedUserAddress]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

    // Verify the authenticated user is the one accepting/rejecting
    if (authenticatedAddress !== normalizedUserAddress) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You can only respond to your own friend requests' },
        { status: 403 }
      );
    }

    // Get friendship
    const friendshipResult = await client.query(
      'SELECT * FROM friendships WHERE id = $1 AND friend_id = $2 AND status = \'pending\'',
      [friendshipIdValue, userId]
    );

    if (friendshipResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    if (statusValue === 'accepted') {
      // Update friendship status
      await client.query(
        'UPDATE friendships SET status = \'accepted\', updated_at = NOW() WHERE id = $1',
        [friendshipIdValue]
      );

      // Create notification for requester
      const friendship = friendshipResult.rows[0];
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'friend_accepted', 'Friend Request Accepted', $2, $3)`,
        [
          friendship.user_id,
          `Your friend request was accepted`,
          JSON.stringify({ friendshipId: friendshipIdValue, userId })
        ]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
      });
    } else if (statusValue === 'rejected') {
      // Delete friendship
      await client.query(
        'DELETE FROM friendships WHERE id = $1',
        [friendshipIdValue]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Friend request rejected',
      });
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid status. Must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Friends PATCH API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update friend request' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/friends?user1=xxx&user2=xxx
 * Remove friend
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: 'Missing required fields: user1, user2' },
        { status: 400 }
      );
    }

    if (!isAddress(user1) || !isAddress(user2)) {
      return NextResponse.json(
        { error: 'Invalid user address format' },
        { status: 400 }
      );
    }

    // Verify the authenticated user is one of the users in the friendship
    const user1Address = normalizeAddress(user1);
    const user2Address = normalizeAddress(user2);
    if (authenticatedAddress !== user1Address && authenticatedAddress !== user2Address) {
      return NextResponse.json(
        { error: 'You can only remove your own friendships' },
        { status: 403 }
      );
    }

    // Get user IDs
    const user1Result = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [user1Address]
    );

    const user2Result = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [user2Address]
    );

    if (user1Result.rows.length === 0 || user2Result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user1Id = user1Result.rows[0]?.id;
    const user2Id = user2Result.rows[0]?.id;
    if (!user1Id || !user2Id) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete friendship
    const result = await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) 
          OR (user_id = $2 AND friend_id = $1)`,
      [user1Id, user2Id]
    );

    return NextResponse.json({
      success: true,
      message: 'Friend removed',
      deleted: result.rowCount || 0,
    });
  } catch (error) {
    logger.error('[Friends DELETE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove friend' },
      { status: 500 }
    );
  }
}
