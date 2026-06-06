'use client';

/**
 * useFraudRegistry — foundation hook for the FraudRegistry user-facing surface.
 *
 * The FraudRegistry implements community-driven fraud reporting with protocol-wide
 * consequences:
 *   • Users with ProofScore ≥ 5000 file complaints against an address
 *   • At 3 complaints, the address enters PENDING_REVIEW (48h appeal window)
 *   • DAO decides: confirmFraud (→ flagged) / dismissComplaints (→ penalize reporters) / clearFlag
 *   • Flagged addresses are service-banned and carry a fraud risk signal. No funds are
 *     ever held, frozen, or escrowed (the former 30-day hold was removed for non-custody)
 *   • DAO can escalate to permanent ban via a 7-day timelock
 *
 * Exposed write paths (this hook):
 *   • fileComplaint(target, reason) — eligible user reports fraud
 *   • processDismissedComplaintPenalties — anyone, after DAO dismisses complaints
 *
 * INTENTIONALLY NOT IN THIS HOOK:
 *   • clearFlag / confirmFraud / dismissComplaints — DAO-only. These are reached via DAO
 *     proposal templates in CreateTab (Phase 5 Turn 3), not as direct writes.
 *   • escrowTransfer — called internally by VFIDEToken._transfer when a flagged user
 *     transfers. Not a user-facing UI action.
 *   • setPermanentBan / applyPermanentBan / cancelPermanentBan — timelocked admin flow,
 *     deferred to Tier 2.
 *   • setDAO / setVaultHub timelocked admin — Tier 2 operational concern.
 *   • rescueExcessTokens — emergency admin recovery, Tier 2.
 */

