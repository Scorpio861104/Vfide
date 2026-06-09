'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { TrendingUp, ShieldCheck, Coins, ArrowUpRight, Scale, Sparkles, Layers, Activity, Vote, Store, Wallet, Lock } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { MonumentCorner } from '@/components/navigation/MonumentCorner'
import { TrustChallenges } from '@/app/proofscore/components/TrustChallenges'
import { ScoreStoryFeed } from '@/app/proofscore/components/ScoreStoryFeed'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'
import { useProofScore } from '@/hooks/useProofScore'
import { useLocale } from '@/lib/locale/LocaleProvider'

// Display ranges mirror lib/constants.ts PROOF_SCORE_TIERS on the canonical
// 0–10000 scale, using the hook's `score >= min && score < max` assignment
// (upper bounds shown as max−1, except Elite which tops out at 10,000).
// Names, descriptions, and dot colors are presentation; mechanics live in the
// contract / constants and are not defined here.
const TIERS = [
  { tier: 'Risky',      min: 0,    max: 3999,  color: 'bg-red-500',    desc: 'No trust history yet. Everyone starts here.' },
  { tier: 'Low Trust',  min: 4000, max: 4999,  color: 'bg-orange-400', desc: 'Early trust history forming.' },
  { tier: 'Neutral',    min: 5000, max: 5399,  color: 'bg-yellow-400', desc: 'Basic on-chain trust established.' },
  { tier: 'Governance', min: 5400, max: 5599,  color: 'bg-lime-400',   desc: 'Trusted enough to participate in governance.' },
  { tier: 'Trusted',    min: 5600, max: 6999,  color: 'bg-green-500',  desc: 'A solid, multi-source record of honest dealing.' },
  { tier: 'Council',    min: 7000, max: 7999,  color: 'bg-cyan-500',   desc: 'Deep trust history; trusted with more responsibility.' },
  { tier: 'Elite',      min: 8000, max: 10000, color: 'bg-violet-600', desc: 'Strongly established trust history; lowest fees, greatest responsibility.' },
]

/* Trust principles — presentation only. No scoring, no ranking, no status. */
const TRUST_PRINCIPLES = [
  { Icon: ShieldCheck, title: 'Earned through participation', body: 'Trust is built by honest dealing over time — not bought, not assigned.' },
  { Icon: Coins,       title: 'Lowers transaction costs',     body: 'As your trust grows, the fee on your transactions falls.' },
  { Icon: TrendingUp,  title: 'Opens commercial opportunity', body: 'A stronger record widens what you can do across the ecosystem.' },
  { Icon: Scale,       title: 'Carries more responsibility',  body: 'Greater trust means greater responsibility to the people who rely on the network.' },
]

/* Canonical fee endpoints — existing protocol constants (ProofScoreBurnRouter:
   minTotalBps 25 = 0.25%, maxTotalBps 500 = 5.00%). Presentation only; no
   values invented, no calculation performed here. */
const FEE_CEILING = '5.00%'
const FEE_FLOOR = '0.25%'

