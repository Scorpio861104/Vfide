'use client';

/**
 * useMerchantHealth — Merchant Headquarters engine (V27).
 *
 * Composes the rich on-chain merchant read (useIsMerchant: isMerchant,
 * isSuspended, businessName, totalVolume, txCount), trust (useProofScore), and
 * continuity (useContinuityStatus) into one commerce read-model. Only existing
 * signals. Where a metric has no on-chain source (retention, loyalty,
 * subscriptions), it is surfaced as an opportunity link, never a fabricated
 * number.
 */

import { useAccount } from 'wagmi';
import { useIsMerchant } from '@/hooks/useMerchantHooks';
import { useProofScore } from '@/hooks/useProofScore';
import { useContinuityStatus } from '@/hooks/useContinuityStatus';

export type MerchantHealthState = 'Healthy' | 'Growing' | 'At Risk' | 'Inactive' | 'Unknown';

export interface HealthRow {
  label: string;
  value: string;
  ok: boolean;
  href?: string;
  /** informational rows have no pass/fail meaning */
  info?: boolean;
}

export interface ReadinessChip {
  label: string;
  ok: boolean;
}

export interface MerchantHealth {
  isConnected: boolean;
  isLoading: boolean;
  isMerchant: boolean;
  isSuspended: boolean;
  businessName: string;
  txCount: number;
  volume: number;
  volumeLabel: string;
  health: MerchantHealthState;
  /**
   * De-collided display label (Wave 84 civilization audit). The crude on-chain state measures account
   * ACTIVITY (has the merchant transacted?), which is a different thing from the composite Merchant Health
   * score. To avoid two "health" vocabularies contradicting each other across surfaces, this label reads as
   * account status ("Active" / "Getting started") rather than reusing the composite's words
   * ("healthy" / "thriving"). Surfaces that show a single health figure should prefer the composite.
   */
  healthLabel: string;
  /** Part 1 - activity rows. */
  activity: HealthRow[];
  /** Part 2 - readiness chips. */
  readiness: ReadinessChip[];
  /** Part 3 - trust impact. */
  trust: { tierName: string; feeLabel: string; canMerchant: boolean; canVote: boolean };
  /** Part 5 - business continuity. */
  continuity: {
    readiness: 'protected' | 'partial' | 'incomplete' | 'unknown';
    guardianOk: boolean;
    recoveryConfigured: boolean;
    inheritanceConfigured: boolean;
    topAction: { label: string; href: string } | null;
  };
  /** Compact top action for the dashboard summary card. */
  topAction: { label: string; href: string } | null;
}

export function useMerchantHealth(): MerchantHealth {
  const { address, isConnected } = useAccount();
  const m = useIsMerchant(address);
  const ps = useProofScore(address);
  const c = useContinuityStatus();

  const isLoading = isConnected && (m.isLoading || ps.isLoading || c.isLoading);

  const isMerchant = !!m.isMerchant;
  const isSuspended = !!m.isSuspended;
  const txCount = m.txCount ?? 0;
  const volume = Number.parseFloat(m.totalVolume ?? '0') || 0;
  const volumeLabel = volume > 0 ? `${volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '0';
  const businessName = m.businessName || '';

  // Health
  let health: MerchantHealthState;
  if (!isConnected || isLoading) health = 'Unknown';
  else if (!isMerchant) health = 'Inactive';
  else if (isSuspended) health = 'At Risk';
  else if (txCount > 0) health = 'Healthy';
  else health = 'Growing';

  // De-collided account-status label (Wave 84) — distinct from the composite Merchant Health vocabulary
  // so the two never appear to contradict each other on different surfaces.
  const HEALTH_LABELS: Record<MerchantHealthState, string> = {
    Unknown: '—',
    Inactive: 'Not active',
    'At Risk': 'Attention needed',
    Healthy: 'Active',
    Growing: 'Getting started',
  };
  const healthLabel = HEALTH_LABELS[health];

  const continuityProtected = c.readiness === 'protected';

  // Part 1: activity
  const activity: HealthRow[] = [
    { label: 'Customer activity', value: txCount > 0 ? `${txCount} payment${txCount === 1 ? '' : 's'}` : 'No payments yet', ok: txCount > 0, href: '/merchant/customers' },
    { label: 'Revenue activity', value: volume > 0 ? volumeLabel : 'No revenue yet', ok: volume > 0, href: '/merchant/analytics' },
    { label: 'Subscriptions', value: 'Manage recurring plans', ok: false, info: true, href: '/merchant/subscriptions' },
    { label: 'Trust activity', value: ps.canMerchant ? (ps.tierName ?? 'Eligible') : 'Building', ok: !!ps.canMerchant, href: '/proofscore' },
    { label: 'Business continuity', value: continuityProtected ? 'Protected' : c.readiness === 'partial' ? 'Partial' : 'Unprotected', ok: continuityProtected, href: '/continuity' },
  ];

  // Part 2: readiness
  const readiness: ReadinessChip[] = [
    { label: 'Business', ok: isMerchant && !isSuspended },
    { label: 'Trust', ok: !!ps.canMerchant },
    { label: 'Commerce', ok: isMerchant && !isSuspended },
    { label: 'Continuity', ok: continuityProtected },
  ];

  // Part 3: trust impact
  const trust = {
    tierName: !isConnected ? 'Connect wallet' : (ps.tierName ?? 'Building'),
    feeLabel: ps.burnFee != null ? `${ps.burnFee.toFixed(2)}%` : '-',
    canMerchant: !!ps.canMerchant,
    canVote: !!ps.canVote,
  };

  // Part 5: business continuity
  const continuity = {
    readiness: c.readiness,
    guardianOk: c.guardianOk,
    recoveryConfigured: c.recoveryConfigured,
    inheritanceConfigured: c.inheritanceConfigured,
    topAction: c.topAction,
  };

  // Top action
  let topAction: { label: string; href: string } | null = null;
  if (!isConnected) topAction = { label: 'Connect your wallet', href: '/merchant' };
  else if (!isMerchant) topAction = { label: 'Activate merchant profile', href: '/merchant/setup' };
  else if (isSuspended) topAction = { label: 'Resolve suspension', href: '/support' };
  else if (!continuityProtected) topAction = c.topAction ?? { label: 'Protect your business', href: '/continuity' };
  else topAction = { label: 'Open merchant tools', href: '/merchant/analytics' };

  return {
    isConnected,
    isLoading,
    isMerchant,
    isSuspended,
    businessName,
    txCount,
    volume,
    volumeLabel,
    health,
    healthLabel,
    activity,
    readiness,
    trust,
    continuity,
    topAction,
  };
}
