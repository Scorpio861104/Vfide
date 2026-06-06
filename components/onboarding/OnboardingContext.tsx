'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UserPath = 'undecided' | 'buyer' | 'seller';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface OnboardingState {
  path: UserPath;
  accountCreated: boolean;
  vaultCreated: boolean;
  firstPurchase: boolean;
  storeCreated: boolean;
  firstProductAdded: boolean;
  storeLinkShared: boolean;
  firstSale: boolean;
  dismissed: boolean;
}

interface OnboardingContextValue {
  state: OnboardingState;
  isOnboarding: boolean;
  steps: OnboardingStep[];
  currentStep: string | null;
  progress: number;
  choosePath: (path: UserPath) => void;
  completeStep: (stepId: string) => void;
  dismiss: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'vfide.onboarding';

function defaultState(): OnboardingState {
  return {
    path: 'undecided',
    accountCreated: false,
    vaultCreated: false,
    firstPurchase: false,
    storeCreated: false,
    firstProductAdded: false,
    storeLinkShared: false,
    firstSale: false,
    dismissed: false,
  };
}

function loadState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultState(), ...JSON.parse(stored) } : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; onboarding should not block rendering.
  }
}

function getBuyerSteps(state: OnboardingState): OnboardingStep[] {
  return [
    { id: 'account', label: 'Create account', description: 'Connect your wallet to get started — takes 10 seconds', completed: state.accountCreated, current: !state.accountCreated },
    { id: 'browse', label: 'Find something', description: 'Browse the marketplace or scan a QR code', completed: state.firstPurchase, current: state.accountCreated && !state.firstPurchase },
    { id: 'purchase', label: 'Make your first payment', description: 'Pay directly — no middleman fees', completed: state.firstPurchase, current: false },
  ];
}

function getSellerSteps(state: OnboardingState): OnboardingStep[] {
  return [
    { id: 'account', label: 'Create account', description: 'Connect your wallet to get started — takes 10 seconds', completed: state.accountCreated, current: !state.accountCreated },
    { id: 'store', label: 'Name your store', description: 'Pick a name and category', completed: state.storeCreated, current: state.accountCreated && !state.storeCreated },
    { id: 'product', label: 'Add a product', description: 'Add at least one thing you sell', completed: state.firstProductAdded, current: state.storeCreated && !state.firstProductAdded },
    { id: 'share', label: 'Share your link', description: 'Send your store link to a customer', completed: state.storeLinkShared, current: state.firstProductAdded && !state.storeLinkShared },
  ];
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const choosePath = useCallback((path: UserPath) => {
    setState((prev) => ({ ...prev, path }));
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setState((prev) => {
      const updates: Partial<OnboardingState> = {};
      if (stepId === 'account') { updates.accountCreated = true; updates.vaultCreated = true; }
      if (stepId === 'purchase') updates.firstPurchase = true;
      if (stepId === 'store') updates.storeCreated = true;
      if (stepId === 'product') updates.firstProductAdded = true;
      if (stepId === 'share') updates.storeLinkShared = true;
      if (stepId === 'sale') updates.firstSale = true;
      return { ...prev, ...updates };
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, dismissed: true }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState());
  }, []);

  const value = useMemo(() => {
    const steps = state.path === 'buyer'
      ? getBuyerSteps(state)
      : state.path === 'seller'
        ? getSellerSteps(state)
        : [];

    const completedCount = steps.filter((step) => step.completed).length;
    const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
    const currentStep = steps.find((step) => step.current)?.id || null;

    const isComplete = steps.length > 0 && steps.every((step) => step.completed);
    const isOnboarding = !state.dismissed && !isComplete && state.path !== 'undecided';

    return { state, isOnboarding, steps, currentStep, progress, choosePath, completeStep, dismiss, reset };
  }, [state, choosePath, completeStep, dismiss, reset]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
