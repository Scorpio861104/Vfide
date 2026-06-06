'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Droplets, X } from 'lucide-react';
import { IS_TESTNET } from '@/lib/chains';
import { useVFIDEBalance } from '@/hooks/useVFIDEBalance';

/**
 * Testnet-only nudge: when a connected wallet holds zero VFIDE, point the user
 * to the faucet so they can actually use the app. It:
 *  - renders nothing on mainnet builds (IS_TESTNET === false),
 *  - waits for a real balance read before deciding (no flash on load),
 *  - auto-hides as soon as the wallet holds any VFIDE (balance > 0n),
 *  - is dismissible for the current session.
 *
 * Mounted on the surfaces where a user looks at their money (dashboard,
 * wallet). The faucet itself lives at /testnet.
 */
export function GetTestVfideBanner({ className = '' }: { className?: string }) {
  const { address, isConnected } = useAccount();
  const { balance, isLoading, isAvailable } = useVFIDEBalance(address);
  const [dismissed, setDismissed] = useState(false);

  // Only on testnet deployments, for a connected wallet, until dismissed.
  if (!IS_TESTNET || !isConnected || !address || dismissed) return null;
  // Need a configured token + a loaded balance before deciding (avoids a flash).
  if (!isAvailable || isLoading) return null;
  // wagmi types the contract read broadly; require a real bigint before deciding.
  if (typeof balance !== 'bigint') return null;
  // They already hold VFIDE — nothing to nudge.
  if (balance > 0n) return null;

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center ${className}`}
      role="status"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="shrink-0 rounded-lg bg-amber-500/15 p-2">
          <Droplets size={18} className="text-amber-300" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100">Get free test VFIDE</p>
          <p className="mt-0.5 text-xs text-amber-100/80">
            Your wallet has no VFIDE yet. Claim 10,000 test VFIDE plus a little gas to start using the app.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
        <Link
          href="/testnet"
          className="inline-flex items-center rounded-lg bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          Open faucet
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-md p-1 text-amber-200/70 transition-colors hover:bg-amber-500/10 hover:text-amber-100"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
