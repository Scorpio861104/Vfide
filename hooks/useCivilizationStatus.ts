'use client';

import { useAccount } from 'wagmi';
import { useHasVault } from '@/hooks/useHasVault';
import { useProofScore } from '@/hooks/useProofScore';
import { useMerchantStatus } from '@/hooks/useMerchantStatus';
import { useGuardians } from '@/hooks/useGuardians';
import { useInheritance } from '@/hooks/useInheritance';
import { INSTITUTIONS, type InstitutionId } from '@/lib/civilization/model';

export type ReadyState =
  | 'ready'
  | 'partial'
  | 'incomplete'
  | 'available'
  | 'locked'
  | 'loading'
  | 'disconnected';

export interface DetailRow {
  label: string;
  value: string;
  ok: boolean;
}

export interface InstitutionStatus {
  id: InstitutionId;
  label: string;
  statusLabel: string;
  state: ReadyState;
  benefit: string;
  whatItIs: string;
  homeHref: string;
  nextAction: { label: string; href: string } | null;
  detail?: DetailRow[];
}

export interface Recommendation {
  id: string;
  label: string;
  href: string;
  institutionId: InstitutionId;
  priority: number;
}

export interface CivilizationStatus {
  isConnected: boolean;
  isLoading: boolean;
  institutions: InstitutionStatus[];
  recommendations: Recommendation[];
}

const GUARDIAN_MIN = 2;

