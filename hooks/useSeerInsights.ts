'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { SeerSocialABI } from '@/lib/abis';

type TimelineEvent = {
  txHash: `0x${string}`;
  blockNumber: bigint;
  oldScore: number;
  newScore: number;
  reason: string;
  delta: number;
};

type SeerSystemStats = {
  recentScoreUpdates: number;
  uniqueSubjects: number;
  userAdjustments: number;
  avgDeltaAbs: number;
  pendingAppeals: number;
};

export type SeerAggregatedAnalytics = {
  generatedAt: string;
  windowHours: number;
  summary: {
    totalEvents: number;
    allowedEvents: number;
    warnedEvents: number;
    delayedEvents: number;
    blockedEvents: number;
    scoreSetEvents: number;
    appealsOpened: number;
    appealsResolved: number;
    uniqueSubjects: number;
    avgScoreDeltaAbs: number;
    avgConfidence: number;
    blockedRate: number;
    delayedRate: number;
    appealResolutionRate: number;
  };
  trends: Array<{
    day: string;
    totalEvents: number;
    blockedEvents: number;
    delayedEvents: number;
    allowedEvents: number;
  }>;
  topReasonCodes: Array<{
    code: string;
    count: number;
  }>;
};

export type SeerReasonCodeEvent = {
  txHash: `0x${string}`;
  blockNumber: bigint;
  source: 'autonomous' | 'guardian';
  reasonCode: number;
  reason: string;
};

const SCORE_SET_EVENT = parseAbiItem(
  'event ScoreSet(address indexed subject, uint16 oldScore, uint16 newScore, string reason)'
);

const SA_RESTRICTION_APPLIED_CODE_EVENT = parseAbiItem(
  'event RestrictionAppliedCode(address indexed subject, uint8 level, uint16 indexed reasonCode, string reason)'
);

const SA_CHALLENGE_RESOLVED_CODE_EVENT = parseAbiItem(
  'event ChallengeResolvedCode(address indexed subject, bool upheld, uint16 indexed reasonCode, string reason)'
);

const SG_AUTO_RESTRICTION_APPLIED_CODE_EVENT = parseAbiItem(
  'event AutoRestrictionAppliedCode(address indexed subject, uint8 rtype, uint16 indexed reasonCode, string reason)'
);

const SG_PENALTY_APPLIED_CODE_EVENT = parseAbiItem(
  'event PenaltyAppliedCode(address indexed subject, uint16 scorePenalty, uint16 indexed reasonCode, string reason)'
);

const LOG_SCAN_WINDOW = 40000n;

function clampFromBlock(blockNumber: bigint): bigint {
  return blockNumber > LOG_SCAN_WINDOW ? blockNumber - LOG_SCAN_WINDOW : 0n;
}

