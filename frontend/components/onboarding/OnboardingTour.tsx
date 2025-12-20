"use client";

import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, ArrowRight, ArrowLeft, Check, Sparkles, DollarSign, Zap, Shield, Star, Store, Vote, Rocket } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  targetUrl?: string;
  highlightSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const iconClass = "w-8 h-8 sm:w-12 sm:h-12 text-[#00F0FF]";

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to VFIDE",
    description: "Let's take a quick tour to show you around. This will only take 2 minutes and help you understand how everything works.",
    icon: <Sparkles className={iconClass} />,
    position: "center"
  },
  {
    id: "zero-fees",
    title: "No Processor Fees",
    description: "Unlike traditional payment processors that charge 2-3%, VFIDE has no processor fees. Network burn fees (0.25-5% based on ProofScore) and zkSync gas fees apply.",
    icon: <DollarSign className={iconClass} />,
    position: "center"
  },
  {
    id: "instant-settlement",
    title: "Get Paid Instantly",
    description: "Traditional payment systems take 2-7 days to settle. With VFIDE, merchants receive funds immediately—no waiting, no delays.",
    icon: <Zap className={iconClass} />,
    position: "center"
  },
  {
    id: "vault-security",
    title: "Your Personal Vault",
    description: "Store your funds in a secure vault with recovery options. If you lose your wallet, trusted guardians can help you recover it. No bank needed!",
    icon: <Shield className={iconClass} />,
    targetUrl: "/vault",
    position: "center"
  },
  {
    id: "trust-system",
    title: "Build Your Reputation",
    description: "Complete tasks, make purchases, and participate in the community to build your Trust Score. Higher scores unlock better features and rewards!",
    icon: <Star className={iconClass} />,
    targetUrl: "/dashboard",
    position: "center"
  },
  {
    id: "merchant-portal",
    title: "Accept Payments Instantly",
    description: "Are you a business owner? Set up your merchant account in minutes and start accepting payments with no processor fees (burn + gas apply). Perfect for e-commerce, retail, or services!",
    icon: <Store className={iconClass} />,
    targetUrl: "/merchant",
    position: "center"
  },
  {
    id: "governance",
    title: "You Have a Voice",
    description: "VFIDE is community-governed. Token holders vote on proposals, decide fees (currently 0%), and shape the future. Real democracy, not corporate control.",
    icon: <Vote className={iconClass} />,
    targetUrl: "/governance",
    position: "center"
  },
  {
    id: "get-started",
    title: "Ready to Get Started?",
    description: "Connect your wallet to start using VFIDE. Don't have a wallet? We'll help you set one up—it's free and takes just 2 minutes!",
    icon: <Rocket className={iconClass} />,
    position: "center"
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  autoStart?: boolean;
}

export function OnboardingTour({ onComplete, autoStart = true }: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(autoStart);
  const router = useRouter();

  const currentStep = tourSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tourSteps.length - 1;
  const progress = ((currentStepIndex + 1) / tourSteps.length) * 100;

  useEffect(() => {
    // Prevent body scroll when tour is active
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      const nextStep = tourSteps[currentStepIndex + 1];
      if (nextStep.targetUrl && nextStep.targetUrl !== window.location.pathname) {
        router.push(nextStep.targetUrl);
      }
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem("vfide_tour_completed", "skipped");
    onComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem("vfide_tour_completed", "true");
    onComplete();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            onClick={handleSkip}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-[calc(100%-2rem)] max-w-lg sm:max-w-xl md:max-w-2xl"
          >
            <div className="bg-gradient-to-br from-[#2A2A2F] to-[#1A1A1D] border-2 border-[#00F0FF] rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1 bg-[#3A3A3F]">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00F0FF] to-[#0080FF]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-[#3A3A3F] flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#00F0FF]/10 rounded-xl flex items-center justify-center">
                    {currentStep.icon}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-[#F5F3E8] font-[family-name:var(--font-display)]">
                      {currentStep.title}
                    </h3>
                    <p className="text-sm text-[#A0A0A5]">
                      Step {currentStepIndex + 1} of {tourSteps.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-2 text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#3A3A3F] rounded-lg transition-colors"
                  aria-label="Skip tour"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-8">
                <p className="text-base sm:text-lg text-[#F5F3E8] leading-relaxed">
                  {currentStep.description}
                </p>

                {/* Special content for specific steps */}
                {currentStep.id === "get-started" && (
                  <div className="mt-6 p-4 bg-[#00F0FF]/10 border border-[#00F0FF] rounded-lg">
                    <p className="text-[#00F0FF] font-bold mb-2">Pro Tip:</p>
                    <p className="text-[#A0A0A5] text-sm">
                      After connecting your wallet, check out the Vault page to set up recovery options. 
                      This ensures you never lose access to your funds, even if you lose your wallet!
                    </p>
                  </div>
                )}

                {currentStep.id === "merchant-portal" && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-center">
                      <svg className="w-6 h-6 mx-auto mb-1 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      <div className="text-xs text-[#A0A0A5]">E-commerce</div>
                    </div>
                    <div className="p-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-center">
                      <svg className="w-6 h-6 mx-auto mb-1 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <div className="text-xs text-[#A0A0A5]">Retail Stores</div>
                    </div>
                    <div className="p-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-center">
                      <svg className="w-6 h-6 mx-auto mb-1 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <div className="text-xs text-[#A0A0A5]">Services</div>
                    </div>
                  </div>
                )}

                {currentStep.id === "vault-security" && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-[#1A1A1D] border border-[#50C878] rounded-lg">
                      <svg className="w-6 h-6 text-[#50C878] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      <div>
                        <div className="font-bold text-[#50C878] text-sm">Guardian Recovery</div>
                        <div className="text-xs text-[#A0A0A5]">Trusted friends/family help recover lost wallets</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#1A1A1D] border border-[#FFD700] rounded-lg">
                      <svg className="w-6 h-6 text-[#FFD700] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                      <div>
                        <div className="font-bold text-[#FFD700] text-sm">Next of Kin</div>
                        <div className="text-xs text-[#A0A0A5]">Designate an heir to inherit your vault</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Navigation */}
              <div className="p-6 border-t border-[#3A3A3F] flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="flex items-center gap-2 px-4 py-2 text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#3A3A3F] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={20} />
                  Previous
                </button>

                <div className="flex gap-2">
                  {tourSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStepIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStepIndex 
                          ? "bg-[#00F0FF] w-6" 
                          : index < currentStepIndex
                          ? "bg-[#50C878]"
                          : "bg-[#3A3A3F]"
                      }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] font-bold rounded-lg hover:scale-105 transition-transform"
                >
                  {isLastStep ? (
                    <>
                      Get Started <Check size={20} />
                    </>
                  ) : (
                    <>
                      Next <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
