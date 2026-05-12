'use client';

/**
 * ComingSoonPage
 *
 * Honest placeholder for features that are designed and named in the
 * navigation but are not yet implemented in this release. Replaces
 * deceptive fake UIs that pretended to work (success toasts on no-op
 * handlers, hardcoded data masquerading as live state, buttons with
 * no onClick handlers).
 *
 * Design principles:
 *   - State clearly what's NOT working
 *   - Explain what's required for the feature to ship (contract, API,
 *     external integration, etc) so the user understands it's not
 *     "we forgot" but "we won't ship a fake one"
 *   - Offer the closest available alternative
 *   - Never accept input that would be silently discarded
 *
 * Use this instead of building forms that toast "Success!" but do
 * nothing — that's worse than no feature at all.
 */

import Link from 'next/link';
import { ArrowLeft, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export interface ComingSoonPageProps {
  /** The feature title. e.g. "Money Streaming" */
  title: string;
  /** Short tagline shown under the title */
  tagline?: string;
  /** Detailed explanation of what the feature would do once shipped */
  description: string;
  /** What's required for the feature to ship (contract, API, etc) */
  requirements?: string[];
  /** Closest existing alternative the user can use today */
  alternative?: {
    href: string;
    label: string;
    description?: string;
  };
  /** Back link target. Defaults to the home page. */
  backHref?: string;
  /** Back link label */
  backLabel?: string;
}

export function ComingSoonPage({
  title,
  tagline,
  description,
  requirements = [],
  alternative,
  backHref = '/',
  backLabel = 'Back to home',
}: ComingSoonPageProps) {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-12">
          <div className="container mx-auto max-w-3xl px-4">
            <Link href={backHref} className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> {backLabel}
            </Link>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={24} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-200 text-sm font-semibold mb-1">Not available in this release</div>
                  <div className="text-amber-100/80 text-sm">
                    This page is reserved for an upcoming feature. The link is kept in navigation
                    so future shipping doesn&apos;t require a redirect, but no functionality is wired up yet.
                  </div>
                </div>
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-2">{title}</h1>
            {tagline && <p className="text-lg text-gray-400 mb-6">{tagline}</p>}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">What this will do</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{description}</p>
            </div>

            {requirements.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">What&apos;s required to ship it</h2>
                <ul className="space-y-2">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-zinc-500 mt-1">○</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alternative && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Use this instead today
                </h2>
                <Link
                  href={alternative.href}
                  className="group flex items-center justify-between gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-white group-hover:text-emerald-200">{alternative.label}</div>
                    {alternative.description && (
                      <div className="text-xs text-zinc-400 mt-0.5">{alternative.description}</div>
                    )}
                  </div>
                  <ArrowRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
