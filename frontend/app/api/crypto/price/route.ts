/**
 * Crypto API Routes - Price Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In production, fetch from CoinGecko or similar
    const ethPrice = 2000; // Mock price
    const vfidePrice = 0.1; // Mock price

    return NextResponse.json({
      success: true,
      ethPrice,
      vfidePrice,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
