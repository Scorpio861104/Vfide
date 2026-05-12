'use client';

/**
 * WizardMount — global mount point for the VaultSetupWizard.
 *
 * Two responsibilities:
 *
 *   1. Auto-show the wizard for first-time users (wallet connected, no
 *      vault yet, wizard enabled, no completed chapters).
 *
 *   2. Force-show the wizard if the URL has ?wizard=1, so a "Reopen
 *      wizard" link can pull the wizard back up after the user turned
 *      it off. When the user closes the wizard, we drop the ?wizard=1
 *      param so they don't get stuck in a "X doesn't actually close it"
 *      loop.
 *
 * Routes we never auto-show on (the user is mid-task on a specific page
 * or it's a public surface that should stay clean):
 *
 *   - /checkout/[id]   — payment in progress
 *   - /legal           — they're reading terms
 *   - /api/*           — server only, doesn't reach here anyway
 *
 * The wizard itself decides whether to render based on shared context
 * state (enabled, isComplete). This wrapper only governs the *initial*
 * show on first wallet connect and the forceOpen flag.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { VaultSetupWizard } from './VaultSetupWizard';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useWizardState } from './useWizardState';

const AUTO_SUPPRESS_PATHS = ['/checkout', '/legal', '/api'];

export function WizardMount() {
  const { isConnected } = useAccount();
  const { hasVault, isLoadingVault, vaultHubConfigured } = useVaultHub();
  const wizard = useWizardState();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Force-open if the URL has ?wizard=1 — used by the launch button.
  const forceOpen = (searchParams?.get('wizard') ?? '') === '1';

  // Suppress auto-show on certain routes.
  const onSuppressedRoute = useMemo(
    () => AUTO_SUPPRESS_PATHS.some((p) => pathname?.startsWith(p) ?? false),
    [pathname],
  );

  // We don't want the wizard to bounce back on every page navigation —
  // only on the first wallet-connect moment per session.
  const [autoLaunchedThisSession, setAutoLaunchedThisSession] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    if (!vaultHubConfigured) return;
    if (isLoadingVault) return;
    if (hasVault) return; // vault exists → user is past the required chapter
    if (onSuppressedRoute) return;
    if (autoLaunchedThisSession) return;

    // Only auto-show if the user hasn't explicitly turned the wizard off
    // and isn't already mid-flow (completed/skipped > 0 means they've
    // engaged before — let them come back deliberately).
    if (!wizard.state.enabled) return;
    if (wizard.state.completedChapters.length > 0) return;
    if (wizard.state.skippedChapters.length > 0) return;

    // OK — show. Nothing to do; the wizard will render itself based on
    // state.enabled. We just record that the auto-launch fired so we
    // don't keep re-evaluating.
    setAutoLaunchedThisSession(true);
  }, [
    isConnected,
    hasVault,
    isLoadingVault,
    vaultHubConfigured,
    onSuppressedRoute,
    autoLaunchedThisSession,
    wizard.state.enabled,
    wizard.state.completedChapters.length,
    wizard.state.skippedChapters.length,
  ]);

  // When the wizard closes, drop ?wizard=1 from the URL so forceOpen
  // doesn't immediately re-show it.
  const handleClose = useCallback(() => {
    if (!forceOpen) return;
    if (typeof window === 'undefined') return;
    // Preserve any other query params; just remove wizard.
    const url = new URL(window.location.href);
    url.searchParams.delete('wizard');
    const qs = url.searchParams.toString();
    const newPath = url.pathname + (qs ? `?${qs}` : '');
    router.replace(newPath, { scroll: false });
  }, [forceOpen, router]);

  return <VaultSetupWizard forceOpen={forceOpen} onClose={handleClose} />;
}
