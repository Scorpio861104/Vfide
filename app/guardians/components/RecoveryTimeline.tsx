// @ts-nocheck
'use client';

import { motion } from 'framer-motion';
import { Key, Timer, Users, CheckCircle2, ArrowRightCircle, Lock } from 'lucide-react';

const TIMELINE_STEPS = [
  { icon: Key, bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/50', iconColor: 'text-cyan-400', title: 'Recovery Requested', desc: 'A mature guardian selected by the vault owner opens the recovery request.' },
  { icon: Timer, bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/50', iconColor: 'text-yellow-400', title: '7-Day Minimum Timelock', desc: 'Recovery cannot finalize before the timelock. Owner can cancel fraudulent requests.' },
  { icon: Users, bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50', iconColor: 'text-green-400', title: 'Guardian Approvals', desc: 'Mature guardians approve by majority snapshot (minimum 2 guardians required).' },
  { icon: CheckCircle2, bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50', iconColor: 'text-green-400', title: 'Finalize Recovery', desc: 'Anyone can call finalizeRecovery() once threshold met' },
  { icon: ArrowRightCircle, bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/50', iconColor: 'text-cyan-400', title: 'Ownership Transferred', desc: 'Vault now owned by new address. Full access restored.' },
];

export function RecoveryTimeline() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Recovery Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500/50 via-yellow-500/50 to-green-500/50" />
          <div className="space-y-6">
            {TIMELINE_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-4 relative"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${step.bgColor} border ${step.borderColor}`}>
                  <step.icon size={16} className={step.iconColor} />
                </div>
                <div className="pt-1">
                  <div className="text-white font-bold text-sm">{step.title}</div>
                  <div className="text-gray-400 text-xs">{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Lock size={18} className="text-yellow-400" />
          Special Case: Next of Kin Without Guardians
        </h3>
        <p className="text-gray-400 text-sm">
          If your vault has <strong className="text-white">no guardians</strong> and recovery is requested by Next of Kin, approval threshold is reduced,
          but finalization still enforces the minimum 7-day timelock.
        </p>
      </motion.div>
    </>
  );
}
