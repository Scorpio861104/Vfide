'use client';

/**
 * FutureReleaseBanner
 *
 * Honest in-tab placeholder for features that exist as designed surfaces
 * but depend on integrations not yet built — typically third-party
 * partnerships (fiat on/off ramps, KYC/AML providers, SDK publication)
 * or downstream contracts in `contracts/future/`.
 *
 * Use this INSIDE an existing page when only some tabs/sections are
 * pending. For whole-page placeholders, use ComingSoonPage instead.
 *
 * Visual pattern matches ComingSoonPage (amber AlertCircle) so users see
 * a consistent signal across the app.
 */

import { AlertCircle, Clock, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

export interface FutureReleaseBannerProps {
  title: string;
  description: string;
  /** Concrete things blocking this from shipping. */
  requirements?: string[];
  /** Optional pointer to a working alternative elsewhere in the app. */
  alternative?: {
    href: string;
    label: string;
    description?: string;
  };
  /** Inline mode: render as a compact banner only, no surrounding card. */
  inline?: boolean;
}

export function FutureReleaseBanner({
  title,
  description,
  requirements = [],
  alternative,
  inline = false,
}: FutureReleaseBannerProps) {
  if (inline) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-300 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-amber-200 text-sm font-semibold">{title}</div>
          <div className="text-amber-100/80 text-sm mt-0.5">{description}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle size={22} className="text-amber-300 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                <Clock size={10} /> Future Release
              </span>
            </div>
            <div className="text-white text-base font-semibold mt-2">{title}</div>
            <p className="text-zinc-300 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        </div>
      </div>

      {requirements.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            What&apos;s required to ship it
          </h3>
          <ul className="space-y-2">
            {requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-zinc-500 mt-1">○</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alternative && (
        <Link
          href={alternative.href}
          className="block rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors"
        >
          <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
            Use this instead today
          </div>
          <div className="font-medium text-white">{alternative.label}</div>
          {alternative.description && (
            <div className="text-xs text-zinc-400 mt-1">{alternative.description}</div>
          )}
        </Link>
      )}
    </div>
  );
}

/**
 * Tiny inline status pill — for replacing fake "Active" status badges
 * on cards/rows that should honestly read "Future Release".
 */
export function FutureReleasePill({ label = 'Future Release', icon: Icon }: { label?: string; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 px-2.5 py-1 text-xs font-bold text-amber-200">
      {Icon ? <Icon size={11} /> : <Clock size={11} />}
      {label}
    </span>
  );
}
