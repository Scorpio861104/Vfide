import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, friendRequestSchema } from '@/lib/auth/validation';

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

/**
 * GET /api/friends?address=xxx&status=accepted
 * Get user's friends list or friend requests
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const status = searchParams.get('status') || 'accepted';

    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    // Verify the requesting user is accessing their own friends list
    if (authResult.user.address.toLowerCase() !== address.toLowerCase()) {
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
       ORDER BY f.created_at DESC`,
      [address.toLowerCase(), status]
    );

    return NextResponse.json({
      friends: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[Friends GET API] Error:', error);
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
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const client = await getClient();
  
  try {
    // Validate request body
    const validation = await validateBody(request, friendRequestSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { from, to } = validation.data;

    // Verify the request is from the authenticated user
    if (authResult.user.address.toLowerCase() !== from.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only send friend requests from your own address' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Get user IDs
    const fromResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [from.toLowerCase()]
    );

    const toResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [to.toLowerCase()]
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
    console.error('[Friends POST API] Error:', error);
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
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const client = await getClient();
  
  try {
    const body = await request.json();
    const { friendshipId, status, userAddress } = body;

    if (!friendshipId || !status || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: friendshipId, status, userAddress' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get user ID
    const userResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [userAddress.toLowerCase()]
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
    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You can only respond to your own friend requests' },
        { status: 403 }
      );
    }

    // Get friendship
    const friendshipResult = await client.query(
      'SELECT * FROM friendships WHERE id = $1 AND friend_id = $2 AND status = \'pending\'',
      [friendshipId, userId]
    );

    if (friendshipResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    if (status === 'accepted') {
      // Update friendship status
      await client.query(
        'UPDATE friendships SET status = \'accepted\', updated_at = NOW() WHERE id = $1',
        [friendshipId]
      );

      // Create notification for requester
      const friendship = friendshipResult.rows[0];
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'friend_accepted', 'Friend Request Accepted', $2, $3)`,
        [
          friendship.user_id,
          `Your friend request was accepted`,
          JSON.stringify({ friendshipId, userId })
        ]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
      });
    } else if (status === 'rejected') {
      // Delete friendship
      await client.query(
        'DELETE FROM friendships WHERE id = $1',
        [friendshipId]
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
    console.error('[Friends PATCH API] Error:', error);
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
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
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

    // Verify the authenticated user is one of the users in the friendship
    const authenticatedAddress = authResult.user.address.toLowerCase();
    if (authenticatedAddress !== user1.toLowerCase() && authenticatedAddress !== user2.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only remove your own friendships' },
        { status: 403 }
      );
    }

    // Get user IDs
    const user1Result = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [user1.toLowerCase()]
    );

    const user2Result = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [user2.toLowerCase()]
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
    console.error('[Friends DELETE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove friend' },
      { status: 500 }
    );
  }
}
