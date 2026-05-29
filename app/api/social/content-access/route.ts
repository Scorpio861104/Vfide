/**
 * /api/social/content-access
 * GET  — check if the requesting wallet has paid for a piece of premium content.
 *        Query params: contentId, buyer (wallet address)
 * POST — grant access after payment confirmation.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory grant store for testnet.
const grants = new Set<string>(); // key = `${contentId}:${buyer}`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  const buyer = searchParams.get('buyer')?.toLowerCase();

  if (!contentId || !buyer) {
    return NextResponse.json({ error: 'contentId and buyer are required' }, { status: 400 });
  }

  const key = `${contentId}:${buyer}`;
  return NextResponse.json({ hasAccess: grants.has(key) });
}

export async function POST(request: NextRequest) {
  try {
    const { contentId, buyer } = await request.json();
    if (!contentId || !buyer) {
      return NextResponse.json({ error: 'contentId and buyer are required' }, { status: 400 });
    }
    grants.add(`${contentId}:${buyer.toLowerCase()}`);
    return NextResponse.json({ success: true, accessGranted: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
