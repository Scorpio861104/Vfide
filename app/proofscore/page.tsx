'use client'

import { useAccount } from 'wagmi'
import { Sparkles } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'
import { TrustChallenges } from '@/app/proofscore/components/TrustChallenges'
import { ScoreStoryFeed } from '@/app/proofscore/components/ScoreStoryFeed'
import { CivilizationRelationships } from '@/components/civilization/CivilizationRelationships'
import {
  TrustStatusPanel,
  WhyTrustExists,
  TrustDrivers,
  TrustOpportunities,
  TrustCommercePanel,
  TrustContinuityPanel,
  TrustAcademyEmbed,
} from '@/components/trust/TrustBureauSections'
import { useTrustStatus } from '@/hooks/useTrustStatus'
import { useProofScore } from '@/hooks/useProofScore'

// Display ranges mirror lib/constants.ts PROOF_SCORE_TIERS on the canonical
// 0–10000 scale (score >= min && score < max; Elite tops at 10,000). Names,
// descriptions, and dot colors are presentation; mechanics live in the
// contract / constants and are not defined here.
const TIERS = [
  { tier: 'Risky',      min: 0,    max: 3999,  color: 'bg-red-500',    desc: 'No trust history on record yet.' },
  { tier: 'Low Trust',  min: 4000, max: 4999,  color: 'bg-orange-400', desc: 'Early trust history forming.' },
  { tier: 'Neutral',    min: 5000, max: 5399,  color: 'bg-yellow-400', desc: 'Basic on-chain trust established. New accounts begin here.' },
  { tier: 'Governance', min: 5400, max: 5599,  color: 'bg-lime-400',   desc: 'Trusted enough to participate in governance.' },
  { tier: 'Trusted',    min: 5600, max: 6999,  color: 'bg-green-500',  desc: 'A solid, multi-source record of honest dealing.' },
  { tier: 'Council',    min: 7000, max: 7999,  color: 'bg-cyan-500',   desc: 'Deep trust history; trusted with more responsibility.' },
  { tier: 'Elite',      min: 8000, max: 10000, color: 'bg-violet-600', desc: 'Strongly established trust history; lowest fees, greatest responsibility.' },
]

// Canonical fee endpoints — existing protocol constants (ProofScoreBurnRouter:
// minTotalBps 25 = 0.25%, maxTotalBps 500 = 5.00%). Presentation only.
const FEE_CEILING = '5.00%'
const FEE_FLOOR = '0.25%'

export default function TrustBureauPage() {
  const { address } = useAccount()
  const t = useTrustStatus()
  const { tierName, burnFee, isDisconnected } = useProofScore()
  const feeLabel = isDisconnected || burnFee == null ? '—' : `${burnFee.toFixed(2)}%`

  return (
    <div className="ui-page-shell relative min-h-screen overflow-hidden md:pt-[3.5rem]">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

      <div className="ui-container-breathing relative z-10 py-12">
        {/* ── Part 1: Institutional hero ── */}
        <div className="mb-12">
          <PageHeader
            eyebrow={<><Sparkles size={12} /> Trust Institution</>}
            title="Trust Bureau"
            subtitle="Trust is earned through participation, responsibility, and contribution. Trust reduces friction, expands opportunity, and strengthens the civilization."
          />
        </div>

        <div className="space-y-10">
          {/* ── Part 2: Trust Status ── */}
          <TrustStatusPanel t={t} />

          <section aria-label="Trust and fees" className="glass-card-premium p-6 sm:p-8">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Trust &amp; cost</p>
            <h2 className="mb-5 text-xl font-bold text-white">Higher trust, lower cost.</h2>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500/60 via-yellow-500/50 to-cyan-500/70" aria-hidden="true" />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Low trust · <span className="font-mono font-semibold text-zinc-300">{FEE_CEILING}</span></span>
              <span className="hidden text-[10px] uppercase tracking-widest text-zinc-500 sm:inline">as trust grows, cost falls →</span>
              <span className="text-zinc-400">High trust · <span className="font-mono font-semibold text-cyan-400">{FEE_FLOOR}</span></span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
              <span className="text-sm text-zinc-400">Your current fee rate:</span>
              <span className="font-mono text-sm font-bold text-glow-cyan">{feeLabel}</span>
              {isDisconnected && <span className="text-xs text-zinc-500">— connect your wallet to see your live rate.</span>}
            </div>
          </section>

          <WhyTrustExists />

          <section aria-label="Your ProofScore" className="flex flex-col items-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Your ProofScore — one part of your trust record</p>
            <ProofScoreVisualizer address={address} />
          </section>

          <TrustDrivers />

          <section aria-label="Trust tiers" className="glass-card-premium overflow-hidden">
            <div className="border-b border-white/8 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">The seven tiers of trust</h2>
              <p className="mt-0.5 text-sm text-zinc-500">A shared ladder. Everyone earns their way up.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.03]">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Range</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((tr) => {
                    const isCurrent = !isDisconnected && tierName === tr.tier
                    return (
                      <tr
                        key={tr.tier}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`border-b border-white/5 transition-colors last:border-0 ${isCurrent ? 'bg-cyan-500/[0.07]' : 'hover:bg-white/[0.03]'}`}
                      >
                        <td className={`px-6 py-3 font-medium text-white ${isCurrent ? 'border-l-2 border-cyan-400' : 'border-l-2 border-transparent'}`}>
                          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${tr.color}`} aria-hidden="true" />
                          {tr.tier}
                          {isCurrent && <span className="ml-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">You are here</span>}
                        </td>
                        <td className="px-6 py-3 font-mono tabular-nums text-zinc-400">{tr.min.toLocaleString()}–{tr.max.toLocaleString()}</td>
                        <td className="px-6 py-3 text-zinc-300">{tr.desc}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <TrustOpportunities t={t} />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">Build your trust</h2>
              <TrustChallenges />
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">Your trust story</h2>
              <ScoreStoryFeed />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TrustCommercePanel />
            <TrustContinuityPanel />
          </div>

          <TrustAcademyEmbed />

          <CivilizationRelationships />
        </div>
      </div>
    </div>
  )
}
