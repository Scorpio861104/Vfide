import { NextRequest, NextResponse } from 'next/server';

// In-memory friends storage (use database in production)
const friendsStore = new Map<string, Set<string>>();
const friendRequestsStore = new Map<string, any[]>();

/**
 * GET /api/friends?address=xxx
 * Get user's friends list
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    const friends = Array.from(friendsStore.get(address.toLowerCase()) || []);

    return NextResponse.json({
      friends,
      count: friends.length,
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
  try {
    const body = await request.json();
    const { from, to } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if already friends
    const userFriends = friendsStore.get(from.toLowerCase()) || new Set();
    if (userFriends.has(to.toLowerCase())) {
      return NextResponse.json(
        { error: 'Already friends' },
        { status: 400 }
      );
    }

    // Create friend request
    const request_obj = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      status: 'pending',
      createdAt: Date.now(),
    };

    const requests = friendRequestsStore.get(to.toLowerCase()) || [];
    requests.push(request_obj);
    friendRequestsStore.set(to.toLowerCase(), requests);

    return NextResponse.json({
      success: true,
      request: request_obj,
    }, { status: 201 });
  } catch (error) {
    console.error('[Friends POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/friends/:requestId
 * Accept or reject friend request
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, status, userAddress } = body;

    if (!requestId || !status || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requests = friendRequestsStore.get(userAddress.toLowerCase()) || [];
    const requestIndex = requests.findIndex(r => r.id === requestId);

    if (requestIndex === -1) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    const friendRequest = requests[requestIndex];

    if (status === 'accepted') {
      // Add to friends lists
      const user1Friends = friendsStore.get(friendRequest.from) || new Set();
      const user2Friends = friendsStore.get(friendRequest.to) || new Set();

      user1Friends.add(friendRequest.to);
      user2Friends.add(friendRequest.from);

      friendsStore.set(friendRequest.from, user1Friends);
      friendsStore.set(friendRequest.to, user2Friends);

      // Remove request
      requests.splice(requestIndex, 1);
      friendRequestsStore.set(userAddress.toLowerCase(), requests);

      return NextResponse.json({
        success: true,
        message: 'Friend request accepted',
      });
    } else if (status === 'rejected') {
      // Remove request
      requests.splice(requestIndex, 1);
      friendRequestsStore.set(userAddress.toLowerCase(), requests);

      return NextResponse.json({
        success: true,
        message: 'Friend request rejected',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Friends PATCH API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update friend request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/friends
 * Remove friend
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const user1 = searchParams.get('user1');
    const user2 = searchParams.get('user2');

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user1Friends = friendsStore.get(user1.toLowerCase());
    const user2Friends = friendsStore.get(user2.toLowerCase());

    if (user1Friends) {
      user1Friends.delete(user2.toLowerCase());
      friendsStore.set(user1.toLowerCase(), user1Friends);
    }

    if (user2Friends) {
      user2Friends.delete(user1.toLowerCase());
      friendsStore.set(user2.toLowerCase(), user2Friends);
    }

    return NextResponse.json({
      success: true,
      message: 'Friend removed',
    });
  } catch (error) {
    console.error('[Friends DELETE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove friend' },
      { status: 500 }
    );
  }
}
