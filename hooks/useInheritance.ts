'use client';

/**
 * useInheritance — single hook for everything the inheritance UI needs.
 *
 * Reads:
 *   - Current heir set (addresses; commitments hidden until reveal)
 *   - State machine (NORMAL / VETO_PERIOD / CLAIM_WINDOW / MEMORIAL / CLOSED)
 *   - Pending config (proposed but not yet confirmed)
 *   - Proof-of-life wallet
 *   - Inheritance claim metadata when active (initiator, reason hash, veto count)
 *
 * Writes (all via the vault facade — never call manager directly):
 *   - proposeInheritanceConfig(guardians[], commitments[])
 *   - confirmInheritanceConfig()
 *   - cancelInheritanceConfigChange()
 *   - clearAllHeirs()
 *   - setProofOfLifeWallet(address)
 *   - initiateInheritanceClaim(bytes32 reasonHash)   ← guardian only
 *   - vetoInheritanceClaim()                          ← guardian only
 *   - ownerOverrideClaim()                            ← owner OR POL wallet
 *   - claimHeirShare(bytes32 secret, uint256 bps)    ← heir only
 *   - finalizeInheritanceDistribution()
 *   - withdrawFinalHeirPayout()
 *   - cleanupMemorialVault()
 *
 * Commitment helper:
 *   computeHeirCommitment({ chainId, vault, configVersion, heirGuardian, basisPoints, heirSecret })
 *     = keccak256(abi.encode("VFIDE_INHERITANCE_V1", chainId, vault, configVersion, heirGuardian, basisPoints, heirSecret))
 *
 * Reduced complexity by design: this hook reads many small pieces of state.
 * Wagmi caches each useReadContract independently, so re-renders only
 * happen when individual pieces change. No mass refetch needed.
 */

import { useEmitEvent } from '@/lib/events/EventProvider';
import type { VfideEventType } from '@/lib/events/eventTypes';
import { useCallback, useMemo } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from 'wagmi';
import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Abi,
  type Address,
  type Hex,
} from 'viem';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import CardBoundVaultInheritanceManagerABI from '@/lib/abis/CardBoundVaultInheritanceManager.json';
import { useUserVault } from './useVaultHooks';

export type InheritanceStateCode = 0 | 1 | 2 | 3 | 4;

export const INHERITANCE_STATE_LABEL: Record<InheritanceStateCode, string> = {
  0: 'Normal',
  1: 'Veto Period',
  2: 'Claim Window',
  3: 'Memorial',
  4: 'Closed',
};

export interface HeirSlot {
  /** 0..4 slot index. */
  index: number;
  /** Heir guardian address. */
  guardian: Address;
  /** Commitment hash (opaque while owner alive). */
  commitment: Hex;
}

export interface InheritanceConfigPending {
  /** Hash of (guardians, commitments, pendingVersion). Set when a proposal is active. */
  pendingConfigHash: Hex;
  /** Unix seconds when confirmInheritanceConfig can be called. */
  effectiveAt: bigint;
  /** Version that will become active on confirm. */
  pendingVersion: bigint;
  /** Number of heirs in the pending config (0 = no proposal active). */
  pendingHeirCount: number;
}

export interface InheritanceClaimData {
  /** Guardian who called initiateInheritanceClaim. Zero address if no active claim. */
  initiator: Address;
  /** Hash of the off-chain reason document. */
  reasonHash: Hex;
  /** Config version snapshotted at claim time. */
  claimConfigVersion: bigint;
  /** Total guardian vetoes counted so far. */
  vetoCount: bigint;
  /** Veto threshold (M-of-N) snapshotted at claim init. */
  vetoThreshold: bigint;
}

export interface HeirClaimStatus {
  /** Basis points the heir revealed (0 if not revealed yet). */
  revealedBps: bigint;
  /** Final basis points after redistribution (0 until finalize). */
  finalBps: bigint;
  /** Final payout amount in vfideToken units (0 until finalize). */
  payoutAmount: bigint;
  /** True iff finalized AND non-zero payout AND withdraw hasn't happened yet. */
  readyToWithdraw: boolean;
}

