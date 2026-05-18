import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import type { JWTPayload } from '@/lib/auth/jwt';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const patchSchema = z.object({
  completed_modules: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  quick_step: z.number().int().min(0).max(100).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }
  return address;
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query(
      `SELECT completed_modules, quick_step, updated_at
         FROM merchant_training_progress
        WHERE merchant_address = $1`,
      [authAddress]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        progress: {
          completed_modules: [],
          quick_step: 0,
          updated_at: null,
        },
      });
    }

    return NextResponse.json({ progress: result.rows[0] });
  } catch (error) {
    logger.error('[Merchant Training GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch training progress' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const completedModules = parsed.data.completed_modules ?? [];
    const quickStep = parsed.data.quick_step ?? 0;

    const result = await query(
      `INSERT INTO merchant_training_progress (merchant_address, completed_modules, quick_step)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (merchant_address)
       DO UPDATE SET completed_modules = EXCLUDED.completed_modules,
                     quick_step = EXCLUDED.quick_step,
                     updated_at = NOW()
       RETURNING completed_modules, quick_step, updated_at`,
      [authAddress, JSON.stringify(completedModules), quickStep]
    );

    return NextResponse.json({ progress: result.rows[0] });
  } catch (error) {
    logger.error('[Merchant Training PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update training progress' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
