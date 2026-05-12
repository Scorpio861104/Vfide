import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { parseUnits } from 'viem';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const withdrawalRequestSchema = z.object({
  // Decimal amount in the token's natural unit (e.g. "5" for 5 VFIDE,
  // "5.50" for 5.50 USDC). API converts to wei before the balance check.
  amount: z.union([
    z.string().trim().regex(/^[0-9]+(\.[0-9]+)?$/, 'amount must be a positive decimal string'),
    z.coerce.number().positive().max(1_000_000_000),
  ]),
  token: z.enum(['VFIDE', 'USDC', 'USDT', 'DAI']),
  provider: z.enum(['yellowcard', 'kotanipay', 'fonbnk', 'transak', 'moonpay']),
  mobileNumber: z.string().trim().min(6).max(32),
  network: z.enum(['mpesa', 'mtn_momo', 'gcash', 'bank', 'wallet', 'airtime']),
});

type ProviderId = z.infer<typeof withdrawalRequestSchema>['provider'];
type TokenSymbol = z.infer<typeof withdrawalRequestSchema>['token'];

interface TokenConfig {
  address: string;
  decimals: number;
}

/**
 * Resolve a token symbol to its on-chain address + decimals.
 *
 * `merchant_payment_confirmations.token` stores the token *address*
 * (lowercased), set by /api/merchant/payments/confirm. For the withdraw
 * balance query to match, we have to look up the address here from the
 * symbol the user picked.
 *
 * VFIDE is configured globally via NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS. The
 * stablecoins (USDC/USDT/DAI) need per-token env vars to be set — the
 * StablecoinRegistry is the canonical on-chain allow-list but doesn't
 * expose a symbol→address lookup, so a small env-driven mapping is the
 * cleanest server-side path until that's added.
 *
 * Returns null if the token isn't configured for this environment. The
 * caller surfaces that as a clear 422 rather than silently summing the
 * wrong rows.
 */
function resolveTokenConfig(symbol: TokenSymbol): TokenConfig | null {
  const envMap: Record<TokenSymbol, { addressEnv: string; decimals: number }> = {
    VFIDE: { addressEnv: 'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS', decimals: 18 },
    USDC: { addressEnv: 'NEXT_PUBLIC_USDC_ADDRESS', decimals: 6 },
    USDT: { addressEnv: 'NEXT_PUBLIC_USDT_ADDRESS', decimals: 6 },
    DAI: { addressEnv: 'NEXT_PUBLIC_DAI_ADDRESS', decimals: 18 },
  };

  const entry = envMap[symbol];
  if (!entry) return null;
  const raw = process.env[entry.addressEnv];
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!ADDRESS_LIKE_REGEX.test(trimmed)) return null;
  return { address: trimmed.toLowerCase(), decimals: entry.decimals };
}

function maskMobileNumber(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '***';
  return `***${trimmed.slice(-4)}`;
}

