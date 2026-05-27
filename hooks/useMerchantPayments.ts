'use client';

/**
 * useMerchantPayments — direct-call payment + refund layer for MerchantPortal.
 *
 * Wraps the four direct-call payment variants (pay, payInvoice, payInPerson,
 * paySubscription) and the refund flow (initiateRefund, completeRefund) plus
 * the relevant read views (getMerchantStats, getRefundStatus,
 * getCustomerTrustScore).
 *
 * Why this hook exists alongside usePayMerchant:
 *
 *   `usePayMerchant` in useMerchantHooks.ts handles `payWithIntent` — the
 *   EIP-712-signed primary checkout flow. The buyer signs a typed PayIntent
 *   that includes vault, recipient, amount, nonce, walletEpoch, deadline,
 *   chainId; the MerchantPortal verifies the signature and pulls from the
 *   buyer's vault. That flow is the right call when the buyer is going
 *   through a standard checkout where signing the intent is natural UX.
 *
 *   The direct-call variants (pay/payInvoice/payInPerson/paySubscription)
 *   pull from msg.sender's vault without signing — useful when:
 *     - The buyer is scanning a QR code in person (no checkout flow)
 *     - A subscription is auto-renewing on a schedule (no human present
 *       to sign each time; signed authorization happens once at setup)
 *     - An invoice app wants direct-pay without the elaborate intent dance
 *
 *   Both flows ultimately call _processPaymentWithChannel internally with
 *   different PaymentChannel enum values. The contract treats them the
 *   same from a security perspective once authorization is established.
 *
 * Functions deliberately NOT covered by this hook:
 *
 *   - payOnline: deliberate `revert MERCH_EscrowRequired()` stub. Online
 *     payments MUST go through CommerceEscrow for buyer protection. The
 *     escrow flow is Phase 3d work.
 *   - completeRefundFromVault: deliberate `revert MERCH_Deprecated()` stub.
 *   - getMerchantRefundRate: deliberate `revert MERCH_Deprecated()` stub
 *     ("compute off-chain from events").
 *   - calculateGrossAmount: deliberate `revert MERCH_Deprecated()` stub.
 *   - payWithIntent: covered by usePayMerchant in useMerchantHooks.ts.
 *
 * Channel enum mapping (from contract):
 *   0 = ONLINE       (use payWithIntent or escrow flow, not this hook)
 *   1 = IN_PERSON    (covered by pay() and payInPerson())
 *   2 = POS_TERMINAL (covered by payInPerson with channel=2)
 *   3 = QR_CODE      (covered by payInPerson with channel=3)
 *   4 = SUBSCRIPTION (covered by paySubscription)
 *   5 = INVOICE      (covered by payInvoice)
 */

import { useCallback } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { type Abi, type Address } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { MerchantPortalABI, MerchantPortalViewerABI } from '@/lib/abis';

export enum PaymentChannel {
  Online = 0,
  InPerson = 1,
  PosTerminal = 2,
  QrCode = 3,
  Subscription = 4,
  Invoice = 5,
}

/** Payment in-person sub-channels — the only valid values for payInPerson(). */
export type InPersonChannel = PaymentChannel.InPerson | PaymentChannel.PosTerminal | PaymentChannel.QrCode;

export interface MerchantStats {
  /** Whether the address is registered as a merchant. */
  registered: boolean;
  /** Whether the merchant is currently suspended. */
  suspended: boolean;
  /** Lifetime payment volume (in token base units, not human-readable). */
  totalVolume: bigint;
  /** Number of payments received. */
  txCount: bigint;
  /** Average transaction size (in token base units). */
  avgTxSize: bigint;
  /** ProofScore at last query (cached). */
  trustScore: number;
}

export interface RefundStatus {
  customer: Address;
  merchant: Address;
  token: Address;
  amount: bigint;
  orderId: string;
  requestTime: number;
  approved: boolean;
  completed: boolean;
}

export interface UseMerchantPaymentsOptions {
  /** Merchant address to read stats for (used by getMerchantStats). */
  merchantAddress?: Address;
  /** Customer address to read trust score for (defaults to connected wallet). */
  customerAddress?: Address;
}

