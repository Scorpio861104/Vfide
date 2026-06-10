'use client';

/**
 * VFIDEExplained — foundational, plain-language explanation of the five institutions and how they
 * connect (Wave 34). Built on progressive-disclosure KnowledgePanels so a first-time user can
 * understand Ownership, Trust, Commerce, Continuity, and their relationship without leaving the
 * page. Content is accurate to VFIDE's real, non-custodial mechanics — no crypto jargon, no implied
 * features that don't exist.
 */

import { Wallet, ShieldCheck, Store, Heart, GraduationCap, Network } from 'lucide-react';
import { KnowledgePanel, type KnowledgePanelProps } from './KnowledgePanel';

const PANELS: KnowledgePanelProps[] = [
  {
    headline: 'What Is Ownership?',
    teaser: 'Your money stays in your control.',
    icon: Wallet,
    explanation:
      'Ownership means your funds live in a vault that only you control. VFIDE cannot freeze, take, or move your money — there is simply no mechanism for anyone else to do so.\nYou hold the keys. You decide what happens.',
    benefits: [
      'No one can freeze or seize your funds',
      'You transact directly, without asking permission',
      'Your wallet works on any phone, with no bank account',
    ],
    questions: [
      { q: 'Can VFIDE take my money?', a: 'No. The system is non-custodial — there is no freeze, block, or seizure capability built into it.' },
      { q: 'What if I lose my phone?', a: 'Continuity covers that: trusted contacts can help you recover access without anyone holding your funds.' },
    ],
    learnMore: { label: 'Open your vault', href: '/vault' },
  },
  {
    headline: 'What Is Trust?',
    teaser: 'A record you own that reduces friction.',
    icon: ShieldCheck,
    explanation:
      'Trust is a record of your actions and participation that belongs to you. It is not a rating of you as a person and no authority decides your worth.\nAs your record grows through honest activity, the friction on what you do falls — for example, lower fees when you transact.',
    benefits: [
      'The record belongs to you, not to VFIDE',
      'Built through actions, never opinions',
      'A stronger record reduces the fees you pay',
    ],
    questions: [
      { q: 'Is this a credit score?', a: 'No. It is a transparent record of what you have done on the network — record-keeping, not a judgment of you.' },
      { q: 'Does VFIDE grant trust?', a: 'No. VFIDE records the activity you choose to take. The trust is earned and owned by you.' },
    ],
    learnMore: { label: 'See your trust record', href: '/proofscore' },
  },
  {
    headline: 'What Is Commerce?',
    teaser: 'Accept payments and run a business — no protocol fees.',
    icon: Store,
    explanation:
      'Commerce is the set of systems for accepting payments and running a business: payments, invoices, inventory, loyalty, and more. Sellers pay no protocol fee.\nIt is built for real businesses — from a single market seller to a multi-location operation.',
    benefits: [
      'Sellers keep 100% — no merchant protocol fee',
      'Accept payment with a link, on any device',
      'Customer, sales, and operations systems in one place',
    ],
    questions: [
      { q: 'What does it cost to sell?', a: 'There is no merchant protocol fee. Buyers pay a small trust fee that falls as their record grows.' },
      { q: 'Do I need a bank?', a: 'No. You can get paid and cash out without a bank account.' },
    ],
    learnMore: { label: 'Open Merchant Headquarters', href: '/merchant' },
  },
  {
    headline: 'What Is Continuity?',
    teaser: 'Access that survives disruption.',
    icon: Heart,
    explanation:
      'Continuity prepares your access for the unexpected — a lost device, an emergency, or passing your assets to the people you choose.\nTrusted contacts you select can help you recover, and you decide how your assets transfer, on your terms — all without anyone ever holding your funds.',
    benefits: [
      'Recover access if a device or key is lost',
      'Plan how your assets pass to loved ones',
      'Protection built in, never custodial',
    ],
    questions: [
      { q: 'Who can recover my account?', a: 'Only the trusted contacts you choose, and only through the process you configure.' },
      { q: 'Does anyone hold my funds during recovery?', a: 'No. Funds stay in your vault throughout — guardians approve a move to a new key, they never take custody.' },
    ],
    learnMore: { label: 'Open the Continuity Command Center', href: '/continuity' },
  },
  {
    headline: 'What Is Capability?',
    teaser: 'Systems and learning that expand what you can do.',
    icon: GraduationCap,
    explanation:
      'Capability is everything that helps you do more over time — guidance available where you need it, plus a reference library when you want to go deeper.\nYou learn the systems as you use them, rather than studying before you start.',
    benefits: [
      'Help appears beside the system you are using',
      'A reference library for going deeper',
      'No course to complete before you begin',
    ],
    questions: [
      { q: 'Do I have to take a course first?', a: 'No. Explanations appear in context as you use each system. The library is there only when you want more.' },
    ],
    learnMore: { label: 'Open the Knowledge Library', href: '/seer-academy' },
  },
  {
    headline: 'How Do They Connect?',
    teaser: 'One ecosystem, each part supporting the next.',
    icon: Network,
    explanation:
      'These are not separate products. Ownership gives you control of your funds. Acting honestly builds your Trust record, which reduces friction in Commerce. Commerce is protected by Continuity so your business and assets survive disruption. Capability helps you do more across all of it.\nTrust is the bridge: ownership earns it, and it powers everything you do in commerce.',
    benefits: [
      'Ownership → Trust → Commerce → Continuity → Capability',
      'Each stage strengthens the next',
      'Your record and your funds stay yours throughout',
    ],
    learnMore: { label: 'See how the ecosystem fits together', href: '/' },
  },
];

export function VFIDEExplained() {
  return (
    <section className="mb-16" aria-label="VFIDE explained">
      <div className="mb-8 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">VFIDE Explained</h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">Understand VFIDE in plain terms</p>
        <p className="mt-3 text-zinc-400">
          Six short explanations. Open any one — no jargon, no course required.
        </p>
      </div>
      <div className="space-y-3">
        {PANELS.map((p) => (
          <KnowledgePanel key={p.headline} {...p} />
        ))}
      </div>
    </section>
  );
}
