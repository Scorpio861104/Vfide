'use client';

/**
 * useRecoveryClaim — the comprehensive vault recovery flow.
 *
 * Path B in the protocol's recovery architecture (per VFIDE_ARCHITECTURE_DECISIONS.md
 * Decision 3). This is the path for users who have lost their device entirely and
 * need to recover their vault from a fresh wallet on a new device.
 *
 * Path A (the simpler `vault.proposeWalletRotation` flow, used when the user still
 * has their old device) lives in `useVaultRecovery.ts` and is unaffected by this hook.
 *
 * What this hook covers:
 *   - The CLAIMANT'S actions: initiate a claim, finalize when ready, expire stale
 *     claims they've started but abandoned
 *   - Status reads any party can use: getClaim, canFinalize, challengeTimeRemaining
 *
 * What this hook does NOT cover (separate hooks):
 *   - Guardian voting → useGuardianVote
 *   - Verifier voting → useVerifierVote
 *   - Owner-side challenge → useChallengeClaim
 *
 * Lifecycle for the claimant:
 *
 *   1. User on a new device finds their vault (via VaultRegistry search,
 *      already wired in /vault/recover).
 *   2. User calls `initiate(vaultAddress, recoveryId, reason, evidenceHash?)`.
 *      The contract requires that:
 *        - The new wallet doesn't already own a vault (no claim-and-flip attacks)
 *        - The vault either has zero trustees (anyone can initiate) OR the caller
 *          is a designated trustee
 *        - The caller is not on cooldown from a previous challenged claim
 *   3. State transitions to Pending. Guardians must vote yes (M-of-N).
 *   4. When threshold is met, state transitions to GuardianApproved. Challenge
 *      window starts. The original owner can call challengeClaim to veto.
 *   5. After the challenge window passes (claim has `challengePeriodSnapshot`
 *      seconds remaining, configurable per vault), anyone can call finalize.
 *   6. Finalize transitions ownership to the new wallet.
 *
 * Read patterns:
 *   - `claim` — the current claim data for the target vault (if any active)
 *   - `claimStatus` — derived status code for easy switch/case in UI
 *   - `canFinalize` — boolean, true when finalize() will succeed
 *   - `challengeTimeRemaining` — seconds left in the challenge window (0 if not active)
 *
 * Write patterns:
 *   - `initiate(...)` — start a claim
 *   - `finalize(claimId)` — execute the recovery once approved + window expired
 *   - `expire(claimId)` — clean up a claim that never completed
 */

import { useCallback, useMemo } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from 'wagmi';
import { type Address, type Hex, keccak256, toHex } from 'viem';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

/**
 * Claim status codes mirror the on-chain ClaimStatus enum.
 *
 * Source: VaultRecoveryClaim.sol line 73-82.
 */
export enum RecoveryClaimStatus {
  None = 0,
  Pending = 1,
  GuardianApproved = 2,
  Challenged = 3,
  Approved = 4,
  Rejected = 5,
  Expired = 6,
  Executed = 7,
}

/**
 * RecoveryClaimData mirrors the on-chain RecoveryClaim struct.
 *
 * Field order matches the struct exactly because viem decodes by position.
 * Adding a field without updating this is a silent failure.
 */
export interface RecoveryClaimData {
  vault: Address;
  claimant: Address;
  originalOwner: Address;
  initiator: Address; // R-8: who started the claim (may differ from claimant for trustee-initiated)
  initiatedAt: bigint;
  challengeEndsAt: bigint;
  expiresAt: bigint;
  status: RecoveryClaimStatus;
  guardianApprovals: number;
  verifierVotes: number;
  guardianCountSnapshot: number;
  challengePeriodSnapshot: bigint; // R-8: snapshotted veto window
  evidenceHash: Hex;
  claimReason: string;
}

/**
 * Hook arguments:
 *   - targetVault: the vault being recovered (NOT the user's own vault — the
 *     user's wallet is fresh and doesn't have a vault yet)
 */
interface UseRecoveryClaimArgs {
  targetVault: Address | undefined;
  /** Optional explicit claim ID. If omitted, the hook reads the active claim
   *  for the target vault and uses that ID. Pass an explicit ID for cases like
   *  re-finalizing a known-completed claim by reference. */
  claimId?: bigint;
}

