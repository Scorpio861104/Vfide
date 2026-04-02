'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { QuickWalletConnect } from './QuickWalletConnect';

export interface PremiumWalletConnectProps {
  showBalance?: boolean;
  showChain?: boolean;
  compact?: boolean;
  onSettingsClick?: () => void;
}

/**
 * @deprecated Legacy premium wallet entrypoint kept as a compatibility shim.
 * The actively maintained wallet UX now lives in `QuickWalletConnect`.
 */
export function PremiumWalletConnect({
  compact = false,
  onSettingsClick,
}: PremiumWalletConnectProps) {
  return (
    <div className={compact ? 'inline-flex' : 'flex flex-col gap-3'}>
      {!compact && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-zinc-400">
          Premium wallet flows now use the shared one-click connection experience.
        </div>
      )}

      <div className="flex items-center gap-2">
        <QuickWalletConnect size={compact ? 'sm' : 'md'} />
        {onSettingsClick ? (
          <button
            type="button"
            onClick={onSettingsClick}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500/40 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PremiumWalletConnectCompact() {
  return <PremiumWalletConnect compact showBalance={false} />;
}

export default PremiumWalletConnect;
