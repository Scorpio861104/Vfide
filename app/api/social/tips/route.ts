/**
 * /api/social/tips
 * POST — record a social tip after the on-chain transaction has been submitted.
 * GET  — retrieve tips for a post (?postId=) or by sender (?sender=).
 *
 * Persistence: stored in-memory for testnet.  A production deployment would
 * swap the store for a database write.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Minimal in-memory store for testnet demo.
// Replace with DB writes in production.
const tips: Record<string, unknown>[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, postId, commentId, recipientAddress, amount, currency, message, timestamp, txHash, status } = body;

    if (!recipientAddress || !amount || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tip = { id, postId, commentId, recipientAddress, amount, currency, message, timestamp, txHash, status };
    tips.push(tip);

    return NextResponse.json({ success: true, tip }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  const sender = searchParams.get('sender');

  let results = tips;
  if (postId) results = results.filter((t: any) => t.postId === postId);
  if (sender) results = results.filter((t: any) => t.senderAddress === sender);

  return NextResponse.json({ tips: results });
}