export default function ProofScorePage() {
  const { locale } = useLocale()
  void locale

  const { address } = useAccount()
  const { tierName, burnFee, isDisconnected, isLoading, canVote, canMerchant } = useProofScore()

  const tierLabel = isDisconnected ? 'Connect wallet' : (tierName ?? '—')
  const feeLabel = isDisconnected || burnFee == null ? '—' : `${burnFee.toFixed(2)}%`
  const trustStatus = isDisconnected ? 'Not connected' : isLoading ? 'Loading…' : 'Active'

  /* Standing — what the current trust record allows. Existing hook values only;
     no new logic, no scoring. Payments are open to any connected account; the
     fee simply varies with trust. */
  const rights = [
    { label: 'Payments',   Icon: Wallet, allowed: !isDisconnected },
    { label: 'Governance', Icon: Vote,   allowed: canVote },
    { label: 'Merchant',   Icon: Store,  allowed: canMerchant },
  ]

  const summaryCells = [
    { Icon: Layers,   label: 'Current tier',     value: tierLabel, valueClass: 'text-white' },
    { Icon: Coins,    label: 'Current fee rate', value: feeLabel,  valueClass: 'text-glow-cyan' },
    { Icon: Activity, label: 'Trust status',     value: trustStatus, valueClass: 'text-white', dot: true },
  ]

  const TrustSummary = (
    <div className="glass-card-premium ui-card-sheen flex w-full items-stretch gap-px overflow-hidden rounded-2xl md:w-auto">
      {summaryCells.map(({ Icon, label, value, valueClass, dot }, i) => (
        <div
          key={label}
          className={`flex flex-1 items-center gap-2.5 px-3 py-3 sm:px-5 md:min-w-[8rem] ${i > 0 ? 'border-l border-white/10' : ''}`}
        >
          <Icon size={15} className="hidden flex-shrink-0 text-cyan-400 sm:block" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
            <p className={`mt-0.5 flex items-center gap-1.5 text-base font-bold leading-none sm:text-lg ${valueClass}`}>
              {dot && (
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isDisconnected ? 'bg-zinc-500' : 'bg-emerald-400'}`}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{value}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="ui-page-shell relative min-h-screen overflow-hidden md:pt-[3.5rem]">
      {/* Ambient orbs — same shell quality as homepage / dashboard */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
        />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

      <div className="ui-container-breathing relative z-10 py-10">
        {/* ── Hero ── */}
        <PageHeader
          eyebrow={<><Sparkles size={12} /> Trust Institution</>}
          title="ProofScore"
          subtitle="Trust earned through participation. As trust grows, costs fall and opportunities expand."
          action={TrustSummary}
        />

        {/* ── Trust Narrative ── */}
        <section className="mb-8">
          <div className="glass-card-premium p-6 sm:p-8">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Why ProofScore exists</p>
            <h2 className="mb-5 text-2xl font-bold text-white">
              Trust is a <span className="gradient-text-cyan-blue">responsibility</span>, not a rank.
            </h2>
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
              ProofScore is VFIDE&apos;s record of trust earned through honest participation. It is not a
              leaderboard, not a badge of status, and not a social hierarchy. It reflects how you have
              transacted — and the network rewards that record by lowering your costs and widening what you
              can do. Every honest interaction also makes the network safer for everyone.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TRUST_PRINCIPLES.map(({ Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/5">
                    <Icon size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Standing — what the current trust record allows. Existing values only. */}
            <div className="mt-6 border-t border-white/8 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                What your trust currently allows
              </p>
              <div className="flex flex-wrap gap-2">
                {rights.map(({ label, Icon, allowed }) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      allowed
                        ? 'border-accent/20 bg-accent/5 text-cyan-400'
                        : 'border-white/8 bg-white/[0.02] text-zinc-500'
                    }`}
                  >
                    {allowed ? <Icon size={13} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
                    {label}
                    <span className="sr-only">{allowed ? ' — available' : ' — locked'}</span>
                  </span>
                ))}
              </div>
              {isDisconnected && (
                <p className="mt-2 text-xs text-zinc-500">Connect your wallet to see what your trust unlocks.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Fee Relationship Panel — connects ProofScore → Fees ── */}
        <section className="mb-8">
          <div className="glass-card-premium p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-500">Trust &amp; cost</p>
                <h2 className="text-2xl font-bold text-white">Higher trust, lower cost.</h2>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-accent/20 bg-accent/5 px-4 py-2 text-sm font-semibold text-cyan-400 transition-colors hover:bg-accent/10 sm:self-auto"
              >
                Open the fee simulator <ArrowUpRight size={14} />
              </Link>
            </div>

            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-400">
              The fee on your transactions moves with your trust. Early on, the rate sits at the ceiling.
              As your ProofScore rises, it falls toward the floor — the same mechanic for everyone.
            </p>

            {/* Endpoint rail — illustrative direction only; no calculation performed. */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gradient-to-r from-red-500/60 via-yellow-500/50 to-cyan-500/70" aria-hidden="true" />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Low trust · <span className="font-mono font-semibold text-zinc-300">{FEE_CEILING}</span></span>
              <span className="hidden text-[10px] uppercase tracking-widest text-zinc-500 sm:inline">as trust grows, cost falls →</span>
              <span className="text-zinc-400">High trust · <span className="font-mono font-semibold text-cyan-400">{FEE_FLOOR}</span></span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
              <Coins size={15} className="text-cyan-400" />
              <span className="text-sm text-zinc-400">Your current fee rate:</span>
              <span className="font-mono text-sm font-bold text-glow-cyan">{feeLabel}</span>
              {isDisconnected && (
                <span className="text-xs text-zinc-500">— connect your wallet to see your live rate.</span>
              )}
            </div>
          </div>
        </section>

        {/* ── Live ProofScore ── */}
        <section className="mb-8 flex flex-col items-center">
          <ProofScoreVisualizer address={address} />
        </section>

        {/* ── 7-Tier Table — institutional surface, data unchanged ── */}
        <section className="mb-8">
          <div className="glass-card-premium overflow-hidden">
            <div className="border-b border-white/8 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">The seven tiers of trust</h2>
              <p className="mt-0.5 text-sm text-zinc-500">A shared ladder. Everyone starts at the bottom and earns their way up.</p>
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
                  {TIERS.map((t) => {
                    const isCurrent = !isDisconnected && tierName === t.tier
                    return (
                      <tr
                        key={t.tier}
                        aria-current={isCurrent ? 'true' : undefined}
                        className={`border-b border-white/5 transition-colors last:border-0 ${
                          isCurrent ? 'bg-cyan-500/[0.07]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <td className={`px-6 py-3 font-medium text-white ${isCurrent ? 'border-l-2 border-cyan-400' : 'border-l-2 border-transparent'}`}>
                          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${t.color}`} aria-hidden="true" />
                          {t.tier}
                          {isCurrent && (
                            <span className="ml-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                              You are here
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 font-mono tabular-nums text-zinc-400">{t.min.toLocaleString()}–{t.max.toLocaleString()}</td>
                        <td className="px-6 py-3 text-zinc-300">{t.desc}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Challenges + Story ── */}
        <section>
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
        </section>
      </div>

      <MonumentCorner />
    </div>
  )
}
