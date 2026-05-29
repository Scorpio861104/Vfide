/**
 * /api/social/content-purchases
 * GET  — list content purchases for a buyer (?buyer=) or seller (?seller=).
 * POST — record a new content purchase.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const purchases: Record<string, unknown>[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buyer = searchParams.get('buyer')?.toLowerCase();
  const seller = searchParams.get('seller')?.toLowerCase();

  let results = purchases;
  if (buyer) results = results.filter((p: any) => p.buyerAddress?.toLowerCase() === buyer);
  if (seller) results = results.filter((p: any) => p.sellerAddress?.toLowerCase() === seller);

  return NextResponse.json({ purchases: results });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, contentType, price, currency, sellerAddress, buyerAddress, txHash } = body;

    if (!contentId || !sellerAddress || !buyerAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const purchase = {
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId, contentType, price, currency, sellerAddress, buyerAddress,
      timestamp: Date.now(), txHash, accessGranted: true,
    };
    purchases.push(purchase);
    return NextResponse.json({ success: true, purchase }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
