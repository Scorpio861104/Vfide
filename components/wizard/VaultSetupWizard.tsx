'use client';

/**
 * VaultSetupWizard — top-level wizard shell.
 *
 * Renders the current chapter, an after-chapter "continue or pause here?"
 * prompt, a progress bar, an X-to-close, and the modal/backdrop chrome.
 *
 * Chapter completion flow:
 *   - chapter calls onComplete or onSkip
 *   - wizard records that, calls pause() so pausedAfter !== null
 *   - the user sees the "continue or pause?" prompt
 *   - continue → resume() (clears pausedAfter, the new currentChapter renders)
 *   - pause → setEnabled(false) (wizard collapses; can be re-opened)
 *
 * Mount semantics:
 *   - The wizard component reads useWizardState internally — caller doesn't
 *     pass props to control it. Caller just renders <VaultSetupWizard /> and
 *     the wizard decides whether to show itself based on `state.enabled` and
 *     `isComplete`.
 *   - If enabled and not yet complete, it shows. Otherwise it returns null.
 *   - Caller is responsible for re-mounting (or setEnabled(true)) when the
 *     user explicitly asks to relaunch the wizard.
 */

import { AnimatePresence, m } from 'framer-motion';
import { ChevronRight, X, Pause, Play, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';

import {
  CHAPTERS,
  CHAPTER_ORDER,
  ChapterId,
  useWizardState,
} from './useWizardState';
import { useOnboarding } from '@/components/onboarding';
import { WelcomeChapter } from './chapters/WelcomeChapter';
import { CreateVaultChapter } from './chapters/CreateVaultChapter';
import { SpendLimitsChapter } from './chapters/SpendLimitsChapter';
import { GuardiansChapter } from './chapters/GuardiansChapter';
import { FinalizeGuardiansChapter } from './chapters/FinalizeGuardiansChapter';
import { MerchantApprovalChapter } from './chapters/MerchantApprovalChapter';
import { ProofScoreChapter } from './chapters/ProofScoreChapter';
import { DoneChapter } from './chapters/DoneChapter';

export interface VaultSetupWizardProps {
  /** If true, force the wizard to render even when isComplete or enabled is false. Used by launch buttons. */
  forceOpen?: boolean;
  /** Called whenever the wizard fully closes (X, turn off, dismiss). */
  onClose?: () => void;
}

export function VaultSetupWizard({ forceOpen = false, onClose }: VaultSetupWizardProps) {
  const wizard = useWizardState();
  const onboarding = useOnboarding();
  const { state, isComplete, currentIndex, totalChapters } = wizard;
  const { isConnected } = useAccount();

  // Whether to render at all. forceOpen overrides the suppress conditions
  // so a "Reopen wizard" button can pull the wizard back up after it was
  // turned off or fully completed.
  const shouldRender = forceOpen || (state.enabled && !isComplete);
  if (!shouldRender) return null;

  const handleCloseEntirely = () => {
    wizard.setEnabled(false);
    onClose?.();
  };

  const handleContinueAfterChapter = () => {
    wizard.resume();
  };

  const handlePauseAfterChapter = () => {
    // Pause means "stop showing until I come back" → turn the wizard off.
    // Progress is preserved; re-opening lands at currentChapter.
    wizard.setEnabled(false);
    onClose?.();
  };

  const renderChapterBody = (chapter: ChapterId) => {
    switch (chapter) {
      case 'welcome':
        return (
          <WelcomeChapter
            onContinue={() => wizard.markComplete('welcome')}
            onSkipAll={() => {
              // "Skip this step" on Welcome = "I don't want the wizard at all".
              // Turn it off; user can come back via /onboarding.
              wizard.setEnabled(false);
              onClose?.();
            }}
          />
        );
      case 'createVault':
        return (
          <CreateVaultChapter
            onComplete={() => {
              // Keep the legacy OnboardingProvider in sync — its `account`
              // step toggles both `accountCreated` and `vaultCreated`.
              onboarding.completeStep('account');
              wizard.markComplete('createVault');
            }}
          />
        );
      case 'spendLimits':
        return (
          <SpendLimitsChapter
            onComplete={() => wizard.markComplete('spendLimits')}
            onSkip={() => wizard.skip('spendLimits')}
          />
        );
      case 'guardians':
        return (
          <GuardiansChapter
            onComplete={() => wizard.markComplete('guardians')}
            onSkip={() => wizard.skip('guardians')}
          />
        );
      case 'finalizeGuardians':
        return (
          <FinalizeGuardiansChapter
            onComplete={() => wizard.markComplete('finalizeGuardians')}
            onSkip={() => wizard.skip('finalizeGuardians')}
          />
        );
      case 'merchantApproval':
        return (
          <MerchantApprovalChapter
            onComplete={() => wizard.markComplete('merchantApproval')}
            onSkip={() => wizard.skip('merchantApproval')}
          />
        );
      case 'proofScore':
        return (
          <ProofScoreChapter
            onComplete={() => wizard.markComplete('proofScore')}
            onSkip={() => wizard.skip('proofScore')}
          />
        );
      case 'done':
        return (
          <DoneChapter
            completedChapters={state.completedChapters}
            skippedChapters={state.skippedChapters}
            onTurnOff={() => {
              wizard.setEnabled(false);
              onClose?.();
            }}
            onClose={handleCloseEntirely}
          />
        );
      default:
        return null;
    }
  };

  // Whether we should show the "continue?" prompt instead of the next chapter
  // body. The pause prompt fires after a chapter is completed/skipped — i.e.
  // when pausedAfter is set. We intercept rendering until the user responds.
  const showContinuePrompt = state.pausedAfter !== null && state.currentChapter !== 'done';

  return (
    <AnimatePresence>
      <m.div
        key="wizard-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vfide-wizard-title"
      >
        <m.div
          key="wizard-panel"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl border-x border-t border-white/10 bg-zinc-950 shadow-2xl sm:rounded-3xl sm:border"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p id="vfide-wizard-title" className="text-xs uppercase tracking-[0.18em] text-accent/80">
                VFIDE setup
              </p>
              <p className="truncate text-sm font-semibold text-white">
                Chapter {currentIndex + 1} of {totalChapters - 1} ·{' '}
                {CHAPTERS.find((c) => c.id === state.currentChapter)?.shortLabel ?? ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseEntirely}
              className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
              aria-label="Close wizard"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          {/* Wallet connect banner — shown when no wallet is connected so
              user can connect without exiting the wizard */}
          {!isConnected && (
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-accent/8 px-5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Wallet size={14} className="text-accent flex-shrink-0" aria-hidden />
                <span className="text-xs text-accent/80 truncate">
                  Connect your wallet to continue
                </span>
              </div>
              <VfideConnectButton size="sm" />
            </div>
          )}

          {/* Progress bar */}
          <div className="h-1 w-full bg-white/5">
            <m.div
              className="h-full bg-gradient-to-r from-accent to-blue-500"
              animate={{
                width: `${Math.min(100, ((currentIndex + (showContinuePrompt ? 1 : 0)) / (CHAPTER_ORDER.length - 1)) * 100)}%`,
              }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* Body */}
          <div className="max-h-[78vh] overflow-y-auto px-5 py-5 sm:max-h-[70vh]">
            <AnimatePresence mode="wait">
              {showContinuePrompt ? (
                <ContinuePrompt
                  key="continue-prompt"
                  justFinished={state.pausedAfter as ChapterId}
                  nextChapter={state.currentChapter}
                  onContinue={handleContinueAfterChapter}
                  onPause={handlePauseAfterChapter}
                />
              ) : (
                renderChapterBody(state.currentChapter)
              )}
            </AnimatePresence>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

function ContinuePrompt({
  justFinished,
  nextChapter,
  onContinue,
  onPause,
}: {
  justFinished: ChapterId;
  nextChapter: ChapterId;
  onContinue: () => void;
  onPause: () => void;
}) {
  const finishedMeta = CHAPTERS.find((c) => c.id === justFinished);
  const nextMeta = CHAPTERS.find((c) => c.id === nextChapter);

  return (
    <m.div
      key="continue-prompt-body"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Chapter wrapped</p>
        <h3 className="text-2xl font-bold text-white">
          {finishedMeta?.title ?? justFinished} ·{' '}
          <span className="text-white/60">done</span>
        </h3>
        <p className="text-sm text-white/70">
          Keep going to{' '}
          <span className="text-white">{nextMeta?.title ?? nextChapter}</span>, or pause here and
          come back later. Your progress is saved either way.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-blue-600 px-4 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/25 hover:scale-[1.01]"
        >
          <Play size={16} aria-hidden />
          Continue to {nextMeta?.shortLabel ?? 'next chapter'}
          <ChevronRight size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onPause}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          <Pause size={16} aria-hidden />
          Pause here
        </button>
      </div>

      <p className="text-center text-xs text-white/40">
        You can re-open the wizard any time from Settings.
      </p>
    </m.div>
  );
}
