/**
 * Merchant Tip Settings API
 *
 * GET   — Read the merchant's tip-jar configuration (preset percentages,
 *          custom-amount allowed, whether tips are enabled at all).
 * PUT   — Upsert the configuration.
 *
 * Actual tip TRANSACTIONS are recorded in the existing merchant_tips
 * table by the checkout flow; this route only manages configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const upsertSchema = z.object({
  enabled: z.boolean(),
  default_preset_percentages: z.array(z.number().int().min(0).max(100)).min(1).max(8),
  allow_custom_amount: z.boolean(),
  prompt_text: z.string().max(200).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return ADDRESS_LIKE_REGEX.test(address) ? address : null;
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await query(
      `SELECT enabled, default_preset_percentages, allow_custom_amount, prompt_text
         FROM merchant_tip_settings WHERE merchant_address = $1`,
      [authAddress],
    );
    // No row yet = sensible defaults
    if (result.rows.length === 0) {
      return NextResponse.json({
        settings: {
          enabled: true,
          default_preset_percentages: [15, 18, 20, 25],
          allow_custom_amount: true,
          prompt_text: null,
        },
        // Tip totals from the existing merchant_tips table
        ...(await tipTotals(authAddress)),
      });
    }
    return NextResponse.json({
      settings: result.rows[0],
      ...(await tipTotals(authAddress)),
    });
  } catch (error) {
    logger.error('[Tip Settings GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load tip settings' }, { status: 500 });
  }
}

async function tipTotals(merchant: string) {
  try {
    const total = await query(
      `SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::int AS count
         FROM merchant_tips WHERE merchant_address = $1`,
      [merchant],
    );
    const week = await query(
      `SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::int AS count
         FROM merchant_tips
        WHERE merchant_address = $1 AND created_at > NOW() - INTERVAL '7 days'`,
      [merchant],
    );
    return {
      totals: {
        all_time: total.rows[0],
        last_7_days: week.rows[0],
      },
    };
  } catch {
    return { totals: null };
  }
}

async function putHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof upsertSchema>;
  try {
    const parsed = upsertSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await query(
      `INSERT INTO merchant_tip_settings
         (merchant_address, enabled, default_preset_percentages, allow_custom_amount, prompt_text, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (merchant_address) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         default_preset_percentages = EXCLUDED.default_preset_percentages,
         allow_custom_amount = EXCLUDED.allow_custom_amount,
         prompt_text = EXCLUDED.prompt_text,
         updated_at = NOW()
       RETURNING enabled, default_preset_percentages, allow_custom_amount, prompt_text`,
      [
        authAddress,
        body.enabled,
        body.default_preset_percentages,
        body.allow_custom_amount,
        body.prompt_text ?? null,
      ],
    );
    return NextResponse.json({ settings: result.rows[0] });
  } catch (error) {
    logger.error('[Tip Settings PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to save tip settings' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const PUT = withAuth(putHandler);
