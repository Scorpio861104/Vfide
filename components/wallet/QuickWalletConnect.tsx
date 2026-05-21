'use client';

/**
 * QuickWalletConnect — primary wallet connect button with smart connector
 * selection. Used on dashboards and onboarding flows where we want the user
 * to land on the most appropriate connector for their device without making
 * them click through the full wallet picker.
 *
 * The pure helper `selectPrimaryConnector` is exported separately so the
 * selection rules can be unit-tested without rendering React or wagmi state.
 *
 * Selection rules (must stay in sync with __tests__/components/
 * quick-wallet-connect-selection.test.ts):
 *
 *   1. On mobile (isMobile === true), prefer a connector whose id or name
 *      contains "walletconnect" (case-insensitive). On mobile, opening the
 *      injected MetaMask connector usually fails because the user is in a
 *      regular mobile browser, not the MetaMask in-app browser.
 *
 *   2. On desktop (isMobile === false), prefer a MetaMask-like connector.
 *      We accept several id/name variants the wagmi ecosystem produces:
 *      - id === 'metaMask'
 *      - id === 'io.metamask' (EIP-6963 multi-injected discovery)
 *      - name (lowercased) contains 'metamask'
 *
 *   3. Fallback: a generic 'injected' connector (the user has *some* browser
 *      wallet but it's not specifically recognised).
 *
 *   4. Final fallback: the first connector in the list, or null if empty.
 */

import { useMemo } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';

export type ConnectorLike = {
  id: string;
  name: string;
};

const norm = (s: string | undefined): string => (s ?? '').toLowerCase();

/**
 * Pure connector picker — exported for unit tests.
 * Does NOT call any wagmi/React APIs.
 */
export function selectPrimaryConnector<T extends ConnectorLike>(
  connectors: readonly T[],
  isMobile: boolean
): T | null {
  if (!connectors || connectors.length === 0) return null;

  const find = (predicate: (c: T) => boolean): T | undefined =>
    connectors.find(predicate);

  if (isMobile) {
    // 1. Prefer WalletConnect on mobile.
    const wc = find(
      (c) => norm(c.id).includes('walletconnect') || norm(c.name).includes('walletconnect')
    );
    if (wc) return wc;
  } else {
    // 2. Prefer MetaMask on desktop.
    const mm = find((c) => {
      const id = norm(c.id);
      const name = norm(c.name);
      return (
        id === 'metamask' ||
        id === 'io.metamask' ||
        id.endsWith('.metamask') ||
        name.includes('metamask')
      );
    });
    if (mm) return mm;
  }

  // 3. Fallback to a generic injected connector.
  const injected = find((c) => norm(c.id) === 'injected');
  if (injected) return injected;

  // 4. Last resort: first connector available.
  return connectors[0] ?? null;
}

function detectIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|blackberry|opera mini|iemobile/i.test(
    navigator.userAgent
  );
}

export interface QuickWalletConnectProps {
  /** Optional className applied to the outer button. */
  className?: string;
  /** Optional label override; defaults to a sensible string per state. */
  label?: string;
  /** Called once a wallet successfully connects. */
  onConnected?: (address: `0x${string}`) => void;
}

export function QuickWalletConnect({
  className,
  label,
  onConnected,
}: QuickWalletConnectProps) {
  const { connect, connectors, isPending, error } = useConnect({
    mutation: {
      onSuccess: (data) => {
        const acct = data?.accounts?.[0];
        if (acct && onConnected) onConnected(acct as `0x${string}`);
      },
    },
  });
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const primary = useMemo(
    () => selectPrimaryConnector(connectors, detectIsMobile()),
    [connectors]
  );

  if (isConnected && address) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
        title={address}
      >
        {label ?? `Disconnect (${address.slice(0, 6)}…${address.slice(-4)})`}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={!primary || isPending}
      onClick={() => {
        if (primary) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (connect as unknown as (args: { connector: unknown }) => void)({
            connector: primary,
          });
        }
      }}
      aria-label="Connect wallet"
    >
      {label ?? (isPending ? 'Connecting…' : 'Connect Wallet')}
      {error ? <span className="sr-only">{error.message}</span> : null}
    </button>
  );
}

export default QuickWalletConnect;
