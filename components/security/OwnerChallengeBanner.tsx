'use client';

/**
 * OwnerChallengeBanner — top-of-page warning when the user's vault is being recovered.
 *
 * This is the user's defense against unauthorized recovery. The flow:
 *   1. Attacker (or rogue trustee, or social-engineered guardian quorum)
 *      initiates a recovery claim against the user's vault.
 *   2. This banner appears prominently across every page until the
 *      challenge window passes or the user takes action.
 *   3. The user reviews who initiated the claim, the reasoning given,
 *      and the time remaining.
 *   4. If the user did NOT request the recovery, they click "Challenge"
 *      and the claim is killed (and the initiator enters a 30-day
 *      cooldown per R-8).
 *
 * Design choices:
 *
 *   Why a top-of-page banner instead of a floating beacon:
 *   The existing RecoveryBeacon is a small pulsing dot for *guardian-side*
 *   awareness — a guardian on a coffee break should notice their watchlist
 *   needs attention, but no single missed beacon is catastrophic. This
 *   banner is different. If the owner misses this and the challenge window
 *   passes, their vault is gone. The signal needs to be unignorable. A
 *   full-width top banner is the protocol's most prominent UI primitive,
 *   so that's what this uses.
 *
 *   Why inline modal instead of separate page:
 *   The user's task is small (type a one-sentence reason and confirm).
 *   A page transition would add friction without value. The modal stays
 *   in the same context as the banner, with the claim details visible.
 *
 *   Why the banner cannot be dismissed:
 *   A user who dismisses the banner could forget about the claim and miss
 *   the challenge window. The banner persists until the claim's status
 *   changes (challenged, expired, executed). If the user genuinely wants
 *   the recovery to proceed (i.e., they initiated it themselves on a new
 *   device), they don't need to dismiss anything — they just don't
 *   challenge, and the recovery completes when the window closes.
 *
 *   What "Challenge" actually does on-chain:
 *   Calls VaultRecoveryClaim.challengeClaim(claimId, reason). Reason is
 *   stored on-chain and emitted in the event. Per R-8, this also locks
 *   the initiator out from re-initiating against this vault for 30 days,
 *   preventing immediate retry attacks.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, Clock, X, Loader2, AlertCircle } from 'lucide-react';
import { useOwnerActiveClaim } from '@/hooks/useOwnerActiveClaim';
import { useChallengeClaim } from '@/hooks/useChallengeClaim';
import { RecoveryClaimStatus } from '@/hooks/useRecoveryClaim';

/**
 * Format seconds remaining into a human-readable string.
 * E.g., 604800 → "7 days", 3600 → "1 hour", 90 → "1 minute".
 *
 * Deliberately imprecise — exact countdown noise would distract from the
 * decision. The user needs to know "you have days" vs "you have hours" vs
 * "act now," not "you have 6 days 3 hours 12 minutes."
 */
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
  if (minutes >= 2) return `${minutes} minutes`;
  return 'less than 1 minute';
}

