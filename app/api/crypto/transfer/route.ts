import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';

import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DECIMAL_AMOUNT_REGEX = /^\d+(\.\d{1,18})?$/;

const transferRequestSchema = z.object({
  to: z.string().trim().regex(ADDRESS_LIKE_REGEX),
  amount: z.union([
    z.number().positive(),
    z.string().trim().regex(DECIMAL_AMOUNT_REGEX),
  ]),
  currency: z.enum(['VFIDE', 'ETH']).optional(),
});

/**
 * #91 compatibility endpoint.
 *
 * Server-side transfer execution is intentionally not supported because VFIDE
 * is non-custodial: the user must sign transfers in their wallet.
 *
 * This route exists to avoid 404 module-missing failures and to return a
 * deterministic response clients can handle.
 */
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof transferRequestSchema>;
  try {
    const parsed = transferRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid transfer request' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const amountString = typeof body.amount === 'number' ? body.amount.toString() : body.amount;
  const currency = body.currency ?? 'VFIDE';

  return NextResponse.json(
    {
      success: false,
      error: 'Server-side transfer execution is not supported. Sign the transfer in wallet and then confirm settlement via verified endpoints.',
      requiresClientWalletSignature: true,
      to: body.to,
      amount: amountString,
      currency,
    },
    { status: 501 }
  );
});
