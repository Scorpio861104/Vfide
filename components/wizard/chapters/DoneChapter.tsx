'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Power } from 'lucide-react';

import { CHAPTERS, ChapterId } from '../useWizardState';
import { ChapterShell } from '../ChapterShell';

interface DoneChapterProps {
  completedChapters: ChapterId[];
  skippedChapters: ChapterId[];
  onTurnOff: () => void;
  onClose: () => void;
}

/**
 * Final chapter: recap which chapters got completed vs skipped, plus
 * a button to turn the wizard off so it doesn't auto-show again. The
 * user can still re-open it from settings.
 */
export function DoneChapter({
  completedChapters,
  skippedChapters,
  onTurnOff,
  onClose,
}: DoneChapterProps) {
  const recap = CHAPTERS.filter((c) => c.id !== 'welcome' && c.id !== 'done').map((c) => {
    if (completedChapters.includes(c.id)) return { ...c, status: 'completed' as const };
    if (skippedChapters.includes(c.id)) return { ...c, status: 'skipped' as const };
    return { ...c, status: 'pending' as const };
  });

  return (
    <ChapterShell
      chapter="done"
      description="Here's where you landed. Skipped chapters are always available — re-open the wizard or jump straight to the page that handles them."
      onPrimary={onClose}
      primaryLabel="Close wizard"
    >
      <div className="space-y-4">
        <ul className="space-y-2">
          {recap.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
            >
              {c.status === 'completed' ? (
                <CheckCircle2 className="text-emerald-300 flex-shrink-0" size={16} aria-hidden />
              ) : (
                <Circle
                  className={
                    c.status === 'skipped' ? 'text-amber-300 flex-shrink-0' : 'text-white/30 flex-shrink-0'
                  }
                  size={16}
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white">{c.title}</p>
                <p className="text-xs text-white/50">
                  {c.status === 'completed' && 'Completed'}
                  {c.status === 'skipped' && 'Skipped — open later when you\u2019re ready'}
                  {c.status === 'pending' && 'Not visited yet'}
                </p>
              </div>
              {c.required && c.status !== 'completed' && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Required
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            href="/vault"
            className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Open Vault page
          </Link>
          <Link
            href="/guardians"
            className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Open Guardians page
          </Link>
          <Link
            href="/marketplace"
            className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Browse merchants
          </Link>
        </div>

        <button
          type="button"
          onClick={onTurnOff}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10"
        >
          <Power size={14} aria-hidden /> Turn off the wizard
        </button>
        <p className="text-center text-xs text-white/40">
          You can re-open the wizard later from Settings.
        </p>
      </div>
    </ChapterShell>
  );
}
