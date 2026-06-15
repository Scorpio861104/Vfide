'use client';

/**
 * usePendingChanges — read + act on all timelocked changes pending on a vault.
 *
 * Closes the read-side of M-CBV-02 (the apply/cancel pipeline UI gap). Reads
 * every pending change across the vault's sub-managers (AdminManager and
 * PaymentQueueManager), normalizes them into a uniform array of
 * PendingChange objects, and exposes the apply/cancel writes for each.
 *
 * Why a single aggregator hook:
 *   The 7 pending pipelines all share the same UX shape: "X is queued,
 *   effective at Y, click here to apply or here to cancel." Rather than
 *   building 7 separate components and 7 separate hook files, this hook
 *   gives the page a single list to .map() over. The page is the natural
 *   place where shape variation matters (e.g., spend limits have two
 *   numbers; rescues have a destination address and amount).
 *
 * Architecture notes:
 *   - AdminManager holds 6 pending pipelines (guardian, trustee, spend
 *     limits, large transfer threshold, native rescue, ERC20 rescue,
 *     token approval). The vault delegates timelocked admin state to
 *     this contract.
 *   - PaymentQueueManager holds 1 pending pipeline (large payment
 *     threshold). The vault delegates payment-queue state to this
 *     contract.
 *   - All writes go through the vault (the user calls vault.applyXxx
 *     which internally calls the sub-manager). This is intentional —
 *     the vault enforces onlyAdmin, then delegates.
 *
 * What the UI consumer needs to know:
 *   - Read `changes` to get the normalized list of pending changes
 *   - Each entry has a unique `id`, human-readable `label`, current
 *     `details` for display, `effectiveAt` (Unix seconds), and
 *     `canApply` (boolean — true when timelock has expired)
 *   - Call `apply(id)` or `cancel(id)` to execute the action
 *
 * Caveats:
 *   - Large payment threshold has no cancel function (contract design).
 *     The PendingChange entry will have canCancel: false for that one.
 *   - Guardian and trustee changes are already wired in MyGuardiansTab.
 *     This hook includes them for completeness but the apply-pending-
 *     changes page should probably hide them OR show them with a hint
 *     to manage them in the guardian tab (cleaner UX). Decided at page level.
 */

