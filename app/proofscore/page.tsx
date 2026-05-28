'use client'

import { useAccount } from 'wagmi'
import { TrustChallenges } from '@/app/proofscore/components/TrustChallenges'
import { ScoreStoryFeed } from '@/app/proofscore/components/ScoreStoryFeed'
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'
import { useLocale } from '@/hooks/useLocale';
import { PROOFSCORE_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

// Canonical 7-tier system — 0–10,000 scale (matches Seer contract + ScoringConstants.sol)
// LOW_FEE_FLOOR=4000, NEUTRAL=5000, MIN_GOVERNANCE=5400, MIN_MERCHANT=5600, HIGH_FEE_CEIL=8000
const TIERS = [
  { tier: 'Risky',      min: 0,    max: 3499,  color: 'bg-red-500',    desc: 'No verified identity. High risk. Max 5% fee.' },
  { tier: 'Low Trust',  min: 3500, max: 4999,  color: 'bg-orange-400', desc: 'Minimal proof. Fee reduces toward 5%–3.5%.' },
  { tier: 'Neutral',    min: 5000, max: 5399,  color: 'bg-yellow-400', desc: 'Basic address ownership verified. ~2.5% fee.' },
  { tier: 'Governance', min: 5400, max: 5599,  color: 'bg-lime-400',   desc: 'Eligible to vote and propose in the DAO.' },
  { tier: 'Trusted',    min: 5600, max: 6999,  color: 'bg-green-500',  desc: 'Multi-source trust. Merchant registration eligible.' },
  { tier: 'Council',    min: 7000, max: 7999,  color: 'bg-accent',   desc: 'Council-eligible. Can endorse and mentor others.' },
  { tier: 'Elite',      min: 8000, max: 10000, color: 'bg-violet-600', desc: 'Highest trust. Minimum 0.25% fee.' },
]

export default function ProofScorePage() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(PROOFSCORE_TRANSLATIONS, locale); // proofscore page i18n
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-[#070813] text-white">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center pt-10 pb-6">
        {isConnected ? (
          <ProofScoreVisualizer address={address} />
        ) : (
          <div className="flex flex-col items-center gap-4 py-12 text-center px-4">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center">
              <span className="text-4xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Connect your wallet</h2>
            <p className="text-zinc-400 max-w-sm">
              Your ProofScore is built on-chain. Connect a wallet to see your live reputation score, fee tier, and trust challenges.
            </p>
          </div>
        )}
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
