import type { JWTPayload } from '@/lib/auth/jwt';
/**
 * Merchant Payment Confirmation API
 * 
 * POST — Record a confirmed on-chain payment and dispatch webhooks
 * Called by the POS/frontend after detecting a PaymentProcessed event.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createPublicClient, decodeEventLog, getAddress, http, parseAbiItem, parseUnits } from 'viem';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { CONTRACT_ADDRESSES, StablecoinRegistryABI, isConfiguredContractAddress } from '@/lib/contracts';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { dispatchWebhook } from '@/lib/webhooks/merchantWebhookDispatcher';
import { z } from 'zod4';

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const INTEGER_STRING_REGEX = /^\d+$/;
const DEFAULT_MIN_CONFIRMATIONS = 2n;
const merchantPaymentConfirmSchema = z.object({
  customer_address: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX),
  // Decimal amount in the token's natural unit, e.g. "5" for 5 VFIDE or
  // "5.50" for 5.50 USDC. The API converts to wei using the token's
  // on-chain decimals() before matching against the chain event.
  amount: z.union([
    z.string().trim().regex(/^[0-9]+(\.[0-9]+)?$/, 'amount must be a positive decimal string'),
    z.number().positive(),
  ]),
  // Token contract address (NOT a symbol). Required so we can read the
  // token's decimals and convert the user-supplied amount to wei.
  token: z.string().trim().regex(ADDRESS_LIKE_REGEX, 'token must be a 0x address'),
  order_id: z.string().trim().optional(),
  tx_hash: z.string().regex(TX_HASH_REGEX),
});

const PAYMENT_PROCESSED_EVENT = parseAbiItem(
  'event PaymentProcessed(address indexed customer, address indexed merchant, address token, uint256 amount, uint256 fee, string orderId, uint16 customerScore, uint8 channel)'
);
// PaymentWithChannel event removed 2026-05-19 v19.13 cleanup: the contract
// no longer declares it (only PaymentProcessed is emitted). The dead
// fallback branch in the decoder below was also removed.

async function claimPaymentConfirmationIdempotency(params: {
  merchant: string;
  txHash: string;
  customer: string;
  amount: bigint;
  token: string;
  orderId?: string;
}): Promise<boolean> {
  const result = await query<{ id: string }>(
    `INSERT INTO merchant_payment_confirmations (
       merchant_address,
       tx_hash,
       customer_address,
       amount,
       token,
       order_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (merchant_address, tx_hash) DO NOTHING
     RETURNING id::text`,
    [
      params.merchant.toLowerCase(),
      params.txHash.toLowerCase(),
      params.customer.toLowerCase(),
      params.amount.toString(),
      params.token.toLowerCase(),
      params.orderId ?? null,
    ]
  );

  return result.rows.length > 0;
}

/**
 * Parse a user-supplied decimal amount (e.g. "5", "5.50") into wei using the
 * supplied token decimals.
 *
 * Historical note: this function previously parsed `"5"` as the literal
 * bigint `5n` and required callers to pre-convert to wei. None of the
 * frontend callers actually did that — they sent decimal strings like
 * `"5"` for "5 VFIDE", and the on-chain event amount is always wei. The
 * mismatch meant the verification step on line below (`args.amount !==
 * params.amount`) never matched, and zero confirmations were written.
 *
 * The fix is to make the API treat the wire format as a decimal value in
 * the token's natural unit (5 VFIDE, 5.50 USDC, etc.) and convert to wei
 * here using `parseUnits` against the *actual* token decimals — which we
 * have to learn at runtime since stablecoins differ (USDC=6, DAI=18).
 *
 * Returns null for invalid input (negative, NaN, more decimal places than
 * the token allows, etc.).
 */
