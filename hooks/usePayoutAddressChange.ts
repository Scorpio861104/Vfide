'use client';

/**
 * usePayoutAddressChange — timelocked payout-address pipeline.
 *
 * The MerchantPortal contract changed how payout addresses are updated.
 * The legacy `setPayoutAddress(address)` is now a deliberate revert stub:
 *   `revert("MP: use proposePayoutAddress + applyPayoutAddress")`
 *
 * The current flow is a 3-step timelock:
 *   1. proposePayoutAddress(newAddress) — records the proposal with a
 *      timestamp `block.timestamp + PAYOUT_ADDRESS_DELAY` (24h by default).
 *      Overwrites any prior pending proposal, so a merchant who is
 *      mid-flight re-routing can update without waiting out a stale one.
 *      The 24h delay restarts from now.
 *   2. wait for the delay to elapse.
 *   3. applyPayoutAddress() — commits the pending value. Reverts if the
 *      delay hasn't elapsed yet, or if the proposed destination is no
 *      longer a tracked vault (VaultHub state could have changed during
 *      the wait window).
 *
 * Or, at any point during the wait:
 *   - cancelPayoutAddressChange() — discards the pending proposal.
 *
 * Validation note:
 *   The contract requires the proposed payout to be `address(0)` (meaning
 *   "use the merchant's own vault as payout") or a tracked vault per
 *   VaultHub. The frontend can't easily check `vaultHub.isVault(addr)`
 *   without an extra RPC call, so we let the contract validate. The error
 *   surfaces back to the user via the standard write error path.
 *
 * Why this hook exists separately:
 *   The legacy `useSetPayoutAddress` in useMerchantHooks.ts still calls
 *   the broken `setPayoutAddress` and is wired into MerchantDashboard's
 *   "Update Payout Address" button. We're not deleting that hook (other
 *   tests might import it), but the dashboard call site is being
 *   redirected to use this hook + its new UI component.
 */

import { useCallback } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { type Address, zeroAddress } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { MerchantPortalABI } from '@/lib/abis';

export interface PayoutAddressPending {
  /** Address that's proposed to become the new payout target. */
  proposed: Address;
  /** Unix seconds when the proposal becomes applicable. */
  effectiveAt: number;
  /** Whether the timelock has elapsed and applyPayoutAddress() can succeed. */
  canApply: boolean;
}

export function usePayoutAddressChange() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const portalAddress = CONTRACT_ADDRESSES.MerchantPortal;
  const portalConfigured = isConfiguredContractAddress(portalAddress);

  // ─────────────────────────────────────────────────────────────────
  // Read the current pending proposal for the connected merchant.
  // pendingPayoutAddress + pendingPayoutAddressEffectiveAt are public
  // mappings on the contract; auto-generated getters return one address
  // and one uint64.
  // ─────────────────────────────────────────────────────────────────
  const { data: proposedAddrRaw, refetch: refetchProposed } = useReadContract({
    address: portalAddress,
    abi: MerchantPortalABI,
    functionName: 'pendingPayoutAddress',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: portalConfigured && !!connectedAddress },
  });

  const { data: effectiveAtRaw, refetch: refetchEffectiveAt } = useReadContract({
    address: portalAddress,
    abi: MerchantPortalABI,
    functionName: 'pendingPayoutAddressEffectiveAt',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: portalConfigured && !!connectedAddress },
  });

  const { data: delayRaw } = useReadContract({
    address: portalAddress,
    abi: MerchantPortalABI,
    functionName: 'PAYOUT_ADDRESS_DELAY',
    query: { enabled: portalConfigured },
  });

  // Decode pending state.
  const effectiveAt = effectiveAtRaw !== undefined ? Number(effectiveAtRaw) : 0;
  const proposed = (proposedAddrRaw ?? zeroAddress) as Address;
  const hasPending = effectiveAt > 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const canApply = hasPending && nowSec >= effectiveAt;

  const pending: PayoutAddressPending | null = hasPending
    ? { proposed, effectiveAt, canApply }
    : null;

  const delaySeconds = delayRaw !== undefined ? Number(delayRaw) : 86400; // 24h fallback

  // ─────────────────────────────────────────────────────────────────
  // Writes
  // ─────────────────────────────────────────────────────────────────

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchProposed(), refetchEffectiveAt()]);
  }, [refetchProposed, refetchEffectiveAt]);

  /**
   * Propose a new payout address (or zeroAddress for "use merchant vault").
   * Contract validates the destination is a tracked vault (or zero).
   */
  const propose = useCallback(
    async (newPayoutAddress: Address) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'proposePayoutAddress',
        args: [newPayoutAddress],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      await refetchAll();
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchAll]
  );

  /**
   * Apply the pending payout-address change. Reverts if the timelock hasn't
   * elapsed or if the proposed address is no longer a valid vault.
   */
  const apply = useCallback(async () => {
    if (!portalConfigured) throw new Error('MerchantPortal not configured');
    const hash = await writeContractAsync({
      address: portalAddress,
      abi: MerchantPortalABI,
      functionName: 'applyPayoutAddress',
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchAll();
    return hash;
  }, [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchAll]);

  /**
   * Cancel the pending change. No-op revert if there's no pending proposal.
   */
  const cancel = useCallback(async () => {
    if (!portalConfigured) throw new Error('MerchantPortal not configured');
    const hash = await writeContractAsync({
      address: portalAddress,
      abi: MerchantPortalABI,
      functionName: 'cancelPayoutAddressChange',
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchAll();
    return hash;
  }, [portalAddress, portalConfigured, writeContractAsync, publicClient, refetchAll]);

  return {
    // Read state
    pending,
    hasPending,
    canApply,
    delaySeconds,
    portalConfigured,

    // Writes
    propose,
    apply,
    cancel,

    // Status
    isWritePending,
    refetch: refetchAll,
  };
}
