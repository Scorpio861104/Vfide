'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';

type ClaimTabProps = {
  isConnected: boolean;
  isBeneficiary?: boolean;
  claimable?: bigint;
  claimsPaused?: boolean;
};

export function ClaimTab({
  isConnected,
  isBeneficiary = true,
  claimable = 0n,
  claimsPaused = false,
}: ClaimTabProps) {
  const claimableAmount = Number(claimable) / 1e18;
  const hasClaimable = claimable > 0n;

  if (!isConnected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 p-12 text-center backdrop-blur-xl">
        <div className="mb-4 inline-block rounded-2xl bg-purple-500/10 p-4">
          <Lock className="h-12 w-12 text-purple-400/50" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to review vesting eligibility and claim status.</p>
      </motion.div>
    );
  }

  if (!isBeneficiary) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 p-12 text-center backdrop-blur-xl">
        <div className="mb-4 inline-block rounded-2xl bg-amber-500/10 p-4">
          <AlertTriangle className="h-12 w-12 text-amber-400/50" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">Beneficiary Required</h2>
        <p className="text-gray-400">Only the configured vesting beneficiary can submit a claim from this dashboard.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 p-8 backdrop-blur-xl">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">Claim Vested Tokens</h2>

        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-6 text-center">
          <div className="mb-2 text-sm text-gray-400">Available to Claim</div>
          <div className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
            {claimableAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-gray-400">VFIDE</div>
        </div>

        {claimsPaused && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            Claims are currently paused by the contract administrator.
          </div>
        )}

        <button
          type="button"
          disabled={!hasClaimable || claimsPaused}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 py-4 font-bold text-white transition-all disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
        >
          <Unlock className="h-5 w-5" />
          {hasClaimable ? `Claim ${claimableAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} VFIDE` : 'Nothing claimable yet'}
        </button>

        {!hasClaimable && !claimsPaused && <p className="mt-4 text-center text-sm text-gray-400">No tokens are available to claim at this time.</p>}
      </div>
    </motion.div>
  );
}
