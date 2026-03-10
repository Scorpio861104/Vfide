'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  FileCheck2,
  Flashlight,
  Gavel,
  Handshake,
  ShieldAlert,
  Scale,
  Shield,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Footer } from '@/components/layout/Footer'
import {
  canPerformAction,
  computeTotalDue,
  getProtectionStatus,
  performAction,
  sanitizeTerms,
  type ActorRole,
  type LoanSimulationState,
  type LoanStage,
  type LoanTerms,
} from '@/lib/flashloans/engine'

interface FlashloanLaneApiRecord {
  id: number
  borrower_address: string
  lender_address: string
  arbiter_address: string | null
  principal: string
  duration_days: number
  interest_bps: number
  collateral_pct: number
  drawn_amount: string
  stage: LoanStage
  sim_day: number
  due_day: number | null
  evidence_note: string
}

const stageOrder: LoanStage[] = [
  'draft',
  'requested',
  'approved',
  'escrow-funded',
  'drawn',
  'repaid',
]

function stageLabel(stage: LoanStage): string {
  const labels: Record<LoanStage, string> = {
    draft: 'Draft',
    requested: 'Requested',
    approved: 'Approved',
    'escrow-funded': 'Escrow Funded',
    drawn: 'Borrower Drawn',
    repaid: 'Repaid',
    disputed: 'Disputed',
    'resolved-borrower': 'Resolved: Borrower',
    'resolved-lender': 'Resolved: Lender',
  }
  return labels[stage]
}

const highlights = [
  {
    title: 'Peer-to-peer credit lanes',
    description: 'Borrow directly from other users with transparent pricing and no pooled yield promises.',
    icon: <Users className="w-4 h-4" />,
  },
  {
    title: 'Escrow-backed repayment',
    description: 'Repayments route through escrow with DAO arbitration and clear release milestones.',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    title: 'Interest only when used',
    description: 'Flashloans P2P interest accrues on drawn balance only, so unused credit stays free.',
    icon: <Flashlight className="w-4 h-4" />,
  },
]

const fairnessRules = [
  {
    title: 'No passive income claims',
    detail: 'Rates are negotiated by borrowers and lenders. VFIDE does not promise returns or profits.',
    icon: <Scale className="w-4 h-4" />,
  },
  {
    title: 'DAO dispute arbitration',
    detail: 'Escalations auto-route to the DAO hub with evidence packs and voting trails.',
    icon: <Gavel className="w-4 h-4" />,
  },
  {
    title: 'Time-boxed settlement',
    detail: 'Timeouts protect both sides with automatic release or refund windows.',
    icon: <Clock className="w-4 h-4" />,
  },
]

const steps = [
  {
    title: 'Borrower requests a Flashloans P2P line',
    detail: 'Select amount, term, and a trusted lender. ProofScore helps price the lane.',
  },
  {
    title: 'Lender approves terms',
    detail: 'Funds move into escrow with clear milestones and an arbitration fallback.',
  },
  {
    title: 'Repayment closes the lane',
    detail: 'Repayments release escrow automatically. Disputes route to the DAO hub.',
  },
]

