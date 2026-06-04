'use client';

/**
 * /recovery-challenge — DEV/TEST-ONLY harness for the OwnerChallengeBanner.
 *
 * NOTE: Playwright does NOT navigate to this real page — its recovery-flow
 * spec hits the standalone mock server (playwright/test-server.js), which
 * serves its own /recovery-challenge HTML. This page is gated to 404 in
 * production (see default export) so it can't surface a fake security alarm.
 * Renders the banner with mock state derived from query params:
 *   ?vault=0x...&claimStatus=GuardianApproved
 */

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { m , LazyMotion, domAnimation } from 'framer-motion';

function RecoveryChallengeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const claimStatusParam = searchParams.get('claimStatus');
  const vault = (searchParams.get('vault') ?? '0x0') as `0x${string}`;

  // No mock param => a real visitor. Send them to their vault, where the live
  // OwnerChallengeBanner appears when an actual recovery claim exists. The demo
  // state below only renders when an explicit claimStatus param is supplied.
  useEffect(() => {
    if (!claimStatusParam) router.replace('/vault');
  }, [claimStatusParam, router]);

  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!claimStatusParam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  const isPending = claimStatusParam === 'Pending';
  const canChallenge = !isPending;

  const handleChallenge = async () => {
    setIsSubmitting(true);
    // Simulate a short async delay (mimics contract write)
    await new Promise<void>((res) => setTimeout(res, 500));
    setIsSubmitting(false);
    setSubmitted(true);
    setShowModal(false);
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-zinc-900">
        {/* ── Banner ─────────────────────────────────────────────────────────── */}
        <div
          className="w-full bg-gradient-to-r from-red-600 via-orange-600 to-red-600 border-b-2 border-red-400/50 shadow-lg shadow-red-500/20"
          data-testid="challenge-banner-root"
        >
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Recovery claim detected on your vault</p>
              <p className="text-white/80 text-xs sm:text-sm mt-0.5" data-testid="challenge-status-text">
                {isPending ? 'Waiting for guardian votes' : 'Guardian approved — challenge window open'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {submitted ? (
                <div
                  className="text-white/90 text-sm font-semibold px-4 py-2 bg-white/10 rounded-lg"
                  data-testid="challenge-submitted-badge"
                >
                  Challenge submitted
                </div>
              ) : canChallenge ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 sm:flex-initial px-5 py-2 bg-white text-red-700 font-bold rounded-lg shadow-md"
                  data-testid="challenge-btn"
                >
                  Challenge This
                </button>
              ) : (
                <div
                  className="text-white/70 text-xs italic px-3 py-2"
                  data-testid="challenge-pending-notice"
                >
                  Can challenge once guardians approve
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Challenge modal ───────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Challenge this recovery</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Vault {vault.slice(0, 10)}…
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 font-medium block">
                    Why are you challenging?
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional but recorded on-chain."
                    rows={3}
                    maxLength={500}
                    disabled={isSubmitting}
                    data-testid="challenge-reason-input"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 text-sm resize-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <m.button
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  onClick={() => void handleChallenge()}
                  disabled={isSubmitting}
                  data-testid="challenge-confirm-btn"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-bold text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Confirm Challenge'
                  )}
                </m.button>
              </div>
            </div>
          </div>
        )}

        {/* Page body placeholder */}
        <div className="p-8 text-gray-500 text-sm text-center">
          Challenge harness — vault {vault.slice(0, 10)}…
        </div>
      </div>
    </LazyMotion>
  );
}

export default function RecoveryChallengeTestPage() {
  // Not gated: a real visitor with no mock param is redirected to /vault (see
  // RecoveryChallengeInner). The demo banner only renders for an explicit
  // ?claimStatus=... param, so no fabricated alarm is shown in production.
  return (
    <Suspense fallback={null}>
      <RecoveryChallengeInner />
    </Suspense>
  );
}
