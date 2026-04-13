import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createPosChargeSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  description: z.string().trim().max(240).optional(),
  currency: z.string().trim().min(1).max(12),
  merchantAddress: z.string().trim().regex(ADDRESS_REGEX),
  offlineId: z.string().trim().min(1).max(128).optional(),
  createdAt: z.number().int().positive().optional(),
});

function normalizeAmount(value: string | number): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value.toFixed(2);
  }

  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) return null;
  if (Number(trimmed) <= 0) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  const rateLimited = await withRateLimit(request, 'write');
  if (rateLimited) return rateLimited;

  try {
    const rawBody = await request.json();
    const parsed = createPosChargeSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid POS charge payload' }, { status: 400 });
    }

    const amount = normalizeAmount(parsed.data.amount);
    if (!amount) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const now = Date.now();
    const chargeId = parsed.data.offlineId ?? `pos_${now}`;

    // Lightweight acceptance endpoint for queued POS charge intents.
    // Live payment confirmation is handled by merchant payment confirmation routes.
    return NextResponse.json({
      ok: true,
      chargeId,
      status: 'accepted',
      amount,
      currency: parsed.data.currency.toUpperCase(),
      merchantAddress: parsed.data.merchantAddress.toLowerCase(),
      acceptedAt: new Date(now).toISOString(),
    });
  } catch (error) {
    logger.error('[POS Charge API] Failed to process charge request', error);
    return NextResponse.json({ error: 'Failed to process POS charge' }, { status: 500 });
  }
}
