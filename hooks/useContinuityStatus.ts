'use client';

/**
 * useContinuityStatus - the Continuity Command Center engine (V26).
 *
 * Composes existing hooks into one continuity read-model: readiness, guardian,
 * recovery, inheritance, security, and memorial sections. Only existing
 * signals; no invented mechanics. Security is informational (device/log level,
 * not an on-chain continuity guarantee), so it never gates readiness.
 */

import { useAccount } from 'wagmi';
import { useHasVault } from '@/hooks/useHasVault';
import { useGuardians } from '@/hooks/useGuardians';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { useRecoveryClaim, RecoveryClaimStatus } from '@/hooks/useRecoveryClaim';
import { useInheritance } from '@/hooks/useInheritance';

export type ContinuityReadiness = 'protected' | 'partial' | 'incomplete' | 'unknown';
export type SectionState = 'ok' | 'partial' | 'missing' | 'active' | 'info';

export interface SectionDetail {
  label: string;
  value: string;
  ok: boolean;
}

export interface ContinuitySection {
  id: 'guardians' | 'recovery' | 'inheritance' | 'security' | 'memorial';
  title: string;
  state: SectionState;
  currentState: string;
  benefit: string;
  risk: string;
  nextAction: { label: string; href: string } | null;
  detail?: SectionDetail[];
}

/** Inheritance state codes (mirror useInheritance): 0 NORMAL, 1 VETO, 2 CLAIM,
 *  3 MEMORIAL, 4 CLOSED. */
export type TimelineStage = 'life' | 'recovery' | 'claim' | 'veto' | 'distribution' | 'memorial' | 'closure';

export interface ContinuityStatus {
  isConnected: boolean;
  hasVault: boolean;
  isLoading: boolean;
  readiness: ContinuityReadiness;
  /** Count of configured continuity pillars (guardians, recovery, inheritance). */
  configuredCount: number;
  guardianCount: number;
  threshold: number;
  guardianOk: boolean;
  recoveryConfigured: boolean;
  recoveryPending: boolean;
  inheritanceConfigured: boolean;
  memorialActive: boolean;
  overrideAvailable: boolean;
  /** Current stage on the continuity timeline. */
  currentStage: TimelineStage;
  /** Top risk sentence for compact summaries (dashboard card). */
  topRisk: string | null;
  /** Single most important next action for compact summaries. */
  topAction: { label: string; href: string } | null;
  sections: ContinuitySection[];
}

const RECOVERY_ACTIVE = new Set<RecoveryClaimStatus>([
  RecoveryClaimStatus.Pending,
  RecoveryClaimStatus.GuardianApproved,
  RecoveryClaimStatus.Approved,
  RecoveryClaimStatus.Challenged,
]);

const RECOVERY_LABEL: Record<number, string> = {
  [RecoveryClaimStatus.None]: 'No active claim',
  [RecoveryClaimStatus.Pending]: 'Awaiting guardians',
  [RecoveryClaimStatus.GuardianApproved]: 'Challenge window open',
  [RecoveryClaimStatus.Challenged]: 'Claim challenged',
  [RecoveryClaimStatus.Approved]: 'Ready to finalize',
  [RecoveryClaimStatus.Executed]: 'Recovery complete',
  [RecoveryClaimStatus.Rejected]: 'Claim rejected',
  [RecoveryClaimStatus.Expired]: 'Claim expired',
};

