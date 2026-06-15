/**
 * Headquarters Academy — content + mapping (Platform Transformation, Wave 4).
 *
 * Pure text content (no JSX/icons) for the two domains that had no embedded education yet — Preparedness and
 * Governance — plus the map of each headquarters to its learning. Kept separate from rendering so the content can be
 * checked for well-formedness and honesty in tests. Voice mirrors the existing KnowledgePanel content: plain,
 * participant-owned, never overclaiming.
 */
import type { DomainId } from '@/lib/headquarters/model';

export interface LearnPanel {
  headline: string;
  teaser: string;
  explanation: string;
  benefits: string[];
  learnMore?: boolean;
}

export const PREPAREDNESS_CONTENT: LearnPanel[] = [
  {
    headline: 'What preparedness means here',
    teaser: 'Ready for life events — without giving up control.',
    explanation:
      'Preparedness is making sure the people and things you care about stay reachable through whatever life brings — a lost device, an illness, an absence. You set it up once; nothing is taken out of your hands.',
    benefits: ['You stay in control', 'Ready before you need it', 'Nothing is automatic against your wishes'],
  },
  {
    headline: 'Recovery readiness',
    teaser: 'Could you regain access today?',
    explanation:
      'Recovery readiness is a simple check: if you lost your device right now, could you get back in? Naming guardians and confirming your recovery path is what makes the answer yes.',
    benefits: ['A clear yes-or-no', 'Guardians never hold your funds', 'Fixable in minutes'],
    learnMore: true,
  },
  {
    headline: 'Protecting your family',
    teaser: 'The people who depend on you, covered.',
    explanation:
      'Family protection means the people who rely on you can reach what they need if you cannot act. You decide who, and how much — it is your plan, recorded plainly, changeable any time.',
    benefits: ['You name who and how much', 'Change it whenever you like', 'No third party decides'],
  },
  {
    headline: 'Keeping a business running',
    teaser: 'Continuity through an absence.',
    explanation:
      'Business continuity is preparing so a business can keep operating through a disruption or absence, and pass to a successor cleanly. Some of this is still being built — the parts that are ready are marked plainly.',
    benefits: ['Plan for disruption early', 'Honest about what is ready', 'Built around your intent'],
    learnMore: true,
  },
];

export const GOVERNANCE_CONTENT: LearnPanel[] = [
  {
    headline: 'What the DAO is',
    teaser: 'The community that stewards the protocol.',
    explanation:
      'The DAO is the community of participants who steward how the protocol evolves. It is not a company or an authority over you — it is a way for the people who use VFIDE to shape it together.',
    benefits: ['Stewarded by participants', 'Not an authority over you', 'Open to take part'],
  },
  {
    headline: 'How voting works',
    teaser: 'Your say in decisions that affect everyone.',
    explanation:
      'Proposals are decisions put to the community. Voting lets you have a say in the ones that affect everyone. You are never required to vote, and your assets are never at stake for taking part.',
    benefits: ['A real say', 'Never required', 'Your funds are never at risk'],
    learnMore: true,
  },
  {
    headline: 'Elections and stewardship',
    teaser: 'Choosing who serves the ecosystem.',
    explanation:
      'Some roles serve the ecosystem over time. Elections let participants choose who fills them. Stewardship means caring for the shared commons for the long term, on behalf of everyone.',
    benefits: ['Participants choose', 'Service, not control', 'Long-term care for the commons'],
  },
  {
    headline: 'Following the treasury',
    teaser: 'See exactly where ecosystem funds go.',
    explanation:
      'The treasury holds funds the ecosystem uses to sustain and grow itself. You can follow where it goes — transparency is the point. Nothing about the treasury reaches into your personal vault.',
    benefits: ['Transparent by design', 'Separate from your vault', 'Accountable to participants'],
    learnMore: true,
  },
];

export type AcademySource = 'continuity' | 'trust' | 'merchant' | 'preparedness' | 'governance';
export const HQ_ACADEMY_MAP: Record<DomainId, AcademySource> = {
  ownership: 'continuity',
  business: 'merchant',
  trust: 'trust',
  preparedness: 'preparedness',
  governance: 'governance',
};
