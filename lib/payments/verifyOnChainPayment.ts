/**
 * On-chain payment verification for social monetization writes (social tips,
 * content purchases, message tips).
 *
 * Why: these endpoints record OFF-chain metadata about an on-chain payment.
 * Without verifying the referenced transaction, a caller could record a
 * tip/purchase citing an unrelated or fabricated txHash. This module fetches
 * the transaction and confirms it actually moved the claimed value from the
 * caller to the recipient.
 *
 *   - ETH payments are sent directly by the user (eth_sendTransaction), so they
 *     are verified from the transaction itself (from / to / value) and resolve
 *     even while the tx is still pending.
 *   - VFIDE (ERC-20) payments are relayer-routed, so the tx sender is the
 *     relayer; these are verified from the ERC-20 Transfer log in the receipt
 *     (from / to / value), which requires the tx to be mined.
 *
 * Enforcement is decided by the caller (see the route handlers). RPC access is
 * required; callers may treat `status: 'unavailable'` leniently in non-production
 * and fail closed in production.
 */
import {
  createPublicClient,
  http,
  parseEther,
  isAddress,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Hash,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { logger } from '@/lib/logger';

const CHAIN = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? base : baseSepolia;
const RPC_URL =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://sepolia.base.org';

// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export type VerificationStatus = 'verified' | 'pending' | 'failed' | 'unavailable';

export interface PaymentVerificationResult {
  ok: boolean;
  status: VerificationStatus;
  reason: string;
}

export interface VerifyPaymentParams {
  txHash: string;
  expectedFrom: string; // payer (the authenticated caller)
  expectedTo: string; // recipient / seller
  currency: string; // 'ETH' | 'VFIDE'
  amount?: string; // human units, 18 decimals assumed; omitted => skip amount check
}

function addrEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function topicToAddress(topic: string): string {
  return '0x' + topic.slice(-40);
}

// Created once at module load; type is inferred to avoid viem client type-identity
// friction that arises from annotating with ReturnType<typeof createPublicClient>.
const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

function parseExpectedValue(amount?: string): bigint | null {
  if (!amount) return null;
  try {
    return parseEther(amount);
  } catch {
    return null; // unparseable => skip amount check rather than false-reject
  }
}

export async function verifyOnChainPayment(
  params: VerifyPaymentParams,
): Promise<PaymentVerificationResult> {
  const { txHash, expectedFrom, expectedTo, currency } = params;

  if (!HASH_RE.test(txHash)) {
    return { ok: false, status: 'failed', reason: 'invalid_tx_hash' };
  }
  if (!isAddress(expectedFrom) || !isAddress(expectedTo)) {
    return { ok: false, status: 'failed', reason: 'invalid_address' };
  }

  const expectedValue = parseExpectedValue(params.amount);
  const client = publicClient;
  const hash = txHash as Hash;

  // --- ETH: verify directly from the transaction (resolves even while pending) ---
  if (currency === 'ETH') {
    try {
      const tx = await client.getTransaction({ hash }).catch((e: unknown) => {
        if (e instanceof TransactionNotFoundError) return null;
        throw e;
      });
      if (!tx) return { ok: false, status: 'failed', reason: 'tx_not_found' };
      if (!addrEq(tx.from, expectedFrom)) {
        return { ok: false, status: 'failed', reason: 'sender_mismatch' };
      }
      if (!addrEq(tx.to, expectedTo)) {
        return { ok: false, status: 'failed', reason: 'recipient_mismatch' };
      }
      if (expectedValue !== null && tx.value !== expectedValue) {
        return { ok: false, status: 'failed', reason: 'amount_mismatch' };
      }

      const receipt = await client.getTransactionReceipt({ hash }).catch((e: unknown) => {
        if (e instanceof TransactionReceiptNotFoundError) return null;
        throw e;
      });
      if (!receipt) return { ok: true, status: 'pending', reason: 'eth_match_unmined' };
      if (receipt.status !== 'success') {
        return { ok: false, status: 'failed', reason: 'tx_reverted' };
      }
      return { ok: true, status: 'verified', reason: 'eth_verified' };
    } catch (e) {
      logger.error('verifyOnChainPayment ETH RPC error', e);
      return { ok: false, status: 'unavailable', reason: 'rpc_error' };
    }
  }

  // --- ERC-20 (VFIDE): verify via the Transfer log (relayer-sent; needs mining) ---
  try {
    const receipt = await client.getTransactionReceipt({ hash }).catch((e: unknown) => {
      if (e instanceof TransactionReceiptNotFoundError) return null;
      throw e;
    });
    if (!receipt) {
      // Distinguish a not-yet-mined tx from a fabricated/nonexistent one: an absent
      // receipt alone is ambiguous (getTransactionReceipt returns nothing in both
      // cases), so probe the transaction itself. If it does not exist, reject like
      // the ETH path (tx_not_found) instead of accepting it as 'pending'. Only a tx
      // that exists but is not yet mined is genuinely pending / re-verifiable.
      const pendingTx = await client.getTransaction({ hash }).catch((e: unknown) => {
        if (e instanceof TransactionNotFoundError) return null;
        throw e;
      });
      if (!pendingTx) return { ok: false, status: 'failed', reason: 'tx_not_found' };
      return { ok: false, status: 'pending', reason: 'receipt_unmined' };
    }
    if (receipt.status !== 'success') {
      return { ok: false, status: 'failed', reason: 'tx_reverted' };
    }

    const tokenAddr =
      typeof CONTRACT_ADDRESSES.VFIDEToken === 'string'
        ? CONTRACT_ADDRESSES.VFIDEToken
        : undefined;

    const matched = receipt.logs.some((log) => {
      if (log.topics[0] !== TRANSFER_TOPIC) return false;
      if (log.topics.length < 3) return false;
      if (tokenAddr && !addrEq(log.address, tokenAddr)) return false;
      const from = topicToAddress(log.topics[1] as string);
      const to = topicToAddress(log.topics[2] as string);
      if (!addrEq(from, expectedFrom) || !addrEq(to, expectedTo)) return false;
      if (expectedValue !== null) {
        let value: bigint;
        try {
          value = BigInt(log.data);
        } catch {
          return false;
        }
        if (value !== expectedValue) return false;
      }
      return true;
    });

    if (!matched) {
      return { ok: false, status: 'failed', reason: 'no_matching_transfer' };
    }
    return { ok: true, status: 'verified', reason: 'erc20_verified' };
  } catch (e) {
    logger.error('verifyOnChainPayment ERC20 RPC error', e);
    return { ok: false, status: 'unavailable', reason: 'rpc_error' };
  }
}

export interface VerificationDecision {
  accept: boolean;
  httpStatus?: number; // set when !accept
  errorReason?: string; // set when !accept
  verified: boolean; // value to persist
  verificationStatus: VerificationStatus; // value to persist
}

/**
 * Translate a verification result into a record/reject decision.
 *   - verified    -> accept, persist verified=true
 *   - pending     -> accept, persist verified=false (re-verifiable once mined)
 *   - failed      -> REJECT (422) in all environments (fabricated/mismatched/reverted)
 *   - unavailable -> fail closed (503) in production; lenient (accept, unverified) otherwise,
 *                    so a missing/rate-limited RPC does not break testnet flows.
 */
export function decidePaymentRecord(result: PaymentVerificationResult): VerificationDecision {
  switch (result.status) {
    case 'verified':
      return { accept: true, verified: true, verificationStatus: 'verified' };
    case 'pending':
      return { accept: true, verified: false, verificationStatus: 'pending' };
    case 'failed':
      return {
        accept: false,
        httpStatus: 422,
        errorReason: result.reason,
        verified: false,
        verificationStatus: 'failed',
      };
    case 'unavailable':
    default:
      if (process.env.NODE_ENV === 'production') {
        return {
          accept: false,
          httpStatus: 503,
          errorReason: 'verification_unavailable',
          verified: false,
          verificationStatus: 'unavailable',
        };
      }
      return { accept: true, verified: false, verificationStatus: 'unavailable' };
  }
}
