'use client';

export const dynamic = 'force-dynamic';

/**
 * /vault/pending-changes — apply or cancel timelocked admin changes.
 *
 * The page that closes M-CBV-02. Before this page existed, a user who
 * proposed a spend-limit change, large-transfer-threshold change, native
 * rescue, ERC20 rescue, token approval, or large payment threshold
 * change had no in-app way to complete or cancel the action. They'd
 * have to call the contract via Etherscan once the timelock expired.
 *
 * Guardian changes and trustee changes already had dedicated UI in
 * MyGuardiansTab (Phase 1 Turn 5), but the page surfaces them too —
 * "everything pending on your vault, in one place" is a cleaner mental
 * model than "go to tab X for type Y." We add a hint linking to the
 * guardian tab for those.
 *
 * Architecture choices:
 *
 * Why consume usePendingChanges instead of building the reads inline:
 *   The hook normalizes 7 heterogeneous pending-state shapes into a
 *   uniform PendingChange[] interface. The page just renders that array.
 *   This separation is what made it possible for Turn 1 to ship without
 *   the page existing, and the page in this turn to be small + focused.
 *
 * Why confirmation modals:
 *   Apply executes the queued change immediately (no further timelock).
 *   For changes like "approve X spender for unlimited tokens" or "rescue
 *   ETH to address Y", a misclick is unrecoverable. The modal forces a
 *   moment of intent before the action fires.
 *
 * Why this page (instead of, say, a banner on the vault dashboard):
 *   Pending changes are most often expected — the user just proposed
 *   them and is waiting for the timelock. A dedicated page is a clear
 *   place to come back to. Turn 3 of Phase 2 will add a small badge/
 *   indicator on the vault dashboard pointing here when N changes are
 *   pending, but the page itself is the primary surface.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import { useLocale } from '@/lib/locale/LocaleProvider';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Inbox,
  Settings,
  Shield,
  ChevronDown,
  ChevronUp,
  Hourglass,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
import { useVaultHub } from '@/hooks/useVaultHub';
import { usePendingChanges, type PendingChange, type PendingChangeId } from '@/hooks/usePendingChanges';
import { ACTIVE_VAULT_ABI } from '@/lib/contracts';

function formatCountdown(effectiveAt: number, canApply: boolean): string {
  if (canApply) return 'Ready to apply';
  const now = Math.floor(Date.now() / 1000);
  const remaining = effectiveAt - now;
  if (remaining <= 0) return 'Ready to apply';
  const days = Math.floor(remaining / 86_400);
  if (days >= 2) return `Ready in ${days} days`;
  if (days === 1) return 'Ready in 1 day';
  const hours = Math.floor(remaining / 3600);
  if (hours >= 2) return `Ready in ${hours} hours`;
  if (hours === 1) return 'Ready in 1 hour';
  const minutes = Math.floor(remaining / 60);
  return minutes >= 2 ? `Ready in ${minutes} minutes` : 'Ready in <1 minute';
}

/** Guardian/trustee pipelines have dedicated UI in MyGuardiansTab; mark them so we show a hint. */
const MANAGED_ELSEWHERE: PendingChangeId[] = ['guardian', 'trustee'];

