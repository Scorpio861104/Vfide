'use client';

import { usePublicClient } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { parseAbiItem, type Address } from 'viem';

const SEER_ADDRESS = (process.env.NEXT_PUBLIC_SEER_ADDRESS ?? '') as Address;
const LOOK_BACK_BLOCKS = BigInt(50_400); // ~7 days on Base

export type ScoreEventKind =
  | 'payment'
  | 'loan_repaid'
  | 'endorsement'
  | 'identity'
  | 'dispute'
  | 'fraud_flag'
  | 'decay'
  | 'initial'
  | 'unknown';

export interface ScoreEvent {
  kind: ScoreEventKind;
  delta: number;
  newScore: number;
  blockNumber: bigint;
  txHash: string;
  timestamp?: number;
}

function classifyDelta(delta: number): ScoreEventKind {
  if (delta === 0) return 'initial';
  if (delta >= 500) return 'identity';
  if (delta >= 200) return 'endorsement';
  if (delta >= 100) return 'loan_repaid';
  if (delta >= 20) return 'payment';
  if (delta > 0) return 'payment';
  if (delta <= -300) return 'fraud_flag';
  if (delta <= -100) return 'dispute';
  return 'decay';
}

function buildFallbackEvents(currentScore: number): ScoreEvent[] {
  const now = Date.now() / 1000;
  return [
    { kind: 'initial', delta: 0, newScore: 3000, blockNumber: 0n, txHash: '', timestamp: now - 86400 * 30 },
    { kind: 'payment', delta: 100, newScore: 3100, blockNumber: 0n, txHash: '', timestamp: now - 86400 * 20 },
    { kind: 'endorsement', delta: 250, newScore: 3350, blockNumber: 0n, txHash: '', timestamp: now - 86400 * 10 },
    { kind: 'payment', delta: currentScore - 3350, newScore: currentScore, blockNumber: 0n, txHash: '', timestamp: now - 86400 },
  ].filter(e => !isNaN(e.delta)) as ScoreEvent[];
}

export function useScoreHistory(address?: Address) {
  const client = usePublicClient();
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIllustrative, setIsIllustrative] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!address || !client || !SEER_ADDRESS) {
      setIsIllustrative(true);
      setEvents(buildFallbackEvents(5000));
      return;
    }
    setIsLoading(true);
    try {
      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestBlock > LOOK_BACK_BLOCKS ? latestBlock - LOOK_BACK_BLOCKS : 0n;

      const logs = await client.getLogs({
        address: SEER_ADDRESS,
        event: parseAbiItem('event ScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore)'),
        args: { user: address },
        fromBlock,
        toBlock: latestBlock,
      });

      if (logs.length === 0) {
        setIsIllustrative(true);
        setEvents(buildFallbackEvents(5000));
        return;
      }

      const parsed: ScoreEvent[] = logs.map((log) => {
        const oldScore = Number(log.args.oldScore ?? 0n);
        const newScore = Number(log.args.newScore ?? 0n);
        const delta = newScore - oldScore;
        return {
          kind: classifyDelta(delta),
          delta,
          newScore,
          blockNumber: log.blockNumber ?? 0n,
          txHash: log.transactionHash ?? '',
        };
      });

      // Fetch timestamps for recent events
      const withTimestamps = await Promise.all(
        parsed.map(async (e) => {
          if (!e.blockNumber) return e;
          try {
            const block = await client.getBlock({ blockNumber: e.blockNumber });
            return { ...e, timestamp: Number(block.timestamp) };
          } catch {
            return e;
          }
        })
      );

      setIsIllustrative(false);
      setEvents(withTimestamps.reverse());
    } catch (err) {
      console.error('useScoreHistory error:', err);
      setIsIllustrative(true);
      setEvents(buildFallbackEvents(5000));
    } finally {
      setIsLoading(false);
    }
  }, [address, client]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, isLoading, isIllustrative, refetch: fetchEvents };
}
