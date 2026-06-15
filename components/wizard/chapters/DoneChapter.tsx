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

  // Honest protection signal (audit Finding A): a vault is only "protected" once recovery is actually
  // configured (guardians chosen AND recovery activated). A guardian-less vault is permanently unrecoverable
  // if the key is lost, so the recap must never tell that user they are protected.
  const recoveryConfigured =
    completedChapters.includes('guardians') && completedChapters.includes('finalizeGuardians');

  const description = recoveryConfigured
    ? 'You are protected. Your vault is active and recovery is set up, so trusted guardians can help you regain access if you ever lose your wallet.'
    : 'Your vault is active — but recovery is not set up yet. Until you add guardians, no one can help you regain access if you lose your wallet, so this is the most important thing left to do.';

  return (
    <ChapterShell
      chapter="done"
      description={description}
      onPrimary={onClose}
      primaryLabel="Enter Dashboard"
    >
      <div className="space-y-4">
        {!recoveryConfigured && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.08] p-3 text-sm">
            <p className="font-semibold text-amber-200">Recovery is not set up</p>
            <p className="mt-1 text-white/80">
              VFIDE never holds your funds and has no master key — so if you lose access to your wallet and have
              no guardians, your funds cannot be recovered by anyone. Adding guardians is the single most
              important step to protect what you hold.
            </p>
            <Link
              href="/guardians"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/30"
            >
              Set up recovery now
            </Link>
          </div>
        )}

        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-100">
          <p className="font-semibold text-white">VFIDE principles</p>
          <p className="mt-1 text-white/80">Protect people. Build trust. Enable freedom while keeping users in control of their assets.</p>
        </div>

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
          <Link
            href="/governance"
            className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Governance
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