import { useCallback } from 'react';
import { usePublicClient, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { type Address } from 'viem';
import { ACTIVE_VAULT_ABI, ZERO_ADDRESS } from '@/lib/contracts';
import { CardBoundVaultAdminManagerABI, CardBoundVaultPaymentQueueManagerABI } from '@/lib/abis';
import CardBoundVaultInheritanceManagerABI from '@/lib/abis/CardBoundVaultInheritanceManager.json';

/**
 * Identifier for each pipeline. The UI uses this to decide which apply/
 * cancel write to call.
 */
export type PendingChangeId =
  | 'guardian'
  | 'trustee'
  | 'spendLimits'
  | 'largeTransferThreshold'
  | 'nativeRescue'
  | 'erc20Rescue'
  | 'tokenApproval'
  | 'inheritance'
  | 'largePaymentThreshold';

export interface PendingChange {
  id: PendingChangeId;
  /** Human-readable label for the change category. */
  label: string;
  /** Short summary of what's queued (e.g., "Add guardian 0x123..."). */
  summary: string;
  /** Longer-form details, optional, for expanded views. */
  details?: string[];
  /** Unix seconds when the timelock expires. */
  effectiveAt: number;
  /** Whether the timelock has expired (apply will succeed if true). */
  canApply: boolean;
  /** Whether this pipeline supports cancellation (large payment threshold doesn't). */
  canCancel: boolean;
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTokenAmount(amount: bigint): string {
  // Display raw value. UI consumer can decimals-format if needed.
  return amount.toString();
}

export function usePendingChanges(vaultAddress: Address | undefined) {
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();

  // ─────────────────────────────────────────────────────────────────
  // Step 1: Read the sub-manager addresses from the vault.
  // We need adminManager() and paymentQueueManager() to know where to
  // call pendingXxx getters.
  // ─────────────────────────────────────────────────────────────────
  const { data: adminMgrRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'adminManager',
    query: { enabled: !!vaultAddress },
  });
  const adminManager = (adminMgrRaw as Address | undefined) ?? undefined;

  const { data: pqmRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'paymentQueueManager',
    query: { enabled: !!vaultAddress },
  });
  const paymentQueueManager = (pqmRaw as Address | undefined) ?? undefined;

  // Wave 87: also read the inheritance manager so a pending heir/successor change (a slow-takeover vector)
  // shows up in the SAME aggregate view as guardian/trustee/limit changes — not only on inheritance pages.
  const { data: imRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'inheritanceManager',
    query: { enabled: !!vaultAddress },
  });
  const inheritanceManager = (imRaw as Address | undefined) ?? undefined;

  // ─────────────────────────────────────────────────────────────────
  // Step 2: Batch-read all pending state across both sub-managers.
  // useReadContracts fans out parallel calls and returns an array of
  // results in the same order. Empty array if disabled.
  // ─────────────────────────────────────────────────────────────────
  const adminCalls = adminManager
    ? [
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingGuardianChange' },
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingTrusteeChange' },
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingSpendLimitChange' },
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingLargeTransferThresholdChange' },
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingNativeRescue' },
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingERC20Rescue' },
        { address: adminManager, abi: CardBoundVaultAdminManagerABI as any, functionName: 'pendingTokenApproval' },
      ]
    : [];

  const pqmCalls = paymentQueueManager
    ? [
        { address: paymentQueueManager, abi: CardBoundVaultPaymentQueueManagerABI as any, functionName: 'pendingLargePaymentThresholdChange' },
      ]
    : [];

  const imCalls = inheritanceManager
    ? [
        { address: inheritanceManager, abi: CardBoundVaultInheritanceManagerABI as any, functionName: 'pendingHeirConfigEffectiveAt' },
        { address: inheritanceManager, abi: CardBoundVaultInheritanceManagerABI as any, functionName: 'pendingConfigVersion' },
      ]
    : [];

  const { data: adminReads, refetch: refetchAdmin } = useReadContracts({
    contracts: adminCalls,
    query: { enabled: !!adminManager && adminManager !== ZERO_ADDRESS },
  });
  const { data: pqmReads, refetch: refetchPqm } = useReadContracts({
    contracts: pqmCalls,
    query: { enabled: !!paymentQueueManager && paymentQueueManager !== ZERO_ADDRESS },
  });
  const { data: imReads, refetch: refetchIm } = useReadContracts({
    contracts: imCalls,
    query: { enabled: !!inheritanceManager && inheritanceManager !== ZERO_ADDRESS },
  });

  const now = Math.floor(Date.now() / 1000);

  // ─────────────────────────────────────────────────────────────────
  // Step 3: Decode each pending state into a uniform PendingChange.
  // For each pipeline:
  //   - If the read returned undefined or the effectiveAt is 0, no
  //     change is queued — skip it.
  //   - Otherwise format the summary based on the pipeline's shape.
  // ─────────────────────────────────────────────────────────────────
  const changes: PendingChange[] = [];

  const pushIfQueued = (
    id: PendingChangeId,
    raw: any,
    label: string,
    formatter: (data: any) => { summary: string; details?: string[]; effectiveAt: number }
  ) => {
    if (!raw || !Array.isArray(raw)) return;
    const formatted = formatter(raw);
    if (formatted.effectiveAt === 0) return; // no pending change
    changes.push({
      id,
      label,
      summary: formatted.summary,
      details: formatted.details,
      effectiveAt: formatted.effectiveAt,
      canApply: formatted.effectiveAt > 0 && now >= formatted.effectiveAt,
      canCancel: id !== 'largePaymentThreshold',
    });
  };

  // Pending guardian change: (address guardian, bool active, uint64 effectiveAt)
  pushIfQueued('guardian', adminReads?.[0]?.result, 'Guardian change', (data) => {
    const [guardian, active, effectiveAt] = data as [string, boolean, bigint];
    return {
      summary: `${active ? 'Add' : 'Remove'} guardian ${shortAddress(guardian)}`,
      details: [`Address: ${guardian}`, `Action: ${active ? 'Add' : 'Remove'}`],
      effectiveAt: Number(effectiveAt),
    };
  });

  // Pending trustee change: (address guardian, bool trustee, uint64 effectiveAt)
  pushIfQueued('trustee', adminReads?.[1]?.result, 'Trustee change', (data) => {
    const [guardian, trustee, effectiveAt] = data as [string, boolean, bigint];
    return {
      summary: `${trustee ? 'Promote' : 'Demote'} guardian ${shortAddress(guardian)} ${trustee ? 'to' : 'from'} trustee`,
      details: [`Guardian: ${guardian}`, `Action: ${trustee ? 'Promote to trustee' : 'Demote from trustee'}`],
      effectiveAt: Number(effectiveAt),
    };
  });

  // Pending spend limits: (uint256 value1, uint256 value2, uint64 executeAfter)
  // value1 = maxPerTransfer, value2 = dailyTransferLimit
  pushIfQueued('spendLimits', adminReads?.[2]?.result, 'Spend limits', (data) => {
    const [maxPerTransfer, dailyLimit, executeAfter] = data as [bigint, bigint, bigint];
    return {
      summary: `New limits: max ${formatTokenAmount(maxPerTransfer)} per tx, ${formatTokenAmount(dailyLimit)} per day`,
      details: [
        `Max per transfer: ${formatTokenAmount(maxPerTransfer)} (raw wei)`,
        `Daily transfer limit: ${formatTokenAmount(dailyLimit)} (raw wei)`,
      ],
      effectiveAt: Number(executeAfter),
    };
  });

  // Pending large transfer threshold: (uint256 value, uint64 executeAfter)
  pushIfQueued('largeTransferThreshold', adminReads?.[3]?.result, 'Large transfer threshold', (data) => {
    const [value, executeAfter] = data as [bigint, bigint];
    return {
      summary: `Large transfer threshold to ${formatTokenAmount(value)}`,
      details: [`New threshold: ${formatTokenAmount(value)} (raw wei)`],
      effectiveAt: Number(executeAfter),
    };
  });

  // Pending native rescue: (address addr, uint256 amount, uint64 executeAfter)
  pushIfQueued('nativeRescue', adminReads?.[4]?.result, 'Native (ETH) rescue', (data) => {
    const [addr, amount, executeAfter] = data as [string, bigint, bigint];
    return {
      summary: `Rescue ${formatTokenAmount(amount)} wei native to ${shortAddress(addr)}`,
      details: [`Destination: ${addr}`, `Amount: ${formatTokenAmount(amount)} wei`],
      effectiveAt: Number(executeAfter),
    };
  });

  // Pending ERC20 rescue: (address token, address to, uint256 amount, uint64 executeAfter)
  pushIfQueued('erc20Rescue', adminReads?.[5]?.result, 'ERC20 rescue', (data) => {
    const [token, to, amount, executeAfter] = data as [string, string, bigint, bigint];
    return {
      summary: `Rescue ${formatTokenAmount(amount)} of token ${shortAddress(token)} to ${shortAddress(to)}`,
      details: [`Token: ${token}`, `Destination: ${to}`, `Amount: ${formatTokenAmount(amount)}`],
      effectiveAt: Number(executeAfter),
    };
  });

  // Pending token approval: (address token, address spender, uint256 amount, uint64 executeAfter)
  pushIfQueued('tokenApproval', adminReads?.[6]?.result, 'Token approval', (data) => {
    const [token, spender, amount, executeAfter] = data as [string, string, bigint, bigint];
    return {
      summary: `Approve ${shortAddress(spender)} to spend ${formatTokenAmount(amount)} of ${shortAddress(token)}`,
      details: [`Token: ${token}`, `Spender: ${spender}`, `Amount: ${formatTokenAmount(amount)}`],
      effectiveAt: Number(executeAfter),
    };
  });

  // Pending large payment threshold: (uint256 threshold, uint64 executeAfter)
  pushIfQueued('largePaymentThreshold', pqmReads?.[0]?.result, 'Large payment threshold', (data) => {
    const [threshold, executeAfter] = data as [bigint, bigint];
    return {
      summary: `Large payment threshold to ${formatTokenAmount(threshold)}`,
      details: [
        `New threshold: ${formatTokenAmount(threshold)} (raw wei)`,
        'This pipeline does not support cancellation (contract design).',
      ],
      effectiveAt: Number(executeAfter),
    };
  });

  // Wave 87: pending heir/successor (inheritance) change — surfaced here so a slow-takeover heir swap is
  // visible in the owner's aggregate pending view, not only buried on the inheritance pages. The reads are
  // scalars (effectiveAt, version), so this is decoded directly rather than via pushIfQueued (array shape).
  {
    const effRaw = imReads?.[0]?.result;
    const verRaw = imReads?.[1]?.result;
    const effectiveAt = typeof effRaw === 'bigint' ? Number(effRaw) : 0;
    if (effectiveAt > 0) {
      const version = typeof verRaw === 'bigint' ? verRaw.toString() : '?';
      changes.push({
        id: 'inheritance',
        label: 'Inheritance / successor change',
        summary: 'A change to who inherits your vault is pending',
        details: [
          `Pending config version: ${version}`,
          'If you did not request this, cancel it on the inheritance page before it takes effect.',
        ],
        effectiveAt,
        canApply: effectiveAt > 0 && now >= effectiveAt,
        canCancel: true,
      });
    }
  }
  // This is the contract's design pattern; we mirror it.
  // ─────────────────────────────────────────────────────────────────
  const apply = useCallback(
    async (id: PendingChangeId) => {
      if (!vaultAddress) throw new Error('No vault');
      const fnName = (() => {
        switch (id) {
          case 'guardian': return 'applyGuardianChange';
          case 'trustee': return 'applyTrusteeChange';
          case 'spendLimits': return 'applySpendLimits';
          case 'largeTransferThreshold': return 'applyLargeTransferThresholdChange';
          case 'nativeRescue': return 'applyRescueNative';
          case 'erc20Rescue': return 'applyRescueERC20';
          case 'tokenApproval': return 'applyTokenApproval';
          case 'largePaymentThreshold': return 'applyLargePaymentThreshold';
          // Inheritance changes are applied/cancelled on the dedicated inheritance page (different manager
          // + commitment flow); this aggregate view surfaces them but defers management there.
          case 'inheritance': throw new Error('Manage inheritance changes on the inheritance page.');
          default: throw new Error('Unknown pending change');
        }
      })();
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: fnName,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchAdmin();
      await refetchPqm();
      return hash;
    },
    [vaultAddress, writeContractAsync, publicClient, refetchAdmin, refetchPqm]
  );

  const cancel = useCallback(
    async (id: PendingChangeId) => {
      if (!vaultAddress) throw new Error('No vault');
      if (id === 'largePaymentThreshold') {
        throw new Error('Large payment threshold change does not support cancellation.');
      }
      if (id === 'inheritance') {
        throw new Error('Cancel a pending inheritance change on the inheritance page.');
      }
      const fnName = (() => {
        switch (id) {
          case 'guardian': return 'cancelGuardianChange';
          case 'trustee': return 'cancelTrusteeChange';
          case 'spendLimits': return 'cancelSpendLimitsChange';
          case 'largeTransferThreshold': return 'cancelLargeTransferThresholdChange';
          case 'nativeRescue': return 'cancelRescueNative';
          case 'erc20Rescue': return 'cancelRescueERC20';
          case 'tokenApproval': return 'cancelTokenApproval';
          default: throw new Error('Unknown pipeline');
        }
      })();
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: fnName,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchAdmin();
      await refetchPqm();
      return hash;
    },
    [vaultAddress, writeContractAsync, publicClient, refetchAdmin, refetchPqm]
  );

  return {
    changes,
    apply,
    cancel,
    isWritePending,
    writeError,
    refetch: () => Promise.all([refetchAdmin(), refetchPqm(), refetchIm()]),
  };
}
