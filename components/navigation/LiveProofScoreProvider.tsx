'use client';

/**
 * LiveProofScoreProvider
 *
 * Supplies the PieMenu ring with a neutral ProofScore immediately, then reads
 * the connected wallet's score after hydration when a wallet is actually
 * connected. Keep contract metadata out of this module's top-level imports:
 * ClientLayout mounts this provider globally, and importing @/lib/contracts here
 * initializes the full ABI/address table during every route's first compile.
 */

import { ReactNode, useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { PieMenuContextProvider } from '@/components/navigation/PieMenuContext';

const NEUTRAL_SCORE = 5000;

interface LiveProofScoreProviderProps {
  children: ReactNode;
}

export function LiveProofScoreProvider({ children }: LiveProofScoreProviderProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [score, setScore] = useState(NEUTRAL_SCORE);

  useEffect(() => {
    let cancelled = false;

    if (!isConnected || !address || !publicClient) {
      setScore(NEUTRAL_SCORE);
      return;
    }

    const connectedAddress = address;
    const client = publicClient;

    async function loadScore() {
      try {
        const contracts = await import('@/lib/contracts');
        const seerAddress = contracts.CONTRACT_ADDRESSES.Seer;

        if (!contracts.isConfiguredContractAddress(seerAddress)) {
          if (!cancelled) setScore(NEUTRAL_SCORE);
          return;
        }

        const data = await client.readContract({
          address: seerAddress,
          abi: contracts.SeerABI,
          functionName: 'getScore',
          args: [connectedAddress],
        });

        if (cancelled) return;

        if (typeof data === 'bigint') {
          const raw = Number(data);
          if (Number.isFinite(raw) && raw >= 0 && raw <= 10_000) {
            setScore(raw);
            return;
          }
        }

        setScore(NEUTRAL_SCORE);
      } catch {
        if (!cancelled) setScore(NEUTRAL_SCORE);
      }
    }

    void loadScore();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, publicClient]);

  return (
    <PieMenuContextProvider score={score}>
      {children}
    </PieMenuContextProvider>
  );
}
