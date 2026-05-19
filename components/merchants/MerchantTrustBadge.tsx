'use client';

export type ProofTier = 'Risky' | 'Low Trust' | 'Neutral' | 'Governance' | 'Trusted' | 'Council' | 'Elite';

const TIER_COLORS: Record<ProofTier, string> = {
  'Risky':      'bg-red-500/20 text-red-400 border-red-500/30',
  'Low Trust':  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Neutral':    'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Governance': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Trusted':    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Council':    'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Elite':      'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

function scoreToTier(score: number): ProofTier {
  if (score >= 8000) return 'Elite';
  if (score >= 7000) return 'Council';
  if (score >= 6000) return 'Trusted';
  if (score >= 5000) return 'Governance';
  if (score >= 3000) return 'Neutral';
  if (score >= 1000) return 'Low Trust';
  return 'Risky';
}

interface MerchantTrustBadgeProps {
  score?: number;
  tier?: ProofTier;
  size?: 'sm' | 'md';
}

export function MerchantTrustBadge({ score, tier, size = 'sm' }: MerchantTrustBadgeProps) {
  const resolvedTier = tier ?? (score !== undefined ? scoreToTier(score) : undefined);
  if (!resolvedTier) return null;

  const colorClass = TIER_COLORS[resolvedTier];
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${colorClass} ${sizeClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {resolvedTier}
    </span>
  );
}

const ALL_TIERS: ProofTier[] = ['Risky', 'Low Trust', 'Neutral', 'Governance', 'Trusted', 'Council', 'Elite'];

interface MerchantTierFilterProps {
  selected: ProofTier | 'All';
  onChange: (tier: ProofTier | 'All') => void;
}

export function MerchantTierFilter({ selected, onChange }: MerchantTierFilterProps) {
  const allTiers: Array<ProofTier | 'All'> = ['All', ...ALL_TIERS];

  return (
    <div className="flex flex-wrap gap-1.5">
      {allTiers.map((tier) => {
        const isActive = selected === tier;
        const colorClass = tier === 'All'
          ? isActive ? 'bg-slate-600 text-slate-100 border-slate-500' : 'bg-slate-800 text-slate-400 border-slate-700'
          : isActive
            ? TIER_COLORS[tier as ProofTier]
            : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-500';

        return (
          <button
            key={tier}
            onClick={() => onChange(tier)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${colorClass}`}
          >
            {tier}
          </button>
        );
      })}
    </div>
  );
}