export function useCivilizationStatus(): CivilizationStatus {
  const { isConnected, address } = useAccount();

  const { hasVault, vaultAddress, isLoading: loadingVault } = useHasVault();
  const ps = useProofScore();
  const merchant = useMerchantStatus(address);
  const { guardians, isLoading: loadingGuardians } = useGuardians(
    (vaultAddress ?? undefined) as `0x${string}` | undefined,
  );
  const inh = useInheritance();

  const isLoading =
    isConnected &&
    (loadingVault || ps.isLoading || merchant.isLoading || loadingGuardians || inh.isLoading);

  const guardianCount = guardians?.length ?? 0;
  const heirCount = inh?.heirCount ?? 0;
  const score = ps.score;
  const hasTrustHistory = !ps.isDisconnected && score != null;

  const ownership: InstitutionStatus = {
    id: 'ownership',
    label: INSTITUTIONS.ownership.label,
    whatItIs: INSTITUTIONS.ownership.whatItIs,
    benefit: INSTITUTIONS.ownership.whyItExists,
    homeHref: INSTITUTIONS.ownership.homeHref,
    statusLabel: !isConnected ? 'Connect wallet' : hasVault ? 'Protected' : 'Not set up',
    state: !isConnected ? 'disconnected' : hasVault ? 'ready' : 'incomplete',
    nextAction: hasVault
      ? { label: 'Open vault', href: INSTITUTIONS.ownership.homeHref }
      : INSTITUTIONS.ownership.readiness.nextStep,
  };

  const trust: InstitutionStatus = {
    id: 'trust',
    label: INSTITUTIONS.trust.label,
    whatItIs: INSTITUTIONS.trust.whatItIs,
    benefit: INSTITUTIONS.trust.whyItExists,
    homeHref: INSTITUTIONS.trust.homeHref,
    statusLabel: !isConnected ? 'Connect wallet' : hasTrustHistory ? (ps.tierName ?? 'Growing') : 'No history',
    state: !isConnected ? 'disconnected' : hasTrustHistory ? 'ready' : 'incomplete',
    nextAction: { label: 'Build your trust', href: INSTITUTIONS.trust.homeHref },
    detail: isConnected
      ? [
          { label: 'Fee rate', value: ps.burnFee != null ? `${ps.burnFee.toFixed(2)}%` : '-', ok: ps.burnFee != null },
          { label: 'Governance', value: ps.canVote ? 'Eligible' : 'Locked', ok: !!ps.canVote },
          { label: 'Merchant', value: ps.canMerchant ? 'Eligible' : 'Locked', ok: !!ps.canMerchant },
        ]
      : undefined,
  };

  const merchantActive = merchant.isMerchant && !merchant.isSuspended;
  const commerce: InstitutionStatus = {
    id: 'commerce',
    label: INSTITUTIONS.commerce.label,
    whatItIs: INSTITUTIONS.commerce.whatItIs,
    benefit: INSTITUTIONS.commerce.whyItExists,
    homeHref: INSTITUTIONS.commerce.homeHref,
    statusLabel: !isConnected
      ? 'Available'
      : merchant.isSuspended
        ? 'Suspended'
        : merchant.isMerchant
          ? 'Active'
          : 'Available',
    state: merchantActive ? 'ready' : 'available',
    nextAction: merchantActive
      ? { label: 'Open merchant portal', href: INSTITUTIONS.commerce.homeHref }
      : INSTITUTIONS.commerce.readiness.nextStep,
    detail: [
      {
        label: 'Merchant profile',
        value: merchant.isSuspended ? 'Suspended' : merchant.isMerchant ? 'Active' : 'Not activated',
        ok: merchantActive,
      },
      { label: 'Merchant fees', value: '0%', ok: true },
    ],
  };

  const continuityReady = hasVault && guardianCount >= GUARDIAN_MIN && heirCount > 0;
  const continuityPartial = hasVault && (guardianCount > 0 || heirCount > 0);
  const continuity: InstitutionStatus = {
    id: 'continuity',
    label: INSTITUTIONS.continuity.label,
    whatItIs: INSTITUTIONS.continuity.whatItIs,
    benefit: INSTITUTIONS.continuity.whyItExists,
    homeHref: INSTITUTIONS.continuity.homeHref,
    statusLabel: !isConnected
      ? 'Connect wallet'
      : !hasVault
        ? 'Needs a vault'
        : continuityReady
          ? 'Protected'
          : continuityPartial
            ? 'Partial'
            : 'Unprotected',
    state: !isConnected
      ? 'disconnected'
      : continuityReady
        ? 'ready'
        : continuityPartial
          ? 'partial'
          : 'incomplete',
    nextAction:
      guardianCount < GUARDIAN_MIN
        ? { label: 'Add guardians', href: '/guardians' }
        : heirCount === 0
          ? { label: 'Configure inheritance', href: '/inheritance/setup' }
          : { label: 'Open continuity', href: INSTITUTIONS.continuity.homeHref },
    detail: [
      { label: 'Guardians', value: String(guardianCount), ok: guardianCount >= GUARDIAN_MIN },
      { label: 'Recovery', value: guardianCount >= 1 ? 'Ready' : 'Needs guardians', ok: guardianCount >= 1 },
      {
        label: 'Inheritance',
        value: heirCount > 0 ? `${heirCount} heir${heirCount > 1 ? 's' : ''}` : 'Not set',
        ok: heirCount > 0,
      },
    ],
  };

  const capability: InstitutionStatus = {
    id: 'capability',
    label: INSTITUTIONS.capability.label,
    whatItIs: INSTITUTIONS.capability.whatItIs,
    benefit: INSTITUTIONS.capability.whyItExists,
    homeHref: INSTITUTIONS.capability.homeHref,
    statusLabel: 'Available',
    state: 'available',
    nextAction: INSTITUTIONS.capability.readiness.nextStep,
    detail: [
      { label: 'Foundations', value: 'Start anytime', ok: true },
      { label: 'Seer guide', value: 'Open', ok: true },
    ],
  };

  const stewardship: InstitutionStatus = {
    id: 'stewardship',
    label: INSTITUTIONS.stewardship.label,
    whatItIs: INSTITUTIONS.stewardship.whatItIs,
    benefit: INSTITUTIONS.stewardship.whyItExists,
    homeHref: INSTITUTIONS.stewardship.homeHref,
    statusLabel: !isConnected ? 'Connect wallet' : ps.canVote ? 'Eligible' : 'Locked',
    state: !isConnected ? 'disconnected' : ps.canVote ? 'ready' : 'locked',
    nextAction: ps.canVote
      ? { label: 'Review governance', href: INSTITUTIONS.stewardship.homeHref }
      : { label: 'Increase trust to participate', href: INSTITUTIONS.trust.homeHref },
    detail: [
      { label: 'Governance', value: ps.canVote ? 'Eligible' : 'Locked', ok: !!ps.canVote },
      { label: 'Council', value: ps.canCouncil ? 'Eligible' : 'Locked', ok: !!ps.canCouncil },
      { label: 'Sanctum', value: 'Open to all', ok: true },
    ],
  };

  const institutions = [ownership, trust, commerce, continuity, capability, stewardship];

  const recommendations: Recommendation[] = [];
  const add = (r: Recommendation) => recommendations.push(r);

  if (!isConnected) {
    add({ id: 'connect', label: 'Connect your wallet to begin', href: '/vault', institutionId: 'ownership', priority: 100 });
  } else {
    if (!hasVault) add({ id: 'create-vault', label: 'Create your vault', href: '/vault', institutionId: 'ownership', priority: 100 });
    if (hasVault && guardianCount < GUARDIAN_MIN) add({ id: 'add-guardians', label: 'Add guardians', href: '/guardians', institutionId: 'continuity', priority: 90 });
    if (hasVault && heirCount === 0) add({ id: 'configure-inheritance', label: 'Configure inheritance', href: '/inheritance/setup', institutionId: 'continuity', priority: 80 });
    if (hasTrustHistory && !ps.canVote) add({ id: 'increase-trust', label: 'Increase trust participation', href: '/proofscore', institutionId: 'trust', priority: 60 });
    if (!merchantActive) add({ id: 'activate-merchant', label: 'Activate your merchant profile', href: '/merchant/setup', institutionId: 'commerce', priority: 50 });
    add({ id: 'academy', label: 'Complete academy foundations', href: '/seer-academy', institutionId: 'capability', priority: 40 });
    if (ps.canVote) add({ id: 'review-governance', label: 'Review governance', href: '/governance', institutionId: 'stewardship', priority: 30 });
  }

  recommendations.sort((a, b) => b.priority - a.priority);

  return { isConnected, isLoading, institutions, recommendations };
}