function decodeStats(raw: unknown): MerchantStats | null {
  if (!raw) return null;
  // Struct decode (named outputs) or array decode (older viem)
  if (typeof raw === 'object' && 'registered' in (raw as any)) {
    const s = raw as any;
    return {
      registered: !!s.registered,
      suspended: !!s.suspended,
      totalVolume: BigInt(s.totalVolume ?? 0),
      txCount: BigInt(s.txCount ?? 0),
      avgTxSize: BigInt(s.avgTxSize ?? 0),
      trustScore: Number(s.trustScore ?? 0),
    };
  }
  if (Array.isArray(raw) && raw.length >= 6) {
    return {
      registered: !!raw[0],
      suspended: !!raw[1],
      totalVolume: BigInt(raw[2] as any),
      txCount: BigInt(raw[3] as any),
      avgTxSize: BigInt(raw[4] as any),
      trustScore: Number(raw[5]),
    };
  }
  return null;
}

function decodeRefund(raw: unknown): RefundStatus | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'customer' in (raw as any)) {
    const r = raw as any;
    return {
      customer: r.customer as Address,
      merchant: r.merchant as Address,
      token: r.token as Address,
      amount: BigInt(r.amount ?? 0),
      orderId: String(r.orderId ?? ''),
      requestTime: Number(r.requestTime ?? 0),
      approved: !!r.approved,
      completed: !!r.completed,
    };
  }
  if (Array.isArray(raw) && raw.length >= 8) {
    return {
      customer: raw[0] as Address,
      merchant: raw[1] as Address,
      token: raw[2] as Address,
      amount: BigInt(raw[3] as any),
      orderId: String(raw[4] ?? ''),
      requestTime: Number(raw[5]),
      approved: !!raw[6],
      completed: !!raw[7],
    };
  }
  return null;
}

