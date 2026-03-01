'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Circle, 
  ChevronRight, 
  X, 
  Sparkles,
  Gift,
  ArrowRight,
  Trophy,
  Zap
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Confetti from 'react-confetti';

// ==================== TYPES ====================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  isComplete: boolean;
  reward?: {
    type: 'badge' | 'points' | 'feature';
    value: string | number;
    description: string;
  };
  icon?: React.ReactNode;
  tutorial?: {
    targetSelector: string;
    message: string;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
}

interface OnboardingContextValue {
  steps: OnboardingStep[];
  currentStep: number;
  isComplete: boolean;
  progress: number;
  markComplete: (stepId: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  showChecklist: boolean;
  setShowChecklist: (show: boolean) => void;
  showReward: (reward: OnboardingStep['reward']) => void;
}

// ==================== CONTEXT ====================

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

// ==================== STORAGE ====================

const STORAGE_KEY = 'vfide_onboarding_progress';

function loadProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ==================== PROVIDER ====================

interface OnboardingProviderProps {
  children: React.ReactNode;
  customSteps?: Omit<OnboardingStep, 'isComplete'>[];
}

export function OnboardingProvider({ children, customSteps }: OnboardingProviderProps) {
  const { address: _address, isConnected } = useAccount();
  const _router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [showChecklist, setShowChecklist] = useState(false);
  const [rewardToShow, setRewardToShow] = useState<OnboardingStep['reward'] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load progress on mount
  useEffect(() => {
    setCompletedSteps(loadProgress());
  }, []);

  // Default steps
  const defaultSteps: Omit<OnboardingStep, 'isComplete'>[] = [
    {
      id: 'connect-wallet',
      title: 'Connect Your Wallet',
      description: 'Connect your wallet to access all features',
      action: { label: 'Connect', onClick: () => document.querySelector<HTMLButtonElement>('[data-wallet-connect]')?.click() },
      icon: <Zap className="w-5 h-5" />,
      reward: { type: 'points', value: 50, description: 'Welcome bonus!' },
    },
    {
      id: 'view-dashboard',
      title: 'Explore Dashboard',
      description: 'Check out your personalized dashboard',
      action: { label: 'Go to Dashboard', href: '/dashboard' },
      icon: <Sparkles className="w-5 h-5" />,
      reward: { type: 'points', value: 25, description: 'Explorer points' },
    },
    {
      id: 'first-transaction',
      title: 'Make First Transaction',
      description: 'Send your first payment to complete your first milestone',
      action: { label: 'Send Payment', href: '/pay' },
      icon: <ArrowRight className="w-5 h-5" />,
      reward: { type: 'badge', value: 'First Payment', description: 'Earned your first badge!' },
    },
    {
      id: 'complete-profile',
      title: 'Complete Your Profile',
      description: 'Add your details to personalize your experience',
      action: { label: 'Edit Profile', href: '/profile' },
      icon: <Gift className="w-5 h-5" />,
      reward: { type: 'points', value: 50, description: 'Profile bonus' },
    },
    {
      id: 'join-social',
      title: 'Join the Community',
      description: 'Connect with other VFIDE users',
      action: { label: 'Social Hub', href: '/social' },
      icon: <Trophy className="w-5 h-5" />,
      reward: { type: 'feature', value: 'Social Features', description: 'Unlocked social features!' },
    },
  ];

  const allSteps = customSteps || defaultSteps;

  // Build steps with completion status
  const steps: OnboardingStep[] = useMemo(() => {
    return allSteps.map((step) => ({
      ...step,
      isComplete: completedSteps[step.id] || false,
    }));
  }, [allSteps, completedSteps]);

  // Auto-complete wallet connection step
  useEffect(() => {
    if (isConnected && !completedSteps['connect-wallet']) {
      markComplete('connect-wallet');
    }
  }, [isConnected, completedSteps]);

  // Calculate progress
  const progress = useMemo(() => {
    const completed = steps.filter((s) => s.isComplete).length;
    return Math.round((completed / steps.length) * 100);
  }, [steps]);

  const isComplete = progress === 100;

  const currentStep = useMemo(() => {
    const index = steps.findIndex((s) => !s.isComplete);
    return index === -1 ? steps.length - 1 : index;
  }, [steps]);

  const markComplete = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const updated = { ...prev, [stepId]: true };
      saveProgress(updated);
      return updated;
    });

    // Show reward if step has one
    const step = steps.find((s) => s.id === stepId);
    if (step?.reward && !completedSteps[stepId]) {
      setRewardToShow(step.reward);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    // Check if all complete
    const allComplete = steps.every((s) => s.id === stepId || s.isComplete);
    if (allComplete) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [steps, completedSteps]);

  const skipOnboarding = useCallback(() => {
    const allCompleted = steps.reduce((acc, step) => {
      acc[step.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setCompletedSteps(allCompleted);
    saveProgress(allCompleted);
    setShowChecklist(false);
  }, [steps]);

  const resetOnboarding = useCallback(() => {
    setCompletedSteps({});
    saveProgress({});
  }, []);

  const showReward = useCallback((reward: OnboardingStep['reward']) => {
    setRewardToShow(reward);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        steps,
        currentStep,
        isComplete,
        progress,
        markComplete,
        skipOnboarding,
        resetOnboarding,
        showChecklist,
        setShowChecklist,
        showReward,
      }}
    >
      {children}

      {/* Confetti */}
      {showConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          colors={['#00FFB2', '#A855F7', '#22C55E', '#F59E0B']}
        />
      )}

      {/* Reward Modal */}
      <AnimatePresence>
        {rewardToShow && (
          <RewardModal reward={rewardToShow} onClose={() => setRewardToShow(null)} />
        )}
      </AnimatePresence>

      {/* Onboarding Checklist */}
      <AnimatePresence>
        {showChecklist && !isComplete && (
          <OnboardingChecklist />
        )}
      </AnimatePresence>
    </OnboardingContext.Provider>
  );
}

