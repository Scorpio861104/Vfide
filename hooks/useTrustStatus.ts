'use client';

/**
 * useTrustStatus - Trust Bureau engine (V28). Presentation-only reshaping of
 * useProofScore into institutional status: tier, fee impact, participation
 * standing, a qualitative trust-health label, and the top contextual trust
 * opportunities. No scoring/tier/fee mechanics are touched - every value comes
 * straight from useProofScore.
 */

import { useAccount } from 'wagmi';
import { useProofScore } from '@/hooks/useProofScore';

export type TrustHealth = 'Strong' | 'Established' | 'Building' | 'Unknown';

export interface TrustOpportunity {
  id: string;
  label: string;
  href: string;
  priority: number;
}

export interface TrustStatus {
  isConnected: boolean;
  isLoading: boolean;
  hasHistory: boolean;
  tierName: string;
  feeLabel: string;
  health: TrustHealth;
  standing: { label: string; ok: boolean }[];
  /** Sorted, highest priority first. UI shows the top 3. */
  opportunities: TrustOpportunity[];
  primaryOpportunity: TrustOpportunity | null;
  /** Compact next action for the dashboard summary card. */
  nextAction: { label: string; href: string } | null;
}

export function useTrustStatus(): TrustStatus {
  const { isConnected } = useAccount();
  const ps = useProofScore();

  const isLoading = isConnected && ps.isLoading;
  const hasHistory = !ps.isDisconnected && ps.score != null;

  const tierName = !isConnected ? 'Connect wallet' : (ps.tierName ?? 'Building');
  const feeLabel = ps.burnFee != null ? `${ps.burnFee.toFixed(2)}%` : '—';

  let health: TrustHealth;
  if (!isConnected || !hasHistory) health = 'Unknown';
  else if (ps.isElite || ps.canCouncil) health = 'Strong';
  else if (ps.canMerchant || ps.canVote) health = 'Established';
  else health = 'Building';

  const standing = [
    { label: 'Governance', ok: !!ps.canVote },
    { label: 'Merchant', ok: !!ps.canMerchant },
    { label: 'Council', ok: !!ps.canCouncil },
  ];

  const opportunities: TrustOpportunity[] = [];
  opportunities.push({ id: 'endorsements', label: 'Complete endorsements', href: '/endorsements', priority: 70 });
  opportunities.push({ id: 'academy', label: 'Complete academy foundations', href: '/seer-academy', priority: 60 });
  if (ps.canVote) opportunities.push({ id: 'governance', label: 'Participate in governance', href: '/governance', priority: 50 });
  if (ps.canMerchant) opportunities.push({ id: 'merchant', label: 'Grow merchant participation', href: '/merchant', priority: 40 });
  opportunities.push({ id: 'maintain', label: 'Maintain responsible activity', href: '/dashboard', priority: 20 });
  opportunities.sort((a, b) => b.priority - a.priority);

  const primaryOpportunity = opportunities[0] ?? null;

  return {
    isConnected,
    isLoading,
    hasHistory,
    tierName,
    feeLabel,
    health,
    standing,
    opportunities,
    primaryOpportunity,
    nextAction: primaryOpportunity ? { label: primaryOpportunity.label, href: primaryOpportunity.href } : null,
  };
}
