/**
 * VAPID API
 * 
 * Endpoint to get VAPID public key for push subscriptions.
 */

import { NextResponse } from 'next/server';

// Mock VAPID public key (replace with real key from environment)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib37L8u38P5Rr1R1gLDmEtA1BQKWjVHvQz9k7K3h7BT5Vfj0a8qYMHSZWRk';

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
  });
}
