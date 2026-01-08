/**
 * Crypto API Routes - Individual Payment Request Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock payment requests storage
const requestsStore = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const paymentRequest = requestsStore.get(id);

    if (!paymentRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: paymentRequest,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    
    const paymentRequest = requestsStore.get(id);
    if (!paymentRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const updated = { ...paymentRequest, ...updates };
    requestsStore.set(id, updated);

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update request' },
      { status: 500 }
    );
  }
}
