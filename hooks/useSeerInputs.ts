'use client';

/**
 * useSeerInputs (Platform Transformation, Wave 3).
 *
 * Consolidates the real participant state the Seer reads — wallet connection, ProofScore, continuity readiness, and
 * merchant activity — into the deterministic engine's input shape. One place wires the hooks; the engine stays pure.
 */
import { useAccount } from 'wagmi';
import { useProofScore } from '@/hooks/useProofScore';
import { useContinuityStatus } from '@/hooks/useContinuityStatus';
import { useMerchantHealth } from '@/hooks/useMerchantHealth';
import type { SeerInputs, ContinuityReadiness } from '@/lib/seer/headquartersObservations';

export function useSeerInputs(): SeerInputs {
  const { isConnected } = useAccount();
  const { score } = useProofScore();
  const continuity = useContinuityStatus();
  const merchant = useMerchantHealth();

  const merchantActive = merchant.health !== 'Unknown' && merchant.health !== 'Inactive';

  return {
    isConnected,
    proofScore: typeof score === 'number' ? score : null,
    continuityReadiness: continuity.readiness as ContinuityReadiness,
    merchantActive,
    configured: [],
  };
}
