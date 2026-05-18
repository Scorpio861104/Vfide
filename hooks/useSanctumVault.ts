'use client';

/**
 * useSanctumVault — foundation hook for the SanctumVault surface.
 *
 * SanctumVault is the protocol's charitable disbursement vault. It receives
 * a share of transfer fees (the "Sanctum Fund" channel of the FeeDistributor,
 * 20% of burn fees per the V1 fee architecture), and distributes them to
 * DAO-approved charities via a multi-sig approval flow.
 *
 * Lifecycle of a charity:
 *   1. DAO submits proposal → approveCharity(addr, name, category) → charity added
 *   2. Sanctum donations flow from FeeDistributor into the vault (deposit())
 *   3. Multi-sig approvers (`approvers`, requires `approvalsRequired`) propose
 *      and approve disbursements to a charity address
 *   4. Once approved, executeDisbursement() sends the funds
 *
 * Exposed write paths (this hook):
 *   • deposit(amount)                       — anyone can deposit donations
 *   • proposeDisbursement(charity, token,
 *     amount, campaign, documentation)      — approver-only (Phase 3 Turn 2)
 *   • approveDisbursement(proposalId)       — approver-only (Phase 3 Turn 2)
 *   • executeDisbursement(proposalId)       — approver-only (Phase 3 Turn 2)
 *
 * INTENTIONALLY NOT IN THIS HOOK:
 *   • approveCharity / removeCharity        — DAO-only. Reached via DAO
 *     proposal templates in CreateTab (Tier 2 Phase 3 Turn 1).
 *   • rejectDisbursement                    — DAO-only veto. Reached via DAO
 *     proposal template in CreateTab (Tier 2 Phase 3 Turn 1).
 *   • addApprover / removeApprover / setApprovalsRequired — DAO-only governance.
 *   • setDAO / applyDAO / cancelDAO         — DAO replacement timelock.
 *   • setEmergencyController / apply / cancel — emergency timelock.
 *   • emergencyTransferOwnership / acceptEmergencyOwnership / etc — emergency ops.
 *   • requestEmergencyRecovery / executeEmergencyRecovery / cancelEmergencyRecovery
 *     — emergency recovery flow, Tier 2 operational concern.
 *   • setLedger / setSeer                   — module wiring, Tier 2 ops.
 *   • transferOwnership / acceptOwnership / cancelOwnershipTransfer / renounceOwnership
 *     — ownership management, Tier 2 ops.
 *   • withdrawNative                        — native-token rescue, DAO/owner.
 */

