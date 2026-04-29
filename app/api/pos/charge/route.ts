import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
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

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

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

    if (parsed.data.merchantAddress.toLowerCase() !== authResult.user.address.toLowerCase()) {
      return NextResponse.json({ error: 'merchantAddress must match authenticated wallet' }, { status: 403 });
    }

    const now = Date.now();
    // N-L29 FIX: Use a UUIDv4 for chargeId to prevent collision and enumeration.
    // `pos_${Date.now()}` is ms-resolution and collides across concurrent terminals.
    const chargeId = parsed.data.offlineId ?? crypto.randomUUID();

    // Queue the intent only. Settlement is confirmed by the merchant payment confirmation flow.
    return NextResponse.json({
      ok: true,
      chargeId,
      status: 'pending',
      amount,
      currency: parsed.data.currency.toUpperCase(),
      merchantAddress: parsed.data.merchantAddress.toLowerCase(),
      acceptedAt: new Date(now).toISOString(),
      settlementReference: chargeId,
    });
  } catch (error) {
    logger.error('[POS Charge API] Failed to process charge request', error);
    return NextResponse.json({ error: 'Failed to process POS charge' }, { status: 500 });
  }
}