// ==================== REWARD MODAL ====================

interface RewardModalProps {
  reward: OnboardingStep['reward'];
  onClose: () => void;
}

function RewardModal({ reward, onClose }: RewardModalProps) {
  if (!reward) return null;

  const icons = {
    badge: <Trophy className="w-12 h-12 text-yellow-400" />,
    points: <Sparkles className="w-12 h-12 text-cyan-400" />,
    feature: <Gift className="w-12 h-12 text-purple-400" />,
  };

  const colors = {
    badge: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    points: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
    feature: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
      >
        <div className={`
          bg-gradient-to-br ${colors[reward.type]} 
          bg-zinc-900 border rounded-2xl p-8 text-center
          shadow-2xl max-w-sm w-full
        `}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-4 flex justify-center"
          >
            {icons[reward.type]}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              {reward.type === 'points' ? `+${reward.value} Points!` :
               reward.type === 'badge' ? `Badge Unlocked!` :
               `Feature Unlocked!`}
            </h2>
            <p className="text-zinc-400 mb-2">{reward.description}</p>
            {reward.type !== 'points' && (
              <p className="text-lg font-semibold text-cyan-400">{reward.value}</p>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
          >
            Continue
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ==================== CHECKLIST ====================

function OnboardingChecklist() {
  const { steps, progress, skipOnboarding, setShowChecklist } = useOnboarding();
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed bottom-20 right-4 z-40 w-80"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Getting Started
            </h3>
            <button
              onClick={() => setShowChecklist(false)}
              className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              />
            </div>
            <span className="text-sm font-medium text-cyan-400">{progress}%</span>
          </div>
        </div>

        {/* Steps */}
        <div className="p-3 max-h-80 overflow-y-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-start gap-3 p-3 rounded-lg mb-2 last:mb-0 transition-colors
                ${step.isComplete ? 'bg-green-500/10' : 'hover:bg-zinc-800'}
              `}
            >
              <div className="mt-0.5">
                {step.isComplete ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.isComplete ? 'text-green-400 line-through' : 'text-zinc-200'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>
                {!step.isComplete && step.action && (
                  <button
                    onClick={() => {
                      if (step.action?.href) {
                        router.push(step.action.href);
                      } else if (step.action?.onClick) {
                        step.action.onClick();
                      }
                    }}
                    className="mt-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {step.action.label}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                {step.reward && !step.isComplete && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-yellow-500">
                    <Gift className="w-3 h-3" />
                    {step.reward.type === 'points' ? `+${step.reward.value} pts` : step.reward.value}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={skipOnboarding}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Skip onboarding
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== TRIGGER BUTTON ====================

export function OnboardingTrigger() {
  const { isComplete, progress, setShowChecklist, showChecklist } = useOnboarding();

  if (isComplete) return null;

  return (
    <motion.button
      onClick={() => setShowChecklist(!showChecklist)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-full shadow-lg hover:shadow-cyan-500/25 transition-shadow"
    >
      <Sparkles className="w-4 h-4" />
      <span className="text-sm">{progress}% Complete</span>
    </motion.button>
  );
}

export default OnboardingProvider;
