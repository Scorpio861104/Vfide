/**
 * Notification Preferences API
 * 
 * Endpoint for managing user notification preferences.
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock storage (replace with database)
const preferencesStore = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
