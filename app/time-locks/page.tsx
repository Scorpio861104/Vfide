'use client';

export const dynamic = 'force-dynamic';

import { useAccount } from 'wagmi';
import { Clock, ShieldAlert } from 'lucide-react';
import { ComingSoonPage } from '@/components/feedback/ComingSoonPage';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { isFeatureEnabled } from '@/lib/features';
import {
  useTimelocks,
  formatTimelockRemaining,
  timelockProgress,
  type TimelockKind,
} from '@/hooks/useTimelocks';

const KIND_LABEL: Record<TimelockKind, string> = {
  withdrawal: 'Withdrawal',
  payment: 'Queued payment',
  spendLimits: 'Spend-limit change',
  largeTransferThreshold: 'Large-transfer threshold',
  guardianChange: 'Guardian change',
  tokenApproval: 'Token approval',
  walletRotation: 'Wallet rotation',
};

/**
 * Transaction Time Locks dashboard.
 *
 * SWITCH: gated behind NEXT_PUBLIC_ENABLE_TIME_LOCKS. Built on the real `useTimelocks` hook,
 * which aggregates pending timelocked actions from CardBoundVault (withdrawal/payment queues +
 * spend-limit / threshold / guardian / wallet-rotation change events). Flip the env var to 'true'
 * to expose this surface; until then the coming-soon page renders.
 *
 * This is read-only surfacing of the pending queue with countdowns. Cancel/execute actions hook
 * into the existing per-action hooks (useLargePaymentThreshold, etc.) and can be added per row.
 */
export default function TimeLocksPage() {
  const { locale } = useLocale();
  void locale;
  const { isConnected } = useAccount();
  const { timelocks, isLoading } = useTimelocks();

  if (!isFeatureEnabled('timeLocks')) {
    return (
      <ComingSoonPage
        title="Transaction Time Locks"
        tagline="Configurable delays for high-value outgoing payments"
        description={
          'Set tiered delay windows on outgoing transactions based on amount: tiny payments execute immediately, ' +
          'medium payments wait an hour, large payments wait a day. Gives you a window to cancel a transaction ' +
          'if your key is compromised — the attacker has to wait before draining your wallet, and you can intervene.'
        }
        requirements={[
          "User-configurable timelock contract per wallet (or integration with CardBoundVault's existing withdrawal queue)",
          'Frontend cancel-pending-transaction UI with proper authorization checks',
          "Notification path so the user is alerted to a pending high-value outflow they didn't expect",
          'Integration with the existing 48-hour governance timelocks (consistent UX patterns)',
        ]}
        alternative={{
          href: '/vault',
          label: 'Vault withdrawal queue',
          description: 'CardBoundVault already implements a withdrawal queue for high-value outflows. The user-configurable wallet-level timelock is the missing piece.',
        }}
        backHref="/"
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-2 flex items-center gap-3">
          <Clock className="text-cyan-400" size={28} aria-hidden="true" />
          <h1 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Transaction Time Locks
            </span>
          </h1>
        </div>
        <p className="text-white/60 mb-8">
          Pending timelocked actions on your vault. Each must clear its delay window before it executes —
          your window to cancel if something looks wrong.
        </p>

        {!isConnected ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 text-white/40" size={32} aria-hidden="true" />
            <p className="text-white/60">Connect your wallet to see pending timelocks.</p>
          </div>
        ) : isLoading ? (
          <p className="text-white/40">Loading pending timelocks…</p>
        ) : timelocks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/60">No pending timelocks. Nothing is waiting to execute on your vault.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {timelocks.map((t) => {
              const progress = Math.round(timelockProgress(t.executeAfter) * 100);
              const remaining = formatTimelockRemaining(t.executeAfter);
              const ready = remaining === 'ready';
              return (
                <li
                  key={t.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  data-testid="timelock-row"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold">{KIND_LABEL[t.kind]}</p>
                      {t.label && <p className="text-sm text-white/50 truncate">{t.label}</p>}
                    </div>
                    <span
                      className={
                        ready
                          ? 'shrink-0 rounded-lg bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-300'
                          : 'shrink-0 rounded-lg bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-300'
                      }
                    >
                      {ready ? 'Ready' : remaining}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={ready ? 'h-1.5 rounded-full bg-emerald-500' : 'h-1.5 rounded-full bg-cyan-500'}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
