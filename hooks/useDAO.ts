'use client';

/**
 * useDAO — foundation hook for V1 governance UI.
 *
 * Exposes the user-facing surface of the DAO contract:
 *   • Reads — proposals, voting power, eligibility, voter stats, protocol parameters
 *   • Writes — propose, vote, finalize, withdrawProposal, expireQueuedProposal,
 *              markExecuted, executeTimelockTx, disputeFlag, pruneVoterHistory
 *
 * INTENTIONALLY EXCLUDED:
 *   • Emergency procedures (break glass, quorum rescue, emergency timelock replacement)
 *     — guardian/admin-only, rare, complex multi-step flows. Deferred to Tier 2.
 *   • Admin onlyTimelock setters (setParams, setAdmin, etc.) — only callable as the
 *     execution target of a passed proposal, not directly. Surfaced via the propose()
 *     flow with a target+data payload, not their own write paths.
 *   • acceptAdmin / cancelPendingAdmin — admin-only role lifecycle, narrowly scoped.
 *
 * ProposalType enum mirrors the contract:
 *   0 — Generic
 *   1 — Financial
 *   2 — ProtocolChange
 *   3 — SecurityAction
 *
 * Proposal status enum (from contract): Pending(0) → Active(1) → Succeeded(2) /
 * Defeated(3) → Queued(4) → Executed(5) / Expired(6) / Withdrawn(7).
 */

