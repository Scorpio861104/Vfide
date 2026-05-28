'use client';

/**
 * RecoveryTimeline — 5-step visual + guardrails callout for CardBound wallet rotation.
 *
 * Pre-cleanup, this had a parallel non-CardBound (legacy "Chain of Return")
 * timeline plus a "Next of Kin without guardians" guardrails card.
 * Removed — those paths are unreachable in this build.
 */

import { motion } from 'framer-motion';
import { Key, Timer, Users, CheckCircle2, ArrowRightCircle, Lock } from 'lucide-react';

const TIMELINE_STEPS = [
  {
    icon: Key,
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-accent/50',
    iconColor: 'text-cyan-400',
    title: 'Rotation Proposed',
    desc: 'The current CardBound vault admin proposes a new active wallet for the vault.',
  },
  {
    icon: Timer,
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    iconColor: 'text-yellow-400',
    title: 'Timelock Window',
    desc: 'The proposal stays pending until the configured delay has elapsed.',
  },
  {
    icon: Users,
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    iconColor: 'text-green-400',
    title: 'Guardian Approvals',
    desc: 'Assigned guardians approve the pending wallet rotation on-chain.',
  },
  {
    icon: CheckCircle2,
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    iconColor: 'text-green-400',
    title: 'Finalize Rotation',
    desc: 'Anyone can call finalizeWalletRotation() once the delay and approval threshold are satisfied.',
  },
  {
    icon: ArrowRightCircle,
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-accent/50',
    iconColor: 'text-cyan-400',
    title: 'Wallet Updated',
    desc: 'The vault keeps custody while the new wallet becomes the active signer.',
  },
] as const;

export function RecoveryTimeline() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Wallet Rotation Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500/50 via-yellow-500/50 to-green-500/50" />
          <div className="space-y-6">
            {TIMELINE_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-4 relative"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${step.bgColor} border ${step.borderColor}`}
                >
                  <step.icon size={16} className={step.iconColor} />
                </div>
                <div className="pt-1 min-w-0">
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
          CardBound Guardrails
        </h3>
        <p className="text-gray-400 text-sm">
          CardBound mode uses guardian-backed wallet rotation for recovery. Guardians approve
          signer changes, and the vault remains in place while authority rotates. For inheritance
          configuration and heir management, see the Inheritance tab.
        </p>
      </motion.div>
    </>
  );
}
