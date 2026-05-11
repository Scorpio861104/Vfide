'use client';

/**
 * LiveProofScoreProvider
 *
 * Reads the connected wallet's ProofScore from the on-chain Seer contract
 * via wagmi and feeds it into PieMenuContextProvider so the V-button ring
 * color matches the user's actual trust tier.
 *
 * Behavior:
 *   - No wallet connected: ring shows neutral (5000 / amber)
 *   - Seer address not configured: ring shows neutral (5000 / amber)
 *   - Read in flight or errored: ring shows neutral (5000 / amber)
 *   - Read succeeded: ring shows the live score (4-tier color per
 *     PieMenuEnhancements.SCORE_COLORS)
 *
 * This component intentionally degrades silently — the ring should never
 * be a blocker for navigation. A misconfigured Seer address or a
 * disconnected wallet just falls back to the default tier.
 *
 * Wired into the layout tree at components/layout/ClientLayout.tsx,
 * above AppShell, so PieMenu (rendered inside AppShell) inherits the
 * context value.
 */

import { ReactNode } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { PieMenuContextProvider } from '@/components/navigation/PieMenu';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress, SeerABI } from '@/lib/contracts';

const NEUTRAL_SCORE = 5000;

interface LiveProofScoreProviderProps {
  children: ReactNode;
}

export function LiveProofScoreProvider({ children }: LiveProofScoreProviderProps) {
  const { address, isConnected } = useAccount();
  const seerAddress = CONTRACT_ADDRESSES.Seer;
  const seerConfigured = isConfiguredContractAddress(seerAddress);

  const { data } = useReadContract({
    address: seerAddress,
    abi: SeerABI,
    functionName: 'getScore',
    args: address ? [address] : undefined,
    query: {
      // Only run when wallet is connected AND a Seer address is configured.
      // Without this, wagmi would call getScore(undefined) and throw.
      enabled: isConnected && seerConfigured && !!address,
      // ProofScore changes slowly; cache for 60s so the ring doesn't
      // refetch on every component remount.
      staleTime: 60_000,
      // Don't retry forever on a broken RPC — fall back to neutral after
      // the first failure so the UI stays responsive.
      retry: 1,
    },
  });

  let score = NEUTRAL_SCORE;
  if (typeof data === 'bigint') {
    // Seer.getScore returns uint256 capped at 10_000. Clamp here defensively.
    const raw = Number(data);
    if (Number.isFinite(raw) && raw >= 0 && raw <= 10_000) {
      score = raw;
    }
  }

  return (
    <PieMenuContextProvider score={score}>
      {children}
    </PieMenuContextProvider>
  );
}