import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { type Address, decodeEventLog } from 'viem';
import { DAOABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

export enum ProposalType {
  Generic = 0,
  Financial = 1,
  ProtocolChange = 2,
  SecurityAction = 3,
}

export function proposalTypeLabel(t: ProposalType | number): string {
  switch (Number(t)) {
    case ProposalType.Generic:
      return 'Generic';
    case ProposalType.Financial:
      return 'Financial';
    case ProposalType.ProtocolChange:
      return 'Protocol Change';
    case ProposalType.SecurityAction:
      return 'Security Action';
    default:
      return 'Unknown';
  }
}

/**
 * Derived proposal status — computed from contract fields rather than returned
 * as an enum, because getProposalDetails only exposes `executed`/`queued`
 * booleans + voting numbers + time. The status enum lives in the frontend.
 */
export enum ProposalStatus {
  Active = 'Active',
  Ended = 'Ended', // ended but not yet finalized — passing/failing is derivable
  Succeeded = 'Succeeded', // ended, passing, not yet queued
  Defeated = 'Defeated', // ended, not passing
  Queued = 'Queued', // queued in the timelock awaiting execution
  Executed = 'Executed', // executed
  Expired = 'Expired', // queued but timelock window expired without execution
}

export function proposalStatusLabel(s: ProposalStatus): string {
  return s; // string-valued enum, label is the value itself
}

/** Decoded proposal record. Mirrors getProposalDetails return shape. */
export interface ProposalRecord {
  id: bigint;
  proposer: Address;
  ptype: ProposalType;
  target: Address;
  value: bigint;
  description: string;
  startTime: bigint; // unix seconds
  endTime: bigint; // unix seconds
  forVotes: bigint;
  againstVotes: bigint;
  executed: boolean;
  queued: boolean;
  /** Derived from executed/queued/endTime/forVotes/againstVotes — see computeProposalStatus. */
  status: ProposalStatus;
}

/**
 * Derive a friendly status from the on-chain Proposal record fields.
 *
 * Notes:
 *   - The contract's `getProposalStatus()` returns 4 string buckets:
 *     "Executed", "Queued", "Ended", "Active". This helper expands "Ended" into
 *     Succeeded/Defeated using forVotes/againstVotes for nicer UX.
 *   - Expired-while-queued is detectable via QUEUE_EXPIRY, but requires reading
 *     queuedAt — which getProposalDetails does NOT expose. So we don't compute
 *     Expired here; the user would see it through the contract's `Queued` state
 *     with the option to call `expireQueuedProposal` if eligible.
 */
export function computeProposalStatus(
  executed: boolean,
  queued: boolean,
  endTime: bigint,
  forVotes: bigint,
  againstVotes: bigint
): ProposalStatus {
  if (executed) return ProposalStatus.Executed;
  if (queued) return ProposalStatus.Queued;
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (endTime > now) return ProposalStatus.Active;
  // Ended — derive succeeded/defeated for clarity
  if (forVotes > againstVotes) return ProposalStatus.Succeeded;
  return ProposalStatus.Defeated;
}

export interface ProposeParams {
  ptype: ProposalType;
  target: Address;
  value: bigint;
  data: `0x${string}`;
  description: string;
}

export function useDAO() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const daoAddress = CONTRACT_ADDRESSES.DAO;
  const daoConfigured = isConfiguredContractAddress(daoAddress);

  // ─────────────────────────────────────────────────────────────────────────
  // READS — protocol parameters (cheap, useful for stats + display)
  // ─────────────────────────────────────────────────────────────────────────

  const { data: proposalCountRaw, refetch: refetchProposalCount } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'proposalCount',
    query: { enabled: daoConfigured },
  });

  const { data: activeProposalCountRaw, refetch: refetchActiveCount } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'activeProposalCount',
    query: { enabled: daoConfigured },
  });

  const { data: minParticipationRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'minParticipation',
    query: { enabled: daoConfigured },
  });

  const { data: effectiveMinParticipationRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'effectiveMinParticipation',
    query: { enabled: daoConfigured },
  });

  const { data: minVotesRequiredRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'minVotesRequired',
    query: { enabled: daoConfigured },
  });

  const { data: votingPeriodRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'votingPeriod',
    query: { enabled: daoConfigured },
  });

  const { data: votingDelayRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'votingDelay',
    query: { enabled: daoConfigured },
  });

  const { data: proposalCooldownRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'proposalCooldown',
    query: { enabled: daoConfigured },
  });

  const { data: totalActiveVotersRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'totalActiveVoters',
    query: { enabled: daoConfigured },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // READS — caller-specific (eligibility, voting power, fatigue, cooldown)
  // ─────────────────────────────────────────────────────────────────────────

  const { data: isEligibleRaw, refetch: refetchIsEligible } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'isEligible',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: daoConfigured && !!connectedAddress },
  });

  const { data: votingPowerRaw, refetch: refetchVotingPower } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'getVotingPower',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: daoConfigured && !!connectedAddress },
  });

  const { data: lastProposalAtRaw, refetch: refetchLastProposal } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'lastProposalAt',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: daoConfigured && !!connectedAddress },
  });

  const { data: voterStatsRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'getVoterStats',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: daoConfigured && !!connectedAddress },
  });

  const { data: fatigueInfoRaw } = useReadContract({
    address: daoAddress,
    abi: DAOABI,
    functionName: 'getFatigueInfo',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: daoConfigured && !!connectedAddress },
  });

  // Pull out concrete values
  const proposalCount = (proposalCountRaw as bigint | undefined) ?? 0n;
  const activeProposalCount = (activeProposalCountRaw as bigint | undefined) ?? 0n;
  const minParticipation = (minParticipationRaw as bigint | undefined) ?? 0n;
  const effectiveMinParticipation = (effectiveMinParticipationRaw as bigint | undefined) ?? 0n;
  const minVotesRequired = (minVotesRequiredRaw as bigint | undefined) ?? 0n;
  const votingPeriod = (votingPeriodRaw as bigint | undefined) ?? 0n;
  const votingDelay = (votingDelayRaw as bigint | undefined) ?? 0n;
  const proposalCooldown = (proposalCooldownRaw as bigint | undefined) ?? 0n;
  const totalActiveVoters = (totalActiveVotersRaw as bigint | undefined) ?? 0n;
  const isEligible = (isEligibleRaw as boolean | undefined) ?? false;
  const votingPower = (votingPowerRaw as bigint | undefined) ?? 0n;
  const lastProposalAt = (lastProposalAtRaw as bigint | undefined) ?? 0n;

  // Cooldown check — derived locally to avoid an extra RPC
  const cooldownEndsAt = lastProposalAt + proposalCooldown;
  const cooldownActive = cooldownEndsAt > BigInt(Math.floor(Date.now() / 1000));

  // ─────────────────────────────────────────────────────────────────────────
  // WRITES
  // ─────────────────────────────────────────────────────────────────────────

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const assertReady = () => {
    if (!daoConfigured) throw new Error('DAO is not configured for this environment');
    if (!connectedAddress) throw new Error('Wallet not connected');
  };

  /**
   * Submit a new proposal.
   *
   * Returns the new proposal id. The id is extracted from the ProposalCreated event
   * in the transaction receipt — falling back to undefined if the event can't be
   * found (won't happen on a successful submission, but defensive).
   */
  const propose = useCallback(
    async ({ ptype, target, value, data, description }: ProposeParams): Promise<bigint | undefined> => {
      assertReady();
      const hash = await writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'propose',
        args: [ptype, target, value, data, description],
      });
      // Wait for the receipt and pull the id out of the ProposalCreated event
      if (!publicClient) return undefined;
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: DAOABI, data: log.data, topics: log.topics });
          if (decoded.eventName === 'ProposalCreated') {
            const args = decoded.args as { id?: bigint; proposalId?: bigint };
            return args.id ?? args.proposalId;
          }
        } catch {
          // Not a DAO event, skip
        }
      }
      // Best-effort: refresh proposal count so consumers can refetch lists
      await Promise.all([refetchProposalCount(), refetchActiveCount(), refetchLastProposal()]);
      return undefined;
    },
    [writeContractAsync, daoAddress, publicClient, refetchProposalCount, refetchActiveCount, refetchLastProposal]
  );

  /** Cast a vote on an active proposal. support=true is FOR, support=false is AGAINST. */
  const vote = useCallback(
    async (proposalId: bigint, support: boolean) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'vote',
        args: [proposalId, support],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /** Finalize a proposal once voting has ended. Anyone can call. */
  const finalize = useCallback(
    async (proposalId: bigint) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'finalize',
        args: [proposalId],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /** Withdraw your own pending proposal. Proposer-only, only valid while Pending or Active. */
  const withdrawProposal = useCallback(
    async (proposalId: bigint) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'withdrawProposal',
        args: [proposalId],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /** Expire a Queued proposal that wasn't executed within the timelock window. Anyone can call. */
  const expireQueuedProposal = useCallback(
    async (proposalId: bigint) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'expireQueuedProposal',
        args: [proposalId],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /** Mark a proposal as executed (post-execution bookkeeping). */
  const markExecuted = useCallback(
    async (proposalId: bigint) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'markExecuted',
        args: [proposalId],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /** Execute the timelock tx for a passed proposal. Permissionless after timelock window. */
  const executeTimelockTx = useCallback(
    async (proposalId: bigint) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'executeTimelockTx',
        args: [proposalId],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /**
   * File a dispute against a user's Seer score decision, with a human-readable
   * reason. Emits DisputeFlagged for DAO review (the DAO can override Seer).
   * Caller must meet the governance ProofScore eligibility threshold.
   */
  const disputeFlag = useCallback(
    async (user: Address, reason: string) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'disputeFlag',
        args: [user, reason],
      });
    },
    [writeContractAsync, daoAddress]
  );

  /** Prune your own voter history (gas-pays for storage reduction). */
  const pruneVoterHistory = useCallback(
    async (count: bigint) => {
      assertReady();
      return writeContractAsync({
        address: daoAddress as Address,
        abi: DAOABI,
        functionName: 'pruneVoterHistory',
        args: [count],
      });
    },
    [writeContractAsync, daoAddress]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Read helper — load a single proposal by id with one call
  // ─────────────────────────────────────────────────────────────────────────

  const fetchProposal = useCallback(
    async (id: bigint): Promise<ProposalRecord | null> => {
      if (!publicClient || !daoConfigured) return null;
      try {
        const result = (await publicClient.readContract({
          address: daoAddress as Address,
          abi: DAOABI,
          functionName: 'getProposalDetails',
          args: [id],
        })) as readonly unknown[];
        // getProposalDetails returns 11 fields. Handle either tuple or named-field returns.
        const r = result as any;
        const proposer = (r.proposer ?? r[0]) as Address;
        const ptype = Number(r.ptype ?? r[1]) as ProposalType;
        const target = (r.target ?? r[2]) as Address;
        const value = (r.value ?? r[3]) as bigint;
        const description = (r.description ?? r[4]) as string;
        const startTime = (r.startTime ?? r[5]) as bigint;
        const endTime = (r.endTime ?? r[6]) as bigint;
        const forVotes = (r.forVotes ?? r[7]) as bigint;
        const againstVotes = (r.againstVotes ?? r[8]) as bigint;
        const executed = (r.executed ?? r[9]) as boolean;
        const queued = (r.queued ?? r[10]) as boolean;
        return {
          id,
          proposer,
          ptype,
          target,
          value,
          description,
          startTime,
          endTime,
          forVotes,
          againstVotes,
          executed,
          queued,
          status: computeProposalStatus(executed, queued, endTime, forVotes, againstVotes),
        };
      } catch {
        return null;
      }
    },
    [publicClient, daoAddress, daoConfigured]
  );

  /**
   * Check whether the connected wallet has voted on a specific proposal.
   * Cheap read — useful for hiding vote buttons after they've already voted.
   */
  const hasVotedOn = useCallback(
    async (proposalId: bigint, voter?: Address): Promise<boolean> => {
      const who = voter ?? connectedAddress;
      if (!publicClient || !daoConfigured || !who) return false;
      try {
        const result = await publicClient.readContract({
          address: daoAddress as Address,
          abi: DAOABI,
          functionName: 'hasVoted',
          args: [proposalId, who],
        });
        return result as boolean;
      } catch {
        return false;
      }
    },
    [publicClient, daoAddress, daoConfigured, connectedAddress]
  );

  return {
    // Configuration
    daoAddress,
    daoConfigured,

    // Protocol-level reads
    proposalCount,
    activeProposalCount,
    minParticipation,
    effectiveMinParticipation,
    minVotesRequired,
    votingPeriod,
    votingDelay,
    proposalCooldown,
    totalActiveVoters,

    // Caller-specific reads
    isEligible,
    votingPower,
    lastProposalAt,
    cooldownEndsAt,
    cooldownActive,
    voterStatsRaw,
    fatigueInfoRaw,

    // Refetches
    refetchProposalCount,
    refetchActiveCount,
    refetchIsEligible,
    refetchVotingPower,
    refetchLastProposal,

    // Helpers
    fetchProposal,
    hasVotedOn,

    // Writes
    propose,
    vote,
    finalize,
    withdrawProposal,
    expireQueuedProposal,
    markExecuted,
    executeTimelockTx,
    disputeFlag,
    pruneVoterHistory,
    isWritePending,
  };
}
