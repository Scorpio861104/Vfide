/**
 * Guided Onboarding — From "what is this" to "I just got paid" in 60 seconds
 * 
 * Detects first-time users and shows a progressive onboarding flow:
 * 
 * Buyer path:
 *   1. Create account (email/phone) → wallet auto-created
 *   2. Browse a store / scan a QR code
 *   3. Make first payment → celebration
 * 
 * Seller path:
 *   1. Create account (email/phone) → wallet + vault auto-created
 *   2. Quick setup: name + category + 1 product
 *   3. Share store link → first customer arrives → celebration
 * 
 * The onboarding is NOT a tutorial. It's the actual actions,
 * guided with contextual hints that disappear once completed.
 */
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Store, ArrowRight, Check, X, Sparkles } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

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
  firstPurchase: boolean;     // Buyer milestone
  storeCreated: boolean;      // Seller milestone
  firstProductAdded: boolean; // Seller milestone
  storeLinkShared: boolean;   // Seller milestone
  firstSale: boolean;         // Seller milestone
  dismissed: boolean;         // User closed the onboarding
}

interface OnboardingContextValue {
  state: OnboardingState;
  isOnboarding: boolean;       // Should we show onboarding UI?
  steps: OnboardingStep[];     // Current path's step list
  currentStep: string | null;  // Current step ID
  progress: number;            // 0-100
  choosePath: (path: UserPath) => void;
  completeStep: (stepId: string) => void;
  dismiss: () => void;
  reset: () => void;
}

// ── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vfide.onboarding';

function loadState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultState(), ...JSON.parse(stored) } : defaultState();
  } catch { return defaultState(); }
}

function saveState(state: OnboardingState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

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

// ── Step Definitions ────────────────────────────────────────────────────────

function getBuyerSteps(state: OnboardingState): OnboardingStep[] {
  return [
    { id: 'account', label: 'Create account', description: 'Sign up with email or phone — takes 10 seconds', completed: state.accountCreated, current: !state.accountCreated },
    { id: 'browse', label: 'Find something', description: 'Browse the marketplace or scan a QR code', completed: state.firstPurchase, current: state.accountCreated && !state.firstPurchase },
    { id: 'purchase', label: 'Make your first payment', description: 'Pay directly — no middleman fees', completed: state.firstPurchase, current: false },
  ];
}

function getSellerSteps(state: OnboardingState): OnboardingStep[] {
  return [
    { id: 'account', label: 'Create account', description: 'Sign up with email or phone — takes 10 seconds', completed: state.accountCreated, current: !state.accountCreated },
    { id: 'store', label: 'Name your store', description: 'Pick a name and category', completed: state.storeCreated, current: state.accountCreated && !state.storeCreated },
    { id: 'product', label: 'Add a product', description: 'Add at least one thing you sell', completed: state.firstProductAdded, current: state.storeCreated && !state.firstProductAdded },
    { id: 'share', label: 'Share your link', description: 'Send your store link to a customer', completed: state.storeLinkShared, current: state.firstProductAdded && !state.storeLinkShared },
  ];
}

// ── Context ─────────────────────────────────────────────────────────────────

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(loadState);

  useEffect(() => { saveState(state); }, [state]);

  const choosePath = useCallback((path: UserPath) => {
    setState(prev => ({ ...prev, path }));
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setState(prev => {
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
    setState(prev => ({ ...prev, dismissed: true }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState());
  }, []);

  const value = useMemo(() => {
    const steps = state.path === 'buyer' ? getBuyerSteps(state)
      : state.path === 'seller' ? getSellerSteps(state) : [];

    const completedCount = steps.filter(s => s.completed).length;
    const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
    const currentStep = steps.find(s => s.current)?.id || null;

    const isComplete = steps.length > 0 && steps.every(s => s.completed);
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

// ── Path Chooser ────────────────────────────────────────────────────────────

export function OnboardingPathChooser() {
  const { state, choosePath } = useOnboarding();

  if (state.path !== 'undecided') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center py-12 px-4"
    >
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to VFIDE</h2>
      <p className="text-gray-400 mb-8">What brings you here?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => choosePath('buyer')}
          className="p-6 bg-white/3 border-2 border-white/10 rounded-2xl hover:border-cyan-500/40 transition-colors text-left"
        >
          <ShoppingCart size={32} className="text-cyan-400 mb-3" />
          <div className="text-white font-bold text-lg mb-1">I want to buy</div>
          <div className="text-gray-400 text-sm">Shop from trusted sellers with lower fees than any payment platform.</div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => choosePath('seller')}
          className="p-6 bg-white/3 border-2 border-white/10 rounded-2xl hover:border-emerald-500/40 transition-colors text-left"
        >
          <Store size={32} className="text-emerald-400 mb-3" />
          <div className="text-white font-bold text-lg mb-1">I want to sell</div>
          <div className="text-gray-400 text-sm">Set up your store in 60 seconds. Zero merchant fees. Get paid directly.</div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Progress Bar (persistent, top of page) ──────────────────────────────────

export function OnboardingProgressBar() {
  const { isOnboarding, steps, progress, dismiss } = useOnboarding();

  if (!isOnboarding) return null;

  const currentStep = steps.find(s => s.current);

  return (
    <motion.div
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      exit={{ y: -60 }}
      className="sticky top-20 z-30 bg-zinc-900/95 backdrop-blur-sm border-b border-white/5"
    >
      <div className="container mx-auto px-4 max-w-6xl py-3">
        <div className="flex items-center gap-4">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.completed ? 'bg-emerald-500 text-white' :
                  step.current ? 'bg-cyan-500 text-white ring-2 ring-cyan-500/30' :
                  'bg-white/10 text-gray-500'
                }`}>
                  {step.completed ? <Check size={12} /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-0.5 rounded ${step.completed ? 'bg-emerald-500' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Current step label */}
          {currentStep && (
            <div className="flex-1 min-w-0">
              <span className="text-white text-sm font-bold truncate">{currentStep.label}</span>
              <span className="text-gray-500 text-sm ml-2 hidden sm:inline">{currentStep.description}</span>
            </div>
          )}

          {/* Dismiss */}
          <button onClick={dismiss} className="p-1 text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Completion Celebration ───────────────────────────────────────────────────

export function OnboardingComplete({ path }: { path: UserPath }) {
  const messages = {
    buyer: { title: 'You\'re all set!', subtitle: 'You just made your first VFIDE payment. Welcome to fee-free commerce.' },
    seller: { title: 'Your store is live!', subtitle: 'You\'re now accepting payments with zero merchant fees. Share your link and start selling.' },
    undecided: { title: 'Welcome!', subtitle: '' },
  };

  const msg = messages[path];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <Sparkles size={40} className="text-white" />
      </motion.div>
      <h2 className="text-3xl font-bold text-white mb-2">{msg.title}</h2>
      <p className="text-gray-400 max-w-md mx-auto">{msg.subtitle}</p>
    </motion.div>
  );
}
