/**
 * VAPID API
 * 
 * Endpoint to get VAPID public key for push subscriptions.
 * 
 * In production, set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.
 * Generate VAPID keys using: npx web-push generate-vapid-keys
 */

import { NextResponse } from 'next/server';

// VAPID public key from environment - required for production
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function GET() {
  if (!VAPID_PUBLIC_KEY) {
    return NextResponse.json({
      success: false,
      error: 'VAPID key not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.',
      configured: false,
    }, { status: 503 });
  }
  
  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
    configured: true,
  });
}
