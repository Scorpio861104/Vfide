'use client';

export const dynamic = 'force-dynamic';

export default function RewardsPage() {
  return (
    <main role="main" className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white">
      <div className="container mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-4xl font-black mb-4">No Token Rewards</h1>
        <p className="text-zinc-400 mb-8">
          VFIDE is a governance utility token. It is not a yield-bearing asset, a profit-sharing
          instrument, or a speculative vehicle. There are no referral bonuses, merchant incentives,
          lock bonuses, or profit-sharing rewards — by design, to keep VFIDE from being classified
          as a security.
        </p>

        <h2 className="text-2xl font-bold mb-4">What VFIDE is for</h2>
        <ul className="space-y-3 text-zinc-300 mb-10">
          <li className="flex gap-2">
            <span className="text-cyan-400">→</span>
            <span>Governance voting rights — shape protocol rules, fees, and treasury allocations.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400">→</span>
            <span>Protocol access — stake VFIDE to unlock merchant tiers and advanced vault features.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400">→</span>
            <span>Governance duty points — earned by participating in Seer panels, not by holding.</span>
          </li>
        </ul>

        <h2 className="text-2xl font-bold mb-4">Why no rewards?</h2>
        <p className="text-zinc-400">
          Because rewards create speculation, and speculation hurts the people we are building for.
          The communities we serve — street vendors in Accra, OFWs in Manila, freelancers in Medellín —
          need stable, predictable financial tools. Not another token to chase.
        </p>
      </div>
    </main>
  );
}
