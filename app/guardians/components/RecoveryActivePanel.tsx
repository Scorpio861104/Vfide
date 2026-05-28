'use client';

/**
 * RecoveryActivePanel — shown when there's an active wallet rotation.
 *
 * Pre-cleanup, this panel had a parallel non-CardBound recovery flow
 * (with a "Cancel Recovery" button, a 7-day-maturity guard before
 * guardians could approve, and different terminology like "Active
 * Recovery Request" vs "Expires In"). That flow doesn't exist in this
 * build — `isCardBoundVaultMode()` is hard-coded to true and the legacy
 * `cancelRecovery` path on the recovery hook throws unconditionally.
 * All non-CardBound branches removed.
 *
 * Note: `isUserGuardianMature` is intentionally NOT consulted here.
 * Maturity is checked on-chain at vote time for CardBound vaults; the
 * frontend doesn't need to enforce a frontend-side 7-day wait.
 */

import { m } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface RecoveryActivePanelProps {
  recoveryStatus: {
    isActive: boolean;
    approvals: number;
    threshold: number;
    daysRemaining: number | null;
    proposedOwner: string | null;
  };
  isUserGuardian: boolean;
  isWritePending: boolean;
  hasVault: boolean;
  onFinalize: () => void;
  onApprove: () => void;
}

export function RecoveryActivePanel({
  recoveryStatus,
  isUserGuardian,
  isWritePending,
  hasVault,
  onFinalize,
  onApprove,
}: RecoveryActivePanelProps) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-2xl p-6"
    >
      <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
        <AlertCircle size={20} />
        Active Wallet Rotation
      </h3>

      <div className="bg-black/30 border border-white/10 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="min-w-0">
          <div className="text-gray-500">Approvals</div>
          <div className="text-white font-bold">
            {recoveryStatus.approvals}/{recoveryStatus.threshold}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-gray-500">Proposed Wallet</div>
          <div className="text-white font-mono text-xs truncate">
            {recoveryStatus.proposedOwner ?? 'n/a'}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-gray-500">Activates In</div>
          <div className="text-white font-bold">
            {recoveryStatus.daysRemaining !== null
              ? `${recoveryStatus.daysRemaining} day${recoveryStatus.daysRemaining === 1 ? '' : 's'}`
              : 'n/a'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <m.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onFinalize}
          disabled={isWritePending || !hasVault}
          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 disabled:opacity-50"
        >
          Finalize Rotation
        </m.button>
      </div>

      {isUserGuardian && (
        <m.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApprove}
          disabled={isWritePending || !hasVault}
          className="w-full mt-3 py-3 bg-gradient-to-r from-accent to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-accent/25 disabled:opacity-50"
        >
          Approve Rotation (Guardian)
        </m.button>
      )}
    </m.div>
  );
}