export function useContinuityStatus(): ContinuityStatus {
  const { isConnected } = useAccount();
  const { hasVault, vaultAddress, isLoading: loadingVault } = useHasVault();
  const vault = (vaultAddress ?? undefined) as `0x${string}` | undefined;

  const { guardians, isLoading: loadingGuardians } = useGuardians(vault);
  const recovery = useVaultRecovery(vault);
  const claim = useRecoveryClaim({ targetVault: vault });
  const inh = useInheritance();

  const isLoading =
    isConnected && (loadingVault || loadingGuardians || inh.isLoading);

  // Signals
  const guardianCount = guardians?.length ?? recovery.guardianCount ?? 0;
  const threshold = recovery.recoveryStatus?.threshold ?? 0;
  const guardianOk = threshold > 0 ? guardianCount >= threshold : guardianCount >= 2;

  const recoveryConfigured = !!recovery.recoverySupported && guardianCount >= 1 && threshold > 0;
  const recoveryPending = claim.hasClaim && RECOVERY_ACTIVE.has(claim.claimStatus);
  const recoveryLabel = RECOVERY_LABEL[claim.claimStatus] ?? 'No active claim';

  const heirCount = inh.heirCount ?? 0;
  const inheritanceConfigured = heirCount > 0;
  const memorialActive = inh.state === 3;
  const inheritanceClosed = inh.state === 4;
  const overrideAvailable = inheritanceConfigured;

  // Readiness
  const configuredCount = [guardianOk, recoveryConfigured, inheritanceConfigured].filter(Boolean).length;
  let readiness: ContinuityReadiness;
  if (!isConnected || isLoading) readiness = 'unknown';
  else if (!hasVault) readiness = 'incomplete';
  else if (configuredCount === 3) readiness = 'protected';
  else if (configuredCount >= 1) readiness = 'partial';
  else readiness = 'incomplete';

  // Timeline current stage (from the real state machine)
  let currentStage: TimelineStage = 'life';
  if (recoveryPending) currentStage = 'recovery';
  else if (inh.state === 1) currentStage = 'veto';
  else if (inh.state === 2) currentStage = 'claim';
  else if (inh.state === 3) currentStage = 'memorial';
  else if (inh.state === 4) currentStage = 'closure';

  const guardiansSection: ContinuitySection = {
    id: 'guardians',
    title: 'Guardians',
    state: guardianOk ? 'ok' : guardianCount > 0 ? 'partial' : 'missing',
    currentState: !hasVault
      ? 'No vault yet'
      : threshold > 0
        ? `${guardianCount} of ${threshold} required`
        : `${guardianCount} guardian${guardianCount === 1 ? '' : 's'}`,
    benefit: 'Guardians can help return access to a new wallet if yours is lost.',
    risk: guardianOk
      ? 'None - your recovery quorum is met.'
      : guardianCount === 0
        ? 'No one can help you recover access.'
        : 'Too few guardians to reach the recovery threshold.',
    nextAction: guardianOk ? { label: 'Manage guardians', href: '/guardians' } : { label: 'Add guardians', href: '/guardians' },
    detail: [
      { label: 'Guardians', value: String(guardianCount), ok: guardianOk },
      { label: 'Threshold', value: threshold > 0 ? `${threshold} required` : 'Not set', ok: threshold > 0 },
      { label: 'You are a guardian', value: recovery.isUserGuardian ? 'Yes' : 'No', ok: !!recovery.isUserGuardian },
    ],
  };

  const recoverySection: ContinuitySection = {
    id: 'recovery',
    title: 'Recovery',
    state: recoveryPending ? 'active' : recoveryConfigured ? 'ok' : 'missing',
    currentState: recoveryPending ? recoveryLabel : recoveryConfigured ? 'Configured' : 'Not configured',
    benefit: 'If your wallet is lost, guardians can return control to a new wallet.',
    risk: recoveryConfigured
      ? recoveryPending
        ? 'A recovery claim is in progress on this vault.'
        : 'None - recovery is ready.'
      : 'You could be permanently locked out if you lose your wallet.',
    nextAction: recoveryPending
      ? { label: 'Track recovery', href: '/vault/recover/status' }
      : recoveryConfigured
        ? { label: 'Review recovery', href: '/vault/recover' }
        : { label: 'Set up guardians', href: '/guardians' },
  };

  const inheritanceSection: ContinuitySection = {
    id: 'inheritance',
    title: 'Inheritance',
    state: memorialActive ? 'active' : inheritanceConfigured ? 'ok' : 'missing',
    currentState: memorialActive
      ? 'Memorial active'
      : inheritanceClosed
        ? 'Closed'
        : inheritanceConfigured
          ? `${heirCount} heir${heirCount === 1 ? '' : 's'} configured`
          : 'Not configured',
    benefit: 'Your assets pass to the heirs you choose if you can no longer act.',
    risk: inheritanceConfigured
      ? 'None - succession is configured.'
      : 'Without heirs, what you built may not survive you.',
    nextAction: inheritanceConfigured
      ? { label: 'Manage inheritance', href: '/inheritance/status' }
      : { label: 'Configure inheritance', href: '/inheritance/setup' },
    detail: [
      { label: 'Heirs', value: heirCount > 0 ? String(heirCount) : 'None', ok: inheritanceConfigured },
      { label: 'Memorial', value: memorialActive ? 'Active' : 'Inactive', ok: true },
      { label: 'Override', value: overrideAvailable ? 'Available' : 'Not available', ok: overrideAvailable },
    ],
  };

  const securitySection: ContinuitySection = {
    id: 'security',
    title: 'Security',
    state: 'info',
    currentState: 'Device & monitoring',
    benefit: 'Biometric unlock, security logs, and threat detection add a layer on top of recovery.',
    risk: 'Optional, but recommended for high-value vaults.',
    nextAction: { label: 'Open security center', href: '/security-center' },
  };

  const memorialSection: ContinuitySection = {
    id: 'memorial',
    title: 'Memorial',
    state: memorialActive ? 'active' : 'info',
    currentState: memorialActive ? 'Memorial active' : inheritanceClosed ? 'Closed' : 'Inactive',
    benefit: 'A memorial preserves the record once a vault has passed to heirs.',
    risk: 'None.',
    nextAction: memorialActive ? { label: 'View memorial', href: '/inheritance/memorial' } : null,
  };

  const sections = [guardiansSection, recoverySection, inheritanceSection, securitySection, memorialSection];

  const priority = [guardiansSection, recoverySection, inheritanceSection];
  const firstGap = priority.find((s) => s.state === 'missing' || s.state === 'partial');
  const topRisk = firstGap ? firstGap.risk : readiness === 'protected' ? null : 'Connect your wallet to assess continuity.';
  const topAction = firstGap?.nextAction ?? null;

  return {
    isConnected,
    hasVault,
    isLoading,
    readiness,
    configuredCount,
    guardianCount,
    threshold,
    guardianOk,
    recoveryConfigured,
    recoveryPending,
    inheritanceConfigured,
    memorialActive,
    overrideAvailable,
    currentStage,
    topRisk,
    topAction,
    sections,
  };
}
