'use client';

/**
 * Playbooks (Platform Transformation, Wave 5).
 *
 * All operational journeys in one place, grouped by headquarters, each with live derived progress. Reached
 * contextually (from a headquarters or the Command Center) rather than the primary nav — the journeys belong beside
 * the work, not in a menu.
 */
import Link from 'next/link';
import { HQRoot, Surface, DomainBadge } from '@/components/headquarters/HQTheme';
import { PrimaryNav } from '@/components/headquarters/PrimaryNav';
import { PlaybooksPanel } from '@/components/headquarters/PlaybooksPanel';
import { HEADQUARTERS, HQ_ORDER } from '@/lib/headquarters/model';
import { playbooksForDomain } from '@/lib/playbooks/model';
import { ArrowLeft } from 'lucide-react';

export default function PlaybooksPage() {
  return (
    <HQRoot>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <PrimaryNav />
        <Link href="/command-center" className="mt-8 inline-flex items-center gap-2 text-xs transition-colors hover:underline" style={{ color: 'var(--hq-ink-faint)' }}>
          <ArrowLeft size={13} /> Command Center
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--hq-gold)' }}>Playbooks</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl" style={{ color: 'var(--hq-ink)' }}>
          Step-by-step journeys
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>
          Each playbook walks you through a goal one step at a time, tracking what you have already done. You decide
          the pace — nothing happens without you.
        </p>

        <div className="mt-10 space-y-10">
          {HQ_ORDER.map((id) => {
            if (playbooksForDomain(id).length === 0) return null;
            return (
              <section key={id}>
                <div className="mb-3"><DomainBadge domain={id}>{HEADQUARTERS[id].label}</DomainBadge></div>
                <PlaybooksPanel domain={id} />
              </section>
            );
          })}
        </div>
      </div>
    </HQRoot>
  );
}
