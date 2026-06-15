'use client';

/**
 * Wizard state — chapter-based vault setup wizard, with on/off toggle.
 *
 * IMPORTANT: All wizard state goes through a single React Context. If
 * you call `useWizardState` from two components and they each ran their
 * own `useState` initializer, they'd see different in-memory copies and
 * only resync after a page reload (via localStorage). So we expose:
 *
 *   - <WizardStateProvider> — wraps the tree, owns the actual state.
 *   - useWizardState()      — reads/mutates the shared state.
 *
 * The provider is mounted high enough in the tree (ClientLayout) that
 * the `/onboarding` page, the `<WizardMount>` overlay, and any future
 * settings page all observe the same enabled / currentChapter values.
 *
 * Six chapters:
 *   0. welcome         — orientation, what the wizard does
 *   1. createVault     — REQUIRED, calls ensureVault
 *   2. spendLimits     — set per-tx, per-day, large-transfer threshold
 *   3. guardians       — add 2+ guardians
 *   4. finalizeGuardians — completeGuardianSetup
 *   5. merchantApproval  — approve MerchantPortal for VFIDE
 *   6. proofScore      — explainer + first-payment hint
 *   7. done            — recap
 *
 * Rules:
 *   - Vault creation is the only hard-required chapter. Everything else is skippable EXCEPT the recovery step:
 *     guardians/finalizeGuardians can be skipped only after the user explicitly acknowledges the permanent-loss
 *     risk (a vault with no guardians is unrecoverable if the key is lost). This keeps the choice the user's —
 *     non-custodial, never coerced — while ensuring it is informed rather than a silent skip. See `recoverySafe`
 *     and `acknowledgeGuardianRisk`.
 *   - After each chapter the user is asked "continue or pause here?" — that's
 *     the "chapters" pattern the user asked for. Exceptions: welcome (we
 *     don't ask "do you want to start setup?" after the Start button), and
 *     done (it's already the recap).
 *   - The whole wizard can be toggled off (enabled=false) and back on.
 *   - State persists in localStorage so leave-and-return works.
 */

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ChapterId =
  | 'welcome'
  | 'createVault'
  | 'spendLimits'
  | 'guardians'
  | 'finalizeGuardians'
  | 'keySeparation'
  | 'merchantApproval'
  | 'proofScore'
  | 'done';

export const CHAPTER_ORDER: ChapterId[] = [
  'welcome',
  'createVault',
  'spendLimits',
  'guardians',
  'finalizeGuardians',
  'keySeparation',
  'merchantApproval',
  'proofScore',
  'done',
];

export const REQUIRED_CHAPTERS: ChapterId[] = ['createVault'];

export interface ChapterMeta {
  id: ChapterId;
  title: string;
  shortLabel: string;
  required: boolean;
}

export const CHAPTERS: ChapterMeta[] = [
  { id: 'welcome', title: 'Welcome to VFIDE', shortLabel: 'Welcome', required: false },
  { id: 'createVault', title: 'Connect wallet and create your vault', shortLabel: 'Vault', required: true },
  { id: 'spendLimits', title: 'Enable core protections', shortLabel: 'Protection', required: false },
  { id: 'guardians', title: 'Choose trusted guardians', shortLabel: 'Guardians', required: false },
  { id: 'finalizeGuardians', title: 'Activate recovery protection', shortLabel: 'Recovery', required: false },
  { id: 'keySeparation', title: 'Separate your keys (optional)', shortLabel: 'Keys', required: false },
  { id: 'merchantApproval', title: 'Payments and commerce readiness', shortLabel: 'Payments', required: false },
  { id: 'proofScore', title: 'Trust and ProofScore', shortLabel: 'ProofScore', required: false },
  { id: 'done', title: 'You are protected', shortLabel: 'Complete', required: false },
];

