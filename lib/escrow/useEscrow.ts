/**
 * useEscrow — thin wrapper around useCommerceEscrow.
 *
 * This file used to be a misleading shim. Its docstring claimed CommerceEscrow
 * was "removed in v6" and routed `createEscrow` calls to MerchantPortal.payWithIntent
 * (a regular instant merchant payment, no escrow protection). The contract was
 * never removed — it's deployed at Layer 11 (PRODUCTION_SET.md), has a formal
 * ICommerceEscrow interface, and MerchantPortal.payOnline reverts with
 * MERCH_EscrowRequired specifically to force online payments through CommerceEscrow.
 *
 * Phase 3d Turn 4 (2026-05-15) replaces the shim with a proper wrapper around
 * useCommerceEscrow.openAndFundWithIntent (the one-click escrow path added in
 * Turn 3). The public API surface — `createEscrow(merchant, amountStr, orderId)`,
 * `loading`, `isSuccess`, `error` — is preserved so existing call sites like
 * app/pay/components/PayContent.tsx continue to work without modification.
 */

'use client';

import { useState, useCallback } from 'react';
import { parseUnits, keccak256, stringToBytes, type Address } from 'viem';
import { useCommerceEscrow } from '@/hooks/useCommerceEscrow';

const VFIDE_DECIMALS = 18;
const EMPTY_METAHASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

/**
 * Re-exported state alias for legacy consumers. The contract's underlying state
 * machine (NONE/OPEN/FUNDED/RELEASED/REFUNDED/DISPUTED/RESOLVED) maps onto the
 * coarser legacy labels here. New code should import EscrowState from
 * `@/hooks/useCommerceEscrow` directly for the full state set.
 */
export type EscrowState = 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

export interface Escrow {
  id: bigint;
  buyer: `0x${string}`;
  merchant: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  createdAt: bigint;
  releaseTime: bigint;
  state: number;
  orderId: string;
}

export function useEscrow() {
  const { openAndFundWithIntent, escrowConfigured, isWritePending } = useCommerceEscrow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Open and fund an escrow in one transaction.
   * Legacy signature kept for call-site compatibility.
   *
   * @param merchant   Merchant owner address (the recipient if the escrow is released)
   * @param amountStr  Human-readable amount (e.g., "12.5"); converted to wei at VFIDE decimals
   * @param orderId    Off-chain order identifier; hashed into the escrow's metaHash for
   *                   later correlation with the merchant's records
   */
  const createEscrow = useCallback(
    async (merchant: Address, amountStr: string, orderId: string) => {
      setError(null);
      setIsSuccess(false);
      setLoading(true);
      try {
        if (!escrowConfigured) throw new Error('CommerceEscrow is not configured for this environment');

        let amountWei: bigint;
        try {
          amountWei = parseUnits(amountStr, VFIDE_DECIMALS);
        } catch {
          throw new Error('Invalid amount');
        }
        if (amountWei === 0n) throw new Error('Amount must be greater than zero');

        const metaHash = orderId && orderId.length > 0 ? keccak256(stringToBytes(orderId)) : EMPTY_METAHASH;

        const { id } = await openAndFundWithIntent({
          merchantOwner: merchant,
          amountWei,
          metaHash,
        });
        setIsSuccess(true);
        return id;
      } catch (e: any) {
        const msg = e?.shortMessage || e?.message || 'Escrow creation failed';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [openAndFundWithIntent, escrowConfigured]
  );

  return {
    createEscrow,
    loading: loading || isWritePending,
    isSuccess,
    error,
  };
}
