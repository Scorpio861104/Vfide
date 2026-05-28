'use client';

/**
 * ChapterShell — the inside of every wizard chapter.
 *
 * Each chapter renders its own body content but uses this shell for the
 * consistent header, progress, error banner, and footer button row. The
 * shell keeps the "Continue?" prompt out of individual chapters by
 * exposing canSkip / onSkip / canComplete / onComplete and leaving the
 * after-chapter "do you want to continue?" prompt to the parent wizard.
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { CHAPTER_ORDER, CHAPTERS, ChapterId } from './useWizardState';

interface ChapterShellProps {
  chapter: ChapterId;
  description: string;
  children: ReactNode;
  /** Set when the chapter has fired a tx or async action that hasn't resolved. */
  isWorking?: boolean;
  /** Disable the primary "Continue" button. */
  primaryDisabled?: boolean;
  /** Override the primary button label. Defaults to "Continue". */
  primaryLabel?: string;
  /** Required: what to do when the user presses the primary button. */
  onPrimary: () => void;
  /** If the chapter is skippable, provide onSkip. Required-chapter shells should leave this undefined. */
  onSkip?: () => void;
  /** Error or notice to show at the top of the chapter body. */
  notice?: { tone: 'error' | 'info'; text: string } | null;
}

export function ChapterShell({
  chapter,
  description,
  children,
  isWorking = false,
  primaryDisabled = false,
  primaryLabel = 'Continue',
  onPrimary,
  onSkip,
  notice,
}: ChapterShellProps) {
  const meta = CHAPTERS.find((c) => c.id === chapter);
  const chapterIndex = CHAPTER_ORDER.indexOf(chapter) + 1;
  const totalForBar = CHAPTER_ORDER.length - 1; // exclude "done" from progress denominator

  return (
    <motion.div
      key={chapter}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-5"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent/70">
          <span>Chapter {chapterIndex}</span>
          <span aria-hidden>·</span>
          <span>of {totalForBar}</span>
          {meta?.required && (
            <>
              <span aria-hidden>·</span>
              <span className="text-amber-300/90">Required</span>
            </>
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">{meta?.title ?? chapter}</h2>
        <p className="text-sm text-white/60">{description}</p>
      </header>

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
            notice.tone === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-accent/30 bg-accent/10 text-accent'
          }`}
        >
          <AlertTriangle
            size={18}
            className={notice.tone === 'error' ? 'text-red-300 flex-shrink-0' : 'text-accent flex-shrink-0'}
            aria-hidden
          />
          <span>{notice.text}</span>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">{children}</div>

      <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={isWorking}
            className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
          >
            Skip this step
          </button>
        ) : (
          <span className="text-xs text-white/40">
            {meta?.required
              ? 'This step is required to use the protocol.'
              : 'This step is optional.'}
          </span>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled || isWorking}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {isWorking && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {primaryLabel}
        </button>
      </footer>
    </motion.div>
  );
}
