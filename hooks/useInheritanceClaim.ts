'use client';

/**
 * useInheritanceClaim — heir-side hook scoped to a SPECIFIC target vault.
 *
 * The owner-side `useInheritance` reads from the connected user's OWN vault.
 * The heir is different: they read from the DECEASED'S vault (which is not
 * theirs), and act on it. This hook takes an explicit vault address.
 *
 * What it returns:
 *   - State machine (NORMAL / VETO / CLAIM_WINDOW / MEMORIAL / CLOSED)
 *   - Connected wallet's heir commitment in this vault (zero = not an heir)
 *   - Whether the connected wallet has already revealed in this claim
 *   - Per-heir status during finalization (revealed bps, final bps, payout)
 *   - claimShare(secret, bps) and withdrawPayout() writes
 *
 * Identity check: the on-chain contract validates the connected wallet's
 * address against the heir commitment. If they connect from the wrong
 * wallet, claimShare reverts cleanly (INH_InvalidCommitment).
 */

import { useCallback } from 'react';
import {
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from 'wagmi';
import { type Address, type Hex } from 'viem';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import CardBoundVaultInheritanceManagerABI from '@/lib/abis/CardBoundVaultInheritanceManager.json';
import type {
  InheritanceStateCode,
  HeirClaimStatus,
  InheritanceClaimData,
} from './useInheritance';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

interface UseInheritanceClaimResult {
  /** Manager contract for the target vault (zero if vault not deployed or unreachable). */
  managerAddress: Address | undefined;
  /** True while initial reads are loading. */
  isLoading: boolean;
  /** True if the vault address is configured + readable. */
  isValidVault: boolean;

  /** Target vault state code (0=NORMAL, 1=VETO, 2=CLAIM, 3=MEMORIAL, 4=CLOSED). */
  state: InheritanceStateCode;
  /** Unix seconds when current state's window ends. */
  windowEnd: bigint;
  /** Active claim metadata for the target vault, or null if none. */
  claim: InheritanceClaimData | null;
  /** Snapshot balance once distribution begins; 0 before. */
  payoutBalance: bigint;
  /** Sum of revealed basis points across all revealers in the active claim. */
  totalRevealedBasisPoints: bigint;
  /** True once finalizeInheritanceDistribution has been called for this claim. */
  distributionFinalized: boolean;

  /** Connected wallet's commitment in the target vault (zero hash = not an heir). */
  myCommitment: Hex;
  /** True if connected wallet is a configured heir of the target vault. */
  amHeir: boolean;
  /** True if connected wallet has already revealed in this claim. */
  haveRevealed: boolean;
  /** Per-heir status — revealed bps, final bps, payout amount, ready flag. */
  myStatus: HeirClaimStatus;

  /** Reveal the heir's secret + share. Reverts INH_InvalidCommitment if wrong. */
  claimShare: (secret: Hex, basisPoints: bigint) => Promise<Hex>;
  /** Withdraw final payout. Only callable after distribution is finalized. */
  withdrawPayout: () => Promise<Hex>;
  /** Anyone can finalize after window ends OR all heirs have revealed. */
  finalizeDistribution: () => Promise<Hex>;

  isWritePending: boolean;
}

export function useInheritanceClaim(
  targetVault: Address | undefined,
  connectedAddress: Address | undefined,
): UseInheritanceClaimResult {
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // ── 1. Resolve manager from the target vault's facade. ────────────
  const { data: managerAddressRaw, isLoading: isLoadingMgr } = useReadContract({
    address: targetVault,
    abi: CardBoundVaultABI,
    functionName: 'inheritanceManager',
    query: { enabled: !!targetVault },
  });
  const managerAddress = managerAddressRaw as Address | undefined;
  const isValidVault = !!managerAddress && managerAddress !== ZERO_ADDR;

  // ── 2. Bulk-read state + claim metadata + my commitment. ──────────
  const myReadEnabled = isValidVault && !!connectedAddress;
  const { data: coreReads, isLoading: isLoadingCore } = useReadContracts({
    contracts: managerAddress && connectedAddress
      ? [
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceState' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceInitiator' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceReasonHash' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'claimConfigVersion' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'vetoCount' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'snapshotVetoThreshold' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'payoutBalance' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'totalRevealedBasisPoints' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'distributionFinalized' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'heirCommitmentByGuardian', args: [connectedAddress] },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'hasRevealedClaim', args: [connectedAddress] },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'getHeirClaimStatus', args: [connectedAddress] },
        ]
      : [],
    query: {
      enabled: myReadEnabled,
      refetchInterval: 60_000,
    },
  });

  const stateTuple = (coreReads?.[0]?.result as readonly [number, bigint] | undefined) ?? [0, 0n];
  const state = stateTuple[0] as InheritanceStateCode;
  const windowEnd = stateTuple[1];
  const initiator = (coreReads?.[1]?.result as Address | undefined) ?? ZERO_ADDR;
  const reasonHash = (coreReads?.[2]?.result as Hex | undefined) ?? ZERO_HASH;
  const claimConfigVersion = (coreReads?.[3]?.result as bigint | undefined) ?? 0n;
  const vetoCount = (coreReads?.[4]?.result as bigint | undefined) ?? 0n;
  const vetoThreshold = (coreReads?.[5]?.result as bigint | undefined) ?? 0n;
  const payoutBalance = (coreReads?.[6]?.result as bigint | undefined) ?? 0n;
  const totalRevealedBasisPoints = (coreReads?.[7]?.result as bigint | undefined) ?? 0n;
  const distributionFinalized = (coreReads?.[8]?.result as boolean | undefined) ?? false;
  const myCommitment = (coreReads?.[9]?.result as Hex | undefined) ?? ZERO_HASH;
  const haveRevealed = (coreReads?.[10]?.result as boolean | undefined) ?? false;
  const statusTuple = (coreReads?.[11]?.result as readonly [bigint, bigint, bigint, boolean] | undefined) ?? [0n, 0n, 0n, false];

  const amHeir = myCommitment !== ZERO_HASH;
  const myStatus: HeirClaimStatus = {
    revealedBps: statusTuple[0],
    finalBps: statusTuple[1],
    payoutAmount: statusTuple[2],
    readyToWithdraw: statusTuple[3],
  };

  const claim =
    state === 0 || state === 4 || initiator === ZERO_ADDR
      ? null
      : {
          initiator,
          reasonHash,
          claimConfigVersion,
          vetoCount,
          vetoThreshold,
        };

  // ── 3. Write wrappers — all go through the TARGET vault facade. ───
  const withTargetVault = useCallback(
    async <T extends readonly unknown[]>(
      functionName: string,
      args?: T,
    ): Promise<Hex> => {
      if (!targetVault) throw new Error('Target vault not configured');
      const hash = await writeContractAsync({
        address: targetVault,
        abi: CardBoundVaultABI,
        functionName,
        args: args as readonly unknown[] | undefined,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      return hash;
    },
    [targetVault, writeContractAsync, publicClient],
  );

  return {
    managerAddress,
    isLoading: isLoadingMgr || isLoadingCore,
    isValidVault,
    state,
    windowEnd,
    claim,
    payoutBalance,
    totalRevealedBasisPoints,
    distributionFinalized,
    myCommitment,
    amHeir,
    haveRevealed,
    myStatus,
    claimShare: (secret, basisPoints) => withTargetVault('claimHeirShare', [secret, basisPoints]),
    withdrawPayout: () => withTargetVault('withdrawFinalHeirPayout'),
    finalizeDistribution: () => withTargetVault('finalizeInheritanceDistribution'),
    isWritePending,
  };
}
