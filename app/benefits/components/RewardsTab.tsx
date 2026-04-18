'use client';

// Extracted from page.tsx — verify imports

export function RewardsTab({ isConnected: _isConnected = false }: { isConnected?: boolean }) {
  const rewardCategories = [
    {
      icon: '💸',
      color: 'border-emerald-500/40 bg-emerald-500/5',
      labelColor: 'text-emerald-400',
      title: 'Fee Discounts',
      description: 'Earn up to 12% off transaction fees by leveling up through quests and daily activity.',
      cta: { label: 'Start Quests', href: '/quests' },
    },
    {
      icon: '🗳️',
      color: 'border-violet-500/40 bg-violet-500/5',
      labelColor: 'text-violet-400',
      title: 'Governance Power',
      description: 'Higher XP levels grant up to 1.5× voting weight and the right to submit DAO proposals directly.',
      cta: { label: 'View Perks', href: '/achievements' },
    },
    {
      icon: '🔬',
      color: 'border-cyan-500/40 bg-cyan-500/5',
      labelColor: 'text-cyan-400',
      title: 'Early Feature Access',
      description: 'Reach Level 10 to opt in to beta features and new platform capabilities before public release.',
      cta: { label: 'View Perks', href: '/achievements' },
    },
    {
      icon: '🏆',
      color: 'border-amber-400/40 bg-amber-400/5',
      labelColor: 'text-amber-400',
      title: 'Headhunter Recognition',
      description: 'Top 20 quarterly recruiters earn the Headhunter governance badge: +25% voting weight, proposal rights, and council eligibility.',
      cta: { label: 'Headhunter Program', href: '/headhunter' },
    },
    {
      icon: '🔥',
      color: 'border-orange-500/40 bg-orange-500/5',
      labelColor: 'text-orange-400',
      title: 'Streak Milestones',
      description: 'Maintain daily activity streaks for XP bonuses at 7, 14, 30, 60, and 90-day milestones.',
      cta: { label: 'Start Quests', href: '/quests' },
    },
    {
      icon: '✅',
      color: 'border-zinc-500/40 bg-zinc-500/5',
      labelColor: 'text-zinc-300',
      title: 'Verified Profile Badge',
      description: 'Reach Level 3 to display a Verified Participant badge on your public profile.',
      cta: { label: 'View Achievements', href: '/achievements' },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Available Rewards</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          All rewards are <span className="text-cyan-400 font-semibold">platform utility benefits</span> earned 
          through your own activity — not investment returns. Level up, streak up, and compete to unlock them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewardCategories.map((cat, idx) => (
          <div key={idx} className={`border rounded-xl p-5 ${cat.color}`}>
            <div className="text-3xl mb-3">{cat.icon}</div>
            <h3 className={`text-lg font-bold mb-2 ${cat.labelColor}`}>{cat.title}</h3>
            <p className="text-zinc-400 text-sm mb-4">{cat.description}</p>
            <a
              href={cat.cta.href}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              {cat.cta.label} →
            </a>
          </div>
        ))}
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 text-sm text-zinc-400">
        <div className="flex items-start gap-2">
          <span className="text-amber-400 shrink-0 mt-0.5">ℹ️</span>
          <span>
            VFIDE is a governance utility token. Rewards are platform perks tied to{' '}
            <strong className="text-zinc-200">your own usage</strong> — fee discounts, voting weight, feature access, and community recognition. 
            No token distributions are offered for holding, referrals, or activity.
          </span>
        </div>
      </div>
    </div>
  );
}
