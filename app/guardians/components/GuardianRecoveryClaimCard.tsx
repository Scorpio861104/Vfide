'use client';

/**
 * GuardianRecoveryClaimCard — Path B guardian inbox row.
 *
 * Parallel to GuardianPendingRecoveryCard (which handles Path A wallet
 * rotation). This card surfaces a VaultRecoveryClaim active on a watched
 * vault and lets the connected guardian cast their vote.
 *
 * Both cards can be rendered for the same watched vault. They don't conflict
 * because they read different state:
 *   - Path A reads `pendingRotation` on the vault itself
 *   - Path B reads VaultRecoveryClaim.getActiveClaimForVault
 * Most of the time, a vault has neither pending. Sometimes it has one or
 * the other. (The contracts don't prevent simultaneous Path A and Path B
 * recoveries, but in practice this would be a rare edge case.)
 *
 * The card renders nothing when there's no Path B claim active. The
 * empty/null state keeps the inbox clean during normal operation.
 *
 * UI rules:
 *   - Vote action is a confirmation modal (not a one-tap) because the
 *     decision is consequential. A guardian who votes accidentally
 *     could enable an unauthorized recovery if their vote pushes the
 *     count to threshold.
 *   - Reject vote (vote=false) is shown with the same weight as approve.
 *     The contract supports both; the UI shouldn't hide the reject path.
 *   - Once voted, the card shows the previous vote and disables further
 *     voting (the contract enforces this; we just mirror it locally).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
  FileText,
} from 'lucide-react';
import { useRecoveryClaim, RecoveryClaimStatus } from '@/hooks/useRecoveryClaim';
import { useGuardianVote } from '@/hooks/useGuardianVote';
import type { WatchedVault } from './types';

function formatTimeRemaining(seconds: bigint): string {
  const s = Number(seconds);
  if (s <= 0) return 'expired';
  const days = Math.floor(s / 86400);
  if (days >= 2) return `${days} days`;
  if (days === 1) return '1 day';
  const hours = Math.floor(s / 3600);
  if (hours >= 2) return `${hours} hours`;
  if (hours === 1) return '1 hour';
  const minutes = Math.floor(s / 60);
  return minutes >= 2 ? `${minutes} minutes` : 'less than 1 minute';
}

function shortAddress(addr?: string): string {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function GuardianRecoveryClaimCard({ entry }: { entry: WatchedVault }) {
  const { claim, claimId, hasClaim, challengeTimeRemaining } = useRecoveryClaim({
    targetVault: entry.address as `0x${string}`,
  });

  const { hasVoted, guardianVote, vote, isWritePending } = useGuardianVote({ claimId });

  const [showVoteModal, setShowVoteModal] = useState(false);
  const [pendingVote, setPendingVote] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  // Card renders nothing when there's no Path B claim on this vault.
  // This is the common case; we don't want to clutter the inbox with
  // empty placeholders.
  if (!hasClaim || !claim) return null;

  // Terminal states — claim no longer needs guardian action. The card
  // could be hidden entirely, but showing the final state briefly tells
  // the guardian what happened to a claim they may have seen before.
  // We hide on Executed (clear success) but keep visible on Challenged/
  // Rejected/Expired so the guardian sees the resolution.
  if (claim.status === RecoveryClaimStatus.Executed) return null;

  const isPending = claim.status === RecoveryClaimStatus.Pending;
  const isApproved = claim.status === RecoveryClaimStatus.GuardianApproved;
  const isTerminal = [
    RecoveryClaimStatus.Challenged,
    RecoveryClaimStatus.Rejected,
    RecoveryClaimStatus.Expired,
  ].includes(claim.status);

  const handleVote = async (approve: boolean) => {
    setError(null);
    try {
      await vote(approve);
      setVoteSubmitted(true);
      setTimeout(() => setShowVoteModal(false), 1200);
    } catch (err: any) {
      const message = err?.shortMessage || err?.details || err?.message || 'Vote failed';
      setError(message);
    }
  };

  const openVoteModal = (approve: boolean) => {
    setPendingVote(approve);
    setError(null);
    setVoteSubmitted(false);
    setShowVoteModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-2 border-purple-500/30 rounded-xl p-5 shadow-lg shadow-purple-500/10"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Recovery Claim Active</p>
              <p className="text-xs text-gray-400">
                Vault {entry.label ? `"${entry.label}"` : shortAddress(entry.address)}
              </p>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-md text-xs font-semibold ${
              isPending
                ? 'bg-amber-500/20 text-amber-300'
                : isApproved
                  ? 'bg-accent/20 text-accent'
                  : claim.status === RecoveryClaimStatus.Challenged
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-gray-500/20 text-gray-300'
            }`}
          >
            {RecoveryClaimStatus[claim.status]}
          </span>
        </div>

        {/* Claim details */}
        <div className="space-y-2 mb-4 text-xs">
          <div className="flex items-start gap-2">
            <User className="h-3.5 w-3.5 text-gray-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-gray-500 uppercase tracking-wider">Claimant: </span>
              <span className="font-mono text-gray-300 break-all">{shortAddress(claim.claimant)}</span>
            </div>
          </div>
          {claim.initiator !== claim.claimant && (
            <div className="flex items-start gap-2">
              <User className="h-3.5 w-3.5 text-gray-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-500 uppercase tracking-wider">Initiator: </span>
                <span className="font-mono text-gray-300 break-all">{shortAddress(claim.initiator)}</span>
                <span className="text-gray-500 ml-1 italic">(trustee initiating on behalf of claimant)</span>
              </div>
            </div>
          )}
          {claim.claimReason && (
            <div className="flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 text-gray-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-500 uppercase tracking-wider">Reason: </span>
                <span className="text-gray-300 italic">&quot;{claim.claimReason}&quot;</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-gray-500 uppercase tracking-wider">Approvals: </span>
            <span className="text-white font-semibold">
              {claim.guardianApprovals}/{claim.guardianCountSnapshot}
            </span>
            {isApproved && (
              <span className="text-cyan-300 ml-2">
                · Challenge window: {formatTimeRemaining(challengeTimeRemaining)}
              </span>
            )}
          </div>
        </div>

        {/* Action area */}
        {isPending && !hasVoted && (
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openVoteModal(true)}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
            >
              <ThumbsUp className="h-4 w-4" />
              Approve
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openVoteModal(false)}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
            >
              <ThumbsDown className="h-4 w-4" />
              Reject
            </motion.button>
          </div>
        )}

        {hasVoted && (
          <div
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${
              guardianVote
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {guardianVote ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            You voted: {guardianVote ? 'Approved' : 'Rejected'}
          </div>
        )}

        {isApproved && !hasVoted && (
          <div className="px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-accent/30 text-cyan-300 text-sm">
            Approvals threshold met. Claim is in the challenge window — your vote is no longer needed.
          </div>
        )}

        {isTerminal && (
          <div className="px-4 py-2.5 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 text-sm text-center italic">
            This claim was {RecoveryClaimStatus[claim.status].toLowerCase()}. No further action.
          </div>
        )}
      </motion.div>

      {/* Vote confirmation modal */}
      <AnimatePresence>
        {showVoteModal && pendingVote !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => !isWritePending && setShowVoteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring' as const, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 shadow-2xl overflow-hidden ${
                pendingVote ? 'border-emerald-500/30' : 'border-red-500/30'
              }`}
            >
              <div
                className={`p-6 border-b border-white/10 ${
                  pendingVote
                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10'
                    : 'bg-gradient-to-br from-red-500/20 to-orange-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        pendingVote ? 'bg-emerald-500/30' : 'bg-red-500/30'
                      }`}
                    >
                      {pendingVote ? (
                        <ThumbsUp className="h-6 w-6 text-emerald-300" />
                      ) : (
                        <ThumbsDown className="h-6 w-6 text-red-300" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {pendingVote ? 'Approve recovery?' : 'Reject recovery?'}
                      </h2>
                      <p className="text-sm text-gray-400 mt-0.5">Your vote is permanent</p>
                    </div>
                  </div>
                  {!isWritePending && (
                    <button
                      onClick={() => setShowVoteModal(false)}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Votes cannot be changed once cast. Make sure you&apos;ve reviewed the claimant address
                      {claim.initiator !== claim.claimant && ' and initiator'} and the reason given.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-gray-500 uppercase tracking-wider mb-1">Claimant</p>
                    <p className="font-mono text-white break-all">{claim.claimant}</p>
                  </div>
                  {claim.initiator !== claim.claimant && (
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-500 uppercase tracking-wider mb-1">Initiator (trustee)</p>
                      <p className="font-mono text-white break-all">{claim.initiator}</p>
                    </div>
                  )}
                  {claim.claimReason && (
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-gray-500 uppercase tracking-wider mb-1">Reason given</p>
                      <p className="text-gray-300 italic">&quot;{claim.claimReason}&quot;</p>
                    </div>
                  )}
                </div>

                {voteSubmitted && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Vote submitted on-chain
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button
                  onClick={() => setShowVoteModal(false)}
                  disabled={isWritePending}
                  className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: isWritePending ? 1 : 1.02 }}
                  whileTap={{ scale: isWritePending ? 1 : 0.98 }}
                  onClick={() => handleVote(pendingVote)}
                  disabled={isWritePending || voteSubmitted}
                  className={`px-6 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    pendingVote
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30'
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
                      {pendingVote ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                      Confirm {pendingVote ? 'Approve' : 'Reject'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
