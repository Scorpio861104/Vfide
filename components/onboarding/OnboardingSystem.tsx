/**
 * Guided Onboarding — From "what is this" to "I just got paid" in 60 seconds
 * 
 * Detects first-time users and shows a progressive onboarding flow:
 * 
 * Buyer path:
 *   1. Connect wallet → browse
 *   2. Browse a store / scan a QR code
 *   3. Make first payment → celebration
 * 
 * Seller path:
 *   1. Connect wallet → vault auto-created
 *   2. Quick setup: name + category + 1 product
 *   3. Share store link → first customer arrives → celebration
 * 
 * The onboarding is NOT a tutorial. It's the actual actions,
 * guided with contextual hints that disappear once completed.
 */
'use client';

import {
  useOnboarding,
  OnboardingProvider,
  type UserPath,
} from './OnboardingContext';
import { m } from 'framer-motion';
import { ShoppingCart, Store, Check, X, Sparkles } from 'lucide-react';

export { OnboardingProvider, useOnboarding };
export type { UserPath } from './OnboardingContext';

// ── Path Chooser ────────────────────────────────────────────────────────────

export function OnboardingPathChooser() {
  const { state, choosePath } = useOnboarding();

  if (state.path !== 'undecided') return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center py-12 px-4"
    >
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to VFIDE</h2>
      <p className="text-gray-400 mb-8">What brings you here?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <m.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => choosePath('buyer')}
          className="p-6 bg-white/3 border-2 border-white/10 rounded-2xl hover:border-accent/40 transition-colors text-left"
        >
          <ShoppingCart size={32} className="text-accent mb-3" />
          <div className="text-white font-bold text-lg mb-1">I want to buy</div>
          <div className="text-gray-400 text-sm">Shop from trusted sellers with lower fees than any payment platform.</div>
        </m.button>

        <m.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => choosePath('seller')}
          className="p-6 bg-white/3 border-2 border-white/10 rounded-2xl hover:border-emerald-500/40 transition-colors text-left"
        >
          <Store size={32} className="text-emerald-400 mb-3" />
          <div className="text-white font-bold text-lg mb-1">I want to sell</div>
          <div className="text-gray-400 text-sm">Set up your store in 60 seconds. Zero merchant fees. Get paid directly.</div>
        </m.button>
      </div>
    </m.div>
  );
}

// ── Progress Bar (persistent, top of page) ──────────────────────────────────

export function OnboardingProgressBar() {
  const { isOnboarding, steps, dismiss } = useOnboarding();

  if (!isOnboarding) return null;

  const currentStep = steps.find(s => s.current);

  return (
    <m.div
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      exit={{ y: -60 }}
      className="sticky top-7 md:top-[5.25rem] z-30 bg-zinc-900/95 backdrop-blur-sm border-b border-white/5"
    >
      <div className="container mx-auto px-4 max-w-6xl py-3">
        <div className="flex items-center gap-4">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.completed ? 'bg-emerald-500 text-white' :
                  step.current ? 'bg-accent text-white ring-2 ring-accent/30' :
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
    </m.div>
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
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12 px-4"
    >
      <m.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
      >
        <Sparkles size={40} className="text-white" />
      </m.div>
      <h2 className="text-3xl font-bold text-white mb-2">{msg.title}</h2>
      <p className="text-gray-400 max-w-md mx-auto">{msg.subtitle}</p>
    </m.div>
  );
}
