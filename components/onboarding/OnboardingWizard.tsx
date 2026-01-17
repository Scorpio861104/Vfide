'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Shield, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  X,
  Sparkles 
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
  completed?: boolean;
}

interface OnboardingWizardProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

/**
 * Interactive onboarding wizard for first-time users
 * Guides users through essential setup steps
 */
export function OnboardingWizard({ onComplete, onDismiss }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      // Check if user has completed onboarding
      const onboardingComplete = localStorage.getItem('vfide_onboarding_complete');
      if (!onboardingComplete) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Default to showing onboarding if localStorage fails
      setIsVisible(true);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'wallet',
      title: 'Connect Your Wallet',
      description: 'Connect your Web3 wallet to access all VFIDE features. We support MetaMask, Coinbase Wallet, and WalletConnect.',
      icon: <Wallet className="w-8 h-8" />,
      actionLabel: 'Connect Wallet',
    },
    {
      id: 'vault',
      title: 'Create Your Vault',
      description: 'Your personal vault is a secure, non-custodial wallet for storing VFIDE tokens. Only you control your funds.',
      icon: <Shield className="w-8 h-8" />,
      actionLabel: 'Create Vault',
    },
    {
      id: 'transaction',
      title: 'Try Your First Transaction',
      description: 'Send VFIDE tokens to earn ProofScore points. Your score determines your transaction fees (0.25% - 5%).',
      icon: <Send className="w-8 h-8" />,
      actionLabel: 'Make Payment',
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'Explore badges, governance, merchant features, and more. Your ProofScore starts at 5,000 (Neutral tier).',
      icon: <Sparkles className="w-8 h-8" />,
      actionLabel: 'Get Started',
    },
  ];

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set(prev).add(stepId));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('vfide_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleDismissWizard = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleSkip = () => {
    localStorage.setItem('vfide_onboarding_complete', 'true');
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={handleDismissWizard}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-[#1A1A2E] rounded-2xl shadow-2xl border border-[#2A2A3F]"
        >
          {/* Close button */}
          <button
            onClick={handleDismissWizard}
            className="absolute top-4 right-4 p-2 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress bar */}
          <div className="h-1 bg-[#2A2A3F] rounded-t-2xl overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#00F0FF] to-[#A78BFA]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-8">
            {/* Step indicator */}
            <div className="flex justify-center mb-6">
              <div className="flex gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`h-2 rounded-full transition-all ${
                      index <= currentStep
                        ? 'w-8 bg-gradient-to-r from-[#00F0FF] to-[#A78BFA]'
                        : 'w-2 bg-[#2A2A3F]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00F0FF]/20 to-[#A78BFA]/20 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
                    {currentStepData.icon}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-[#F5F3E8] mb-3">
                  {currentStepData.title}
                </h2>

                {/* Description */}
                <p className="text-[#A0A0A5] leading-relaxed mb-8 max-w-lg mx-auto">
                  {currentStepData.description}
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {currentStep < steps.length - 1 && (
                    <button
                      onClick={handleSkip}
                      className="px-6 py-3 rounded-xl text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors"
                    >
                      Skip for now
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleStepComplete(currentStepData.id)}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#A78BFA] text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-[#00F0FF]/25 transition-all flex items-center justify-center gap-2"
                  >
                    {currentStepData.actionLabel || 'Continue'}
                    {currentStep < steps.length - 1 ? (
                      <ArrowRight className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Step counter */}
            <div className="text-center mt-6 text-sm text-[#A0A0A5]">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
