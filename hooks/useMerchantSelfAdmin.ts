'use client';

/**
 * useMerchantSelfAdmin — merchant self-administration writes.
 *
 * Covers two merchant-side admin operations that had no UI access before:
 *   - updateMerchantInfo(businessName, category) — change on-chain merchant
 *     fields. The MerchantProfileWizard writes to MerchantRegistry.metaHash
 *     (off-chain content-addressed profile) but never calls this function,
 *     so before this hook, the on-chain businessName/category on
 *     MerchantPortal were frozen at registration. Two parallel systems exist
 *     (Phase 0 Decision 1); this surface lets merchants keep the on-chain
 *     side current too.
 *   - deregisterMerchant() — voluntary deregistration. Contract enforces:
 *       - Not suspended (suspended merchants can't deregister; DAO must
 *         unsuspend first via reinstateMerchant)
 *       - No pending refunds (must complete or expire all pending refunds
 *         before deregistration)
 *     Both gates surface as contract reverts; the hook just calls the function.
 *
 * What this hook does NOT cover:
 *   - DAO-only operations (suspend / reinstate / setAcceptedToken / etc.) —
 *     those belong in a future DAO admin surface, not a merchant-self-service
 *     hook.
 *   - Customer-side pull permit operations (setMerchantPullPermit /
 *     setMerchantPullPermitForToken) — those are customer-side authorizations,
 *     not merchant admin.
 *
 * Race / safety considerations:
 *   updateMerchantInfo writes directly without a timelock. This is intentional
 *   in the contract — businessName and category are display fields, not
 *   security-relevant. They don't affect fund routing (that's payoutAddress,
 *   which IS timelocked per Phase 3c Turn 1).
 *
 *   deregisterMerchant is permanent in the sense that the merchant has to
 *   call registerMerchant again to come back. The contract preserves their
 *   totalVolume and txCount through deregister/re-register cycles. We
 *   surface a confirmation modal in the UI layer.
 */

import { useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { MerchantPortalABI } from '@/lib/abis';

export function useMerchantSelfAdmin() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const portalAddress = CONTRACT_ADDRESSES.MerchantPortal;
  const portalConfigured = isConfiguredContractAddress(portalAddress);

  /**
   * Update on-chain merchant info (businessName + category).
   * No timelock. Display fields only — not fund-routing related.
   */
  const updateMerchantInfo = useCallback(
    async (params: { businessName: string; category: string }) => {
      if (!portalConfigured) throw new Error('MerchantPortal not configured');
      const hash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalABI,
        functionName: 'updateMerchantInfo',
        args: [params.businessName, params.category],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [portalAddress, portalConfigured, writeContractAsync, publicClient]
  );

  /**
   * Voluntarily deregister as a merchant.
   * Contract enforces preconditions (not suspended, no pending refunds).
   * Errors surface as contract reverts.
   */
  const deregisterMerchant = useCallback(async () => {
    if (!portalConfigured) throw new Error('MerchantPortal not configured');
    if (!connectedAddress) throw new Error('Wallet not connected');
    const hash = await writeContractAsync({
      address: portalAddress,
      abi: MerchantPortalABI,
      functionName: 'deregisterMerchant',
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }, [portalAddress, portalConfigured, writeContractAsync, publicClient, connectedAddress]);

  return {
    updateMerchantInfo,
    deregisterMerchant,
    isWritePending,
    portalConfigured,
  };
}
