/**
 * Push Notifications API
 * 
 * Endpoints for managing push notification subscriptions and preferences.
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock storage (replace with database)
const subscriptionsStore = new Map<string, any>();
const preferencesStore = new Map<string, any>();

// Mock VAPID keys (replace with real keys from environment variables)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib37L8u38P5Rr1R1gLDmEtA1BQKWjVHvQz9k7K3h7BT5Vfj0a8qYMHSZWRk';

// ============================================================================
// GET - Fetch data
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    // Get VAPID public key
    if (endpoint === 'vapid') {
      return NextResponse.json({
        success: true,
        publicKey: VAPID_PUBLIC_KEY,
      });
    }

    // Get user subscription
    if (endpoint === 'subscription') {
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'userId is required' },
          { status: 400 }
        );
      }

      const subscription = subscriptionsStore.get(userId);
      return NextResponse.json({
        success: true,
        subscription: subscription || null,
      });
    }

    // Get notification preferences
    if (endpoint === 'preferences') {
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'userId is required' },
          { status: 400 }
        );
      }

      const preferences = preferencesStore.get(userId);
      return NextResponse.json({
        success: true,
        preferences: preferences || null,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid endpoint' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Subscribe to push notifications
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    if (!userId || !subscription) {
      return NextResponse.json(
        { success: false, error: 'userId and subscription are required' },
        { status: 400 }
      );
    }

    // Validate subscription format
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    // Store subscription
    const subscriptionData = {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      createdAt: Date.now(),
      userAgent: request.headers.get('user-agent') || undefined,
    };

    subscriptionsStore.set(userId, subscriptionData);

    // Initialize default preferences if they don't exist
    if (!preferencesStore.has(userId)) {
      preferencesStore.set(userId, {
        userId,
        enabled: true,
        types: {
          message: true,
          mention: true,
          reaction: true,
          group_invite: true,
          badge_earned: true,
          announcement: true,
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      });
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Update notification preferences
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Store preferences
    preferencesStore.set(userId, body);

    return NextResponse.json({
      success: true,
      preferences: body,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Unsubscribe from push notifications
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Remove subscription
    subscriptionsStore.delete(userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription removed',
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
