'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Gavel, CheckCircle2, Clock, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAccount } from 'wagmi'
import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { useAppealStatus, useFileAppeal } from '@/lib/vfide-hooks'
import { sanitizeString } from '@/lib/validation'

export default function AppealsPage() {
  const { address, isConnected } = useAccount()
  const [reason, setReason] = useState('')
  const { hasAppeal, resolved, approved, timestamp, reason: existingReason, resolution, isLoading, error, refetch } = useAppealStatus(address)
  const { fileAppeal, isLoading: isSubmitting, isSuccess, error: submitError } = useFileAppeal()

  const statusBadge = useMemo(() => {
    if (!hasAppeal) return { label: 'No Appeal', color: 'bg-white/10 text-gray-300 border border-white/10', icon: <Gavel className="w-4 h-4" /> }
    if (!resolved) return { label: 'Pending Review', color: 'bg-amber-500/15 text-amber-200 border border-amber-500/30', icon: <Clock className="w-4 h-4" /> }
    if (approved) return { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30', icon: <CheckCircle2 className="w-4 h-4" /> }
    return { label: 'Rejected', color: 'bg-red-500/15 text-red-200 border border-red-500/30', icon: <XCircle className="w-4 h-4" /> }
  }, [hasAppeal, resolved, approved])

  const canSubmit = isConnected && !isSubmitting && reason.trim().length && !hasAppeal

  const handleSubmit = () => {
    if (!canSubmit) return
    fileAppeal(reason.trim())
    setReason('')
    refetch()
  }

  return (
    <>
      <GlobalNav />
      <div className="min-h-screen bg-black text-white pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-10">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f1117] via-[#0a0c12] to-[#05060a] border border-white/10 p-8">
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-emerald-200 border border-white/10 mb-3">
                  <Gavel className="w-4 h-4" /> Appeal Center
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Dispute a ProofScore decision</h1>
                <p className="text-gray-400 max-w-2xl">
                  Submit an appeal if you believe your score, flag, or decision was incorrect. The DAO will review and respond.
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusBadge.color}`}>
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </div>
            </div>
          </section>

          <section className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-3 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <Gavel className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-semibold text-lg">Submit Appeal</div>
                  <div className="text-sm text-gray-400">Explain what happened and what you want reviewed.</div>
                </div>
              </div>

              {!isConnected && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-100 text-sm">
                  Connect your wallet to file an appeal.
                </div>
              )}

              {hasAppeal && !resolved && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-100 text-sm flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5" />
                  <div>
                    You already have a pending appeal. We&apos;ll notify you when it is resolved.
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm text-gray-300">Reason (500 chars max)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  placeholder="Describe the issue, include evidence or context."
                  className="w-full min-h-[140px] rounded-xl bg-black/40 border border-white/10 p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-400/50"
                  disabled={!isConnected || hasAppeal || isSubmitting}
                />
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>{reason.length}/500</span>
                  {(submitError || error) && (
                    <span className="text-red-300">{submitError?.message || error?.message}</span>
                  )}
                </div>
              </div>

              <motion.button
                whileHover={canSubmit ? { scale: 1.02 } : undefined}
                whileTap={canSubmit ? { scale: 0.98 } : undefined}
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  canSubmit
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:shadow-lg hover:shadow-emerald-500/30'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                {hasAppeal ? 'Appeal Pending' : 'Submit Appeal'}
              </motion.button>

              {isSuccess && (
                <div className="text-sm text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Appeal submitted. We&apos;ll review and update you.
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Current Status
                </div>
                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-white/10 rounded" />
                    <div className="h-4 bg-white/10 rounded w-2/3" />
                  </div>
                ) : hasAppeal ? (
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      {statusBadge.icon}
                      <span>{statusBadge.label}</span>
                    </div>
                    {timestamp && (
                      <div className="text-xs text-gray-500">
                        Filed {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                      </div>
                    )}
                    {existingReason && (
                      <div className="text-xs text-gray-400">
                        <span className="text-gray-500">Reason: </span>{existingReason}
                      </div>
                    )}
                    {resolved && (
                      <div className="text-xs text-gray-400">
                        <span className="text-gray-500">Resolution: </span>{resolution || 'No details provided'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">No appeal on file. Submit one if you need a review.</div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-sm text-gray-200 space-y-2">
                <div className="font-semibold text-white">How reviews work</div>
                <ul className="space-y-2 list-disc list-inside text-gray-300">
                  <li>Appeals are reviewed by the DAO or designated reviewers.</li>
                  <li>Provide concise evidence to speed up review.</li>
                  <li>You&apos;ll see status updates here once processed.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}
