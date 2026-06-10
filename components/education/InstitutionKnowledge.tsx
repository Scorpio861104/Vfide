'use client';

/**
 * Institution knowledge content (Wave 34) — contextual education embedded beside each institution's
 * systems. Plain-language, accurate to VFIDE's real non-custodial mechanics, no crypto jargon.
 * Rendered via KnowledgePanelGroup so it appears in-context with progressive disclosure.
 */

import { KnowledgePanelGroup, type KnowledgePanelProps } from './KnowledgePanel';
import {
  HelpCircle, LifeBuoy, ScrollText, Users, Heart,
  ShieldCheck, BadgeCheck, TrendingUp, Sparkles,
  CreditCard, Repeat, Award, Banknote, ClipboardCheck,
} from 'lucide-react';

const LIBRARY = { label: 'Go deeper in the Knowledge Library', href: '/seer-academy' };

// ─── Continuity ──────────────────────────────────────────────────────────────

const CONTINUITY_PANELS: KnowledgePanelProps[] = [
  {
    headline: 'Why This Matters',
    teaser: 'What happens to your access if something goes wrong?',
    icon: HelpCircle,
    explanation:
      'Most people never plan for a lost phone, an emergency, or what happens to their money afterward. Continuity is how you prepare — so your access and assets are never stranded.',
    benefits: ['Nothing is lost if a device is lost', 'Your loved ones are protected', 'You stay in control the whole time'],
  },
  {
    headline: 'Understanding Recovery',
    teaser: 'How you get back in if you lose access.',
    icon: LifeBuoy,
    explanation:
      'Recovery uses trusted contacts you choose. If you lose your device, they can approve moving your vault to a new key. Your funds never leave the vault and no one ever takes custody of them.',
    benefits: ['Recover without a bank or company', 'Trusted contacts approve, never take', 'Funds stay in your vault throughout'],
    questions: [{ q: 'Could my contacts steal my funds?', a: 'No. They can only help approve a move to a new key you control — they never gain custody.' }],
    learnMore: LIBRARY,
  },
  {
    headline: 'Inheritance Planning Basics',
    teaser: 'Decide how your assets pass on.',
    icon: ScrollText,
    explanation:
      'You can plan how your assets transfer to the people you choose, on the terms you set. It follows clear, time-based steps so transfers happen the way you intended.',
    benefits: ['You choose who inherits', 'You set the terms', 'Clear, predictable process'],
  },
  {
    headline: 'Trusted Contact Guidance',
    teaser: 'Who to choose, and what they can do.',
    icon: Users,
    explanation:
      'Trusted contacts are people you pick to help protect your access — close family or long-term partners are common choices. They help with recovery and continuity, but cannot spend or take your funds.',
    benefits: ['Pick people you actually trust', 'They protect access, not custody', 'Add more than one for resilience'],
  },
  {
    headline: 'Business Continuity Education',
    teaser: 'Keep a business running through disruption.',
    icon: Heart,
    explanation:
      'For merchants, continuity keeps the business operating through an absence or transition, and supports passing ownership to a successor — so the business survives beyond any one person.',
    benefits: ['Operate through disruption', 'Hand over cleanly', 'Preserve business assets'],
    learnMore: LIBRARY,
  },
];

export function ContinuityKnowledge() {
  return (
    <KnowledgePanelGroup
      title="Learn as you go"
      subtitle="Short, plain-language explanations — open any that's useful, no navigation required."
      panels={CONTINUITY_PANELS}
    />
  );
}

// ─── Trust ───────────────────────────────────────────────────────────────────

