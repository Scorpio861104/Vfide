'use client';

/**
 * /recovery-sign — test harness route for the ClaimFlowModal.
 *
 * Playwright navigates here to test the vault recovery initiation flow.
 * Query params:
 *   step=1|2|3   — which step to start on
 *   vault=0x...  — vault address
 *   wallet=0x... — new wallet address
 *   submitted=true — pre-advance to step 3 success state
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import {
  Shield, UserCheck, AlertCircle, Key, XCircle,
  CheckCircle2, Users, Clock, Unlock, Loader2,
  Fingerprint, HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

function RecoverySignInner() {
  const searchParams = useSearchParams();
  const initialStep = Number(searchParams.get('step') ?? 1);
  const vault = searchParams.get('vault') ?? '0xdeadbeef';
  const newWallet = searchParams.get('wallet') ?? '';
  const preSubmitted = searchParams.get('submitted') === 'true';

  const [step, setStep] = useState(preSubmitted ? 3 : initialStep);
  const [recoveryId, setRecoveryId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!recoveryId || !reason) {
      setError('Recovery ID and reason are required');
      return;
    }
    setIsSubmitting(true);
    await new Promise<void>((res) => setTimeout(res, 300));
    setIsSubmitting(false);
    setStep(3);
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-white/20 shadow-2xl"
          data-testid="rc-modal-root"
        >
          {/* Header */}
          <div className="p-8 pb-0">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg">
                <Key className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Claim Your Vault</h2>
                <p className="text-sm text-gray-400">Step {step} of 3 • Secure Recovery</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-blue-500 transition-all duration-500"
                    style={{ width: s <= step ? '100%' : '0%' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <m.div
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-accent" />
                      Vault to Recover
                    </p>
                    <p className="font-mono text-accent text-lg break-all" data-testid="rc-vault-address">
                      {vault}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                      Your New Wallet
                    </p>
                    <p className="font-mono text-emerald-400 text-lg break-all" data-testid="rc-new-wallet">
                      {newWallet || 'Connect wallet to continue'}
                    </p>
                  </div>

                  <div
                    className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30"
                    data-testid="rc-challenge-notice"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-amber-400 font-semibold mb-1">Security Notice</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          This initiates a <strong className="text-white">multi-day challenge period</strong>.
                          Your guardians must approve, and the original wallet can cancel if not truly lost.
                        </p>
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

              {step === 2 && (
                <m.div
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="text-sm text-gray-300 mb-3 font-medium flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-purple-400" />
                      Recovery ID
                    </label>
                    <input
                      type="text"
                      value={recoveryId}
                      onChange={(e) => setRecoveryId(e.target.value)}
                      placeholder="The recovery ID you set when creating your vault"
                      disabled={isSubmitting}
                      data-testid="rc-recovery-id"
                      className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 transition-colors text-lg disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 mb-3 font-medium flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-400" />
                      Recovery Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="What happened? Your guardians will see this when they review the claim."
                      rows={3}
                      maxLength={500}
                      disabled={isSubmitting}
                      data-testid="rc-reason"
                      className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 transition-colors resize-none disabled:opacity-50"
                    />
                  </div>

                  {error && (
                    <m.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                      data-testid="rc-error"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    </m.div>
                  )}
                </m.div>
              )}

              {step === 3 && (
                <m.div
                  key="step3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="text-center py-4"
                  data-testid="rc-success"
                >
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center mb-6 shadow-lg">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Claim Submitted</h3>
                  <p className="text-gray-400 mb-6">Your recovery process has begun</p>
                  <Link
                    href={`/vault/recover/status?vault=${vault}`}
                    data-testid="rc-status-link"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent to-blue-500 text-white rounded-lg font-bold"
                  >
                    Track Recovery Status
                  </Link>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer nav */}
          {step < 3 && (
            <div className="px-8 pb-8 flex justify-between items-center">
              {step > 1 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              <m.button
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                onClick={() => {
                  if (step === 1) setStep(2);
                  else if (step === 2) void handleSubmit();
                }}
                disabled={isSubmitting}
                data-testid={step === 1 ? 'rc-continue-btn' : 'rc-submit-btn'}
                className="px-8 py-3 bg-gradient-to-r from-accent to-blue-500 rounded-xl font-bold text-white flex items-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : step === 1 ? (
                  'Continue'
                ) : (
                  'Submit Claim'
                )}
              </m.button>
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}

export default function RecoverySignPage() {
  return (
    <Suspense fallback={null}>
      <RecoverySignInner />
    </Suspense>
  );
}
