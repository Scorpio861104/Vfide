'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Clock, Shield, Users } from 'lucide-react';

interface RecoveryActivePanelProps {
  recoveryStatus: {
    isActive: boolean;
    approvals: number;
    threshold: number;
    daysRemaining: number | null;
    proposedAddress: string;
  };
  isUserGuardian: boolean;
  isUserGuardianMature: boolean;
  isWritePending: boolean;
  hasVault: boolean;
  onFinalize: () => void;
  onCancel: () => void;
  onApprove: () => void;
}

export function RecoveryActivePanel({
  recoveryStatus, isUserGuardian, isUserGuardianMature,
  isWritePending, hasVault,
  onFinalize, onCancel, onApprove,
}: RecoveryActivePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-2xl p-6"
    >
      <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
        <AlertCircle size={20} />
        Active Recovery Request
      </h3>

      <div className="bg-black/30 border border-white/10 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Approvals</div>
          <div className="text-white font-bold">{recoveryStatus.approvals}/{recoveryStatus.threshold}</div>
        </div>
        <div>
          <div className="text-gray-500">Proposed Owner</div>
          <div className="text-white font-mono text-xs truncate">
            {recoveryStatus.proposedAddress}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Expires In</div>
          <div className="text-white font-bold">
            {recoveryStatus.daysRemaining !== null ? `${recoveryStatus.daysRemaining} days` : 'n/a'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onFinalize}
          disabled={isWritePending || !hasVault}
          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25"
        >
          Finalize Recovery
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          disabled={isWritePending || !hasVault}
          className="px-6 py-3 border border-red-500/50 text-red-400 rounded-xl font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          Cancel Recovery
        </motion.button>
      </div>

      {isUserGuardian && !isUserGuardianMature && (
        <p className="text-amber-300 text-sm mt-3">You are a guardian but still in the 7-day maturity period and cannot approve yet.</p>
      )}

      {isUserGuardian && isUserGuardianMature && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onApprove}
          disabled={isWritePending || !hasVault}
          className="w-full mt-3 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
        >
          Approve Recovery (Guardian)
        </motion.button>
      )}
    </motion.div>
  );
}
