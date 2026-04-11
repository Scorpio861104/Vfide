import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { sendReceiptSMS } from '@/lib/sms';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const receiptSmsSchema = z.object({
  merchantAddress: z.string().trim().regex(ADDRESS_REGEX),
  phone: z.string().trim().min(5).optional(),
  to: z.string().trim().min(5).optional(),
  merchantName: z.string().trim().min(1),
  amount: z.union([z.string(), z.number()]).transform((value) => String(value).trim()),
  currency: z.string().trim().min(1).max(12),
  txHash: z.string().trim().optional(),
  orderId: z.string().trim().optional(),
}).refine((payload) => Boolean(payload.to || payload.phone), {
  message: 'Phone number is required',
  path: ['to'],
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = receiptSmsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Required receipt fields are missing.' }, { status: 400 });
    }

    const { merchantAddress, merchantName, amount, currency, txHash } = parsed.data;
    const to = (parsed.data.to ?? parsed.data.phone ?? '').trim();

    const authResult = await requireOwnership(request, merchantAddress.toLowerCase());
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const result = await sendReceiptSMS(to, {
      merchantName,
      amount,
      currency,
      txHash,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Unable to send SMS receipt.', provider: result.provider },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('[Merchant Receipt SMS] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected SMS receipt error.' },
      { status: 500 }
    );
  }
}
