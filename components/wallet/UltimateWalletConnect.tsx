'use client';

import React from 'react';
import { ArrowRight, Settings, Send, Download } from 'lucide-react';
import { QuickWalletConnect } from './QuickWalletConnect';

export interface UltimateWalletConnectProps {
  showBalance?: boolean;
  showChain?: boolean;
  showQuickActions?: boolean;
  enableKeyboardShortcuts?: boolean;
  onSend?: () => void;
  onReceive?: () => void;
  onSwap?: () => void;
  onSettingsClick?: () => void;
  className?: string;
}

/**
 * @deprecated Legacy ultimate wallet surface consolidated into the
 * maintained quick-connect entry point to avoid duplicate wallet flows.
 */
export function UltimateWalletConnect({
  showQuickActions = true,
  onSend,
  onReceive,
  onSwap,
  onSettingsClick,
  className = '',
}: UltimateWalletConnectProps) {
  const quickActions = [
    onSend ? { label: 'Send', icon: Send, onClick: onSend } : null,
    onReceive ? { label: 'Receive', icon: Download, onClick: onReceive } : null,
    onSwap ? { label: 'Swap', icon: ArrowRight, onClick: onSwap } : null,
    onSettingsClick ? { label: 'Settings', icon: Settings, onClick: onSettingsClick } : null,
  ].filter((action): action is { label: string; icon: typeof Send; onClick: () => void } => Boolean(action));

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
          Ultimate wallet mode now routes through the shared quick-connect experience.
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <QuickWalletConnect size="md" />

          {showQuickActions && quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500/40 hover:text-white transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function UltimateWalletConnectCompact() {
  return <UltimateWalletConnect showBalance={false} showQuickActions={false} />;
}

export default UltimateWalletConnect;
