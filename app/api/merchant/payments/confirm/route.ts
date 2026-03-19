/**
 * Merchant Payment Confirmation API
 * 
 * POST — Record a confirmed on-chain payment and dispatch webhooks
 * Called by the POS/frontend after detecting a PaymentProcessed event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { dispatchWebhook } from '@/lib/webhooks/merchantWebhookDispatcher';

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { customer_address, amount, token, order_id, tx_hash } = body;

  if (!customer_address || typeof customer_address !== 'string' || !ADDRESS_LIKE_REGEX.test(customer_address.toLowerCase())) {
    return NextResponse.json({ error: 'Valid customer_address required' }, { status: 400 });
  }
  if (!amount || (typeof amount !== 'string' && typeof amount !== 'number')) {
    return NextResponse.json({ error: 'amount required' }, { status: 400 });
  }
  const validTxHash = typeof tx_hash === 'string' && TX_HASH_REGEX.test(tx_hash) ? tx_hash : null;

  // Dispatch webhook to merchant (the authenticated user is the merchant)
  dispatchWebhook(authAddress, 'payment.completed', {
    customer_address: (customer_address as string).toLowerCase(),
    amount: String(amount),
    token: typeof token === 'string' ? token : 'VFIDE',
    order_id: typeof order_id === 'string' ? order_id : undefined,
    tx_hash: validTxHash,
    confirmed_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