export function useRecoveryClaim({ targetVault, claimId: explicitClaimId }: UseRecoveryClaimArgs) {
  const { address: newWalletAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();
  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;

  // ─────────────────────────────────────────────────────────────────
  // Active claim lookup
  // If no explicit claimId, look up the active claim for this vault.
  // The contract returns 0 if there's no active claim.
  // ─────────────────────────────────────────────────────────────────
  const { data: activeClaimIdRaw } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'getActiveClaimForVault',
    args: targetVault ? [targetVault] : undefined,
    query: { enabled: !!targetVault && !explicitClaimId },
  });
  const activeClaimId = (activeClaimIdRaw as bigint | undefined) ?? 0n;
  const claimId = explicitClaimId ?? activeClaimId;
  const hasClaim = claimId > 0n;

  // ─────────────────────────────────────────────────────────────────
  // Claim data + view aggregations
  // Three separate views read together (parallel via useReadContracts).
  // ─────────────────────────────────────────────────────────────────
  const { data: viewData, refetch: refetchClaim } = useReadContracts({
    contracts: hasClaim
      ? [
          {
            address: recoveryAddress,
            abi: VaultRecoveryClaimABI as any,
            functionName: 'getClaim',
            args: [claimId],
          },
          {
            address: recoveryAddress,
            abi: VaultRecoveryClaimABI as any,
            functionName: 'canFinalize',
            args: [claimId],
          },
          {
            address: recoveryAddress,
            abi: VaultRecoveryClaimABI as any,
            functionName: 'challengeTimeRemaining',
            args: [claimId],
          },
        ]
      : [],
    query: { enabled: hasClaim },
  });

  /**
   * The contract's `getClaim` returns the full struct. viem decodes it as
   * an array of positional values. We hydrate it here.
   *
   * IMPORTANT: If the struct's field order changes in Solidity, this decoder
   * must be updated. The fields are documented in the struct at the top of
   * VaultRecoveryClaim.sol; check there if the decoded shape ever feels off.
   */
  const claim: RecoveryClaimData | null = useMemo(() => {
    const raw = viewData?.[0]?.result;
    if (!raw || !Array.isArray(raw)) return null;
    return {
      vault: raw[0] as Address,
      claimant: raw[1] as Address,
      originalOwner: raw[2] as Address,
      initiator: raw[3] as Address,
      initiatedAt: raw[4] as bigint,
      challengeEndsAt: raw[5] as bigint,
      expiresAt: raw[6] as bigint,
      status: Number(raw[7]) as RecoveryClaimStatus,
      guardianApprovals: Number(raw[8]),
      verifierVotes: Number(raw[9]),
      guardianCountSnapshot: Number(raw[10]),
      challengePeriodSnapshot: raw[11] as bigint,
      evidenceHash: raw[12] as Hex,
      claimReason: raw[13] as string,
    };
  }, [viewData]);

  const canFinalize = (viewData?.[1]?.result as boolean | undefined) ?? false;
  const challengeTimeRemaining = (viewData?.[2]?.result as bigint | undefined) ?? 0n;

  // ─────────────────────────────────────────────────────────────────
  // Connected-wallet role detection
  // The frontend needs to know which UI to show based on the connected
  // wallet's relationship to this claim.
  // ─────────────────────────────────────────────────────────────────
  const isClaimant = !!newWalletAddress && claim?.claimant.toLowerCase() === newWalletAddress.toLowerCase();
  const isOriginalOwner = !!newWalletAddress && claim?.originalOwner.toLowerCase() === newWalletAddress.toLowerCase();
  const isInitiator = !!newWalletAddress && claim?.initiator.toLowerCase() === newWalletAddress.toLowerCase();

  // ─────────────────────────────────────────────────────────────────
  // Write: initiate a claim
  //
  // The recoveryId is the public identifier the vault owner registered with
  // their vault (e.g., a username, email hash, or random string). This is
  // how a claimant references which vault they want to recover without
  // needing to know the vault's contract address. The contract validates
  // the recovery ID matches.
  //
  // Reason is a short human-readable string the claimant provides ("I lost
  // my phone in a robbery on 2026-05-15"). It's stored on-chain in the
  // claim and shown to guardians during voting.
  //
  // evidenceHash (optional) is a hash of off-chain evidence (police report,
  // medical records, photo IDs) the claimant references. The hash is
  // recorded; the actual evidence lives off-chain. Pass ZERO_HASH if no
  // evidence is being attached.
  // ─────────────────────────────────────────────────────────────────
  const initiate = useCallback(
    async (args: {
      vault: Address;
      recoveryId: string;
      reason: string;
      evidenceHash?: Hex;
    }) => {
      if (!recoveryAddress || recoveryAddress === ZERO_ADDR) {
        throw new Error('VaultRecoveryClaim contract address not configured');
      }
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'initiateClaim',
        args: [args.vault, args.recoveryId, args.evidenceHash ?? ZERO_HASH, args.reason],
      });
    },
    [recoveryAddress, writeContractAsync]
  );

  /**
   * Convenience: initiate by recovery ID alone (no explicit vault address).
   * The contract resolves the recovery ID to a vault internally via
   * VaultRegistry. Use this when the user knows their recovery ID but not
   * their vault address (which is the common case for a lost-device user
   * who never wrote down their vault's hex address).
   */
  const initiateByRecoveryId = useCallback(
    async (args: { recoveryId: string; reason: string }) => {
      if (!recoveryAddress || recoveryAddress === ZERO_ADDR) {
        throw new Error('VaultRecoveryClaim contract address not configured');
      }
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'initiateClaimByRecoveryId',
        args: [args.recoveryId, args.reason],
      });
    },
    [recoveryAddress, writeContractAsync]
  );

  // ─────────────────────────────────────────────────────────────────
  // Write: finalize an approved claim
  //
  // Once the challenge window passes without veto AND guardian approvals
  // have hit threshold, anyone can finalize. Typically the claimant does
  // this themselves to complete their recovery, but it's permissionless
  // by design (in case the claimant abandons mid-flow, a guardian or
  // helper can complete the rotation).
  //
  // Pre-check: `canFinalize` view returns true when finalize() will succeed.
  // The UI should disable the finalize button when canFinalize is false
  // and explain why (challenge window still active, insufficient approvals,
  // etc.) using the claim status.
  // ─────────────────────────────────────────────────────────────────
  const finalize = useCallback(
    async (id?: bigint) => {
      const targetId = id ?? claimId;
      if (targetId === 0n) throw new Error('No claim ID specified');
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'finalizeClaim',
        args: [targetId],
      });
    },
    [claimId, recoveryAddress, writeContractAsync]
  );

  // ─────────────────────────────────────────────────────────────────
  // Write: expire a stale claim
  //
  // If a claim never gets enough guardian approvals AND the expiry window
  // passes (CLAIM_EXPIRY constant, currently 90 days), anyone can call
  // expireClaim to clean up. This frees the vault to accept a new claim.
  //
  // Permissionless on purpose: claimants who give up shouldn't be able to
  // block the vault forever.
  // ─────────────────────────────────────────────────────────────────
  const expire = useCallback(
    async (id?: bigint) => {
      const targetId = id ?? claimId;
      if (targetId === 0n) throw new Error('No claim ID specified');
      return writeContractAsync({
        address: recoveryAddress,
        abi: VaultRecoveryClaimABI as any,
        functionName: 'expireClaim',
        args: [targetId],
      });
    },
    [claimId, recoveryAddress, writeContractAsync]
  );

  // ─────────────────────────────────────────────────────────────────
  // Helper: hash a reason string into evidence hash
  // For users attaching short text-only evidence (no off-chain document),
  // the hash is just keccak256 of the text. Longer evidence (PDFs, etc.)
  // should be hashed by the caller and the hash passed in directly.
  // ─────────────────────────────────────────────────────────────────
  const hashEvidence = useCallback((text: string): Hex => {
    return keccak256(toHex(text));
  }, []);

  return {
    // Identifiers
    claimId,
    hasClaim,

    // Claim state
    claim,
    claimStatus: claim?.status ?? RecoveryClaimStatus.None,
    canFinalize,
    challengeTimeRemaining,

    // Role detection (against connected wallet)
    isClaimant,
    isOriginalOwner,
    isInitiator,

    // Writes
    initiate,
    initiateByRecoveryId,
    finalize,
    expire,
    isWritePending,
    writeError,

    // Helpers
    hashEvidence,
    refetchClaim,
  };
}