import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from 'wagmi';
import { type Address, type Abi } from 'viem';
import { SanctumVaultABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Approved charity entry. Mirrors `getCharityInfo(addr)` / `charities(addr)`
 * return tuples.
 */
export interface CharityInfo {
  /** The wallet address that receives this charity's disbursements. */
  address: Address;
  /** Whether the charity is currently active (can receive disbursements). */
  active: boolean;
  /** Human-readable name (e.g. "Save the Children"). */
  name: string;
  /** Category tag (e.g. "Healthcare", "Education"). */
  category: string;
  /** Unix timestamp when this charity was added (uint64 in contract). */
  addedAt: bigint;
}

/**
 * Disbursement record. Mirrors `getDisbursement(id)` / `disbursements(id)`
 * return tuples.
 */
export interface Disbursement {
  /** Disbursement ID (the array index). */
  id: bigint;
  /** Charity recipient address. */
  charity: Address;
  /** Address that proposed the disbursement (must be an approver). */
  proposer: Address;
  /** Amount in VFIDE wei. */
  amount: bigint;
  /** Description of the disbursement purpose. */
  description: string;
  /** Reason (if rejected). */
  rejectionReason: string;
  /** Unix timestamp when proposed. */
  proposedAt: bigint;
  /** Unix timestamp when executed (0 if not executed). */
  executedAt: bigint;
  /** Whether it has been executed. */
  executed: boolean;
  /** Whether it has been rejected. */
  rejected: boolean;
  /** Number of approvals collected so far. */
  approvalCount: number;
}

/**
 * Derived status for a disbursement, computed from the boolean flags + counts.
 * Mirrors the bucket-enum pattern from FraudStatusBucket (Phase 5).
 */
export type DisbursementStatus = 'pending' | 'approved-pending-execution' | 'executed' | 'rejected';

export function deriveDisbursementStatus(
  d: Pick<Disbursement, 'executed' | 'rejected' | 'approvalCount'>,
  approvalsRequired: number,
): DisbursementStatus {
  if (d.executed) return 'executed';
  if (d.rejected) return 'rejected';
  if (d.approvalCount >= approvalsRequired) return 'approved-pending-execution';
  return 'pending';
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getSanctumAddress(): Address | undefined {
  const addr = CONTRACT_ADDRESSES.SanctumVault;
  if (!isConfiguredContractAddress(addr)) return undefined;
  return addr as Address;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSanctumVault() {
  const { address: connectedAddress } = useAccount();
  const sanctumAddress = getSanctumAddress();
  const enabled = Boolean(sanctumAddress);

  // ─── Singletons (cheap, always read) ─────────────────────────────────────

  const { data: charityCount } = useReadContract({
    address: sanctumAddress,
    abi: SanctumVaultABI,
    functionName: 'getCharityCount',
    query: { enabled },
  });

  const { data: disbursementCount } = useReadContract({
    address: sanctumAddress,
    abi: SanctumVaultABI,
    functionName: 'disbursementCount',
    query: { enabled },
  });

  const { data: vaultBalance } = useReadContract({
    address: sanctumAddress,
    abi: SanctumVaultABI,
    functionName: 'getBalance',
    query: { enabled },
  });

  const { data: approvalsRequired } = useReadContract({
    address: sanctumAddress,
    abi: SanctumVaultABI,
    functionName: 'approvalsRequired',
    query: { enabled },
  });

  const { data: approverCount } = useReadContract({
    address: sanctumAddress,
    abi: SanctumVaultABI,
    functionName: 'getApproverCount',
    query: { enabled },
  });

  /** Is the connected address an approver (multi-sig signer)? */
  const { data: isCurrentUserApprover } = useReadContract({
    address: sanctumAddress,
    abi: SanctumVaultABI,
    functionName: 'isApprover',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: enabled && Boolean(connectedAddress) },
  });

  // ─── Batch reads: full charity list ──────────────────────────────────────

  /**
   * Fetch ALL charities. Q2-A decision (fetch-all). If the registry grows
   * large (>50), this should be paginated; tracked in VFIDE_BACKLOG.md.
   */
  const charityCountNumber = charityCount ? Number(charityCount) : 0;
  const charityListCalls = Array.from({ length: charityCountNumber }, (_, i) => ({
    address: sanctumAddress!,
    abi: SanctumVaultABI as Abi,
    functionName: 'charityList' as const,
    args: [BigInt(i)] as const,
  }));

  const { data: charityAddresses, isLoading: charityListLoading } = useReadContracts({
    contracts: charityListCalls as readonly {
      address: Address;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[],
    query: { enabled: enabled && charityCountNumber > 0 },
  });

  // Now fetch getCharityInfo for each. Two-phase: addresses first, then info.
  const validAddresses: Address[] = (charityAddresses ?? [])
    .map((r) => r?.result as Address | undefined)
    .filter((a): a is Address => Boolean(a));

  const charityInfoCalls = validAddresses.map((addr) => ({
    address: sanctumAddress!,
    abi: SanctumVaultABI as Abi,
    functionName: 'getCharityInfo' as const,
    args: [addr] as const,
  }));

  const { data: charityInfoResults, isLoading: charityInfoLoading } = useReadContracts({
    contracts: charityInfoCalls as readonly {
      address: Address;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[],
    query: { enabled: enabled && validAddresses.length > 0 },
  });

  /**
   * Decoded charities, one per registered charity address. Returns an empty
   * array while still loading or if the registry is empty.
   */
  const charities: CharityInfo[] = (charityInfoResults ?? [])
    .map((r, i) => {
      const charityAddress = validAddresses[i];
      if (!r?.result || r.status !== 'success' || !charityAddress) return null;
      const tuple = r.result as readonly [boolean, string, string, bigint];
      return {
        address: charityAddress,
        active: tuple[0],
        name: tuple[1],
        category: tuple[2],
        addedAt: tuple[3],
      } satisfies CharityInfo;
    })
    .filter((c): c is CharityInfo => c !== null);

  const charitiesLoading = charityListLoading || charityInfoLoading;

  // ─── Batch reads: full disbursement list ─────────────────────────────────

  const disbursementCountNumber = disbursementCount ? Number(disbursementCount) : 0;
  const disbursementCalls = Array.from({ length: disbursementCountNumber }, (_, i) => ({
    address: sanctumAddress!,
    abi: SanctumVaultABI as Abi,
    functionName: 'getDisbursement' as const,
    args: [BigInt(i)] as const,
  }));

  const { data: disbursementResults, isLoading: disbursementsLoading } = useReadContracts({
    contracts: disbursementCalls as readonly {
      address: Address;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[],
    query: { enabled: enabled && disbursementCountNumber > 0 },
  });

  const disbursements: Disbursement[] = (disbursementResults ?? [])
    .map((r, i) => {
      if (!r?.result || r.status !== 'success') return null;
      // getDisbursement returns:
      //   (address charity, address proposer, uint256 amount, string description,
      //    string rejectionReason, uint64 proposedAt, uint64 executedAt,
      //    bool executed, bool rejected, uint8 approvalCount)
      const tuple = r.result as readonly [Address, Address, bigint, string, string, bigint, bigint, boolean, boolean, number];
      return {
        id: BigInt(i),
        charity: tuple[0],
        proposer: tuple[1],
        amount: tuple[2],
        description: tuple[3],
        rejectionReason: tuple[4],
        proposedAt: tuple[5],
        executedAt: tuple[6],
        executed: tuple[7],
        rejected: tuple[8],
        approvalCount: Number(tuple[9]),
      } satisfies Disbursement;
    })
    .filter((d): d is Disbursement => d !== null);

  // ─── Per-item reads (caller passes id) ───────────────────────────────────

  /** Fetch a single charity by address (e.g. for the /sanctum/charities/[id] route). */
  const useCharityByAddress = (addr: Address | undefined) => {
    return useReadContract({
      address: sanctumAddress,
      abi: SanctumVaultABI,
      functionName: 'getCharityInfo',
      args: addr ? [addr] : undefined,
      query: { enabled: enabled && Boolean(addr) },
    });
  };

  /** Fetch a single disbursement by id. */
  const useDisbursementById = (id: bigint | undefined) => {
    return useReadContract({
      address: sanctumAddress,
      abi: SanctumVaultABI,
      functionName: 'getDisbursement',
      args: id !== undefined ? [id] : undefined,
      query: { enabled: enabled && id !== undefined },
    });
  };

  /** Has a specific approver already approved a specific disbursement? */
  const useHasApproved = (disbursementId: bigint | undefined, approver: Address | undefined) => {
    return useReadContract({
      address: sanctumAddress,
      abi: SanctumVaultABI,
      functionName: 'hasApproved',
      args: disbursementId !== undefined && approver ? [disbursementId, approver] : undefined,
      query: { enabled: enabled && disbursementId !== undefined && Boolean(approver) },
    });
  };

  // ─── Writes ──────────────────────────────────────────────────────────────

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  /**
   * Donate VFIDE to the Sanctum vault. The depositor pays the gas; the vault
   * tracks `totalReceived` and emits a Donation event. Above MIN_REWARDABLE_DEPOSIT
   * the depositor earns ProofScore via the DONATION_REWARD parameter.
   */
  const deposit = useCallback(
    async (amountWei: bigint) => {
      if (!sanctumAddress) throw new Error('SanctumVault address not configured');
      if (amountWei <= 0n) throw new Error('Deposit amount must be greater than zero');
      return writeContractAsync({
        address: sanctumAddress,
        abi: SanctumVaultABI,
        functionName: 'deposit',
        args: [amountWei],
      });
    },
    [sanctumAddress, writeContractAsync],
  );

  /**
   * Approver-only: propose a disbursement to an approved charity. `onlyApprover`
   * on the contract — `isCurrentUserApprover` should be checked in the calling
   * UI before exposing this write.
   *
   * Args:
   *   • charity        — must be in the registry with `approved == true`
   *   • token          — typically `CONTRACT_ADDRESSES.VFIDEToken`, but Sanctum
   *                       supports other ERC-20s in case fee-funded balances
   *                       arrive in alternative tokens
   *   • amountWei      — must be > 0; the vault re-checks balance at execution
   *                       time, so this only needs to be a realistic intent
   *   • campaign       — short identifier (used in event logs + the campaign field)
   *   • documentation  — IPFS hash or URL to impact report
   */
  const proposeDisbursement = useCallback(
    async (charity: Address, token: Address, amountWei: bigint, campaign: string, documentation: string) => {
      if (!sanctumAddress) throw new Error('SanctumVault address not configured');
      if (amountWei <= 0n) throw new Error('Disbursement amount must be greater than zero');
      if (!campaign.trim()) throw new Error('Campaign identifier is required');
      return writeContractAsync({
        address: sanctumAddress,
        abi: SanctumVaultABI,
        functionName: 'proposeDisbursement',
        args: [charity, token, amountWei, campaign, documentation],
      });
    },
    [sanctumAddress, writeContractAsync],
  );

  /**
   * Approver-only: sign a pending disbursement. Caller must:
   *   • be an approver (`onlyApprover`)
   *   • not have already approved this proposal (contract reverts SANCT_AlreadyApproved)
   *   • disbursement must exist and not yet be executed/rejected
   *
   * UI guards: hide button when `useHasApproved(id, currentUser)` returns true.
   */
  const approveDisbursement = useCallback(
    async (proposalId: bigint) => {
      if (!sanctumAddress) throw new Error('SanctumVault address not configured');
      return writeContractAsync({
        address: sanctumAddress,
        abi: SanctumVaultABI,
        functionName: 'approveDisbursement',
        args: [proposalId],
      });
    },
    [sanctumAddress, writeContractAsync],
  );

  /**
   * Approver-only: execute an approved disbursement. Contract enforces:
   *   • caller is an approver
   *   • disbursement not already finalized
   *   • `approvalCount >= approvalsRequired`
   *   • at least 24 hours since proposal (cooling-off)
   *   • not more than 90 days since proposal (expiry)
   *   • charity still in registry (i.e. not removed since proposal)
   *   • vault balance >= disbursement amount
   *
   * UI guards: only show button when the disbursement object has
   * `approvalCount >= approvalsRequired && !executed && !rejected`. Additional
   * client-side hints for the 24h/90d windows reduce user surprise on revert.
   */
  const executeDisbursement = useCallback(
    async (proposalId: bigint) => {
      if (!sanctumAddress) throw new Error('SanctumVault address not configured');
      return writeContractAsync({
        address: sanctumAddress,
        abi: SanctumVaultABI,
        functionName: 'executeDisbursement',
        args: [proposalId],
      });
    },
    [sanctumAddress, writeContractAsync],
  );

  // ─── Returned surface ────────────────────────────────────────────────────

  return {
    // Address + config
    sanctumAddress,
    configured: enabled,

    // Counts and totals
    charityCount: charityCountNumber,
    disbursementCount: disbursementCountNumber,
    vaultBalance: (vaultBalance as bigint | undefined) ?? 0n,
    approvalsRequired: approvalsRequired ? Number(approvalsRequired) : 0,
    approverCount: approverCount ? Number(approverCount) : 0,

    // User-relative state
    isCurrentUserApprover: Boolean(isCurrentUserApprover),

    // Lists (loaded via getCharityCount + per-id reads)
    charities,
    charitiesLoading,
    disbursements,
    disbursementsLoading,

    // Per-item read helpers (consumers call these directly)
    useCharityByAddress,
    useDisbursementById,
    useHasApproved,

    // Writes
    deposit,
    proposeDisbursement,
    approveDisbursement,
    executeDisbursement,
    isWritePending,
  };
}