export default function FlashlightPage() {
  const [amount, setAmount] = useState(1500)
  const [durationDays, setDurationDays] = useState(14)
  const [interestBps, setInterestBps] = useState(600)
  const [collateralPct, setCollateralPct] = useState(125)
  const [drawnAmount, setDrawnAmount] = useState(1500)
  const [lenderAddress, setLenderAddress] = useState('0x1111111111111111111111111111111111111111')
  const [arbiterAddress, setArbiterAddress] = useState('0x2222222222222222222222222222222222222222')
  const [actorRole, setActorRole] = useState<ActorRole>('simulator')
  const [laneId, setLaneId] = useState<number | null>(null)
  const [serverMode, setServerMode] = useState(false)
  const [isServerBusy, setIsServerBusy] = useState(false)
  const [simulation, setSimulation] = useState<LoanSimulationState>({
    stage: 'draft',
    simDay: 0,
    dueDay: null,
    evidenceNote: '',
  })
  const [auditLog, setAuditLog] = useState<string[]>(['System: simulation initialized'])
  const [actionError, setActionError] = useState<string>('')

  const terms: LoanTerms = useMemo(
    () =>
      sanitizeTerms({
        principal: amount,
        durationDays,
        interestBps,
        collateralPct,
        drawnAmount,
      }),
    [amount, durationDays, interestBps, collateralPct, drawnAmount]
  )

  const totalDue = useMemo(() => computeTotalDue(terms), [terms])
  const { borrowerProtected, lenderProtected } = useMemo(() => getProtectionStatus(terms), [terms])

  const canRequest = canPerformAction('request', actorRole, simulation, terms)
  const canApprove = canPerformAction('approve', actorRole, simulation, terms)
  const canFundEscrow = canPerformAction('fund-escrow', actorRole, simulation, terms)
  const canDraw = canPerformAction('draw', actorRole, simulation, terms)
  const canRepay = canPerformAction('repay', actorRole, simulation, terms)
  const canDispute = canPerformAction('raise-dispute', actorRole, simulation, terms)
  const canResolve = canPerformAction('resolve-lender', actorRole, simulation, terms)

  const stage = simulation.stage
  const simDay = simulation.simDay
  const dueDay = simulation.dueDay
  const evidenceNote = simulation.evidenceNote
  const currentStep = stageOrder.indexOf(simulation.stage)

  const setEvidenceNote = (note: string) => {
    setSimulation((prev) => ({
      ...prev,
      evidenceNote: note,
    }))
  }

  const runAction = (action: Parameters<typeof performAction>[0]) => {
    if (serverMode && laneId) {
      void runServerAction(action)
      return
    }

    try {
      const result = performAction(action, actorRole, simulation, terms, {
        evidenceNote: simulation.evidenceNote,
      })
      setSimulation(result.state)
      setActionError('')
      setAuditLog((prev) => [`Day ${result.state.simDay}: ${result.event}`, ...prev].slice(0, 12))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Blocked action'
      setActionError(message)
      setAuditLog((prev) => [`Day ${simulation.simDay}: blocked action (${action})`, ...prev].slice(0, 12))
    }
  }

  const hydrateFromLane = (lane: FlashloanLaneApiRecord) => {
    setAmount(Number(lane.principal))
    setDurationDays(lane.duration_days)
    setInterestBps(lane.interest_bps)
    setCollateralPct(lane.collateral_pct)
    setDrawnAmount(Number(lane.drawn_amount))
    setSimulation({
      stage: lane.stage,
      simDay: lane.sim_day,
      dueDay: lane.due_day,
      evidenceNote: lane.evidence_note,
    })
  }

  const createServerLane = async () => {
    setIsServerBusy(true)
    setActionError('')
    try {
      const response = await fetch('/api/flashloans/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderAddress,
          arbiterAddress,
          principal: terms.principal,
          durationDays: terms.durationDays,
          interestBps: terms.interestBps,
          collateralPct: terms.collateralPct,
          drawnAmount: terms.drawnAmount,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.lane) {
        throw new Error(payload?.error || 'Unable to create server lane')
      }

      setServerMode(true)
      setLaneId(payload.lane.id)
      hydrateFromLane(payload.lane as FlashloanLaneApiRecord)
      setAuditLog((prev) => [`Day 0: server lane ${payload.lane.id} created`, ...prev].slice(0, 12))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create server lane'
      setActionError(message)
    } finally {
      setIsServerBusy(false)
    }
  }

  const runServerAction = async (action: Parameters<typeof performAction>[0]) => {
    if (!laneId) return
    setIsServerBusy(true)
    setActionError('')
    try {
      const response = await fetch(`/api/flashloans/lanes/${laneId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          drawnAmount: terms.drawnAmount,
          evidenceNote: simulation.evidenceNote,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.lane) {
        throw new Error(payload?.error || `Server action failed: ${action}`)
      }

      hydrateFromLane(payload.lane as FlashloanLaneApiRecord)
      const eventText = typeof payload.event === 'string' ? payload.event : `server action ${action}`
      const nextDay = (payload.lane as FlashloanLaneApiRecord).sim_day
      setAuditLog((prev) => [`Day ${nextDay}: ${eventText}`, ...prev].slice(0, 12))
    } catch (error) {
      const message = error instanceof Error ? error.message : `Server action failed: ${action}`
      setActionError(message)
      setAuditLog((prev) => [`Day ${simulation.simDay}: blocked server action (${action})`, ...prev].slice(0, 12))
    } finally {
      setIsServerBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0e111f] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,153,102,0.16),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,240,255,0.12),transparent_50%)]" />
      </div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-16"
      >
        <section className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-200">
              <Flashlight className="w-4 h-4" />
              Flashloans P2P Credit
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-black text-white">
              Flashloans P2P Borrowing, Built on Trust
            </h1>
            <p className="mt-3 text-lg text-zinc-400">
              A peer-to-peer credit lane where borrowers and lenders agree on terms, interest, and escrow protections.
              No pooled returns. No hidden yield promises. Just transparent, verifiable settlement.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button className="rounded-full bg-gradient-to-r from-cyan-400 to-amber-300 px-6 py-2 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-500/20">
                Request Flashloans P2P Line
              </button>
              <button className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-semibold text-white">
                Offer Liquidity
              </button>
            </div>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-amber-200 font-semibold">
                  {item.icon}
                  {item.title}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-cyan-200 font-semibold">
                <Wallet className="w-4 h-4" />
                How Flashloans P2P Works
              </div>
              <div className="mt-6 space-y-4">
                {steps.map((step, index) => (
                  <div key={step.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3 text-white font-semibold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-200">
                        {index + 1}
                      </span>
                      {step.title}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-amber-200 font-semibold">
                <Scale className="w-4 h-4" />
                Fairness & Compliance
              </div>
              <div className="mt-6 space-y-4">
                {fairnessRules.map((rule) => (
                  <div key={rule.title} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2 text-amber-100 font-semibold">
                      {rule.icon}
                      {rule.title}
                    </div>
                    <p className="mt-2 text-xs text-zinc-300">{rule.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Howey-safe positioning
                </div>
                <p className="mt-2 text-emerald-100/80">
                  Flashloans P2P is a peer-to-peer credit tool. VFIDE does not market profit expectations, pool user funds,
                  or promise returns. Participants set their own terms and remain responsible for local compliance.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-6 space-y-5">
              <div className="flex items-center gap-2 text-cyan-200 font-semibold">
                <Handshake className="w-4 h-4" />
                Live P2P Flow Simulator
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm text-zinc-300">
                  Principal (USDC)
                  <input
                    type="number"
                    min={100}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(100, Number(e.target.value) || 100))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Duration (days)
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Interest (bps)
                  <input
                    type="number"
                    min={100}
                    max={1200}
                    value={interestBps}
                    onChange={(e) => setInterestBps(Math.min(1200, Math.max(100, Number(e.target.value) || 100)))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Collateral (%)
                  <input
                    type="number"
                    min={110}
                    max={200}
                    value={collateralPct}
                    onChange={(e) => setCollateralPct(Math.min(200, Math.max(110, Number(e.target.value) || 110)))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Drawn Amount (USDC)
                  <input
                    type="number"
                    min={1}
                    max={amount}
                    value={drawnAmount}
                    onChange={(e) => setDrawnAmount(Math.max(1, Math.min(amount, Number(e.target.value) || 1)))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Active Role
                  <select
                    value={actorRole}
                    onChange={(e) => setActorRole(e.target.value as ActorRole)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  >
                    <option value="simulator">Simulator (all actions)</option>
                    <option value="borrower">Borrower</option>
                    <option value="lender">Lender</option>
                    <option value="arbiter">Arbiter</option>
                  </select>
                </label>
                <label className="text-sm text-zinc-300">
                  Lender Address
                  <input
                    type="text"
                    value={lenderAddress}
                    onChange={(e) => setLenderAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Arbiter Address
                  <input
                    type="text"
                    value={arbiterAddress}
                    onChange={(e) => setArbiterAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-white"
                  />
                </label>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-sm text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Current Stage</span>
                  <span className="font-semibold text-white">{stageLabel(stage)}</span>
                </div>
                <div className="mt-3 h-2 rounded bg-zinc-800 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-cyan-400 to-emerald-400"
                    style={{ width: `${((Math.max(currentStep, 0) + 1) / stageOrder.length) * 100}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>Principal: <span className="text-white">${amount}</span></div>
                  <div>Drawn: <span className="text-white">${Math.min(drawnAmount, amount)}</span></div>
                  <div>Duration: <span className="text-white">{durationDays}d</span></div>
                  <div>Sim Day: <span className="text-white">{simDay}</span></div>
                  <div>Interest: <span className="text-white">{(interestBps / 100).toFixed(2)}%</span></div>
                  <div>Total Due: <span className="text-white">${totalDue.toFixed(2)}</span></div>
                  <div>
                    Due Day:{' '}
                    <span className="text-white">{dueDay === null ? 'Not set' : dueDay}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void createServerLane()}
                  disabled={isServerBusy || !!laneId}
                  className="rounded-full px-4 py-2 text-sm font-semibold border border-cyan-400/30 text-cyan-200 disabled:opacity-40"
                >
                  {laneId ? `Server Lane #${laneId}` : 'Create Server Lane'}
                </button>
                <button
                  onClick={() => {
                    setServerMode((prev) => !prev)
                    setActionError('')
                  }}
                  disabled={!laneId || isServerBusy}
                  className="rounded-full px-4 py-2 text-sm font-semibold border border-white/15 text-white disabled:opacity-40"
                >
                  Mode: {serverMode ? 'Server' : 'Local'}
                </button>
                <button
                  onClick={() => runAction('advance-day')}
                  disabled={isServerBusy}
                  className="rounded-full px-4 py-2 text-sm font-semibold border border-white/15 text-white disabled:opacity-40"
                >
                  Advance Day
                </button>
              </div>

              {actionError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
                  {actionError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!canRequest || isServerBusy}
                  onClick={() => runAction('request')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-cyan-500 text-zinc-900 disabled:opacity-40"
                >
                  Request Lane
                </button>
                <button
                  disabled={!canApprove || isServerBusy}
                  onClick={() => runAction('approve')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-emerald-500 text-zinc-900 disabled:opacity-40"
                >
                  Lender Approve Terms
                </button>
                <button
                  disabled={!canFundEscrow || isServerBusy}
                  onClick={() => runAction('fund-escrow')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-amber-400 text-zinc-900 disabled:opacity-40"
                >
                  Fund Escrow
                </button>
                <button
                  disabled={!canDraw || isServerBusy}
                  onClick={() => runAction('draw')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-indigo-400 text-zinc-900 disabled:opacity-40"
                >
                  Borrower Draw
                </button>
                <button
                  disabled={!canRepay || isServerBusy}
                  onClick={() => runAction('repay')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-green-400 text-zinc-900 disabled:opacity-40"
                >
                  Repay + Close
                </button>
                <button
                  disabled={!canDispute || isServerBusy}
                  onClick={() => runAction('raise-dispute')}
                  className="rounded-full px-4 py-2 text-sm font-semibold bg-rose-400 text-zinc-900 disabled:opacity-40"
                >
                  Raise Dispute
                </button>
              </div>

              {(stage === 'escrow-funded' || stage === 'drawn' || stage === 'disputed') && (
                <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 space-y-2">
                  <div className="text-xs font-semibold text-zinc-200">Evidence Notes</div>
                  <textarea
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    placeholder="Attach borrower/lender evidence summary..."
                    className="w-full min-h-24 rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

              {stage === 'disputed' && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-100 font-semibold">
                    <Gavel className="w-4 h-4" />
                    DAO Arbitration Required
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runAction('resolve-borrower')}
                      disabled={!canResolve || isServerBusy}
                      className="rounded-full px-4 py-2 text-sm font-semibold bg-emerald-400 text-zinc-900"
                    >
                      Resolve to Borrower
                    </button>
                    <button
                      onClick={() => runAction('resolve-lender')}
                      disabled={!canResolve || isServerBusy}
                      className="rounded-full px-4 py-2 text-sm font-semibold bg-amber-300 text-zinc-900"
                    >
                      Resolve to Lender
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => runAction('reset')}
                disabled={isServerBusy}
                className="text-xs text-zinc-400 underline underline-offset-4"
              >
                Reset simulation
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold">
                <FileCheck2 className="w-4 h-4 text-cyan-300" />
                Two-Party Protections
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-2 text-cyan-100 font-semibold">
                  <Shield className="w-4 h-4" /> Borrower Protections
                </div>
                <ul className="mt-2 text-xs text-zinc-300 space-y-1">
                  <li>- Interest cap enforced at 12% max in this lane.</li>
                  <li>- Funds remain escrowed until lender signs terms.</li>
                  <li>- Dispute can freeze settlement before final release.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 text-amber-100 font-semibold">
                  <Banknote className="w-4 h-4" /> Lender Protections
                </div>
                <ul className="mt-2 text-xs text-zinc-300 space-y-1">
                  <li>- Minimum collateral ratio enforced at 110%.</li>
                  <li>- Funds never leave escrow before approvals.</li>
                  <li>- DAO arbitration supports evidence-based rulings.</li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-xs text-zinc-300">
                <div className="flex items-center gap-2 text-white font-semibold">
                  {borrowerProtected && lenderProtected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  )}
                  Protection Status
                </div>
                <p className="mt-2">
                  {borrowerProtected && lenderProtected
                    ? 'Both parties are currently protected under configured terms.'
                    : 'Adjust terms until both borrower and lender protections are satisfied.'}
                </p>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-100">
                <div className="flex items-center gap-2 font-semibold">
                  <TriangleAlert className="w-4 h-4" />
                  Default + Dispute Safety
                </div>
                <p className="mt-2 text-zinc-300">
                  If repayment fails by term expiry, lane enters dispute/default review with escrow freeze and DAO resolution.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="text-white font-semibold text-xs uppercase tracking-wide">Audit Trail</div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                  {auditLog.map((line) => (
                    <li key={line}>- {line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-white font-semibold">Ready to deploy Flashloans P2P lanes?</div>
                <p className="text-sm text-zinc-400">
                  Use escrow defaults for new partners, and graduate to instant lanes for trusted repeat borrowers.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-semibold text-white">
                View DAO Arbitration Hub
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </motion.main>
      <Footer />
    </>
  )
}
