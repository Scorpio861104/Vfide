'use client';

import { motion } from 'framer-motion';
import { Shield, Clock } from 'lucide-react';
import { GuardianConstellation } from '@/components/security/GuardianConstellation';

export function OverviewTab() {
  const recoverySteps = [
    { step: '1', title: 'Admin Proposes Rotation', desc: 'The active CardBound vault admin proposes a new wallet address.' },
    { step: '2', title: 'Guardians Review', desc: 'Guardians verify the owner off-chain and approve the pending wallet rotation.' },
    { step: '3', title: 'Timelock Elapses', desc: 'The on-chain rotation delay runs before the change can be finalized.' },
    { step: '4', title: 'Rotation Finalized', desc: 'The new wallet becomes the active signer for the existing vault.' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* My Constellation — live visualization of the user's own guardians */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-accent/5 backdrop-blur-xl border border-purple-500/30 p-8">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-accent mb-4">
          Your Guardian Constellation
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Each star is a guardian. Lines brighten with recent on-chain activity (cancellations, approvals). Hover a star for details.
        </p>
        <div className="flex justify-center">
          <GuardianConstellation size={340} />
        </div>
      </div>

      {/* What is a Guardian */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 to-blue-500/5 backdrop-blur-xl border border-accent/30 p-8">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400 mb-6 flex items-center gap-3">
          <Shield className="w-7 h-7 text-accent" />
          What is a Guardian?
        </h2>
        <p className="text-white leading-relaxed mb-4">
          Guardians are trusted individuals who can help vault owners recover access if they lose their wallet.
          Being a guardian is a <strong>responsibility</strong>, not a privilege.
        </p>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">
            <strong className="text-amber-400">⚠️ Important:</strong> Guardians cannot access funds directly.
            They can only approve a wallet rotation that moves the active signer for the vault to a new address.
          </p>
        </div>
        <div className="bg-cyan-500/10 rounded-xl p-4 border border-accent/30 mt-3">
          <p className="text-accent text-sm">
            Guardians are a private trust list chosen by each vault holder (typically family/friends). This is not an open guardian network.
          </p>
          <p className="text-accent/90 text-sm mt-2">
            VFIDE social features can help you discover, invite, and coordinate with trusted people, but guardian assignment is always explicit owner consent.
          </p>
        </div>
      </div>

      {/* How Wallet Rotation Works */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Clock className="w-7 h-7 text-accent" />
          How Wallet Rotation Works
        </h2>
        <div className="space-y-4">
          {recoverySteps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-blue-500 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-cyan-500/25">
                {item.step}
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold">{item.title}</div>
                <div className="text-gray-400 text-sm">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.02 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 to-blue-500/5 border border-accent/30 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">🔑</span>
          <h3 className="text-xl font-bold text-accent">Wallet Rotation</h3>
        </div>
        <p className="text-white mb-2">
          <strong>CardBound Recovery</strong>
        </p>
        <p className="text-gray-400 text-sm">
          CardBound vaults keep funds in the vault while guardians approve a wallet rotation to a new signer address.
        </p>
      </motion.div>
    </motion.div>
  );
}