/** All inheritance state for the current user's vault. */
export interface InheritanceState {
  /** Manager contract address (read from vault.inheritanceManager()). */
  managerAddress: Address | undefined;
  /** True while initial reads are loading. */
  isLoading: boolean;

  /** Current state code: 0=NORMAL, 1=VETO, 2=CLAIM, 3=MEMORIAL, 4=CLOSED. */
  state: InheritanceStateCode;
  /** Unix seconds when the current window ends (0 in NORMAL/CLOSED). */
  windowEnd: bigint;

  /** Confirmed active config version (monotonically increasing). */
  configVersion: bigint;
  /** Number of confirmed heirs (0..5). */
  heirCount: number;
  /** Configured heir guardians + commitments. */
  heirs: HeirSlot[];

  /** Pre-registered proof-of-life wallet (zero address if none). */
  proofOfLifeWallet: Address;

  /** Pending config proposal (after proposeInheritanceConfig, before confirm). */
  pendingConfig: InheritanceConfigPending | null;

  /** Active claim data (zero / empty when state == NORMAL). */
  claim: InheritanceClaimData | null;
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function useInheritance(): InheritanceState & {
  // Commitment helper (pure)
  computeHeirCommitment: (args: {
    chainId: bigint;
    vault: Address;
    configVersion: bigint;
    heirGuardian: Address;
    basisPoints: bigint;
    heirSecret: Hex;
  }) => Hex;
  generateHeirSecret: () => Hex;
  // Writes
  proposeConfig: (guardians: Address[], commitments: Hex[]) => Promise<Hex>;
  confirmConfig: () => Promise<Hex>;
  cancelConfigChange: () => Promise<Hex>;
  clearAllHeirs: () => Promise<Hex>;
  setProofOfLife: (polWallet: Address) => Promise<Hex>;
  initiateClaim: (reasonHash: Hex) => Promise<Hex>;
  vetoClaim: () => Promise<Hex>;
  ownerOverride: () => Promise<Hex>;
  claimShare: (secret: Hex, basisPoints: bigint) => Promise<Hex>;
  finalizeDistribution: () => Promise<Hex>;
  withdrawPayout: () => Promise<Hex>;
  cleanupMemorial: () => Promise<Hex>;
  isWritePending: boolean;
} {
  const { vaultAddress } = useUserVault();
  const vault = (vaultAddress as Address | null) ?? undefined;
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const emitEvent = useEmitEvent();

  // ── 1. Get the manager address from the vault. ────────────────────
  const { data: managerAddressRaw } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'inheritanceManager',
    query: { enabled: !!vault && isConnected },
  });
  const managerAddress = managerAddressRaw as Address | undefined;

  // ── 2. Read state machine + version + heir count in one batch. ────
  const { data: coreReads, isLoading: isLoadingCore } = useReadContracts({
    contracts: managerAddress
      ? [
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceState' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceConfigVersion' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'heirCount' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'proofOfLifeWallet' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'pendingConfigHash' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'pendingHeirConfigEffectiveAt' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'pendingConfigVersion' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'pendingHeirCount' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceInitiator' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'inheritanceReasonHash' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'claimConfigVersion' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'vetoCount' },
          { address: managerAddress, abi: CardBoundVaultInheritanceManagerABI as readonly unknown[], functionName: 'snapshotVetoThreshold' },
        ]
      : [],
    query: {
      enabled: !!managerAddress,
      refetchInterval: 60_000, // calm — state changes rarely
    },
  });

  const stateTuple = (coreReads?.[0]?.result as readonly [number, bigint] | undefined) ?? [0, 0n];
  const state = stateTuple[0] as InheritanceStateCode;
  const windowEnd = stateTuple[1];
  const configVersion = (coreReads?.[1]?.result as bigint | undefined) ?? 0n;
  const heirCount = Number((coreReads?.[2]?.result as bigint | number | undefined) ?? 0);
  const proofOfLifeWallet = (coreReads?.[3]?.result as Address | undefined) ?? ZERO_ADDR;
  const pendingConfigHash = (coreReads?.[4]?.result as Hex | undefined) ?? ZERO_HASH;
  const effectiveAt = (coreReads?.[5]?.result as bigint | undefined) ?? 0n;
  const pendingVersion = (coreReads?.[6]?.result as bigint | undefined) ?? 0n;
  const pendingHeirCount = Number((coreReads?.[7]?.result as bigint | number | undefined) ?? 0);
  const initiator = (coreReads?.[8]?.result as Address | undefined) ?? ZERO_ADDR;
  const reasonHash = (coreReads?.[9]?.result as Hex | undefined) ?? ZERO_HASH;
  const claimConfigVersion = (coreReads?.[10]?.result as bigint | undefined) ?? 0n;
  const vetoCount = (coreReads?.[11]?.result as bigint | undefined) ?? 0n;
  const vetoThreshold = (coreReads?.[12]?.result as bigint | undefined) ?? 0n;

  // ── 3. Read each heir slot (up to MAX_HEIRS=5). ────────────────────
  // We can't dynamically size the batch by heirCount because hooks must be
  // called unconditionally, so we always read 5 slots and filter empties below.
  const { data: heirReads } = useReadContracts({
    // Imported JSON ABIs are typed as unknown[] in this repo; cast once for wagmi.
    contracts: managerAddress
      ? Array.from({ length: 5 }, (_, i) => ({
          address: managerAddress,
          abi: CardBoundVaultInheritanceManagerABI as Abi,
          functionName: 'heirGuardianByIndex' as const,
          args: [BigInt(i)],
        }))
      : [],
    query: { enabled: !!managerAddress },
  });

  const heirAddrs = useMemo<Address[]>(() => {
    const out: Address[] = [];
    if (!heirReads) return out;
    for (let i = 0; i < heirCount; i++) {
      const r = heirReads[i]?.result as Address | undefined;
      if (r && r !== ZERO_ADDR) out.push(r);
    }
    return out;
  }, [heirReads, heirCount]);

  // ── 4. Read commitment for each known heir address. ───────────────
  const { data: commitmentReads } = useReadContracts({
    contracts: managerAddress && heirAddrs.length > 0
      ? heirAddrs.map((g) => ({
          address: managerAddress,
          abi: CardBoundVaultInheritanceManagerABI as Abi,
          functionName: 'heirCommitmentByGuardian' as const,
          args: [g],
        }))
      : [],
    query: { enabled: !!managerAddress && heirAddrs.length > 0 },
  });

  const heirs = useMemo<HeirSlot[]>(() => {
    return heirAddrs.map((g, i) => ({
      index: i,
      guardian: g,
      commitment: ((commitmentReads?.[i]?.result as Hex | undefined) ?? ZERO_HASH),
    }));
  }, [heirAddrs, commitmentReads]);

  // ── 5. Compose pending + claim sub-objects. ────────────────────────
  const pendingConfig = useMemo<InheritanceConfigPending | null>(() => {
    if (effectiveAt === 0n && pendingHeirCount === 0 && pendingConfigHash === ZERO_HASH) {
      return null;
    }
    return {
      pendingConfigHash,
      effectiveAt,
      pendingVersion,
      pendingHeirCount,
    };
  }, [pendingConfigHash, effectiveAt, pendingVersion, pendingHeirCount]);

  const claim = useMemo<InheritanceClaimData | null>(() => {
    if (state === 0 || state === 4) return null;
    if (initiator === ZERO_ADDR) return null;
    return {
      initiator,
      reasonHash,
      claimConfigVersion,
      vetoCount,
      vetoThreshold,
    };
  }, [state, initiator, reasonHash, claimConfigVersion, vetoCount, vetoThreshold]);

  // ── 6. Commitment helper — domain-separated keccak per the design. ─
  // domain = keccak256("VFIDE_INHERITANCE_V1")
  // hash   = keccak256(abi.encode(domain, chainid, vault, configVersion, heirGuardian, basisPoints, heirSecret))
  const computeHeirCommitment = useCallback(
    ({
      chainId,
      vault: vaultAddr,
      configVersion: cv,
      heirGuardian,
      basisPoints,
      heirSecret,
    }: {
      chainId: bigint;
      vault: Address;
      configVersion: bigint;
      heirGuardian: Address;
      basisPoints: bigint;
      heirSecret: Hex;
    }): Hex => {
      const domain = keccak256(toBytes('VFIDE_INHERITANCE_V1'));
      const encoded = encodeAbiParameters(
        parseAbiParameters('bytes32, uint256, address, uint64, address, uint256, bytes32'),
        [domain, chainId, vaultAddr, cv, heirGuardian, basisPoints, heirSecret],
      );
      return keccak256(encoded);
    },
    [],
  );

  // Random 32-byte secret. Owners use this once per heir during setup; the
  // raw value goes into the heir's envelope and the hash goes on-chain.
  const generateHeirSecret = useCallback((): Hex => {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const arr = new Uint8Array(32);
      window.crypto.getRandomValues(arr);
      return `0x${Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')}` as Hex;
    }
    // Server-side fallback — should never happen for a write flow, but
    // we don't want this to throw in SSR. The user will get a fresh
    // secret on the client when the page hydrates.
    return ZERO_HASH;
  }, []);

  // ── 7. Write wrappers. All go through the VAULT facade. ────────────
  // Hooked through the vault so onlyAdmin / onlyGuardian gating runs.
  const withVault = useCallback(
    async <T extends readonly unknown[]>(
      functionName: string,
      args?: T,
      event?: VfideEventType,
    ): Promise<Hex> => {
      if (!vault) throw new Error('Vault not deployed');
      const hash = await writeContractAsync({
        address: vault,
        abi: CardBoundVaultABI,
        functionName,
        args: args as readonly unknown[] | undefined,
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      // Coordination event (Wave 49) — emitted only after the tx confirms. Durable so it reaches the
      // timeline/Nexus across refresh; the on-chain tx remains the authoritative record.
      if (event) emitEvent(event, { txHash: hash }, 'useInheritance', true);
      return hash;
    },
    [vault, writeContractAsync, publicClient, emitEvent],
  );

  return {
    managerAddress,
    isLoading: isLoadingCore,
    state,
    windowEnd,
    configVersion,
    heirCount,
    heirs,
    proofOfLifeWallet,
    pendingConfig,
    claim,

    computeHeirCommitment,
    generateHeirSecret,

    proposeConfig: (guardians, commitments) =>
      withVault('proposeInheritanceConfig', [guardians, commitments]),
    confirmConfig: () => withVault('confirmInheritanceConfig', undefined, 'CONTINUITY_PLAN_CREATED'),
    cancelConfigChange: () => withVault('cancelInheritanceConfigChange'),
    clearAllHeirs: () => withVault('clearAllHeirs'),
    setProofOfLife: (polWallet) => withVault('setProofOfLifeWallet', [polWallet]),
    initiateClaim: (reasonH) => withVault('initiateInheritanceClaim', [reasonH], 'BUSINESS_TRANSFER_INITIATED'),
    vetoClaim: () => withVault('vetoInheritanceClaim'),
    ownerOverride: () => withVault('ownerOverrideClaim'),
    claimShare: (secret, basisPoints) => withVault('claimHeirShare', [secret, basisPoints]),
    finalizeDistribution: () => withVault('finalizeInheritanceDistribution'),
    withdrawPayout: () => withVault('withdrawFinalHeirPayout'),
    cleanupMemorial: () => withVault('cleanupMemorialVault'),
    isWritePending,
  };
}
