'use client';

import { Crown, Sparkles } from 'lucide-react';

export function TiersTab() {
  const tiers = [
    {
      name: 'Bronze',
      color: '#CD7F32',
      requirement: '1,000+ VFIDE',
      benefits: ['1% fee discount', 'Community access', 'Voting rights'],
      proofScore: '10+',
      xpLevel: 2,
    },
    {
      name: 'Silver',
      color: '#C0C0C0',
      requirement: '10,000+ VFIDE',
      benefits: ['3% fee discount', 'Priority support', 'Early feature access'],
      proofScore: '25+',
      xpLevel: 5,
    },
    {
      name: 'Gold',
      color: '#FFD700',
      requirement: '50,000+ VFIDE',
      benefits: ['5% fee discount', '1.25× voting weight', 'Beta features'],
      proofScore: '50+',
      xpLevel: 10,
    },
    {
      name: 'Platinum',
      color: '#E5E4E2',
      requirement: '250,000+ VFIDE',
      benefits: ['8% fee discount', 'Direct DAO proposals', 'Custom integrations', 'Premium support'],
      proofScore: '75+',
      xpLevel: 12,
    },
    {
      name: 'Diamond',
      color: '#B9F2FF',
      requirement: '1,000,000+ VFIDE',
      benefits: ['12% fee discount', '1.5× voting weight', 'Council eligibility', 'Founding Member status'],
      proofScore: '90+',
      xpLevel: 15,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Membership Tiers</h2>
        <p className="text-zinc-400">Hold VFIDE, maintain your ProofScore, <span className="text-cyan-400">and reach the matching XP level</span> to unlock higher tiers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {tiers.map((tier, idx) => (
          <div 
            key={idx} 
            className="bg-zinc-800 border-2 rounded-xl p-6 text-center hover:scale-105 transition-transform"
            style={{ borderColor: tier.color }}
          >
            <Crown size={40} style={{ color: tier.color }} className="mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-100 mb-2">{tier.name}</h3>
            <div className="text-sm text-cyan-400 font-bold mb-1">{tier.requirement}</div>
            <div className="text-xs text-zinc-400 mb-1">ProofScore: {tier.proofScore}</div>
            <div className="text-xs text-amber-400 font-semibold mb-4">XP Level {tier.xpLevel}+</div>
            <div className="border-t border-zinc-700 pt-4">
              <ul className="text-xs text-zinc-400 space-y-1">
                {tier.benefits.map((benefit, bidx) => (
                  <li key={bidx} className="flex items-center gap-2">
                    <Sparkles size={12} style={{ color: tier.color }} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">How Tiers Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-cyan-400 font-bold mb-2">Token Holdings</h4>
            <p className="text-zinc-400 text-sm">
              Your tier is determined by the minimum VFIDE balance you hold for 30 consecutive days.
              Short-term holdings don&apos;t count toward tier qualification.
            </p>
          </div>
          <div>
            <h4 className="text-cyan-400 font-bold mb-2">ProofScore Requirement</h4>
            <p className="text-zinc-400 text-sm">
              Even with sufficient tokens, you must maintain the minimum ProofScore to access
              tier benefits. This ensures only trusted members receive premium perks.
            </p>
          </div>
          <div>
            <h4 className="text-amber-400 font-bold mb-2">XP Level Requirement</h4>
            <p className="text-zinc-400 text-sm">
              Each tier also requires a matching XP level, earned through quests, streaks, 
              and daily activity. Level up to unlock your tier&apos;s perks — regardless of token balance alone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