export function useSeerTimeline(address?: `0x${string}`) {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicClient || !address) {
        setEvents([]);
        return;
      }
      if (!isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = clampFromBlock(latest);

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.Seer,
          event: SCORE_SET_EVENT,
          args: { subject: address },
          fromBlock,
          toBlock: latest,
        });

        const mapped = logs
          .map((log) => {
            const oldScore = Number(log.args.oldScore ?? 0);
            const newScore = Number(log.args.newScore ?? 0);
            return {
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              oldScore,
              newScore,
              reason: String(log.args.reason ?? ''),
              delta: newScore - oldScore,
            } as TimelineEvent;
          })
          .sort((a, b) => Number(b.blockNumber - a.blockNumber))
          .slice(0, 12);

        if (!cancelled) {
          setEvents(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load timeline');
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  return { events, isLoading, error };
}

export function useSeerSystemStats(address?: `0x${string}`) {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<SeerSystemStats>({
    recentScoreUpdates: 0,
    uniqueSubjects: 0,
    userAdjustments: 0,
    avgDeltaAbs: 0,
    pendingAppeals: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: pendingAppealCount } = useReadContract({
    address: CONTRACT_ADDRESSES.SeerSocial,
    abi: SeerSocialABI,
    functionName: 'pendingAppealCount',
    query: {
      enabled: isConfiguredContractAddress(CONTRACT_ADDRESSES.SeerSocial),
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicClient) return;
      if (!isConfiguredContractAddress(CONTRACT_ADDRESSES.Seer)) return;

      setIsLoading(true);
      setError(null);

      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = clampFromBlock(latest);

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESSES.Seer,
          event: SCORE_SET_EVENT,
          fromBlock,
          toBlock: latest,
        });

        const subjects = new Set<string>();
        let userAdjustments = 0;
        let deltaAbsSum = 0;

        for (const log of logs) {
          const subject = String(log.args.subject ?? '');
          if (subject) subjects.add(subject.toLowerCase());

          const oldScore = Number(log.args.oldScore ?? 0);
          const newScore = Number(log.args.newScore ?? 0);
          deltaAbsSum += Math.abs(newScore - oldScore);

          if (address && subject.toLowerCase() === address.toLowerCase()) {
            userAdjustments += 1;
          }
        }

        if (!cancelled) {
          setStats((prev) => ({
            ...prev,
            recentScoreUpdates: logs.length,
            uniqueSubjects: subjects.size,
            userAdjustments,
            avgDeltaAbs: logs.length > 0 ? Number((deltaAbsSum / logs.length).toFixed(2)) : 0,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stats');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  const merged = useMemo(() => {
    return {
      ...stats,
      pendingAppeals: Number(pendingAppealCount ?? 0n),
    };
  }, [stats, pendingAppealCount]);

  return { stats: merged, isLoading, error };
}

export function useSeerReasonCodeTimeline(address?: `0x${string}`) {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<SeerReasonCodeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicClient || !address) {
        setEvents([]);
        return;
      }

      const seerAutonomous = CONTRACT_ADDRESSES.SeerAutonomous;
      const seerGuardian = CONTRACT_ADDRESSES.SeerGuardian;

      if (
        !isConfiguredContractAddress(seerAutonomous) &&
        !isConfiguredContractAddress(seerGuardian)
      ) {
        setEvents([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = clampFromBlock(latest);

        const tasks: Array<Promise<SeerReasonCodeEvent[]>> = [];

        if (isConfiguredContractAddress(seerAutonomous)) {
          tasks.push(
            publicClient
              .getLogs({
                address: seerAutonomous,
                event: SA_RESTRICTION_APPLIED_CODE_EVENT,
                args: { subject: address },
                fromBlock,
                toBlock: latest,
              })
              .then((logs) =>
                logs.map((log) => ({
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                  source: 'autonomous' as const,
                  reasonCode: Number(log.args.reasonCode ?? 0),
                  reason: String(log.args.reason ?? ''),
                }))
              )
          );

          tasks.push(
            publicClient
              .getLogs({
                address: seerAutonomous,
                event: SA_CHALLENGE_RESOLVED_CODE_EVENT,
                args: { subject: address },
                fromBlock,
                toBlock: latest,
              })
              .then((logs) =>
                logs.map((log) => ({
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                  source: 'autonomous' as const,
                  reasonCode: Number(log.args.reasonCode ?? 0),
                  reason: String(log.args.reason ?? ''),
                }))
              )
          );
        }

        if (isConfiguredContractAddress(seerGuardian)) {
          tasks.push(
            publicClient
              .getLogs({
                address: seerGuardian,
                event: SG_AUTO_RESTRICTION_APPLIED_CODE_EVENT,
                args: { subject: address },
                fromBlock,
                toBlock: latest,
              })
              .then((logs) =>
                logs.map((log) => ({
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                  source: 'guardian' as const,
                  reasonCode: Number(log.args.reasonCode ?? 0),
                  reason: String(log.args.reason ?? ''),
                }))
              )
          );

          tasks.push(
            publicClient
              .getLogs({
                address: seerGuardian,
                event: SG_PENALTY_APPLIED_CODE_EVENT,
                args: { subject: address },
                fromBlock,
                toBlock: latest,
              })
              .then((logs) =>
                logs.map((log) => ({
                  txHash: log.transactionHash,
                  blockNumber: log.blockNumber,
                  source: 'guardian' as const,
                  reasonCode: Number(log.args.reasonCode ?? 0),
                  reason: String(log.args.reason ?? ''),
                }))
              )
          );
        }

        const grouped = await Promise.all(tasks);
        const merged = grouped
          .flat()
          .sort((a, b) => Number(b.blockNumber - a.blockNumber))
          .slice(0, 20);

        if (!cancelled) {
          setEvents(merged);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reason-code timeline');
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address]);

  return { events, isLoading, error };
}

export function useSeerAggregatedAnalytics(windowHours = 24 * 7) {
  const [analytics, setAnalytics] = useState<SeerAggregatedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/seer/analytics?windowHours=${windowHours}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Seer analytics (${response.status})`);
        }

        const payload = (await response.json()) as SeerAggregatedAnalytics;
        if (!cancelled) {
          setAnalytics(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch Seer analytics');
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [windowHours]);

  return { analytics, isLoading, error };
}
