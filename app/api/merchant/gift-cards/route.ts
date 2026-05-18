import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership, withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function normalizeMerchantAddress(value: string | null): string | null {
  const merchant = value?.trim().toLowerCase() || '';
  return ADDRESS_REGEX.test(merchant) ? merchant : null;
}

function generateGiftCardCode(): string {
  // F-BE-015 FIX: was randomBytes(4) = 32 bits = 4.3B codes. With ~10K active
  // cards in a popular merchant base, birthday-paradox collision probability
  // becomes meaningful, and a 32-bit bearer is brute-forceable in minutes.
  // 16 bytes = 128 bits matches industry baseline for unguessable bearer
  // tokens. Format remains GC-<hex> for human readability.
  return `GC-${randomBytes(16).toString('hex').toUpperCase()}`;
}

function serializeGiftCard(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    code: String(row.code),
    originalAmount: Number(row.original_amount ?? 0),
    remainingAmount: Number(row.remaining_amount ?? 0),
    currency: String(row.currency ?? 'USD'),
    recipientName: row.recipient_name ? String(row.recipient_name) : null,
    recipientMessage: row.recipient_message ? String(row.recipient_message) : null,
    status: String(row.status ?? 'active'),
    purchasedAt: row.purchased_at ? new Date(String(row.purchased_at)).getTime() : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).getTime() : null,
    redeemedAt: row.redeemed_at ? new Date(String(row.redeemed_at)).getTime() : null,
  };
}

async function getHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase() || '';
  const merchant = normalizeMerchantAddress(request.nextUrl.searchParams.get('merchant'));

  if (code && merchant) {
    try {
      const result = await query(
        `SELECT id, remaining_amount, currency, status, expires_at
           FROM merchant_gift_cards
          WHERE code = $1 AND merchant_address = $2 AND status = 'active'`,
        [code, merchant],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ valid: false, reason: 'Invalid gift card' });
      }

      const card = result.rows[0] as Record<string, unknown>;
      if (card.expires_at && new Date(String(card.expires_at)).getTime() < Date.now()) {
        return NextResponse.json({ valid: false, reason: 'Gift card expired' });
      }

      return NextResponse.json({
        valid: true,
        balance: Number(card.remaining_amount ?? 0),
        currency: String(card.currency ?? 'USD'),
      });
    } catch (error) {
      logger.error('[Merchant Gift Cards GET validate] Error:', error);
      return NextResponse.json({ valid: false, reason: 'Validation failed' });
    }
  }

  if (!merchant) {
    return NextResponse.json({ error: 'merchant required' }, { status: 400 });
  }

  const authResult = await requireOwnership(request, merchant);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await query(
      `SELECT id, code, original_amount, remaining_amount, currency, recipient_name, recipient_message,
              status, purchased_at, expires_at, redeemed_at
         FROM merchant_gift_cards
        WHERE merchant_address = $1
        ORDER BY purchased_at DESC
        LIMIT 100`,
      [merchant],
    );

    return NextResponse.json({
      success: true,
      giftCards: result.rows.map((row) => serializeGiftCard(row as Record<string, unknown>)),
    });
  } catch (error) {
    logger.error('[Merchant Gift Cards GET list] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch gift cards' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const merchantAddress = normalizeMerchantAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const amount = Number(body?.amount ?? 0);
    const recipientName = typeof body?.recipientName === 'string' ? body.recipientName.trim() : '';
    const recipientMessage = typeof body?.recipientMessage === 'string' ? body.recipientMessage.trim() : '';
    const expiresInDays = Number(body?.expiresInDays ?? 0);

    if (!merchantAddress || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'merchantAddress and positive amount required' }, { status: 400 });
    }

    const purchaserAddress = typeof user.address === 'string'
      ? user.address.trim().toLowerCase()
      : '';

    if (!purchaserAddress || !ADDRESS_REGEX.test(purchaserAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // F-BE-012 FIX: minting a gift card creates a bearer credential redeemable
    // for `amount` of value at the merchant. Without an ownership gate, ANY
    // authenticated user could call POST with {merchantAddress, amount: 1000000}
    // to create unlimited gift cards bearing any merchant's name.
    //
    // The merchant must mint their own gift cards. End-customer purchase flow:
    //   1) Customer pays merchant on-chain (or holds VFIDE balance equivalent)
    //   2) Merchant verifies payment, calls POST as the merchant
    //   3) Merchant delivers code to customer
    //   4) Bearer (customer/recipient) redeems via PATCH with code
    //
    // This is consistent with all other merchant-side mutations in this codebase
    // (coupons, products, locations, staff, etc. all derive merchant_address
    // from auth.address, never trusting body.merchantAddress).
    if (purchaserAddress !== merchantAddress) {
      return NextResponse.json(
        { error: 'Only the merchant can mint gift cards for their own merchant_address' },
        { status: 403 },
      );
    }

    const code = generateGiftCardCode();
    const expiresAt = Number.isFinite(expiresInDays) && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null;

    const result = await query(
      `INSERT INTO merchant_gift_cards (
         merchant_address, code, original_amount, remaining_amount, purchaser_address,
         recipient_name, recipient_message, expires_at
       ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7)
       RETURNING id, code, original_amount, remaining_amount, currency, recipient_name, recipient_message,
                 status, purchased_at, expires_at, redeemed_at`,
      [
        merchantAddress,
        code,
        amount,
        purchaserAddress || null,
        recipientName || null,
        recipientMessage || null,
        expiresAt,
      ],
    );

    return NextResponse.json({
      success: true,
      giftCard: serializeGiftCard(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Gift Cards POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create gift card' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    const merchantAddress = normalizeMerchantAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const redeemAmount = Number(body?.redeemAmount ?? 0);

    if (!code || !merchantAddress || !Number.isFinite(redeemAmount) || redeemAmount <= 0) {
      return NextResponse.json({ error: 'code, merchantAddress, and positive redeemAmount required' }, { status: 400 });
    }

    // F-BE-012 FIX: redemption is a merchant-side action — the merchant's POS
    // (logged in as the merchant) records the redemption. Without this gate,
    // any authenticated user knowing a gift card code AND a merchant address
    // could PATCH `remaining_amount -= redeemAmount`, draining card value
    // without ever exchanging it for goods. Combined with the F-BE-015 entropy
    // fix (128-bit codes), redemption now requires both the bearer code AND
    // merchant authentication.
    const authAddress = typeof user.address === 'string'
      ? user.address.trim().toLowerCase()
      : '';
    if (!authAddress || !ADDRESS_REGEX.test(authAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authAddress !== merchantAddress) {
      return NextResponse.json(
        { error: 'Only the merchant can record redemptions for their own merchant_address' },
        { status: 403 },
      );
    }

    const result = await query(
      `UPDATE merchant_gift_cards
          SET remaining_amount = remaining_amount - $3,
              status = CASE WHEN remaining_amount - $3 <= 0 THEN 'depleted' ELSE 'active' END,
              redeemed_at = CASE WHEN remaining_amount - $3 <= 0 THEN NOW() ELSE redeemed_at END
        WHERE code = $1
          AND merchant_address = $2
          AND status = 'active'
          AND remaining_amount >= $3
        RETURNING remaining_amount`,
      [code, merchantAddress, redeemAmount],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Insufficient balance or invalid gift card' }, { status: 400 });
    }

    const updatedRow = result.rows[0] as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      remainingBalance: Number(updatedRow.remaining_amount ?? 0),
    });
  } catch (error) {
    logger.error('[Merchant Gift Cards PATCH] Error:', error);
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
