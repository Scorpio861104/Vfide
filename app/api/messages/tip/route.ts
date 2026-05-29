/**
 * /api/messages/tip
 * POST — attach a tip record to an in-chat message after the on-chain tx.
 *        Body: { messageId: string, transaction: Transaction }
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory store for testnet — keyed by messageId.
const messageTips = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, transaction } = body;

    if (!messageId || !transaction) {
      return NextResponse.json({ error: 'messageId and transaction are required' }, { status: 400 });
    }

    messageTips.set(messageId, transaction);
    return NextResponse.json({ success: true, messageId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
  }

  const tip = messageTips.get(messageId) ?? null;
  return NextResponse.json({ tip });
}
