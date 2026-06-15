'use client'

export const dynamic = 'force-dynamic'

/**
 * /proofscore — Trust Bureau (Wave 33: Trust Infrastructure).
 *
 * Records-first. Trust is presented as participant-owned infrastructure — a record of actions,
 * commitments, and contributions — not a score that judges. Leads with the record, the
 * participation history, verification states, and opportunity expansion. The ProofScore number and
 * the tier reference are SUPPORTING information, surfaced lower as a transparency reference, never
 * as the primary frame.
 *
 * Microcopy avoids rank/level/elite/status/class/grade/approval. All records/verification states
 * derive from real state (useProofScore / useContinuityStatus / useMerchantHealth).
 */

import { useAccount } from 'wagmi'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'
import { CivilizationRelationships } from '@/components/civilization/CivilizationRelationships'
import {
  TrustInfrastructureHero,
  TrustRecord,
  ParticipationHistory,
  VerificationSystems,
  OpportunityAccess,
  TrustExplainer,
} from '@/components/trust/TrustInfrastructure'
import { TrustKnowledge } from '@/components/education/InstitutionKnowledge'
import { useProofScore } from '@/hooks/useProofScore'

// Canonical fee endpoints — existing protocol constants (ProofScoreBurnRouter:
// minTotalBps 25 = 0.25%, maxTotalBps 500 = 5.00%). Presentation only.
const FEE_CEILING = '5.00%'
const FEE_FLOOR = '0.25%'

export default function TrustBureauPage() {
  const { address } = useAccount()
  const { burnFee, isDisconnected } = useProofScore()
  const feeLabel = isDisconnected || burnFee == null ? '—' : `${burnFee.toFixed(2)}%`

  return (
    <div className="ui-page-shell relative min-h-screen overflow-hidden md:pt-[3.5rem]">
      {/* Ambient field — restrained single glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 left-1/4 h-[680px] w-[680px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
        {/* Records-first: lead with infrastructure, not the score */}
        <TrustInfrastructureHero />
        <TrustRecord />
        <ParticipationHistory />
        <VerificationSystems />
        <OpportunityAccess />
        <TrustExplainer />
        <TrustKnowledge />

        {/* ── Supporting reference: the score + fee relationship (not the primary frame) ── */}
        <section className="mb-16" aria-label="Supporting reference">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Supporting Reference</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Your ProofScore &amp; cost</p>
            <p className="mt-3 text-zinc-400">
              Your ProofScore is one summary of the record above — supporting information, not a
              judgment. As your record grows, the friction on what you transact falls.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-label="Your ProofScore" className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">A summary of your record</p>
              <ProofScoreVisualizer address={address} />
            </section>

            <section aria-label="Trust and cost" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Record &amp; cost</p>
              <h3 className="mb-5 text-lg font-semibold text-white">A stronger record reduces friction.</h3>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-zinc-600/60 via-cyan-700/50 to-cyan-500/70" aria-hidden="true" />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Early record · <span className="font-mono font-semibold text-zinc-300">{FEE_CEILING}</span></span>
                <span className="hidden text-[10px] uppercase tracking-widest text-zinc-500 sm:inline">friction falls →</span>
                <span className="text-zinc-400">Established record · <span className="font-mono font-semibold text-cyan-400">{FEE_FLOOR}</span></span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/[0.06] bg-white/5 px-4 py-3">
                <span className="text-sm text-zinc-400">Your current fee rate:</span>
                <span className="font-mono text-sm font-bold text-cyan-300">{feeLabel}</span>
                {isDisconnected && <span className="text-xs text-zinc-500">— connect your wallet to see your live rate.</span>}
              </div>
            </section>
          </div>
        </section>

        <CivilizationRelationships />
      </div>
    </div>
  )
}
