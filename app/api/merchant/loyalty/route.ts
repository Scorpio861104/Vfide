import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { serializeCustomerLoyaltyRow, serializeLoyaltyProgramRow } from '@/lib/merchantLoyalty';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const updateProgramSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['stamp', 'points']).default('stamp'),
  stampsRequired: z.coerce.number().int().positive().max(10_000).optional(),
  pointsPerUnit: z.coerce.number().positive().max(10_000).optional(),
  rewardDescription: z.string().trim().min(1).max(500),
  rewardType: z.enum(['free_item', 'percentage_discount', 'fixed_discount']),
  rewardValue: z.coerce.number().min(0).max(1_000_000),
  active: z.boolean().optional().default(true),
});

function getAuthAddress(user: JWTPayload): string | NextResponse {
  const address = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return address;
}

const getHandler = async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const publicMerchant = (searchParams.get('merchant') || '').trim().toLowerCase();
  const publicCustomer = (searchParams.get('customer') || '').trim().toLowerCase();

  try {
    if (publicMerchant) {
      if (!ADDRESS_LIKE_REGEX.test(publicMerchant)) {
        return NextResponse.json({ error: 'Invalid merchant address' }, { status: 400 });
      }

      const programResult = await query(
        `SELECT merchant_address, name, type, stamps_required, points_per_unit,
                reward_description, reward_type, reward_value, active
           FROM merchant_loyalty_programs
          WHERE merchant_address = $1
          LIMIT 1`,
        [publicMerchant],
      );

      const program = programResult.rows[0]
        ? serializeLoyaltyProgramRow(programResult.rows[0] as Record<string, unknown>)
        : null;

      let progress = null;
      if (publicCustomer && ADDRESS_LIKE_REGEX.test(publicCustomer)) {
        const progressResult = await query(
          `SELECT merchant_address, customer_address, stamps, rewards_earned, rewards_redeemed, updated_at
             FROM customer_loyalty
            WHERE merchant_address = $1
              AND customer_address = $2
            LIMIT 1`,
          [publicMerchant, publicCustomer],
        );
        progress = progressResult.rows[0]
          ? serializeCustomerLoyaltyRow(progressResult.rows[0] as Record<string, unknown>)
          : null;
      }

      return NextResponse.json({ success: true, program, progress });
    }

    const authAddress = getAuthAddress(user);
    if (authAddress instanceof NextResponse) return authAddress;

    const [programResult, membersResult] = await Promise.all([
      query(
        `SELECT merchant_address, name, type, stamps_required, points_per_unit,
                reward_description, reward_type, reward_value, active
           FROM merchant_loyalty_programs
          WHERE merchant_address = $1
          LIMIT 1`,
        [authAddress],
      ),
      query(
        `SELECT merchant_address, customer_address, stamps, rewards_earned, rewards_redeemed, updated_at
           FROM customer_loyalty
          WHERE merchant_address = $1
          ORDER BY stamps DESC, updated_at DESC
          LIMIT 25`,
        [authAddress],
      ),
    ]);

    return NextResponse.json({
      success: true,
      program: programResult.rows[0] ? serializeLoyaltyProgramRow(programResult.rows[0] as Record<string, unknown>) : null,
      members: membersResult.rows.map((row) => serializeCustomerLoyaltyRow(row as Record<string, unknown>)),
    });
  } catch (error) {
    logger.error('[Merchant Loyalty GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch loyalty program' }, { status: 500 });
  }
}

const patchHandler = async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = updateProgramSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid loyalty program payload' }, { status: 400 });
    }

    const body = parsedBody.data;
    const result = await query(
      `INSERT INTO merchant_loyalty_programs (
         merchant_address,
         name,
         type,
         stamps_required,
         points_per_unit,
         reward_description,
         reward_type,
         reward_value,
         active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (merchant_address)
       DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         stamps_required = EXCLUDED.stamps_required,
         points_per_unit = EXCLUDED.points_per_unit,
         reward_description = EXCLUDED.reward_description,
         reward_type = EXCLUDED.reward_type,
         reward_value = EXCLUDED.reward_value,
         active = EXCLUDED.active,
         updated_at = NOW()
       RETURNING merchant_address, name, type, stamps_required, points_per_unit,
                 reward_description, reward_type, reward_value, active`,
      [
        authAddress,
        body.name,
        body.type,
        body.stampsRequired ?? 10,
        body.pointsPerUnit ?? 1,
        body.rewardDescription,
        body.rewardType,
        body.rewardValue,
        body.active ?? true,
      ],
    );

    return NextResponse.json({
      success: true,
      program: serializeLoyaltyProgramRow(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Loyalty PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to save loyalty program' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const publicMerchant = (searchParams.get('merchant') || '').trim().toLowerCase();

  if (publicMerchant) {
    return getHandler(request, { address: '' } as JWTPayload);
  }

  return withAuth(getHandler)(request);
}

export const PATCH = withAuth(patchHandler);
