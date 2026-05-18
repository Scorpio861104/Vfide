import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { z } from 'zod4';
import { withRateLimit } from '@/lib/auth/rateLimit';
import type { JWTPayload } from '@/lib/auth/jwt';

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getStepUpAndCooldownPolicy } from '@/lib/security/accountProtection';
import {
  buildPaymentStepUpPayloadHash,
  createPaymentStepUpChallenge,
} from '@/lib/security/paymentStepUpChallenge';

const USER_ID_REGEX = /^\d+$/;
const DECIMAL_AMOUNT_REGEX = /^\d+(\.\d{1,18})?$/;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const ALLOWED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'];

const stepUpRequestSchema = z.object({
  fromUserId: z.union([z.number().int().positive(), z.string().regex(USER_ID_REGEX)]).optional(),
  toUserId: z.union([z.number().int().positive(), z.string().regex(USER_ID_REGEX)]).optional(),
  toAddress: z.string().trim().regex(ADDRESS_LIKE_REGEX).optional(),
  amount: z.union([
    z.number().positive(),
    z.string().trim().regex(DECIMAL_AMOUNT_REGEX),
  ]),
  token: z.string().trim().optional(),
});

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    const rateLimitResponse = await withRateLimit(request, 'write');
    if (rateLimitResponse) return rateLimitResponse;
    const authAddress = typeof user?.address === 'string'
      ? user.address.trim().toLowerCase()
      : '';
    if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = stepUpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid step-up payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const amountValue = typeof parsed.data.amount === 'number'
      ? parsed.data.amount.toString()
      : parsed.data.amount;
    const normalizedAmountValue = amountValue.trim();
    const numAmount = parseFloat(normalizedAmountValue);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const policy = getStepUpAndCooldownPolicy(numAmount);
    if (!policy.isHighRisk || !policy.requiresStepUp) {
      return NextResponse.json({
        required: false,
        reason: 'Step-up is not required for this amount.',
      });
    }

    const userResult = await query('SELECT id FROM users WHERE wallet_address = $1', [authAddress]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }
    const resolvedFromUserId = Number(userResult.rows[0]?.id);

    let toUserIdValue: number | null = null;
    if (parsed.data.toUserId !== undefined && parsed.data.toUserId !== null) {
      toUserIdValue = Number(parsed.data.toUserId);
    } else if (parsed.data.toAddress) {
      const toUserResult = await query('SELECT id FROM users WHERE wallet_address = $1', [parsed.data.toAddress.toLowerCase()]);
      if (toUserResult.rows.length === 0) {
        return NextResponse.json({ error: 'Recipient user not found' }, { status: 404 });
      }
      toUserIdValue = Number(toUserResult.rows[0]?.id);
    }

    if (!toUserIdValue || toUserIdValue <= 0) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
    }

    const tokenValue = typeof parsed.data.token === 'string' && parsed.data.token.trim()
      ? parsed.data.token.trim().toUpperCase()
      : 'ETH';
    if (!ALLOWED_TOKENS.includes(tokenValue)) {
      return NextResponse.json({ error: `Invalid token. Allowed tokens: ${ALLOWED_TOKENS.join(', ')}` }, { status: 400 });
    }

    const payloadHash = buildPaymentStepUpPayloadHash({
      fromUserId: resolvedFromUserId,
      toUserId: toUserIdValue,
      amount: normalizedAmountValue,
      token: tokenValue,
    });

    const challenge = await createPaymentStepUpChallenge({
      address: authAddress,
      payloadHash,
    });

    return NextResponse.json({
      required: true,
      nonce: challenge.nonce,
      message: challenge.message,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
      cooldownSeconds: policy.requiresDelay ? policy.cooldownSeconds : 0,
    });
  } catch (error) {
    logger.error('[Payment Step-up POST] Error issuing challenge', error);
    return NextResponse.json({ error: 'Failed to issue step-up challenge' }, { status: 500 });
  }
});