function _shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function OwnerChallengeBanner() {
  const { hasActiveClaim, claim, claimId, canChallenge, challengeTimeRemaining } = useOwnerActiveClaim();
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { challenge, isWritePending } = useChallengeClaim({
    claimId,
    originalOwner: claim?.originalOwner,
  });

  // Render nothing when there's nothing to warn about.
  if (!hasActiveClaim || !claim) return null;

  // If the claim is in a terminal state (already challenged, executed, expired,
  // rejected) the banner has served its purpose and we can hide it. The hook
  // will return hasActiveClaim=true while the active-claim mapping still points
  // here, but visually we don't need to keep showing the warning.
  const terminalStates = [
    RecoveryClaimStatus.Challenged,
    RecoveryClaimStatus.Rejected,
    RecoveryClaimStatus.Executed,
    RecoveryClaimStatus.Expired,
  ];
  if (terminalStates.includes(claim.status)) return null;

  // After a successful challenge submission, show a confirmation state.
  // The on-chain event will eventually update the claim status to Challenged
  // and the banner will disappear via the terminal-state check above.
  // The intermediate "submitted" state covers the gap between tx mined and
  // event propagating to the read.
  const handleChallenge = async () => {
    setError(null);
    try {
      await challenge(reason || 'No reason provided');
      setSubmitted(true);
    } catch (err: any) {
      const message = err?.shortMessage || err?.details || err?.message || 'Challenge failed';
      setError(message);
    }
  };

  const isPending = claim.status === RecoveryClaimStatus.Pending;
  const isApproved = claim.status === RecoveryClaimStatus.GuardianApproved;

  return (
    <>
      {/* The banner itself — fixed at top of viewport, above TopNav (which is z-50).
          We use z-[60] so this overlays the navigation chrome during a recovery
          claim. This is intentional: when the user's vault is being claimed,
          the warning is more important than navigation. */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-[60] w-full bg-gradient-to-r from-red-600 via-orange-600 to-red-600 border-b-2 border-red-400/50 shadow-lg shadow-red-500/20"
      >
        {/* Animated warning stripe across the top for extra visibility */}
        <motion.div
          animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="h-1 w-full bg-[linear-gradient(90deg,transparent_0%,#fbbf24_50%,transparent_100%)] bg-[length:200%_100%]"
        />

        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {/* Icon + headline */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              >
                <AlertTriangle className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <p className="text-white font-bold text-sm sm:text-base leading-tight">
                  Recovery claim active on your vault
                </p>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  {isPending
                    ? `Guardians are voting (${claim.guardianApprovals}/${claim.guardianCountSnapshot} approved so far)`
                    : isApproved
                      ? `Guardians approved. Challenge window closes in ${formatTimeRemaining(challengeTimeRemaining)}.`
                      : `Status: ${RecoveryClaimStatus[claim.status]}`}
                </p>
              </div>
            </div>

            {/* Spacer */}
            <div className="hidden sm:block flex-1" />

            {/* Action area */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {canChallenge && !submitted && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowChallengeModal(true)}
                  className="flex-1 sm:flex-initial px-5 py-2 bg-white text-red-700 font-bold rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Challenge This
                </motion.button>
              )}
              {submitted && (
                <div className="text-white/90 text-sm font-semibold px-4 py-2 bg-white/10 rounded-lg">
                  Challenge submitted
                </div>
              )}
              {!canChallenge && isPending && (
                <div className="text-white/70 text-xs italic px-3 py-2">
                  Can challenge once guardians approve
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Inline challenge modal */}
      <AnimatePresence>
        {showChallengeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => !isWritePending && setShowChallengeModal(false)}
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
              className="relative w-full max-w-lg rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-red-500/30 shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="p-6 bg-gradient-to-br from-red-500/20 to-orange-500/10 border-b border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-red-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Challenge recovery claim</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Stop this recovery from proceeding</p>
                    </div>
                  </div>
                  {!isWritePending && (
                    <button
                      onClick={() => setShowChallengeModal(false)}
                      className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-5">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <p className="font-semibold text-amber-300 mb-1">Only challenge if you did NOT request this recovery.</p>
                      <p>
                        If you genuinely lost access to your vault and someone is helping you recover it, do nothing —
                        the recovery will complete when the challenge window passes. If you did not initiate this and
                        do not recognize the claimant, challenge now.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claim details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Claimant (new wallet)</p>
                    <p className="font-mono text-sm text-white break-all">{claim.claimant}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Initiator</p>
                    <p className="font-mono text-sm text-white break-all">
                      {claim.initiator === claim.claimant ? (
                        <span className="text-gray-500 italic">Same as claimant</span>
                      ) : (
                        claim.initiator
                      )}
                    </p>
                  </div>
                  {claim.claimReason && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reason given</p>
                      <p className="text-sm text-gray-300 italic">&quot;{claim.claimReason}&quot;</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <p className="text-xs text-gray-400">
                      <span className="text-white font-semibold">{formatTimeRemaining(challengeTimeRemaining)}</span>
                      <span> until challenge window closes</span>
                    </p>
                  </div>
                </div>

                {/* Reason input */}
                <div>
                  <label className="text-sm text-gray-300 mb-2 font-medium block">Why are you challenging?</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional but recorded on-chain. Helps your guardians understand later."
                    rows={3}
                    maxLength={500}
                    disabled={isWritePending}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 transition-colors text-sm disabled:opacity-50 resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button
                  onClick={() => setShowChallengeModal(false)}
                  disabled={isWritePending}
                  className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: isWritePending ? 1 : 1.02 }}
                  whileTap={{ scale: isWritePending ? 1 : 0.98 }}
                  onClick={handleChallenge}
                  disabled={isWritePending}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isWritePending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Confirm Challenge
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
