'use client';

/**
 * Community (Platform Transformation, Wave 7).
 *
 * The freedom-first social layer. A place for connection, learning, commerce, and shared journeys — built to stay
 * human, with no ranking, no popularity, and nothing engineered to hold your attention.
 */
import Link from 'next/link';
import { HQRoot } from '@/components/headquarters/HQTheme';
import { PrimaryNav } from '@/components/headquarters/PrimaryNav';
import { CommunityNetwork } from '@/components/headquarters/CommunityNetwork';
import { ArrowLeft } from 'lucide-react';

export default function CommunityPage() {
  return (
    <HQRoot>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <PrimaryNav />
        <Link href="/command-center" className="mt-8 inline-flex items-center gap-2 text-xs transition-colors hover:underline" style={{ color: 'var(--hq-ink-faint)' }}>
          <ArrowLeft size={13} /> Command Center
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--hq-gold)' }}>Community</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl" style={{ color: 'var(--hq-ink)' }}>
          People, on equal terms
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>
          Share what matters, find your people, learn from real experience. No one is ranked, scored, or judged here —
          the network exists to connect you, not to keep you scrolling.
        </p>

        <div className="mt-10">
          <CommunityNetwork />
        </div>
      </div>
    </HQRoot>
  );
}
