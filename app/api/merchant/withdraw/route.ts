import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const withdrawalRequestSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000_000),
  token: z.enum(['VFIDE', 'USDC', 'USDT', 'DAI']),
  provider: z.enum(['yellowcard', 'kotanipay', 'fonbnk', 'transak', 'moonpay']),
  mobileNumber: z.string().trim().min(6).max(32),
  network: z.enum(['mpesa', 'mtn_momo', 'gcash', 'bank', 'wallet', 'airtime']),
});

type ProviderId = z.infer<typeof withdrawalRequestSchema>['provider'];

function maskMobileNumber(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '***';
  return `***${trimmed.slice(-4)}`;
}

function buildProviderRedirectUrl(
  provider: ProviderId,
  walletAddress: string,
  token: string,
  amount: number,
  network: string,
): string {
  const params = new URLSearchParams({
    walletAddress,
    defaultCryptoCurrency: token,
    amount: amount.toString(),
    network,
  });

  switch (provider) {
    case 'transak': {
      params.set('apiKey', process.env.NEXT_PUBLIC_TRANSAK_KEY || '');
      params.set('productsAvailed', 'SELL');
      params.set('cryptoCurrencyCode', token);
      params.set('environment', process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'STAGING');
      return `https://global.transak.com?${params.toString()}`;
    }
    case 'moonpay': {
      params.set('apiKey', process.env.NEXT_PUBLIC_MOONPAY_KEY || '');
      params.set('currencyCode', token.toLowerCase());
      return `https://sell.moonpay.com?${params.toString()}`;
    }
    case 'yellowcard':
      return `https://yellowcard.io/?${params.toString()}`;
    case 'kotanipay':
      return `https://kotanipay.com/?${params.toString()}`;
    case 'fonbnk':
      return `https://www.fonbnk.com/?${params.toString()}`;
    default:
      return 'https://vfide.com/merchant';
  }
}

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
  }

  return address;
}

async function getHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const merchant = (searchParams.get('merchant') || authAddress).trim().toLowerCase();

  if (!ADDRESS_LIKE_REGEX.test(merchant)) {
    return NextResponse.json({ error: 'Invalid merchant address' }, { status: 400 });
  }

  if (merchant !== authAddress) {
    return NextResponse.json({ error: 'You do not have permission to access this resource' }, { status: 403 });
  }

  try {
    const result = await query(
      `SELECT id, merchant_address, amount::text AS amount, token, provider,
              mobile_number_hint, network, status, provider_tx_id, created_at, completed_at
         FROM merchant_withdrawals
        WHERE merchant_address = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [merchant]
    );

    return NextResponse.json({
      success: true,
      withdrawals: result.rows,
    });
  } catch (error) {
    logger.error('[Merchant Withdraw GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsedBody = withdrawalRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid withdrawal request' }, { status: 400 });
    }

    const { amount, token, provider, mobileNumber, network } = parsedBody.data;

    const merchantResult = await query(
      'SELECT id, merchant_address FROM merchant_profiles WHERE merchant_address = $1 LIMIT 1',
      [authAddress]
    );

    if (merchantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Merchant profile required before requesting withdrawal' }, { status: 403 });
    }

    // #138 fix: verify the merchant has sufficient confirmed balance before creating the withdrawal row.
    // Sum confirmed (non-pending, non-failed) credits minus pending/completed withdrawals.
    const balanceResult = await query<{ net_balance: string }>(
      `SELECT (
         COALESCE((
           SELECT SUM(amount::numeric)
             FROM merchant_payment_confirmations
            WHERE merchant_address = $1
              AND ($2 = 'VFIDE' OR token IS NOT NULL)
         ), 0)
         -
         COALESCE((
           SELECT SUM(amount::numeric)
             FROM merchant_withdrawals
            WHERE merchant_address = $1
              AND token = $2
              AND status IN ('pending', 'processing', 'completed')
         ), 0)
       )::text AS net_balance`,
      [authAddress, token]
    );

    const netBalance = parseFloat(balanceResult.rows[0]?.net_balance ?? '0');
    if (!Number.isFinite(netBalance) || amount > netBalance) {
      return NextResponse.json(
        { error: 'Insufficient confirmed balance for the requested withdrawal amount' },
        { status: 422 }
      );
    }

    const providerTxId = `wd_${Date.now().toString(36)}`;
    const redirectUrl = buildProviderRedirectUrl(provider, authAddress, token, amount, network);

    const insertResult = await query(
      `INSERT INTO merchant_withdrawals
         (merchant_address, amount, token, provider, mobile_number_hint, network, status, provider_tx_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8::jsonb)
       RETURNING id, merchant_address, amount::text AS amount, token, provider,
                 mobile_number_hint, network, status, provider_tx_id, created_at, completed_at`,
      [
        authAddress,
        amount.toString(),
        token,
        provider,
        maskMobileNumber(mobileNumber),
        network,
        providerTxId,
        JSON.stringify({ redirectUrl }),
      ]
    );

    return NextResponse.json({
      success: true,
      request: insertResult.rows[0],
      redirectUrl,
      instructions: 'Continue with the provider to complete settlement into your selected mobile-money or bank rail.',
    });
  } catch (error) {
    logger.error('[Merchant Withdraw POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