function parseAmountToUnits(value: unknown, decimals: number): bigint | null {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
    return null;
  }

  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    text = value.toString();
  } else if (typeof value === 'string') {
    text = value.trim();
    if (text === '') return null;
  } else {
    return null;
  }

  // Allow only digits and at most one decimal point. Reject scientific
  // notation, signs, anything weird.
  if (!/^[0-9]+(\.[0-9]+)?$/.test(text)) return null;

  try {
    const units = parseUnits(text as `${number}`, decimals);
    if (units <= 0n) return null;
    return units;
  } catch {
    return null;
  }
}

/**
 * Read decimals() from a token contract. Caches per-process.
 */
const TOKEN_DECIMALS_CACHE = new Map<string, number>();

async function readTokenDecimals(
  client: ReturnType<typeof createPublicClient>,
  tokenAddress: string,
): Promise<number | null> {
  const key = tokenAddress.toLowerCase();
  const cached = TOKEN_DECIMALS_CACHE.get(key);
  if (typeof cached === 'number') return cached;

  try {
    const decimals = await client.readContract({
      address: getAddress(tokenAddress),
      abi: [parseAbiItem('function decimals() view returns (uint8)')],
      functionName: 'decimals',
    });
    const num = Number(decimals);
    if (!Number.isInteger(num) || num < 0 || num > 30) return null;
    TOKEN_DECIMALS_CACHE.set(key, num);
    return num;
  } catch (error) {
    logger.warn('[Merchant Payment Confirm] Failed to read token decimals', error);
    return null;
  }
}

function getMerchantPortalAddress(): string | null {
  if (isConfiguredContractAddress(CONTRACT_ADDRESSES.MerchantPortal)) {
    return CONTRACT_ADDRESSES.MerchantPortal;
  }

  const value = process.env.MERCHANT_PORTAL_ADDRESS;
  if (!value) return null;
  const normalized = value.trim();
  return ADDRESS_LIKE_REGEX.test(normalized) ? normalized : null;
}

function getRpcUrl(): string | null {
  const value = process.env.RPC_URL;
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getMinConfirmations(): bigint {
  const configured = process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS;
  if (!configured || !INTEGER_STRING_REGEX.test(configured)) {
    return DEFAULT_MIN_CONFIRMATIONS;
  }

  const parsed = BigInt(configured);
  if (parsed < 1n) return DEFAULT_MIN_CONFIRMATIONS;
  return parsed;
}

async function isAcceptedSettlementToken(params: {
  client: ReturnType<typeof createPublicClient>;
  token: string;
}): Promise<boolean> {
  const normalizedToken = getAddress(params.token);

  if (
    isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken) &&
    getAddress(CONTRACT_ADDRESSES.VFIDEToken) === normalizedToken
  ) {
    return true;
  }

  if (!isConfiguredContractAddress(CONTRACT_ADDRESSES.StablecoinRegistry)) {
    return false;
  }

  try {
    const allowed = await params.client.readContract({
      address: CONTRACT_ADDRESSES.StablecoinRegistry,
      abi: StablecoinRegistryABI,
      functionName: 'isAllowed',
      args: [normalizedToken],
    });
    return Boolean(allowed);
  } catch (error) {
    logger.warn('[Merchant Payment Confirm] StablecoinRegistry lookup failed', error);
    return false;
  }
}