function buildProviderRedirectUrl(
  provider: ProviderId,
  walletAddress: string,
  token: string,
  amount: string,
  network: string,
): string {
  const params = new URLSearchParams({
    walletAddress,
    defaultCryptoCurrency: token,
    amount,
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

    // Per-token balance summary: sum(confirmations) − sum(in-flight or
    // completed withdrawals), grouped by token. All values are in wei
    // strings (no parseFloat — wei can exceed JS Number precision).
    // The UI is expected to format these against the token's decimals.
    const balanceSummary = await query<{
      token: string;
      confirmed_wei: string;
      reserved_wei: string;
    }>(
      `SELECT
         t.token,
         COALESCE(c.confirmed_wei, '0') AS confirmed_wei,
         COALESCE(w.reserved_wei, '0') AS reserved_wei
       FROM (
         SELECT DISTINCT token FROM merchant_payment_confirmations WHERE merchant_address = $1 AND token IS NOT NULL
         UNION
         SELECT DISTINCT token FROM merchant_withdrawals WHERE merchant_address = $1
       ) t
       LEFT JOIN (
         SELECT token, SUM(amount::numeric)::text AS confirmed_wei
           FROM merchant_payment_confirmations
          WHERE merchant_address = $1 AND token IS NOT NULL
          GROUP BY token
       ) c ON c.token = t.token
       LEFT JOIN (
         SELECT token, SUM(amount::numeric)::text AS reserved_wei
           FROM merchant_withdrawals
          WHERE merchant_address = $1
            AND status IN ('requested', 'pending', 'processing', 'completed')
          GROUP BY token
       ) w ON w.token = t.token`,
      [merchant]
    );

    return NextResponse.json({
      success: true,
      withdrawals: result.rows,
      // Per-token balance rows. The `token` column here is whatever was
      // stored at confirmation/withdrawal time (token address for
      // confirmations; symbol-or-address for legacy withdrawal rows
      // depending on how the row got written). UI: prefer to look up
      // the merchant's known token configurations and match them.
      balances: balanceSummary.rows.map(row => ({
        token: row.token,
        confirmed_wei: row.confirmed_wei,
        reserved_wei: row.reserved_wei,
      })),
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

    // Normalize the amount to a string in the token's natural unit
    // (e.g. "5" or "5.50"). The user can pass either a number or a
    // decimal string; we coerce both to a string for downstream use so
    // the SQL math stays exact (avoid float drift on very small/large
    // values).
    const amountText = typeof amount === 'number' ? amount.toString() : amount;
    const amountNumeric = Number(amountText);
    if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    // Resolve the token symbol to an address + decimals so we can match
    // against `merchant_payment_confirmations` (which keys by address).
    const tokenConfig = resolveTokenConfig(token);
    if (!tokenConfig) {
      return NextResponse.json(
        {
          error: `${token} is not configured for withdrawals in this environment. Set the corresponding token address env var (e.g. NEXT_PUBLIC_${token}_ADDRESS) and try again.`,
        },
        { status: 422 }
      );
    }

    const merchantResult = await query(
      'SELECT id, merchant_address FROM merchant_profiles WHERE merchant_address = $1 LIMIT 1',
      [authAddress]
    );

    if (merchantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Merchant profile required before requesting withdrawal' }, { status: 403 });
    }

    // Verify the merchant has sufficient confirmed balance.
    //
    // Confirmations are stored in wei (TEXT column); withdrawals are
    // stored in human-decimal units (NUMERIC(36,18) column). Convert
    // confirmations to human units by dividing by 10^decimals, then
    // subtract reserved (in-flight + completed) withdrawals which are
    // already in human units. Compare to the user's requested amount.
    //
    // The token-address filter on confirmations ensures we only count
    // the token the user is withdrawing.
    const balanceResult = await query<{ net_balance: string }>(
      `SELECT (
         COALESCE((
           SELECT SUM(amount::numeric) / POWER(10::numeric, $3::int)
             FROM merchant_payment_confirmations
            WHERE merchant_address = $1
              AND LOWER(token) = $2
         ), 0)
         -
         COALESCE((
           SELECT SUM(amount::numeric)
             FROM merchant_withdrawals
            WHERE merchant_address = $1
              AND token = $4
              AND status IN ('requested', 'pending', 'processing', 'completed')
         ), 0)
       )::text AS net_balance`,
      [authAddress, tokenConfig.address, tokenConfig.decimals, token]
    );

    const netBalance = Number(balanceResult.rows[0]?.net_balance ?? '0');
    if (!Number.isFinite(netBalance) || amountNumeric > netBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient confirmed balance for the requested withdrawal amount',
          available: balanceResult.rows[0]?.net_balance ?? '0',
        },
        { status: 422 }
      );
    }

    // Defensive sanity-check the wei conversion (we'll log if it overflows
    // bigint, which it shouldn't for any reasonable amount).
    try {
      parseUnits(amountText, tokenConfig.decimals);
    } catch (err) {
      logger.warn('[Merchant Withdraw POST] amount overflowed parseUnits', err);
      return NextResponse.json({ error: 'Invalid amount precision for this token' }, { status: 400 });
    }

    const providerTxId = `wd_${Date.now().toString(36)}`;
    const redirectUrl = buildProviderRedirectUrl(provider, authAddress, token, amountText, network);

    const insertResult = await query(
      `INSERT INTO merchant_withdrawals
         (merchant_address, amount, token, provider, mobile_number_hint, network, status, provider_tx_id, metadata)
       VALUES ($1, $2::numeric, $3, $4, $5, $6, 'requested', $7, $8::jsonb)
       RETURNING id, merchant_address, amount::text AS amount, token, provider,
                 mobile_number_hint, network, status, provider_tx_id, created_at, completed_at`,
      [
        authAddress,
        amountText,
        token,
        provider,
        maskMobileNumber(mobileNumber),
        network,
        providerTxId,
        JSON.stringify({ redirectUrl, token_address: tokenConfig.address, decimals: tokenConfig.decimals }),
      ]
    );

    return NextResponse.json({
      success: true,
      request: insertResult.rows[0],
      redirectUrl,
      instructions: 'Withdrawal request created. Continue with the provider to initiate settlement into your selected mobile-money or bank rail.',
    });
  } catch (error) {
    logger.error('[Merchant Withdraw POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
