'use client';

/**
 * PlainHelp — the Core Product Law, made reusable (Wave 46, Grandmother Test).
 *
 * Every page should answer, in plain words, within seconds:
 *   1. What is this?      2. Why do I need it?
 *   3. What happens next? 4. Am I done?
 *
 * This component renders those four answers in a calm, friendly band a non-technical 70-year-old can
 * read and act on — no jargon, no crypto assumptions. Drop it at the top of any institution page.
 *
 * `status` shows the "Am I done?" answer as a clear completion state (done / in progress / not
 * started) so users always know where they stand. Keep the copy short and human.
 */

import { CheckCircle2, Circle, Clock, HelpCircle } from 'lucide-react';

type DoneStatus = 'done' | 'in-progress' | 'not-started';

export interface PlainHelpProps {
  /** Plain, human title — what this page IS (e.g. "Get Paid", not "Settlement Configuration"). */
  title: string;
  /** One sentence: what is this? */
  whatIsThis: string;
  /** One sentence: why would I want it? */
  whyYouNeedIt: string;
  /** One sentence: what happens when I act here? */
  whatHappensNext: string;
  /** The "Am I done?" answer. */
  status?: { state: DoneStatus; label: string };
}

const STATUS: Record<DoneStatus, { icon: typeof CheckCircle2; tone: string; ring: string }> = {
  done: { icon: CheckCircle2, tone: 'text-emerald-300', ring: 'border-emerald-400/25 bg-emerald-400/[0.06]' },
  'in-progress': { icon: Clock, tone: 'text-amber-300', ring: 'border-amber-400/25 bg-amber-400/[0.06]' },
  'not-started': { icon: Circle, tone: 'text-zinc-400', ring: 'border-white/10 bg-white/[0.03]' },
};

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{q}</p>
      <p className="mt-1 leading-relaxed text-zinc-200">{a}</p>
    </div>
  );
}

export function PlainHelp({ title, whatIsThis, whyYouNeedIt, whatHappensNext, status }: PlainHelpProps) {
  const S = status ? STATUS[status.state] : null;
  const StatusIcon = S?.icon;

  return (
    <section className="mb-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-8" aria-label={`About ${title}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300/90">
            <HelpCircle size={18} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        </div>
        {status && S && StatusIcon && (
          <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${S.ring} ${S.tone}`}>
            <StatusIcon size={15} aria-hidden="true" />
            {status.label}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <QA q="What is this?" a={whatIsThis} />
        <QA q="Why you need it" a={whyYouNeedIt} />
        <QA q="What happens next" a={whatHappensNext} />
        {status && <QA q="Am I done?" a={status.label} />}
      </div>
    </section>
  );
}