interface WizardState {
  enabled: boolean;
  currentChapter: ChapterId;
  completedChapters: ChapterId[];
  skippedChapters: ChapterId[];
  pausedAfter: ChapterId | null; // user said "no, stop here" after this chapter
  // Recovery-safety gate (audit Finding A): a vault with no guardians is permanently UNRECOVERABLE if the key
  // is lost. We never *force* guardians (non-custodial ethos — the choice is the user's), but the wizard must
  // not let someone silently skip recovery and then be told "you are protected". A user may finish without
  // guardians ONLY by explicitly acknowledging the permanent-loss risk; that informed deferral is recorded here.
  guardianRiskAcknowledged: boolean;
}

const STORAGE_KEY = 'vfide.wizard.v1';

function defaultState(): WizardState {
  return {
    enabled: true,
    currentChapter: 'welcome',
    completedChapters: [],
    skippedChapters: [],
    pausedAfter: null,
    guardianRiskAcknowledged: false,
  };
}

function loadState(): WizardState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return {
      ...defaultState(),
      ...parsed,
      completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters : [],
      skippedChapters: Array.isArray(parsed.skippedChapters) ? parsed.skippedChapters : [],
      guardianRiskAcknowledged: parsed.guardianRiskAcknowledged === true,
    };
  } catch {
    return defaultState();
  }
}

