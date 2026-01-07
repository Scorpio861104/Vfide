/**
 * Crypto API Routes - Payment Requests Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock payment requests storage
const requestsStore = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const allRequests = Array.from(requestsStore.values());
    const userRequests = allRequests.filter(
      (r) =>
        r.from.toLowerCase() === userId.toLowerCase() ||
        r.to.toLowerCase() === userId.toLowerCase()
    );

    return NextResponse.json({
      success: true,
      requests: userRequests.sort((a, b) => b.createdAt - a.createdAt),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const paymentRequest = await request.json();
    requestsStore.set(paymentRequest.id, paymentRequest);

    return NextResponse.json({
      success: true,
      request: paymentRequest,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
