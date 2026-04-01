import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import {
  getAccountLock,
  getStepUpAndCooldownPolicy,
  recordSecurityEvent,
} from '@/lib/security/accountProtection';
import { getRequestIp } from '@/lib/security/requestContext';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const USER_ID_REGEX = /^\d+$/;
const DECIMAL_AMOUNT_REGEX = /^\d+(\.\d{1,18})?$/;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const createPaymentRequestSchema = z.object({
  fromUserId: z.union([z.number().int().positive(), z.string().regex(USER_ID_REGEX)]).optional(),
  toUserId: z.union([z.number().int().positive(), z.string().regex(USER_ID_REGEX)]).optional(),
  toAddress: z.string().trim().regex(ADDRESS_LIKE_REGEX).optional(),
  amount: z.union([
    z.number().positive(),
    z.string().trim().regex(DECIMAL_AMOUNT_REGEX),
  ]),
  token: z.string().trim().optional(),
  memo: z.string().max(500).nullable().optional(),
});

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const userAddressParam = searchParams.get('userAddress');

    // Resolve the authenticated user's DB id
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }
    const userId = userResult.rows[0]?.id;

    // Accept either userId or userAddress — verify caller owns the requested data
    if (userIdParam) {
      const requestedUserId = parsePositiveInteger(userIdParam);
      if (!requestedUserId) {
        return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
      }
      if (!userId || userId.toString() !== requestedUserId.toString()) {
        return NextResponse.json(
          { error: 'You can only view your own payment requests' },
          { status: 403 }
        );
      }
    } else if (userAddressParam) {
      // Verify the requested address matches the authenticated user
      if (userAddressParam.trim().toLowerCase() !== authAddress) {
        return NextResponse.json(
          { error: 'You can only view your own payment requests' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: 'userId or userAddress required' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM payment_requests
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    logger.error('[Payment Requests GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ip: requesterIp } = getRequestIp(request.headers);
  const lock = await getAccountLock(authAddress);
  if (lock) {
    return NextResponse.json(
      { error: `Account temporarily locked due to security signals: ${lock.reason}` },
      { status: 423 }
    );
  }

  let body: z.infer<typeof createPaymentRequestSchema>;
  try {
    const rawBody = await request.json();
    const parsed = createPaymentRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Payment Requests POST] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const { fromUserId, toUserId, toAddress, amount, token, memo } = body;

    // Resolve sender: use authenticated wallet address to look up fromUserId
    const senderResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );
    if (senderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sender account not found' }, { status: 403 });
    }
    const resolvedFromUserId = (senderResult.rows[0] as { id: number }).id.toString();

    // Resolve recipient: accept toUserId (numeric) or toAddress (wallet address)
    let resolvedToUserId: string | null = null;
    if (toUserId) {
      const toUserIdValue =
        typeof toUserId === 'number' || typeof toUserId === 'string' ? toUserId.toString() : null;
      if (!toUserIdValue || !USER_ID_REGEX.test(toUserIdValue)) {
        return NextResponse.json({ error: 'toUserId must be a positive integer' }, { status: 400 });
      }
      resolvedToUserId = toUserIdValue;
    } else if (toAddress && typeof toAddress === 'string' && ADDRESS_LIKE_REGEX.test(toAddress.trim())) {
      const recipientResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [toAddress.trim().toLowerCase()]
      );
      if (recipientResult.rows.length === 0) {
        return NextResponse.json({ error: 'Recipient address not found' }, { status: 404 });
      }
      resolvedToUserId = (recipientResult.rows[0] as { id: number }).id.toString();
    } else {
      return NextResponse.json({ error: 'toUserId or toAddress required' }, { status: 400 });
    }

    // Validate fromUserId if explicitly provided — must match authenticated user
    if (fromUserId) {
      const fromUserIdValue =
        typeof fromUserId === 'number' || typeof fromUserId === 'string' ? fromUserId.toString() : null;
      if (fromUserIdValue && fromUserIdValue !== resolvedFromUserId) {
        return NextResponse.json(
          { error: 'You can only create payment requests from your own account' },
          { status: 403 }
        );
      }
    }
    const fromUserIdValue = resolvedFromUserId;
    const toUserIdValue = resolvedToUserId;

    if (!amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (fromUserIdValue === toUserIdValue) {
      return NextResponse.json({ error: 'Cannot create a payment request to yourself' }, { status: 400 });
    }

    const amountValue =
      typeof amount === 'number' ? amount.toString() : typeof amount === 'string' ? amount : null;
    if (!amountValue) {
      return NextResponse.json({ error: 'Amount must be a string or number' }, { status: 400 });
    }

    const normalizedAmountValue = amountValue.trim();
    if (!DECIMAL_AMOUNT_REGEX.test(normalizedAmountValue)) {
      return NextResponse.json({ error: 'Amount must be a positive decimal with up to 18 decimals' }, { status: 400 });
    }

    // Validate amount is positive and within reasonable bounds
    const numAmount = parseFloat(normalizedAmountValue);
    const MAX_PAYMENT_AMOUNT = 1000000; // 1 million units max
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }
    
    if (numAmount > MAX_PAYMENT_AMOUNT) {
      return NextResponse.json(
        { error: `Amount exceeds maximum limit of ${MAX_PAYMENT_AMOUNT}` },
        { status: 400 }
      );
    }

    const policy = getStepUpAndCooldownPolicy(numAmount);
    if (policy.isHighRisk) {
      const stepUpHeader = request.headers.get('x-vfide-step-up') || '';
      const delayHeader = request.headers.get('x-vfide-delay-ack') || '';

      if (policy.requiresStepUp && stepUpHeader.toLowerCase() !== 'verified') {
        await recordSecurityEvent(authAddress, {
          ts: Date.now(),
          ip: requesterIp,
          type: 'payment_high_risk',
          amount: numAmount,
        });

        return NextResponse.json(
          {
            error: 'Step-up authentication required for high-risk payment request',
            requiresStepUp: true,
            hardwareWalletRecommended: policy.hardwareWalletRecommended,
          },
          { status: 403 }
        );
      }

      if (policy.requiresDelay && delayHeader.toLowerCase() !== 'acknowledged') {
        return NextResponse.json(
          {
            error: 'High-risk payment request requires delay acknowledgement',
            requiresDelay: true,
            cooldownSeconds: policy.cooldownSeconds,
          },
          { status: 409 }
        );
      }

      const lockResult = await recordSecurityEvent(authAddress, {
        ts: Date.now(),
        ip: requesterIp,
        type: 'payment_high_risk',
        amount: numAmount,
      });
      if (lockResult.locked) {
        return NextResponse.json(
          { error: `Account locked after suspicious high-risk activity: ${lockResult.reason}` },
          { status: 423 }
        );
      }
    }

    // Validate token if provided
    const ALLOWED_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH'];
    const tokenValue = typeof token === 'string' && token.trim() ? token.trim().toUpperCase() : 'ETH';
    
    if (!ALLOWED_TOKENS.includes(tokenValue)) {
      return NextResponse.json(
        { error: `Invalid token. Allowed tokens: ${ALLOWED_TOKENS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate memo length if provided
    if (memo !== undefined && memo !== null && typeof memo !== 'string') {
      return NextResponse.json(
        { error: 'Memo must be a string' },
        { status: 400 }
      );
    }

    if (typeof memo === 'string' && memo.length > 500) {
      return NextResponse.json(
        { error: 'Memo must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Sender already verified via authenticated address — no redundant lookup needed

    const memoValue = typeof memo === 'string' ? memo : null;

    const result = await query(
      `INSERT INTO payment_requests (from_user_id, to_user_id, amount, token, memo, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [fromUserIdValue, toUserIdValue, normalizedAmountValue, tokenValue, memoValue]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    logger.error('[Payment Requests POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
