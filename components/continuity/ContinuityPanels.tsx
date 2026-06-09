'use client';

/**
 * Continuity panels (V26 Parts 7-9):
 *   FamilyContinuityPanel    - plain-language explainer (understanding, not legal advice).
 *   BusinessContinuityPanel  - connects Merchant <-> Continuity.
 *   ContinuityRelationships  - Ownership / Trust / Commerce / Stewardship -> Continuity.
 */

import Link from 'next/link';
import { ArrowRight, Users, KeyRound, Heart, Gavel, Store, ShieldCheck } from 'lucide-react';
import { INSTITUTIONS } from '@/lib/civilization/model';

export function FamilyContinuityPanel() {
  const items = [
    { Icon: ShieldCheck, term: 'Guardians', plain: 'People you trust who can help you get back into your vault if you lose your wallet. They cannot spend your funds.' },
    { Icon: Users, term: 'Heirs', plain: 'The people who receive what is in your vault if you can no longer act. You choose them and their shares.' },
    { Icon: KeyRound, term: 'Recovery', plain: 'The process where your guardians return control of your vault to a new wallet that you hold.' },
    { Icon: Heart, term: 'Memorial', plain: 'A preserved record once a vault has passed to heirs - so what you built is remembered.' },
    { Icon: Gavel, term: 'Override', plain: 'A safeguard: if something looks wrong during a claim, it can be challenged before anything is distributed.' },
  ];
  return (
    <section aria-label="Family continuity, in plain language" className="glass-card-premium p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Family continuity, in plain language</h2>
      <p className="mt-0.5 mb-4 text-sm text-zinc-500">For understanding - not legal advice.</p>
      <dl className="space-y-3">
        {items.map(({ Icon, term, plain }) => (
          <div key={term} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-pink-400/20 bg-pink-400/10">
              <Icon size={15} className="text-pink-300" aria-hidden="true" />
            </span>
            <div>
              <dt className="text-sm font-semibold text-white">{term}</dt>
              <dd className="text-sm leading-relaxed text-zinc-400">{plain}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function BusinessContinuityPanel() {
  const rows = [
    { title: 'Business succession', body: 'The heirs you set on your vault also inherit the business identity tied to it.' },
    { title: 'Recovery protection', body: 'If you lose access, guardians restore your merchant account along with your vault - your storefront is not lost.' },
    { title: 'Continuity planning', body: 'A protected vault keeps payouts, customers, and history reachable through a change of wallet.' },
    { title: 'Merchant inheritance', body: 'What you built commercially passes the same way your assets do - through the heirs you configured.' },
  ];
  return (
    <section aria-label="Business continuity" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Store size={16} className="text-emerald-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Business continuity</h2>
      </div>
      <p className="mb-4 text-sm text-zinc-400">
        Continuity protects your livelihood, not just your assets. If you run a merchant account, the same guardians,
        recovery, and inheritance cover your business.
      </p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.title} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <dt className="text-sm font-semibold text-white">{r.title}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-zinc-400">{r.body}</dd>
          </div>
        ))}
      </dl>
      <Link href={INSTITUTIONS.commerce.homeHref} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 transition-colors hover:text-emerald-200">
        Open merchant portal <ArrowRight size={14} />
      </Link>
    </section>
  );
}

export function ContinuityRelationships() {
  const sources = ['ownership', 'trust', 'commerce', 'stewardship'] as const;
  const why: Record<(typeof sources)[number], string> = {
    ownership: 'What you own is only truly yours if it can survive a lost wallet.',
    trust: 'The trust you build should not be erased by losing access.',
    commerce: 'A business needs to outlast a single device or a single owner.',
    stewardship: 'The institutions you help steward must persist beyond any one citizen.',
  };
  return (
    <section aria-label="How continuity protects the other institutions" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-white">Continuity protects everything else</h2>
        <p className="mt-0.5 text-sm text-zinc-500">Every institution depends on it.</p>
      </div>
      <ul className="mt-4 space-y-3">
        {sources.map((id) => {
          const inst = INSTITUTIONS[id];
          const Icon = inst.icon;
          return (
            <li key={id} className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <Link href={inst.homeHref} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors hover:bg-white/5" style={{ borderColor: `${inst.color}33`, color: inst.color }}>
                  <Icon size={14} aria-hidden="true" />
                  {inst.label}
                </Link>
                <ArrowRight size={14} className="flex-shrink-0 text-zinc-600" aria-hidden="true" />
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-pink-400/30 px-2.5 py-1 text-sm font-semibold text-pink-300">
                  <Heart size={14} aria-hidden="true" />
                  Continuity
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400 sm:ml-1">{why[id]}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
