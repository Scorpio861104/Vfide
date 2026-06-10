'use client';

/**
 * KnowledgePanel — the embedded-Academy primitive (Wave 34).
 *
 * Just-in-time education that lives beside the system it explains, instead of in a separate portal.
 * Progressive disclosure: collapsed to a single headline + one-line teaser by default; expands in
 * place to reveal explanation, key benefits, common questions, and an optional "Learn more" link.
 * No navigation required to learn.
 *
 * Content is plain-language and accurate to VFIDE's real mechanics — it never implies features,
 * maturity, or guarantees that do not exist. Reused across Continuity / Trust / Merchant and the
 * VFIDE Explained section.
 */

import { useId, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronDown, ArrowRight, type LucideIcon } from 'lucide-react';

export interface KnowledgeQA {
  q: string;
  a: string;
}

export interface KnowledgePanelProps {
  /** Short headline — what this explains. */
  headline: string;
  /** One-line teaser shown while collapsed. */
  teaser?: string;
  /** Plain-language explanation (1–3 short paragraphs). */
  explanation: string;
  /** Concrete benefits — kept short. */
  benefits?: string[];
  /** Common questions, answered simply. */
  questions?: KnowledgeQA[];
  /** Optional deeper reference (e.g. the Knowledge Library). */
  learnMore?: { label: string; href: string };
  /** Optional leading icon (defaults to a learning glyph). */
  icon?: LucideIcon;
  /** Start expanded (rare — default is collapsed for just-in-time disclosure). */
  defaultOpen?: boolean;
}

export function KnowledgePanel({
  headline,
  teaser,
  explanation,
  benefits,
  questions,
  learnMore,
  icon: Icon = GraduationCap,
  defaultOpen = false,
}: KnowledgePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300/90">
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">{headline}</span>
          {teaser && <span className="mt-0.5 block truncate text-sm text-zinc-500">{teaser}</span>}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={bodyId} className="space-y-5 border-t border-white/[0.06] px-5 py-5">
          {explanation.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} className="leading-relaxed text-zinc-300">{para}</p>
          ))}

          {benefits && benefits.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Key benefits</p>
              <ul className="space-y-2">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {questions && questions.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Common questions</p>
              <dl className="space-y-3">
                {questions.map((qa) => (
                  <div key={qa.q}>
                    <dt className="text-sm font-medium text-zinc-200">{qa.q}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-zinc-400">{qa.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {learnMore && (
            <Link
              href={learnMore.href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              {learnMore.label} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * KnowledgePanelGroup — a titled stack of KnowledgePanels for embedding a small set of contextual
 * explanations beside a system. Keeps spacing/heading consistent across institutions.
 */
export function KnowledgePanelGroup({
  title = 'Learn as you go',
  subtitle,
  panels,
}: {
  title?: string;
  subtitle?: string;
  panels: KnowledgePanelProps[];
}) {
  return (
    <section className="mb-16" aria-label={title}>
      <div className="mb-6 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</h2>
        {subtitle && <p className="mt-2 text-zinc-400">{subtitle}</p>}
      </div>
      <div className="space-y-3">
        {panels.map((p) => (
          <KnowledgePanel key={p.headline} {...p} />
        ))}
      </div>
    </section>
  );
}