export function useMerchantPayments(options: UseMerchantPaymentsOptions = {}) {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const portalAddress = CONTRACT_ADDRESSES.MerchantPortal;
  const portalConfigured = isConfiguredContractAddress(portalAddress);
  const viewerAddress = CONTRACT_ADDRESSES.MerchantPortalViewer;
  const viewerConfigured = isConfiguredContractAddress(viewerAddress);

  const merchantTarget = options.merchantAddress;
  const customerTarget = options.customerAddress ?? connectedAddress;

  // ─────────────────────────────────────────────────────────────────
  // Read merchant stats — totalVolume, txCount, avgTxSize, trustScore.
  // ─────────────────────────────────────────────────────────────────
  const { data: statsRaw, refetch: refetchStats } = useReadContract({
    // getMerchantStats retained on MerchantPortal for on-chain compatibility (pools, scripts).
    address: portalAddress,
    abi: MerchantPortalABI,
    functionName: 'getMerchantStats',
    args: merchantTarget ? [merchantTarget] : undefined,
    query: { enabled: portalConfigured && !!merchantTarget },
  });
  const stats = decodeStats(statsRaw);

  // ─────────────────────────────────────────────────────────────────
  // Read customer trust score — duplicates Seer.getScore but lets us
  // read it via MerchantPortal which is what gets enforced on payment.
  // ─────────────────────────────────────────────────────────────────
  const { data: trustScoreRaw } = useReadContract({
    // getCustomerTrustScore moved to MerchantPortalViewer (EIP-170 extraction)
    address: viewerAddress,
    abi: MerchantPortalViewerABI,
    functionName: 'getCustomerTrustScore',
    args: customerTarget ? [customerTarget] : undefined,
    query: { enabled: viewerConfigured && !!customerTarget },
  });
  const customerTrustScore = trustScoreRaw !== undefined ? Number(trustScoreRaw) : undefined;

  // ─────────────────────────────────────────────────────────────────
  // Writes: direct-call payment variants.
  //
  // These pull from msg.sender's vault. The buyer's wallet IS the caller.
  // For checkout flows with elaborate auth UX, prefer payWithIntent via
  // usePayMerchant (it does EIP-712 signing + nonce management + walletEpoch).
  // ─────────────────────────────────────────────────────────────────

  /**
   * Generic direct-call payment. Used for IN_PERSON channel by default.
   * Contract internally records the channel as IN_PERSON.
   */
  const pay = useCallback(
    async (params: { merchant: Address; token: Address; amountWei: bigint; orderId: string }) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'pay',
        args: [params.merchant, params.token, params.amountWei, params.orderId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchStats();
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchStats]
  );

  /**
   * Invoice payment. Records channel as INVOICE.
   */
  const payInvoice = useCallback(
    async (params: { merchant: Address; token: Address; amountWei: bigint; invoiceId: string }) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'payInvoice',
        args: [params.merchant, params.token, params.amountWei, params.invoiceId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchStats();
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchStats]
  );

  /**
   * In-person payment with explicit channel choice (IN_PERSON, POS_TERMINAL,
   * or QR_CODE). Contract reverts if a non-in-person channel is passed.
   */
  const payInPerson = useCallback(
    async (params: {
      merchant: Address;
      token: Address;
      amountWei: bigint;
      orderId: string;
      channel: InPersonChannel;
    }) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'payInPerson',
        args: [params.merchant, params.token, params.amountWei, params.orderId, params.channel],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchStats();
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchStats]
  );

  /**
   * Subscription payment. Records channel as SUBSCRIPTION. Typically called
   * by a session-key-authorized service on the user's behalf, not directly
   * by the user each cycle.
   */
  const paySubscription = useCallback(
    async (params: { merchant: Address; token: Address; amountWei: bigint; subscriptionId: string }) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'paySubscription',
        args: [params.merchant, params.token, params.amountWei, params.subscriptionId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchStats();
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchStats]
  );

  // ─────────────────────────────────────────────────────────────────
  // Refund flow.
  //
  // initiateRefund is called by the MERCHANT (not the customer) when they
  // want to refund a payment. It creates a refundRequest entry. The merchant
  // then calls completeRefund with the refundId — at that point the actual
  // token transfer happens from the merchant's vault back to the customer.
  //
  // The split (initiate vs complete) lets the merchant pause/cancel between
  // the request and the transfer, e.g., if they realize the refund was a
  // mistake. The customer sees the request immediately so they have
  // visibility into the merchant's intent.
  //
  // refundId capture: the contract returns the computed refundId, but writes
  // to chain don't expose return values to the frontend (txHash only). To
  // capture refundId, we simulate the call first with the same args at the
  // current block — the simulation returns the deterministic refundId the
  // real call will produce. We then submit the real tx. Race-condition note:
  // between simulate and write, another initiateRefund from the same merchant
  // for the same customer could change customerRefunds[customer].length and
  // produce a different refundId. In practice merchant-side concurrent
  // refunds are extremely rare; if it ever happens, the merchant can recover
  // the real refundId from the transaction logs on a block explorer (see the
  // backlog entry for the contract-side fix that would eliminate this).
  // ─────────────────────────────────────────────────────────────────
  const initiateRefund = useCallback(
    async (params: { customer: Address; token: Address; amountWei: bigint; orderId: string }) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      if (!connectedAddress) throw new Error('Wallet not connected');

      // Step 1: simulate to capture the predicted refundId.
      let refundId: `0x${string}` | undefined;
      if (publicClient) {
        try {
          const simulateContract = publicClient.simulateContract as (args: {
            address: Address;
            abi: Abi;
            functionName: string;
            args: readonly unknown[];
            account: Address;
          }) => Promise<{ result: unknown }>;
          const sim = await simulateContract({
            address: portalAddress!,
            abi: MerchantPortalABI as Abi,
            functionName: 'initiateRefund',
            args: [params.customer, params.token, params.amountWei, params.orderId],
            account: connectedAddress,
          });
          refundId = sim.result as `0x${string}`;
        } catch {
          // Simulation failed (likely the real tx will also fail). We let the
          // real tx attempt and surface its error to the user.
        }
      }

      // Step 2: submit the real tx.
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'initiateRefund',
        args: [params.customer, params.token, params.amountWei, params.orderId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchStats();
      return { hash, refundId };
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchStats, connectedAddress]
  );

  const completeRefund = useCallback(
    async (refundId: `0x${string}`) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'completeRefund',
        args: [refundId],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchStats();
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchStats]
  );

  return {
    // Reads
    stats,
    customerTrustScore,
    portalConfigured,

    // Payment writes (direct-call, no EIP-712)
    pay,
    payInvoice,
    payInPerson,
    paySubscription,

    // Refund writes
    initiateRefund,
    completeRefund,

    // Status
    isWritePending,
    refetch: refetchStats,
  };
}

/**
 * Companion hook for reading a single refund's status by ID. Use this in
 * UI that displays the lifecycle of a specific refund (e.g., a customer
 * checking "did the merchant complete the refund they promised?").
 */
export function useRefundStatus(refundId: `0x${string}` | undefined) {
  // getRefundStatus moved to MerchantPortalViewer (EIP-170 extraction)
  const viewerAddress = CONTRACT_ADDRESSES.MerchantPortalViewer;
  const viewerConfigured = isConfiguredContractAddress(viewerAddress);

  const { data, isLoading, refetch } = useReadContract({
    address: viewerAddress,
    abi: MerchantPortalViewerABI,
    functionName: 'getRefundStatus',
    args: refundId ? [refundId] : undefined,
    query: { enabled: viewerConfigured && !!refundId },
  });

  return {
    refund: decodeRefund(data),
    isLoading,
    refetch,
  };
}
