'use client'

import { useAccount } from 'wagmi'
import { TrustChallenges } from '@/app/proofscore/components/TrustChallenges'
import { ScoreStoryFeed } from '@/app/proofscore/components/ScoreStoryFeed'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'

const TIERS = [
  { tier: 'Risky',      min: 0,   max: 299, color: 'bg-red-500',    desc: 'No verified identity. High risk.' },
  { tier: 'Low Trust',  min: 300, max: 499, color: 'bg-orange-400', desc: 'Minimal proof. Unstable trust.' },
  { tier: 'Neutral',    min: 500, max: 599, color: 'bg-yellow-400', desc: 'Basic address ownership verified.' },
  { tier: 'Governance', min: 600, max: 699, color: 'bg-lime-400',   desc: 'Governance participation active.' },
  { tier: 'Trusted',    min: 700, max: 799, color: 'bg-green-500',  desc: 'Multi-source trust. Recognised.' },
  { tier: 'Council',    min: 800, max: 899, color: 'bg-cyan-500',   desc: 'Council-level governance + staking.' },
  { tier: 'Elite',      min: 900, max: 999, color: 'bg-violet-600', desc: 'Elite — top 1% verified wallets.' },
]

export default function ProofScorePage() {
  const { address } = useAccount()

  return (
    <div className="min-h-screen bg-[#070813] text-white">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center pt-10 pb-6">
        <ProofScoreVisualizer address={address} />
      </section>

      {/* ── 7-Tier Table ── */}
      <section className="mx-auto max-w-2xl px-4 pb-6">
        <h2 className="text-lg font-semibold text-gray-300 mb-3">ProofScore Tiers</h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="py-2 px-4 text-left text-gray-400">Tier</th>
                <th className="py-2 px-4 text-left text-gray-400">Range</th>
                <th className="py-2 px-4 text-left text-gray-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="py-2 px-4">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${t.color}`} />
                    {t.tier}
                  </td>
                  <td className="py-2 px-4 tabular-nums text-gray-400">{t.min}–{t.max}</td>
                  <td className="py-2 px-4 text-gray-300">{t.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Phase 1: Challenges + Feed (2-col grid) ── */}
      <section className="mx-auto max-w-5xl px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Trust Challenges</h2>
            <TrustChallenges />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3">Score Story</h2>
            <ScoreStoryFeed />
          </div>
        </div>
      </section>

      {/* ── Deep-dive sections ── */}
    </div>
  )
}