import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { type Address } from 'viem';
import { FraudRegistryABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

/** Aggregated fraud status for an address. Mirrors getFraudStatus return shape. */
export interface FraudStatus {
  totalComplaints: number;
  pendingReview: boolean;
  flagged: boolean;
  permanentlyBanned: boolean;
  flagTimestamp: bigint;
  pendingEscrowCount: bigint;
}

/** Derived high-level status enum for cleaner UI display. */
export enum FraudStatusBucket {
  Clean = 'Clean',
  HasComplaints = 'HasComplaints', // 1-2 complaints, not yet under review
  PendingReview = 'PendingReview', // 3+ complaints, in 48h appeal window
  Flagged = 'Flagged', // DAO confirmed fraud
  PermanentlyBanned = 'PermanentlyBanned',
}

export function deriveFraudStatusBucket(s: FraudStatus): FraudStatusBucket {
  if (s.permanentlyBanned) return FraudStatusBucket.PermanentlyBanned;
  if (s.flagged) return FraudStatusBucket.Flagged;
  if (s.pendingReview) return FraudStatusBucket.PendingReview;
  if (s.totalComplaints > 0) return FraudStatusBucket.HasComplaints;
  return FraudStatusBucket.Clean;
}

export function fraudStatusLabel(b: FraudStatusBucket): string {
  switch (b) {
    case FraudStatusBucket.Clean:
      return 'No complaints';
    case FraudStatusBucket.HasComplaints:
      return 'Has complaints';
    case FraudStatusBucket.PendingReview:
      return 'Pending DAO review';
    case FraudStatusBucket.Flagged:
      return 'Flagged for fraud';
    case FraudStatusBucket.PermanentlyBanned:
      return 'Permanently banned';
  }
}

export interface ComplaintRecord {
  reporter: Address;
  reason: string;
  timestamp: bigint;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function useFraudRegistry() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const fraudAddress = CONTRACT_ADDRESSES.FraudRegistry;
  const fraudConfigured = isConfiguredContractAddress(fraudAddress);

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRACT CONSTANTS — read once, useful as bounds for UI gating
  // ─────────────────────────────────────────────────────────────────────────

  const { data: complaintsToFlagRaw } = useReadContract({
    address: fraudAddress,
    abi: FraudRegistryABI,
    functionName: 'COMPLAINTS_TO_FLAG',
    query: { enabled: fraudConfigured },
  });

  const { data: minReporterScoreRaw } = useReadContract({
    address: fraudAddress,
    abi: FraudRegistryABI,
    functionName: 'MIN_REPORTER_SCORE',
    query: { enabled: fraudConfigured },
  });

  const { data: pendingReviewWindowRaw } = useReadContract({
    address: fraudAddress,
    abi: FraudRegistryABI,
    functionName: 'PENDING_REVIEW_APPEAL_WINDOW',
    query: { enabled: fraudConfigured },
  });

  const { data: complaintReporterPenaltyRaw } = useReadContract({
    address: fraudAddress,
    abi: FraudRegistryABI,
    functionName: 'COMPLAINT_REPORTER_PENALTY',
    query: { enabled: fraudConfigured },
  });

  const complaintsToFlag = Number(complaintsToFlagRaw ?? 3);
  const minReporterScore = Number(minReporterScoreRaw ?? 6000);
  const pendingReviewWindow = (pendingReviewWindowRaw as bigint | undefined) ?? 0n; // seconds
  const complaintReporterPenalty = Number(complaintReporterPenaltyRaw ?? 50);


  // ─────────────────────────────────────────────────────────────────────────
  // ARBITRARY-ADDRESS READS — used by the lookup view
  // ─────────────────────────────────────────────────────────────────────────

  /** Fetch the aggregate fraud status for any address. */
  const fetchStatus = useCallback(
    async (target: Address): Promise<FraudStatus | null> => {
      if (!publicClient || !fraudConfigured) return null;
      try {
        const result = (await publicClient.readContract({
          address: fraudAddress as Address,
          abi: FraudRegistryABI,
          functionName: 'getFraudStatus',
          args: [target],
        })) as readonly unknown[];
        const r = result as any;
        return {
          totalComplaints: Number(r.totalComplaints ?? r[0]),
          pendingReview: Boolean(r.pendingReview ?? r[1]),
          flagged: Boolean(r.flagged ?? r[2]),
          permanentlyBanned: Boolean(r.permanentlyBanned ?? r[3]),
          flagTimestamp: (r.flagTimestamp ?? r[4]) as bigint,
          pendingEscrowCount: (r.pendingEscrowCount ?? r[5]) as bigint,
        };
      } catch {
        return null;
      }
    },
    [publicClient, fraudAddress, fraudConfigured]
  );

  /** Fetch the full complaint list for a target address. */
  const fetchComplaints = useCallback(
    async (target: Address): Promise<ComplaintRecord[]> => {
      if (!publicClient || !fraudConfigured) return [];
      try {
        const result = (await publicClient.readContract({
          address: fraudAddress as Address,
          abi: FraudRegistryABI,
          functionName: 'getComplaints',
          args: [target],
        })) as readonly [readonly Address[], readonly string[], readonly bigint[]];
        const [reporters, reasons, timestamps] = result;
        return reporters.map((reporter, i) => ({
          reporter,
          reason: reasons[i]!,
          timestamp: timestamps[i]!,
        }));
      } catch {
        return [];
      }
    },
    [publicClient, fraudAddress, fraudConfigured]
  );

  /** Check whether the connected wallet has already complained about `target`. */
  const fetchHasComplained = useCallback(
    async (target: Address, reporter?: Address): Promise<boolean> => {
      const who = reporter ?? connectedAddress;
      if (!publicClient || !fraudConfigured || !who) return false;
      try {
        const result = await publicClient.readContract({
          address: fraudAddress as Address,
          abi: FraudRegistryABI,
          functionName: 'hasComplained',
          args: [target, who],
        });
        return result as boolean;
      } catch {
        return false;
      }
    },
    [publicClient, fraudAddress, fraudConfigured, connectedAddress]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // WRITES
  // ─────────────────────────────────────────────────────────────────────────

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const assertReady = () => {
    if (!fraudConfigured) throw new Error('FraudRegistry is not configured for this environment');
    if (!connectedAddress) throw new Error('Wallet not connected');
  };

  /**
   * File a fraud complaint against `target` with a free-text reason.
   *
   * Requirements (enforced by contract):
   *   - target ≠ zero, target ≠ vault address, target ≠ msg.sender
   *   - msg.sender's ProofScore ≥ MIN_REPORTER_SCORE (5000)
   *   - msg.sender hasn't already complained about target in current epoch
   *   - target isn't already pendingReview, flagged, or permanently banned
   */
  const fileComplaint = useCallback(
    async (target: Address, reason: string) => {
      assertReady();
      if (target === ZERO_ADDRESS) throw new Error('Target address required');
      if (!reason.trim()) throw new Error('Reason required');
      return writeContractAsync({
        address: fraudAddress as Address,
        abi: FraudRegistryABI,
        functionName: 'fileComplaint',
        args: [target, reason],
      });
    },
    [writeContractAsync, fraudAddress]
  );

  /**
   * Process penalty deductions on reporters whose complaints were dismissed.
   * Permissionless — uses a cursor, processes up to `maxCount` per call.
   */
  const processDismissedComplaintPenalties = useCallback(
    async (target: Address, maxCount: bigint) => {
      assertReady();
      return writeContractAsync({
        address: fraudAddress as Address,
        abi: FraudRegistryABI,
        functionName: 'processDismissedComplaintPenalties',
        args: [target, maxCount],
      });
    },
    [writeContractAsync, fraudAddress]
  );

  return {
    // Configuration
    fraudAddress,
    fraudConfigured,

    // Constants
    complaintsToFlag,
    minReporterScore,
    pendingReviewWindow,
    complaintReporterPenalty,

    // Arbitrary-address read helpers
    fetchStatus,
    fetchComplaints,
    fetchHasComplained,

    // Writes
    fileComplaint,
    processDismissedComplaintPenalties,
    isWritePending,
  };
}