async function verifyPaymentEventOnChain(params: {
  txHash: `0x${string}`;
  merchant: string;
  customer: string;
  amount: bigint;
  token: string;
  orderId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rpcUrl = getRpcUrl();
  const merchantPortalAddress = getMerchantPortalAddress();

  if (!rpcUrl || !merchantPortalAddress) {
    return { ok: false, error: 'Payment confirmation is unavailable due to missing chain configuration' };
  }

  const expectedMerchant = getAddress(params.merchant);
  const expectedCustomer = getAddress(params.customer);
  const expectedPortal = getAddress(merchantPortalAddress);
  const expectedToken = getAddress(params.token);

  const client = createPublicClient({ transport: http(rpcUrl) });

  const receipt = await client.getTransactionReceipt({ hash: params.txHash });
  if (receipt.status !== 'success') {
    return { ok: false, error: 'Transaction did not succeed on-chain' };
  }

  if (!receipt.to || getAddress(receipt.to) !== expectedPortal) {
    return { ok: false, error: 'Transaction target does not match MerchantPortal contract' };
  }

  const currentBlock = await client.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber + 1n;
  if (confirmations < getMinConfirmations()) {
    return { ok: false, error: 'Transaction does not have enough confirmations yet' };
  }

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== expectedPortal) continue;

    try {
      const decoded = decodeEventLog({
        abi: [PAYMENT_PROCESSED_EVENT],
        data: log.data,
        topics: log.topics,
      });

      if (!decoded || decoded.eventName !== 'PaymentProcessed') {
        continue;
      }

      const args = decoded.args as {
        customer: string;
        merchant: string;
        token: string;
        amount: bigint;
        orderId: string;
      };

      const eventToken = getAddress(args.token);
      const acceptedToken = await isAcceptedSettlementToken({ client, token: eventToken });
      if (!acceptedToken) {
        return { ok: false, error: 'Token not in accepted settlement list' };
      }

      if (getAddress(args.customer) !== expectedCustomer) continue;
      if (getAddress(args.merchant) !== expectedMerchant) continue;
      if (args.amount !== params.amount) continue;
      if (typeof params.orderId === 'string' && params.orderId.length > 0 && args.orderId !== params.orderId) continue;
      if (eventToken !== expectedToken) continue;

      return { ok: true };
    } catch (error) {
      // Non-payment logs in the receipt can fail event decoding; continue scanning remaining logs.
      logger.debug('[Merchant Payment Confirm] Failed to decode receipt log', error);
      continue;
    }
  }

  return { ok: false, error: 'Transaction receipt does not contain a matching payment event' };
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  const authAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !ADDRESS_LIKE_REGEX.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof merchantPaymentConfirmSchema>;
  try {
    const rawBody = await request.json();
    const parsed = merchantPaymentConfirmSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Merchant Payment Confirm] Invalid JSON payload', error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { customer_address, amount, token, order_id, tx_hash } = body;

  // Resolve token decimals on-chain so we can convert the user-supplied
  // decimal amount (e.g. "5.50") into wei. Without this step the verify
  // function below compares mismatched units and never confirms anything.
  const rpcUrl = getRpcUrl();
  if (!rpcUrl) {
    return NextResponse.json(
      { error: 'Payment confirmation is unavailable due to missing chain configuration' },
      { status: 503 },
    );
  }
  const sharedClient = createPublicClient({ transport: http(rpcUrl) });
  const tokenDecimals = await readTokenDecimals(sharedClient, token);
  if (tokenDecimals === null) {
    return NextResponse.json(
      { error: 'Could not read token decimals — check the token address and RPC connectivity' },
      { status: 422 },
    );
  }

  const amountUnits = parseAmountToUnits(amount, tokenDecimals);
  if (amountUnits === null) {
    return NextResponse.json({ error: 'amount must be a positive decimal value' }, { status: 400 });
  }

  const verification = await verifyPaymentEventOnChain({
    txHash: tx_hash as `0x${string}`,
    merchant: authAddress,
    customer: customer_address,
    amount: amountUnits,
    token,
    orderId: typeof order_id === 'string' ? order_id : undefined,
  });

  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 422 });
  }

  const idempotencyClaimed = await claimPaymentConfirmationIdempotency({
    merchant: authAddress,
    txHash: tx_hash,
    customer: customer_address,
    amount: amountUnits,
    token,
    orderId: typeof order_id === 'string' ? order_id : undefined,
  });

  if (!idempotencyClaimed) {
    return NextResponse.json({ success: true, idempotent: true, duplicate: true });
  }

  // Dispatch webhook to merchant (the authenticated user is the merchant)
  await dispatchWebhook(authAddress, 'payment.completed', {
    customer_address: customer_address.toLowerCase(),
    amount: amountUnits.toString(),
    token,
    order_id: order_id || undefined,
    tx_hash,
    confirmed_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
});
