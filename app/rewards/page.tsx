'use client'

// Token rewards are not available in this protocol.
// VFIDE is a governance utility token only — there are no referral bonuses,
// merchant incentives, lock bonuses, or any other profit-distribution mechanisms.
import { Footer } from '@/components/layout/Footer'

export default function RewardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
            <div className="text-5xl mb-4">🛡️</div>
            <h1 className="text-2xl font-bold text-white mb-3">No Token Rewards</h1>
            <p className="text-slate-300 mb-6">
              VFIDE is a governance utility token. There are no referral bonuses,
              merchant incentives, lock bonuses, or any other profit-distribution
              mechanisms — by design, to ensure VFIDE is not classified as a
              security under the Howey Test.
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-green-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white font-medium text-sm">Governance voting rights</div>
                  <div className="text-slate-400 text-xs">Participate in DAO proposals and decisions</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-green-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white font-medium text-sm">Protocol access</div>
                  <div className="text-slate-400 text-xs">Use VFIDE to pay commerce and vault fees</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <span className="text-green-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white font-medium text-sm">Governance duty points</div>
                  <div className="text-slate-400 text-xs">Non-transferable participation tracking — not profit</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
            <h2 className="text-white font-bold mb-2 text-sm">ℹ️ Why no rewards?</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Referral bonuses, merchant incentives, and yield create an expectation
              of profits from the efforts of others — the third and fourth prongs of
              the Howey Test. VFIDE deliberately omits all such mechanisms so that
              holding or using the token cannot be construed as an investment contract.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
