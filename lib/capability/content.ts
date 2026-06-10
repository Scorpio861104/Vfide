/**
 * lib/capability/content.ts - V31 Capability Layer content (single source).
 *
 * Pure data. No mechanics, no scores, no gamification. This is the text the
 * capability components render so learning can live where questions occur
 * instead of behind an academy visit. Copy is human and grounded in systems
 * that already exist; no invented features, no specific time/number claims that
 * aren't certain.
 */

import type { InstitutionId } from '@/lib/civilization/model';

export interface CapabilityContent {
  what: string;
  why: string;
  when: string;
  risksReduced: string[];
}

export const CAPABILITY: Partial<Record<InstitutionId, CapabilityContent>> = {
  ownership: {
    what: 'A vault that only you control - funds held in your own contract, not on an exchange.',
    why: 'No bank or middleman can freeze, seize, or block your money.',
    when: 'From the moment you hold any value you want to keep.',
    risksReduced: ['Frozen or seized accounts', 'A company failing with your funds', 'Losing access to your own money'],
  },
  trust: {
    what: 'A record of trust you earn through honest dealing over time.',
    why: 'As it grows, your fees fall and more of the network opens to you.',
    when: 'It works in the background; you build it by participating honestly.',
    risksReduced: ['Paying higher fees than you need to', 'Being treated as a stranger forever', 'Starting over on every new service'],
  },
  commerce: {
    what: 'Tools to get paid, sell, and run a business with zero merchant fees.',
    why: 'You participate in commerce without traditional gatekeepers, and keep what you earn.',
    when: 'When you want to accept payments or grow a business.',
    risksReduced: ['Payment processors taking a cut', 'Account holds and chargebacks', 'Being shut out by a platform'],
  },
  continuity: {
    what: 'Guardians, recovery, and inheritance - ways to survive losing a device or more.',
    why: 'Self-custody should not mean a single point of failure.',
    when: 'Set it up early, before you ever need it.',
    risksReduced: ['Permanent lockout from a lost wallet', 'Losing everything if something happens to you', 'No way for family to reach what you built'],
  },
  stewardship: {
    what: 'A way to help maintain and protect the protocol you use.',
    why: 'The system stays healthy because participants tend to it - as participants, not subjects.',
    when: 'When you want a say in the parameters that affect everyone.',
    risksReduced: ['Decisions made without you', 'A protocol that drifts from its users', 'Capture by a small group'],
  },
};

export interface Guidance {
  title: string;
  why: string;
  learnMore?: { label: string; href: string };
}

export const GUIDANCE: Record<string, Guidance> = {
  guardians: {
    title: 'What guardians do',
    why: 'Guardians are people you trust who can help return access to a new wallet if you lose yours. They can never spend your funds - they only help you recover.',
    learnMore: { label: 'How guardians work', href: '/guardians' },
  },
  inheritance: {
    title: 'What inheritance does',
    why: 'Inheritance lets what you built pass to the people you choose if you can no longer act. Without it, your vault could become unreachable.',
    learnMore: { label: 'How inheritance works', href: '/inheritance/setup' },
  },
  merchant: {
    title: 'What a merchant account does',
    why: 'A merchant account lets you accept payments and run a business with zero protocol fees. Commerce is available whether or not you ever activate one.',
    learnMore: { label: 'How merchant works', href: '/merchant' },
  },
  trust: {
    title: 'What your trust record does',
    why: 'Your trust record lowers the fee you pay and opens more of the network as it grows. It is yours, earned through honest participation.',
    learnMore: { label: 'How trust works', href: '/proofscore' },
  },
};

export interface DecisionContent {
  question: string;
  benefits: string[];
  tradeoffs: string[];
  consequencesIfSkipped: string[];
}

export const DECISIONS: Record<string, DecisionContent> = {
  inheritance: {
    question: 'Should I configure inheritance?',
    benefits: ['What you build can pass to people you choose', 'You decide who and in what shares', 'There is a challenge window before anything moves, as a safeguard'],
    tradeoffs: ['It takes a few minutes to set heirs', 'Heirs must be people you already trust as guardians'],
    consequencesIfSkipped: ['Your vault may be unreachable by anyone after you'],
  },
  guardians: {
    question: 'Should I add guardians?',
    benefits: ['You can recover access if you lose your wallet', 'Guardians cannot spend your funds - only help you recover', 'You choose who and how many'],
    tradeoffs: ['You need people you trust to say yes', 'Recovery takes a deliberate waiting period by design'],
    consequencesIfSkipped: ['Losing your wallet could mean permanent lockout'],
  },
  merchant: {
    question: 'Should I activate a merchant account?',
    benefits: ['Accept payments with zero protocol fees', 'Keep 100% of what customers pay', 'Your business is covered by your guardians and inheritance'],
    tradeoffs: ['Activation is a deliberate step', 'Some merchant tools depend on your trust record'],
    consequencesIfSkipped: ['You can still pay and transact - you just will not have a storefront'],
  },
  governance: {
    question: 'Should I participate in governance?',
    benefits: ['A say in the parameters that affect everyone', 'Helps keep the protocol aligned with its users'],
    tradeoffs: ['Participation is optional and takes attention', 'Eligibility depends on your trust record'],
    consequencesIfSkipped: ['Decisions still get made - just without your voice'],
  },
};

export interface Pathway {
  id: string;
  title: string;
  description: string;
  uses: string[];
  entry: { label: string; href: string };
}

export const PATHWAYS: Pathway[] = [
  {
    id: 'owner',
    title: 'Owner',
    description: 'Hold and protect your own value.',
    uses: ['Vault', 'Guardians', 'Recovery'],
    entry: { label: 'Open your vault', href: '/vault' },
  },
  {
    id: 'merchant',
    title: 'Merchant',
    description: 'Get paid and run a business with zero fees.',
    uses: ['Merchant', 'Payments', 'Trust'],
    entry: { label: 'Explore commerce', href: '/merchant' },
  },
  {
    id: 'steward',
    title: 'Steward',
    description: 'Help protect and maintain the protocol.',
    uses: ['Governance', 'Council', 'Sanctum'],
    entry: { label: 'Explore stewardship', href: '/governance' },
  },
  {
    id: 'builder',
    title: 'Builder',
    description: 'Build on top of VFIDE.',
    uses: ['Docs', 'Explorer', 'Testnet'],
    entry: { label: 'Explore building', href: '/docs' },
  },
  {
    id: 'family-planner',
    title: 'Family planner',
    description: 'Make sure what you build survives and passes on.',
    uses: ['Inheritance', 'Guardians', 'Continuity'],
    entry: { label: 'Plan continuity', href: '/continuity' },
  },
];