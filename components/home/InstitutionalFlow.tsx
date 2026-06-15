'use client';

/**
 * InstitutionalFlow — the connected-ecosystem narrative for the homepage.
 *
 * Shows VFIDE as one institution where each system supports the next:
 *   Ownership -> Trust -> Commerce -> Continuity -> Capability
 *
 * Not five separate products — one connected flow. Plain-language one-liners, links into each
 * institution's surface. Institutional presentation: generous spacing, strong type, minimal
 * decoration, a clear directional spine.
 */

import Link from 'next/link';
import { Wallet, ShieldCheck, Store, Heart, GraduationCap, ArrowRight, ArrowDown } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  line: string;
  /** How this stage feeds the next — shown on the connector. */
  bridge?: string;
  icon: typeof Wallet;
  href: string;
  accent: string;
}

const INSTITUTIONS: Institution[] = [
  { id: 'ownership', name: 'Ownership', line: 'Your funds live in a vault only you control.', bridge: 'control earns', icon: Wallet, href: '/vault', accent: '#06b6d4' },
  { id: 'trust', name: 'Trust', line: 'A record you own that reduces friction over time.', bridge: 'trust powers', icon: ShieldCheck, href: '/proofscore', accent: '#3b82f6' },
  { id: 'commerce', name: 'Commerce', line: 'Accept payments and run a business with no protocol fees.', bridge: 'commerce is preserved by', icon: Store, href: '/merchant', accent: '#8b5cf6' },
  { id: 'continuity', name: 'Continuity', line: 'Recovery and inheritance so access survives disruption.', bridge: 'continuity is extended by', icon: Heart, href: '/continuity', accent: '#ec4899' },
  { id: 'capability', name: 'Capability', line: 'Systems and learning that expand what you can do.', icon: GraduationCap, href: '/seer-academy', accent: '#f59e0b' },
];

export function InstitutionalFlow() {
  return (
    <section className="py-20 sm:py-28" aria-label="How VFIDE works together">
      <div className="container mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">One connected ecosystem</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Each system supports the next
          </h2>
          <p className="mt-4 leading-relaxed text-zinc-400">
            Not five separate products. Ownership earns trust, trust powers commerce, commerce is
            preserved by continuity, and capability expands what every participant can do.
          </p>
        </div>

        <ol className="hidden items-stretch gap-2 lg:flex">
          {INSTITUTIONS.map((inst, i) => {
            const Icon = inst.icon;
            const isLast = i === INSTITUTIONS.length - 1;
            return (
              <li key={inst.id} className="flex flex-1 items-center gap-2">
                <Link
                  href={inst.href}
                  className="group flex h-full w-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${inst.accent}14`, border: `1px solid ${inst.accent}33` }}
                  >
                    <Icon size={20} style={{ color: inst.accent }} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{inst.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{inst.line}</p>
                </Link>
                {!isLast && (
                  <span className="flex shrink-0 flex-col items-center gap-1">
                    <ArrowRight size={18} className="text-zinc-700" aria-hidden="true" />
                    {inst.bridge && (
                      <span className="max-w-[5.5rem] text-center text-[10px] font-medium uppercase leading-tight tracking-wide text-zinc-600">
                        {inst.bridge}
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <ol className="space-y-2 lg:hidden">
          {INSTITUTIONS.map((inst, i) => {
            const Icon = inst.icon;
            const isLast = i === INSTITUTIONS.length - 1;
            return (
              <li key={inst.id} className="flex flex-col">
                <Link
                  href={inst.href}
                  className="group flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${inst.accent}14`, border: `1px solid ${inst.accent}33` }}
                  >
                    <Icon size={20} style={{ color: inst.accent }} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{inst.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{inst.line}</p>
                  </div>
                </Link>
                {!isLast && (
                  <div className="flex justify-center py-1">
                    <ArrowDown size={16} className="text-zinc-700" aria-hidden="true" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}'use client';