function saveState(state: WizardState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export interface UseWizardStateValue {
  state: WizardState;
  isComplete: boolean;
  currentIndex: number;
  totalChapters: number;
  /**
   * Whether the vault has recovery protection configured (guardians chosen AND recovery activated). This is the
   * honest signal the recap uses — a guardian-less vault is NOT "protected" and must not be shown as such.
   */
  recoveryConfigured: boolean;
  /**
   * True once the user may safely leave the recovery step: either recovery is configured, or they explicitly
   * acknowledged the permanent-loss risk. The guardians/finalizeGuardians skip buttons gate on this.
   */
  recoverySafe: boolean;
  /** Mark current chapter complete and advance. Pauses after (except welcome → next). */
  markComplete: (chapter: ChapterId) => void;
  /** Mark current chapter skipped and advance. Only allowed for non-required chapters. */
  skip: (chapter: ChapterId) => void;
  /**
   * Record the user's informed acknowledgment that, without guardians, a lost key means permanently
   * unrecoverable funds. Required before the recovery chapters can be skipped. Non-custodial by design: this
   * preserves the user's right to decline guardians — it only ensures the choice is informed, not silent.
   */
  acknowledgeGuardianRisk: () => void;
  /** Move directly to a specific chapter (used by Resume / step-clicks in nav). */
  goTo: (chapter: ChapterId) => void;
  /** "Pause here" — user said no when asked to continue after a chapter. */
  pause: () => void;
  /** Resume from where we paused. */
  resume: () => void;
  /** Reset everything to first run. */
  reset: () => void;
  /** Toggle the wizard off (won't auto-show) — equivalent to dismiss + remember. */
  setEnabled: (enabled: boolean) => void;
}

const WizardStateContext = createContext<UseWizardStateValue | null>(null);

export function WizardStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(loadState);

  // Persist on every state change.
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Listen for cross-tab localStorage changes so two open tabs stay in sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      // Re-read from localStorage rather than parse event.newValue directly,
      // so we benefit from the same fallback / shape-guard as initial load.
      setState(loadState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const currentIndex = useMemo(
    () => CHAPTER_ORDER.indexOf(state.currentChapter),
    [state.currentChapter],
  );

  const isComplete = useMemo(() => {
    return REQUIRED_CHAPTERS.every((c) => state.completedChapters.includes(c))
      && state.currentChapter === 'done';
  }, [state.completedChapters, state.currentChapter]);

  // Recovery is "configured" only when BOTH guardian chapters were genuinely completed (not skipped). A vault
  // with no guardians is operational but permanently unrecoverable if the key is lost (see Recovery audit), so
  // this flag — not mere wizard completion — is what the recap must key its "protected" messaging on.
  const recoveryConfigured = useMemo(
    () => state.completedChapters.includes('guardians') && state.completedChapters.includes('finalizeGuardians'),
    [state.completedChapters],
  );

  // The user may move past the recovery step only if recovery is configured OR they explicitly acknowledged the
  // permanent-loss risk. This is the safeCompletionGate the audit recommended: informed choice, never a silent skip.
  const recoverySafe = useMemo(
    () => recoveryConfigured || state.guardianRiskAcknowledged,
    [recoveryConfigured, state.guardianRiskAcknowledged],
  );

  const advance = useCallback(
    (current: ChapterId, statusList: 'completedChapters' | 'skippedChapters') => {
      setState((prev) => {
        const next = CHAPTER_ORDER[CHAPTER_ORDER.indexOf(current) + 1] ?? 'done';
        const list = prev[statusList].includes(current)
          ? prev[statusList]
          : [...prev[statusList], current];

        // "Chapters" pattern — after each chapter the wizard pauses so it
        // can ask "continue or stop here?". The exceptions:
        //   - welcome → don't pause (user just clicked Start, they want to start)
        //   - the chapter immediately before 'done' → don't pause, jump to recap
        //   - 'done' → don't pause, it's already the recap
        const shouldPause = current !== 'welcome' && next !== 'done';

        return {
          ...prev,
          [statusList]: list,
          currentChapter: next,
          pausedAfter: shouldPause ? current : null,
        };
      });
    },
    [],
  );

  const markComplete = useCallback(
    (chapter: ChapterId) => {
      advance(chapter, 'completedChapters');
    },
    [advance],
  );

  const skip = useCallback(
    (chapter: ChapterId) => {
      const meta = CHAPTERS.find((c) => c.id === chapter);
      if (meta?.required) {
        // Required chapters cannot be skipped — caller should disable the skip button.
        return;
      }
      // Recovery-safety gate (audit Finding A): skipping a recovery chapter is only allowed once the user has
      // acknowledged that, without guardians, a lost key means permanently unrecoverable funds. The chapter UI
      // surfaces the acknowledgment; if it hasn't been given, the skip is refused here as a defense-in-depth
      // backstop so the path to an uninformed, unprotected "done" simply does not exist.
      if ((chapter === 'guardians' || chapter === 'finalizeGuardians') && !recoverySafe) {
        return;
      }
      advance(chapter, 'skippedChapters');
    },
    [advance, recoverySafe],
  );

  const acknowledgeGuardianRisk = useCallback(() => {
    setState((prev) => ({ ...prev, guardianRiskAcknowledged: true }));
  }, []);

  const goTo = useCallback((chapter: ChapterId) => {
    setState((prev) => ({ ...prev, currentChapter: chapter, pausedAfter: null }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, pausedAfter: prev.currentChapter }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, pausedAfter: null, enabled: true }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState());
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled }));
  }, []);

  const value = useMemo<UseWizardStateValue>(
    () => ({
      state,
      isComplete,
      currentIndex,
      totalChapters: CHAPTER_ORDER.length,
      recoveryConfigured,
      recoverySafe,
      markComplete,
      skip,
      acknowledgeGuardianRisk,
      goTo,
      pause,
      resume,
      reset,
      setEnabled,
    }),
    [state, isComplete, currentIndex, recoveryConfigured, recoverySafe, markComplete, skip, acknowledgeGuardianRisk, goTo, pause, resume, reset, setEnabled],
  );

  return <WizardStateContext.Provider value={value}>{children}</WizardStateContext.Provider>;
}

export function useWizardState(): UseWizardStateValue {
  const ctx = useContext(WizardStateContext);
  if (!ctx) {
    throw new Error(
      'useWizardState must be used inside <WizardStateProvider>. Mount the provider in ClientLayout (or wherever the wizard tree lives).',
    );
  }
  return ctx;
}
