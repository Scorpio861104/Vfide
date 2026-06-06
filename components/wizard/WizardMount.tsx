'use client';

/**
 * WizardMount — global mount point for the VaultSetupWizard.
 *
 * Keep this wrapper lightweight. The full vault wizard imports many contract
 * hooks and chapter components, so only load it when the user is connected and
 * the wizard can actually render, or when a launch URL explicitly asks for it
 * with ?wizard=1.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useVaultHub } from '@/hooks/useVaultHub';
import { useWizardState } from './useWizardState';

const VaultSetupWizard = dynamic(
  () => import('./VaultSetupWizard').then((mod) => mod.VaultSetupWizard),
  { ssr: false },
);

const AUTO_SUPPRESS_PATHS = ['/checkout', '/legal', '/api'];

function WizardMountConnected({ forceOpen, onClose }: { forceOpen: boolean; onClose: () => void }) {
  const { hasVault, isLoadingVault, vaultHubConfigured } = useVaultHub();
  const wizard = useWizardState();
  const pathname = usePathname();

  const onSuppressedRoute = useMemo(
    () => AUTO_SUPPRESS_PATHS.some((p) => pathname?.startsWith(p) ?? false),
    [pathname],
  );
  const [autoLaunchedThisSession, setAutoLaunchedThisSession] = useState(false);

  const canAutoRender =
    vaultHubConfigured &&
    !isLoadingVault &&
    !hasVault &&
    !onSuppressedRoute &&
    !autoLaunchedThisSession &&
    wizard.state.enabled &&
    wizard.state.completedChapters.length === 0 &&
    wizard.state.skippedChapters.length === 0;

  useEffect(() => {
    if (!canAutoRender) return;
    setAutoLaunchedThisSession(true);
  }, [canAutoRender]);

  if (!forceOpen && !canAutoRender) return null;

  return <VaultSetupWizard forceOpen={forceOpen} onClose={onClose} />;
}

export function WizardMount() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceOpen = (searchParams?.get('wizard') ?? '') === '1';

  const handleClose = useCallback(() => {
    if (!forceOpen) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('wizard');
    const qs = url.searchParams.toString();
    const newPath = url.pathname + (qs ? `?${qs}` : '');
    router.replace(newPath, { scroll: false });
  }, [forceOpen, router]);

  if (!isConnected && !forceOpen) return null;

  return <WizardMountConnected forceOpen={forceOpen} onClose={handleClose} />;
}
