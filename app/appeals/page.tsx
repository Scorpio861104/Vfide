'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Gavel, CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, Search, ShieldCheck, Copy, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAccount, useChainId } from 'wagmi'
import { Footer } from '@/components/layout/Footer'
import { useAppealStatus, useFileAppeal } from '@/lib/vfide-hooks'
import { SEER_REASON_CODES, getSeerReasonCodeInfo } from '@/lib/seer/reasonCodes'

const DIAGNOSTICS_MODE_STORAGE_KEY = 'seer_appeal_diagnostics_mode'

export default function AppealsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [reason, setReason] = useState('')
  const [reasonCodeInput, setReasonCodeInput] = useState('')
  const [txHash, setTxHash] = useState('')
  const [network, setNetwork] = useState('Base')
  const [observedAt, setObservedAt] = useState('')
  const [copiedBundle, setCopiedBundle] = useState(false)
  const [diagnosticsMode, setDiagnosticsMode] = useState<'none' | 'minimal' | 'full'>('none')
  const [privacyResetNotice, setPrivacyResetNotice] = useState(false)
  const { hasAppeal, resolved, approved, timestamp, reason: existingReason, resolution, isLoading, error, refetch } = useAppealStatus(address)
  const { fileAppeal, isLoading: isSubmitting, isSuccess, error: submitError } = useFileAppeal()

  const parsedReasonCode = useMemo(() => {
    if (!reasonCodeInput.trim()) return null
    const value = Number.parseInt(reasonCodeInput, 10)
    if (Number.isNaN(value)) return null
    return value
  }, [reasonCodeInput])

  const selectedReasonCode = useMemo(() => {
    if (parsedReasonCode === null) return null
    return getSeerReasonCodeInfo(parsedReasonCode)
  }, [parsedReasonCode])

  const appealBundle = useMemo(() => {
    const reasonCodeLine = parsedReasonCode === null
      ? 'n/a'
      : selectedReasonCode
        ? `${parsedReasonCode} (${selectedReasonCode.key})`
        : String(parsedReasonCode)

    const when = observedAt.trim().length > 0
      ? new Date(observedAt).toISOString()
      : new Date().toISOString()

    const baseLines = [
      'SEER_APPEAL_BUNDLE',
      `wallet: ${address ?? 'n/a'}`,
      `network: ${network.trim() || 'n/a'}`,
      `txHash: ${txHash.trim() || 'n/a'}`,
      `reasonCode: ${reasonCodeLine}`,
      `observedAt: ${when}`,
      `appealReason: ${reason.trim() || 'n/a'}`,
    ]

    if (diagnosticsMode === 'none' || typeof window === 'undefined') {
      return baseLines.join('\n')
    }

    const minimalDiagnostics = [
      '--- diagnostics ---',
      `generatedAt: ${new Date().toISOString()}`,
      `chainId: ${chainId}`,
      `route: ${window.location.pathname}`,
    ]

    if (diagnosticsMode === 'minimal') {
      return [...baseLines, ...minimalDiagnostics].join('\n')
    }

    const fullDiagnostics = [
      ...minimalDiagnostics,
      `timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || 'n/a'}`,
      `language: ${navigator.language || 'n/a'}`,
      `platform: ${navigator.platform || 'n/a'}`,
      `userAgent: ${navigator.userAgent || 'n/a'}`,
    ]

    return [...baseLines, ...fullDiagnostics].join('\n')
  }, [address, network, txHash, parsedReasonCode, selectedReasonCode, observedAt, reason, diagnosticsMode, chainId])

  const statusBadge = useMemo(() => {
    if (!hasAppeal) return { label: 'No Appeal', color: 'bg-white/10 text-gray-300 border border-white/10', icon: <Gavel className="w-4 h-4" /> }
    if (!resolved) return { label: 'Pending Review', color: 'bg-amber-500/15 text-amber-200 border border-amber-500/30', icon: <Clock className="w-4 h-4" /> }
    if (approved) return { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30', icon: <CheckCircle2 className="w-4 h-4" /> }
    return { label: 'Rejected', color: 'bg-red-500/15 text-red-200 border border-red-500/30', icon: <XCircle className="w-4 h-4" /> }
  }, [hasAppeal, resolved, approved])

  const canSubmit = isConnected && !isSubmitting && reason.trim().length && !hasAppeal

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(DIAGNOSTICS_MODE_STORAGE_KEY)
    if (stored === 'none' || stored === 'minimal' || stored === 'full') {
      setDiagnosticsMode(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DIAGNOSTICS_MODE_STORAGE_KEY, diagnosticsMode)
  }, [diagnosticsMode])

  const handleSubmit = () => {
    if (!canSubmit) return
    fileAppeal(reason.trim())
    setReason('')
    refetch()
  }

  const handleCopyBundle = async () => {
    try {
      await navigator.clipboard.writeText(appealBundle)
      setCopiedBundle(true)
      setTimeout(() => setCopiedBundle(false), 1800)
    } catch {
      setCopiedBundle(false)
    }
  }

  const handleDownloadBundle = () => {
    const now = new Date()
    const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const blob = new Blob([appealBundle], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seer-appeal-bundle-${stamp}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleResetPrivacyDefaults = () => {
    setDiagnosticsMode('none')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DIAGNOSTICS_MODE_STORAGE_KEY)
    }
    setPrivacyResetNotice(true)
    setTimeout(() => setPrivacyResetNotice(false), 1800)
  }

  return (
    <>
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

              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Network</label>
                  <input
                    value={network}
                    onChange={(e) => setNetwork(e.target.value.slice(0, 40))}
                    placeholder="Base"
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50"
                    disabled={hasAppeal || isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Transaction hash (optional)</label>
                  <input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value.slice(0, 120))}
                    placeholder="0x..."
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50"
                    disabled={hasAppeal || isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">Observed time (optional)</label>
                <input
                  type="datetime-local"
                  value={observedAt}
                  onChange={(e) => setObservedAt(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50"
                  disabled={hasAppeal || isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-400">Appeal bundle preview</div>
                <pre className="max-h-44 overflow-auto rounded-xl bg-black/50 border border-white/10 p-3 text-xs text-gray-300 whitespace-pre-wrap">{appealBundle}</pre>
                <div className="space-y-1">
                  <label className="text-xs text-gray-300">Diagnostics mode</label>
                  <select
                    value={diagnosticsMode}
                    onChange={(e) => setDiagnosticsMode(e.target.value as 'none' | 'minimal' | 'full')}
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                  >
                    <option value="none">None (privacy-first)</option>
                    <option value="minimal">Minimal (chain/time/route)</option>
                    <option value="full">Full (includes browser metadata)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleResetPrivacyDefaults}
                  className="w-full py-2 rounded-xl font-medium border border-gray-400/20 bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
                >
                  Reset privacy defaults
                </button>
                {privacyResetNotice && (
                  <div className="text-xs text-emerald-300">Privacy defaults restored.</div>
                )}
                <p className="text-[11px] leading-relaxed text-gray-500">
                  Privacy notice: minimal mode adds chain ID, route, and export timestamp. Full mode also adds timezone, language,
                  platform, and browser user-agent to help support reproduce issues faster.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBundle}
                    className="w-full py-2 rounded-xl font-medium border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedBundle ? 'Copied appeal bundle' : 'Copy appeal bundle'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBundle}
                    className="w-full py-2 rounded-xl font-medium border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download .txt bundle
                  </button>
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

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <Search className="w-4 h-4 text-cyan-300" /> Seer reason code lookup
                </div>
                <input
                  value={reasonCodeInput}
                  onChange={(e) => setReasonCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="Enter reason code (example: 121)"
                  className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-400/50"
                />

                {reasonCodeInput.trim().length > 0 && selectedReasonCode && (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-sm space-y-2">
                    <div className="text-cyan-200 font-semibold">
                      Code {selectedReasonCode.code}: {selectedReasonCode.key}
                    </div>
                    <div className="text-gray-300">{selectedReasonCode.userMeaning}</div>
                    <div className="text-gray-400 text-xs">What to do: {selectedReasonCode.whatToDo}</div>
                  </div>
                )}

                {reasonCodeInput.trim().length > 0 && !selectedReasonCode && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                    Unknown code. Include it in your appeal anyway with tx hash and timestamp.
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Popular codes: {SEER_REASON_CODES.slice(0, 8).map((c) => c.code).join(', ')}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" /> Appeal evidence checklist
                </div>
                <ul className="space-y-2 list-disc list-inside text-xs text-gray-300">
                  <li>Wallet address used for the blocked or delayed action</li>
                  <li>Transaction hash (or clear attempted-action details)</li>
                  <li>Timestamp and network used</li>
                  <li>Reason code and exact error text, if available</li>
                  <li>Short explanation of expected behavior and supporting context</li>
                </ul>
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