const TRUST_PANELS: KnowledgePanelProps[] = [
  {
    headline: 'How Trust Works',
    teaser: 'Built through actions, owned by you.',
    icon: ShieldCheck,
    explanation:
      'Trust is a record of what you have done on the network. It is built through actions, the record belongs to you, and no authority decides your worth. Its purpose is transparency and less friction.',
    benefits: ['Earned through real activity', 'Owned by the participant', 'No one judges you'],
  },
  {
    headline: 'Understanding Verification',
    teaser: 'What "verified" actually means here.',
    icon: BadgeCheck,
    explanation:
      'Verification simply confirms things you choose to confirm — like activating as a merchant or adding a trusted contact. Each shows a plain state: verified, pending, configured, or not configured.',
    benefits: ['You decide what to verify', 'Clear, factual states', 'Never good/bad or high/low'],
  },
  {
    headline: 'How Participation Builds Trust',
    teaser: 'Actions add to your record over time.',
    icon: TrendingUp,
    explanation:
      'Each meaningful action — completing payments, configuring recovery, taking part in governance — adds to your record. Consistent, honest participation is what strengthens it.',
    benefits: ['Every action counts', 'Consistency matters most', 'Nothing to buy'],
    learnMore: LIBRARY,
  },
  {
    headline: 'Reducing Friction Through Trust',
    teaser: 'A stronger record lowers your costs.',
    icon: Sparkles,
    explanation:
      'As your record grows, the friction on what you do falls — most directly, the fee you pay when transacting decreases. The network rewards a strong record with lower cost.',
    benefits: ['Lower fees as your record grows', 'Smoother access to systems', 'Rewards honest history'],
  },
  {
    headline: 'Trust and Opportunity',
    teaser: 'Trust opens doors — it never ranks you.',
    icon: HelpCircle,
    explanation:
      'A trust record can unlock opportunity: merchant benefits, governance participation, and access to more of the network. It is about expanding what you can do, never about approval or status.',
    benefits: ['Expands what you can access', 'Never an approval gate', 'Opportunity, not status'],
    learnMore: LIBRARY,
  },
];

export function TrustKnowledge() {
  return (
    <KnowledgePanelGroup
      title="Understanding trust"
      subtitle="Simple explanations of how the trust record works — open any to learn in place."
      panels={TRUST_PANELS}
    />
  );
}

// ─── Merchant ──────────────────────────────────────────────────────────────

const MERCHANT_PANELS: KnowledgePanelProps[] = [
  {
    headline: 'Accepting Payments',
    teaser: 'Get paid with a link, on any device.',
    icon: CreditCard,
    explanation:
      'Share a payment link or show a QR code and receive payment directly — no card terminal, no bank account, and no merchant protocol fee. Funds settle to a vault only you control.',
    benefits: ['No merchant protocol fee', 'Works on any phone', 'Funds stay in your control'],
  },
  {
    headline: 'Customer Retention',
    teaser: 'Turn first-time buyers into regulars.',
    icon: Users,
    explanation:
      'Keeping a customer is cheaper than finding a new one. Use customer records, loyalty, and follow-up to bring people back — the systems sit together in Customer Infrastructure.',
    benefits: ['Know your repeat customers', 'Reward loyalty', 'Bring buyers back'],
  },
  {
    headline: 'Loyalty Programs',
    teaser: 'Reward the customers who come back.',
    icon: Award,
    explanation:
      'Loyalty programs — punch cards, points, tiers — give customers a reason to return. Set one up beside your other customer systems and track it over time.',
    benefits: ['Encourage repeat business', 'Simple to set up', 'Flexible reward styles'],
    learnMore: LIBRARY,
  },
  {
    headline: 'Business Continuity',
    teaser: 'Protect the business itself.',
    icon: Heart,
    explanation:
      'Prepare your business for disruption, transition, and succession — so it can keep operating through an absence and pass to a successor cleanly. This connects your business into the Continuity institution.',
    benefits: ['Operate through disruption', 'Plan ownership transition', 'Preserve business assets'],
  },
  {
    headline: 'Settlement Education',
    teaser: 'How and when you get your money.',
    icon: Banknote,
    explanation:
      'Payments settle to your vault, which only you control — there is no processor holding your funds. You can then cash out to mobile money, bank, or airtime where supported.',
    benefits: ['No processor holds your funds', 'Settles to your own vault', 'Cash out flexibly'],
  },
  {
    headline: 'Merchant Best Practices',
    teaser: 'Small habits that build a strong business.',
    icon: ClipboardCheck,
    explanation:
      'Keep inventory current, follow up with customers, configure continuity early, and build your trust record through consistent, honest activity — it lowers your costs over time.',
    benefits: ['Keep records current', 'Set up continuity early', 'Build trust through consistency'],
    learnMore: LIBRARY,
  },
];

export function MerchantKnowledge() {
  return (
    <KnowledgePanelGroup
      title="Running your business"
      subtitle="Practical guidance beside the systems you use — open any, no separate course."
      panels={MERCHANT_PANELS}
    />
  );
}
