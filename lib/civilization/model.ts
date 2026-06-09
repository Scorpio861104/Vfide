/**
 * lib/civilization/model.ts - VFIDE Civilization Model (single source of truth).
 */

import {
  Shield,
  TrendingUp,
  Store,
  Sparkles,
  Heart,
  GraduationCap,
  Scale,
  type LucideIcon,
} from 'lucide-react';

export type InstitutionId =
  | 'ownership'
  | 'trust'
  | 'commerce'
  | 'opportunity'
  | 'continuity'
  | 'capability'
  | 'stewardship';

export interface ReadinessSignal {
  label: string;
  signal: string;
  nextStep: { label: string; href: string };
}

export interface Institution {
  id: InstitutionId;
  label: string;
  whatItIs: string;
  whyItExists: string;
  homeHref: string;
  routes: string[];
  navGroupId: 'citizens' | 'merchants' | 'builders' | 'stewards' | 'academy' | null;
  color: string;
  icon: LucideIcon;
  readiness: ReadinessSignal;
}

export interface Relationship {
  from: InstitutionId;
  to: InstitutionId;
  relation: string;
}

export const INSTITUTIONS: Record<InstitutionId, Institution> = {
  ownership: {
    id: 'ownership',
    label: 'Ownership',
    whatItIs: 'A vault only you control - no freeze, no seizure.',
    whyItExists: 'Self-custody is the ground everything else stands on.',
    homeHref: '/vault',
    routes: ['/vault', '/vault/settings', '/vault/lock', '/wallet', '/pay'],
    navGroupId: 'citizens',
    color: '#8B5CF6',
    icon: Shield,
    readiness: {
      label: 'Vault created',
      signal: 'useVaultOperations().hasVault',
      nextStep: { label: 'Create your vault', href: '/vault' },
    },
  },
  trust: {
    id: 'trust',
    label: 'Trust',
    whatItIs: 'A record of trust earned through honest participation.',
    whyItExists: 'Trust lowers your costs and widens what you can do.',
    homeHref: '/proofscore',
    routes: ['/proofscore', '/endorsements'],
    navGroupId: 'citizens',
    color: '#06B6D4',
    icon: TrendingUp,
    readiness: {
      label: 'Trust history forming',
      signal: 'useProofScore().score !== null (has on-chain history)',
      nextStep: { label: 'See how to build trust', href: '/proofscore' },
    },
  },
  commerce: {
    id: 'commerce',
    label: 'Commerce',
    whatItIs: 'Run a business with zero merchant fees.',
    whyItExists: 'Trust turns into livelihood - sellers keep 100%.',
    homeHref: '/merchant',
    routes: ['/merchant', '/pos', '/marketplace', '/merchant/payouts', '/merchant/customers'],
    navGroupId: 'merchants',
    color: '#10B981',
    icon: Store,
    readiness: {
      label: 'Merchant activated',
      signal: 'useMerchantStatus().isRegistered / isActive',
      nextStep: { label: 'Set up your storefront', href: '/merchant/setup' },
    },
  },
  opportunity: {
    id: 'opportunity',
    label: 'Opportunity',
    whatItIs: 'Lower fees, governance, and reach that trust unlocks.',
    whyItExists: 'Standing should translate into concrete advantage.',
    homeHref: '/proofscore',
    routes: ['/marketplace', '/governance'],
    navGroupId: null,
    color: '#F59E0B',
    icon: Sparkles,
    readiness: {
      label: 'Opportunities unlocked',
      signal: 'useProofScore().canMerchant || canVote (tier thresholds)',
      nextStep: { label: 'See what your trust unlocks', href: '/proofscore' },
    },
  },
  continuity: {
    id: 'continuity',
    label: 'Continuity',
    whatItIs: 'Guardians, recovery, and inheritance - loss is survivable.',
    whyItExists: 'Self-custody must not mean a single point of failure.',
    homeHref: '/continuity',
    routes: [
      '/continuity',
      '/guardians',
      '/vault/recover',
      '/vault/recover/status',
      '/vault/safety',
      '/security-center',
      '/inheritance',
      '/inheritance/setup',
      '/inheritance/status',
      '/inheritance/memorial',
      '/inheritance/override',
    ],
    navGroupId: 'citizens',
    color: '#EC4899',
    icon: Heart,
    readiness: {
      label: 'Guardians + inheritance set',
      signal: 'useGuardians().guardians.length >= threshold && useInheritance().heirs.length > 0',
      nextStep: { label: 'Protect your vault', href: '/continuity' },
    },
  },
  capability: {
    id: 'capability',
    label: 'Capability',
    whatItIs: 'Learning that prepares you to act safely.',
    whyItExists: 'Capability is how a newcomer becomes a participant.',
    homeHref: '/seer-academy',
    routes: ['/seer-academy', '/onboarding', '/seer-service', '/docs'],
    navGroupId: 'academy',
    color: '#F59E0B',
    icon: GraduationCap,
    readiness: {
      label: 'Academy basics complete',
      signal: 'academy readiness checklist (local state)',
      nextStep: { label: 'Start the academy', href: '/seer-academy' },
    },
  },
  stewardship: {
    id: 'stewardship',
    label: 'Stewardship',
    whatItIs: 'Governance, treasury, and the Sanctum - caring for the whole.',
    whyItExists: 'The civilization preserves itself through its members.',
    homeHref: '/governance',
    routes: ['/governance', '/treasury', '/sanctum', '/appeals', '/fraud', '/council', '/elections'],
    navGroupId: 'stewards',
    color: '#6366F1',
    icon: Scale,
    readiness: {
      label: 'Eligible to participate',
      signal: 'useProofScore().canVote (governance threshold)',
      nextStep: { label: 'Explore governance', href: '/governance' },
    },
  },
};

export const RELATIONSHIPS: Relationship[] = [
  { from: 'ownership', to: 'trust', relation: 'Ownership is the ground trust is built on.' },
  { from: 'trust', to: 'commerce', relation: 'Trust lowers the cost of doing business.' },
  { from: 'commerce', to: 'opportunity', relation: 'Commerce opens new opportunity.' },
  { from: 'opportunity', to: 'continuity', relation: 'What you build deserves to endure.' },
  { from: 'capability', to: 'stewardship', relation: 'Capability prepares you to participate.' },
  { from: 'stewardship', to: 'continuity', relation: 'Stewardship preserves what is built.' },
  { from: 'capability', to: 'trust', relation: 'Learning is how trust begins.' },
  { from: 'continuity', to: 'ownership', relation: 'Continuity protects what you own.' },
];

export const INSTITUTION_ORDER: InstitutionId[] = [
  'ownership',
  'trust',
  'commerce',
  'opportunity',
  'continuity',
  'capability',
  'stewardship',
];

export function institutionForPath(pathname: string): Institution | null {
  let best: { inst: Institution; len: number } | null = null;
  for (const inst of Object.values(INSTITUTIONS)) {
    for (const route of inst.routes) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        if (!best || route.length > best.len) best = { inst, len: route.length };
      }
    }
  }
  return best?.inst ?? null;
}

export function connectedInstitutions(id: InstitutionId): { inst: Institution; relation: string }[] {
  const out: { inst: Institution; relation: string }[] = [];
  for (const rel of RELATIONSHIPS) {
    if (rel.from === id) out.push({ inst: INSTITUTIONS[rel.to], relation: rel.relation });
    else if (rel.to === id) out.push({ inst: INSTITUTIONS[rel.from], relation: rel.relation });
  }

  const seen = new Set<InstitutionId>();
  return out.filter(({ inst }) => (seen.has(inst.id) ? false : (seen.add(inst.id), true)));
}
