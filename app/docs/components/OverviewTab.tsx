'use client';

import Link from 'next/link';

const docSections = [
  {
    title: 'Getting Started',
    links: [
      { name: 'Connect your wallet', href: '/dashboard' },
      { name: 'Create your CardBound Vault', href: '/vault' },
      { name: 'Setup wizard', href: '/onboarding' },
    ],
  },
  {
    title: 'Core Concepts',
    links: [
      { name: 'ProofScore & reputation', href: '/proofscore' },
      { name: 'Escrow & trust fees', href: '/escrow' },
      { name: 'Guardian Recovery', href: '/guardians' },
      { name: 'Merchant Portal', href: '/merchant' },
    ],
  },
  {
    title: 'Protocol & Governance',
    links: [
      { name: 'Seer Constitution', href: '/governance' },
      { name: 'DAO & voting', href: '/dao-hub' },
      { name: 'ProofScore burn model', href: '/proofscore' },
      { name: "What's coming (roadmap)", href: '/roadmap' },
    ],
  },
];

export function OverviewTab() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400 leading-relaxed">
        VFIDE is a zero-merchant-fee payments protocol. Your funds live in a{' '}
        <strong className="text-zinc-300">non-custodial CardBound Vault</strong> — no company
        controls them. Reputation is earned on-chain via{' '}
        <strong className="text-zinc-300">ProofScore</strong>, not granted. The merchant fee is
        hardcoded to zero in an immutable smart contract.
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {docSections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="mb-4 text-base font-bold text-white">{section.title}</h3>
            <div className="space-y-2">
              {section.links.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block text-sm text-accent hover:text-accent-light transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