export default function PendingChangesPage() {
  const { locale } = useLocale();
  void locale;

  const { address: connectedAddress } = useAccount();
  const { vaultAddress, hasVault, isLoadingVault } = useVaultHub();

  // Read vault.admin() so we can gate the apply/cancel buttons properly.
  // Only the admin can apply or cancel pending changes; anyone else clicking
  // would hit the contract's onlyAdmin guard and get a revert.
  const { data: adminAddrRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'admin',
    query: { enabled: !!vaultAddress },
  });
  const isAdmin =
    !!connectedAddress &&
    !!adminAddrRaw &&
    connectedAddress.toLowerCase() === (adminAddrRaw as string).toLowerCase();

  const { changes, apply, cancel, isWritePending, refetch } = usePendingChanges(vaultAddress);

  const [confirmingAction, setConfirmingAction] = useState<{
    id: PendingChangeId;
    kind: 'apply' | 'cancel';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!confirmingAction) return;
    setError(null);
    setSuccess(null);
    try {
      if (confirmingAction.kind === 'apply') {
        await apply(confirmingAction.id);
        setSuccess(`${confirmingAction.id} change applied.`);
      } else {
        await cancel(confirmingAction.id);
        setSuccess(`${confirmingAction.id} change cancelled.`);
      }
      setConfirmingAction(null);
      await refetch();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.details || e?.message || 'Action failed';
      setError(msg);
    }
  };

  return (
    <>
      <div className="min-h-screen md:pt-[3.5rem] text-white">
        <div className="container mx-auto max-w-3xl px-4 pb-16">
          <Link
            href="/vault"
            className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft size={16} /> Back to your vault
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
              <Hourglass className="text-cyan-400" size={28} />
              Pending changes
            </h1>
            <p className="text-gray-400 leading-relaxed">
              Timelocked admin changes you&apos;ve queued on your vault. After the timelock expires
              you can apply the change here, or cancel it before then if you change your mind.
              Some changes (guardian, trustee) are also manageable from the guardian tab.
            </p>
          </div>

          {/* Connection / vault states */}
          {!connectedAddress && (
            <GlassCard hover={false} className="p-6 text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-bold text-white mb-2">Connect your wallet</h3>
              <p className="text-sm text-gray-400">
                Connect the wallet that owns the vault to see and manage its pending changes.
              </p>
            </GlassCard>
          )}

          {connectedAddress && isLoadingVault && (
            <GlassCard hover={false} className="p-6 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading vault…</p>
            </GlassCard>
          )}

          {connectedAddress && !isLoadingVault && !hasVault && (
            <GlassCard hover={false} className="p-6 text-center">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-bold text-white mb-2">No vault on this wallet</h3>
              <p className="text-sm text-gray-400">
                You don&apos;t have a vault yet, so there&apos;s nothing to manage here.
              </p>
            </GlassCard>
          )}

          {connectedAddress && hasVault && !isAdmin && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-300 mb-1">View-only mode</p>
                  <p className="text-xs text-gray-300">
                    Your connected wallet is not the admin of this vault. You can see what&apos;s
                    pending but can&apos;t apply or cancel changes from here.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success / error feedback */}
          {success && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-300">{success}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* The list */}
          {connectedAddress && hasVault && (
            <>
              {changes.length === 0 ? (
                <GlassCard hover={false} className="p-8 text-center">
                  <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-lg font-bold text-white mb-2">No pending changes</h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    When you propose a timelocked change to your vault — spend limits, large
                    transfer threshold, token approvals, rescue operations, or large payment
                    threshold — it&apos;ll show up here while it waits for the timelock to expire.
                  </p>
                </GlassCard>
              ) : (
                <div className="space-y-4">
                  {changes.map((change) => (
                    <PendingChangeCard
                      key={change.id}
                      change={change}
                      isAdmin={isAdmin}
                      isWritePending={isWritePending}
                      onApplyClick={() => setConfirmingAction({ id: change.id, kind: 'apply' })}
                      onCancelClick={() => setConfirmingAction({ id: change.id, kind: 'cancel' })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmingAction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => !isWritePending && setConfirmingAction(null)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div
            className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-white/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {confirmingAction.kind === 'apply' ? 'Apply' : 'Cancel'}{' '}
                {changes.find((c) => c.id === confirmingAction.id)?.label.toLowerCase()}?
              </h2>
              <p className="text-sm text-gray-400 mt-2">
                {confirmingAction.kind === 'apply'
                  ? 'This will execute the queued change immediately. The action takes effect on-chain right after the transaction confirms.'
                  : 'This will remove the queued change. If you want it later, you\'ll need to propose it again from scratch and wait for the timelock to expire.'}
              </p>
            </div>
            <div className="p-6 flex justify-end gap-3 bg-black/20">
              <button
                onClick={() => setConfirmingAction(null)}
                disabled={isWritePending}
                className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={() => void handleConfirm()}
                disabled={isWritePending}
                className={`px-6 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmingAction.kind === 'apply'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/30'
                    : 'bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/30'
                }`}
              >
                {isWritePending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    {confirmingAction.kind === 'apply' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Confirm {confirmingAction.kind === 'apply' ? 'Apply' : 'Cancel'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

/**
 * One row in the pending-changes list. Kept as its own component so the
 * details disclosure has its own state (expanding one card doesn't affect others).
 */
function PendingChangeCard({
  change,
  isAdmin,
  isWritePending,
  onApplyClick,
  onCancelClick,
}: {
  change: PendingChange;
  isAdmin: boolean;
  isWritePending: boolean;
  onApplyClick: () => void;
  onCancelClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isManagedElsewhere = MANAGED_ELSEWHERE.includes(change.id);

  return (
    <GlassCard hover={false} className="p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="text-cyan-400 shrink-0" size={16} />
            <h3 className="text-sm font-bold text-white">{change.label}</h3>
            {isManagedElsewhere && (
              <Link
                href="/guardians"
                className="text-xs text-cyan-400 hover:text-cyan-300 italic"
                title="Also manageable in the guardian tab"
              >
                (also in guardian tab)
              </Link>
            )}
          </div>
          <p className="text-sm text-gray-300 break-words">{change.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Clock size={14} className={change.canApply ? 'text-emerald-400' : 'text-amber-400'} />
          <span
            className={`text-xs font-semibold ${
              change.canApply ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {formatCountdown(change.effectiveAt, change.canApply)}
          </span>
        </div>
      </div>

      {/* Effective-at full timestamp */}
      <p className="text-xs text-gray-500 mb-3">
        Effective at: {new Date(change.effectiveAt * 1000).toLocaleString()}
      </p>

      {/* Expandable details */}
      {change.details && change.details.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-200 mb-3 flex items-center gap-1"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          {expanded && (
            <div className="mb-3 p-3 rounded-lg bg-black/30 space-y-1">
              {change.details.map((d, i) => (
                <p key={i} className="text-xs text-gray-400 font-mono break-all">
                  {d}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={onApplyClick}
          disabled={!isAdmin || !change.canApply || isWritePending}
          className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
          title={
            !change.canApply
              ? 'Timelock has not yet expired'
              : !isAdmin
                ? 'Only the vault admin can apply'
                : 'Apply this change'
          }
        >
          <CheckCircle2 size={16} />
          Apply
        </button>
        {change.canCancel && (
          <button
            onClick={onCancelClick}
            disabled={!isAdmin || isWritePending}
            className="flex-1 sm:flex-initial px-4 py-2 border border-red-500/50 text-red-300 rounded-lg font-semibold text-sm hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isAdmin ? 'Cancel this pending change' : 'Only the vault admin can cancel'}
          >
            <XCircle size={16} />
            Cancel
          </button>
        )}
        {!change.canCancel && (
          <span className="text-xs text-gray-500 italic self-center">
            This pipeline doesn&apos;t support cancellation
          </span>
        )}
      </div>
    </GlassCard>
  );
}
