/**
 * ProofScore tier utilities — single source of truth for tier boundaries,
 * human-readable names, and brand colour palette.
 */

export interface Tier {
  name: string;
  min: number;
  max: number;
  hex: string;
  textClass: string;
  bgClass: string;
}

export const TIERS: Tier[] = [
  { name: 'Risky',      min: 0,    max: 4000, hex: '#FF4444', textClass: 'text-red-400',    bgClass: 'bg-red-400/10'     },
  { name: 'Low Trust',  min: 4000, max: 5000, hex: '#FFA500', textClass: 'text-amber-400',  bgClass: 'bg-amber-400/10'   },
  { name: 'Neutral',    min: 5000, max: 5400, hex: '#FFD700', textClass: 'text-yellow-400', bgClass: 'bg-yellow-400/10'  },
  { name: 'Governance', min: 5400, max: 5600, hex: '#60A5FA', textClass: 'text-blue-400',   bgClass: 'bg-blue-400/10'    },
  { name: 'Trusted',    min: 5600, max: 7000, hex: '#34D399', textClass: 'text-emerald-400',bgClass: 'bg-emerald-400/10' },
  { name: 'Council',    min: 7000, max: 8000, hex: '#A78BFA', textClass: 'text-violet-400', bgClass: 'bg-violet-400/10'  },
  { name: 'Elite',      min: 8000, max: Infinity,hex: '#00FF88', textClass: 'text-green-400',  bgClass: 'bg-green-400/10'   },
];

export const TIER_HEX: Record<string, string> = Object.fromEntries(
  TIERS.map(t => [t.name, t.hex])
);

export function getTier(score: number): Tier {
  const found = TIERS.find(t => score >= t.min && score < t.max);
  return found ?? (TIERS[TIERS.length - 1] as Tier);
}

export function scoreToTierName(score: number): string {
  return getTier(score).name;
}
