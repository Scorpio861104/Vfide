'use client';

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { Wallet, Smartphone, Link, Building2, PartyPopper } from "lucide-react";

interface Step {
  id: number;
  title: string;
  icon: ReactNode;
  description: string;
  action?: React.ReactNode;
}

const iconClass = "w-10 h-10 text-cyan-400";

export function BeginnerWizard({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWizard, setShowWizard] = useState(true);
  const { isConnected } = useAccount();

  const steps: Step[] = [
    {
      id: 1,
      icon: <Wallet className={iconClass} />,
      title: "What is a wallet?",
      description: "A wallet is like your digital piggy bank! It keeps your money safe and lets you pay for things online. You need one to use VFIDE.",
    },
    {
      id: 2,
      icon: <Smartphone className={iconClass} />,
      title: "Get a wallet (it's free!)",
      description: "We recommend MetaMask or Coinbase Wallet. They're easy to use, like having a bank app on your phone. Click a button below to install one.",
      action: (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-400 transition-all text-center"
          >
            Get MetaMask
          </a>
          <a
            href="https://www.coinbase.com/wallet/downloads"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-600 transition-all text-center"
          >
            Get Coinbase Wallet
          </a>
        </div>
      ),
    },
    {
      id: 3,
      icon: <Link className={iconClass} />,
      title: "Connect your wallet",
      description: "Now click 'Connect Wallet' at the top right. Your wallet will ask permission - click 'Yes' or 'Approve'. Don't worry, we can't take your money!",
    },
    {
      id: 4,
      icon: <Building2 className={iconClass} />,
      title: "Your vault is being created!",
      description: "VFIDE gives you a special vault (like a super-secure safe) that only YOU control. Even we can't open it! This keeps your money safer than a regular bank.",
    },
    {
      id: 5,
      icon: <PartyPopper className={iconClass} />,
      title: "You're all set!",
      description: "That's it! You can now receive payments, send money, and build your trust score. If you get stuck, click the '?' icons for help.",
    },
  ];

  const currentStepData = steps[currentStep];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowWizard(false);
      onComplete?.();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipWizard = () => {
    setShowWizard(false);
    onComplete?.();
  };

  if (!showWizard) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) skipWizard();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-800 border-2 border-cyan-400 rounded-2xl p-8 max-w-2xl w-full relative"
      >
        {/* Close Button */}
        <button
          onClick={skipWizard}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 text-2xl"
        >
          ×
        </button>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`h-2 flex-1 rounded-full transition-all ${
                index <= currentStep ? "bg-cyan-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-cyan-400/10 rounded-full border border-cyan-400/30">
                {currentStepData?.icon}
              </div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-3 font-(family-name:--font-display)">
                {currentStepData?.title}
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed font-(family-name:--font-body) max-w-xl mx-auto">
                {currentStepData?.description}
              </p>
            </div>

            {currentStepData?.action && (
              <div className="flex justify-center">{currentStepData?.action}</div>
            )}

            {/* Special message when wallet is connected */}
            {currentStep === 2 && isConnected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500 rounded-lg text-center"
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-emerald-500 font-bold">Wallet Connected!</div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-zinc-700">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              currentStep === 0
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                : "bg-zinc-700 text-zinc-100 hover:bg-zinc-700"
            }`}
          >
            ← Back
          </button>

          <div className="text-zinc-400 text-sm font-(family-name:--font-body)">
            Step {currentStep + 1} of {steps.length}
          </div>

          <button
            onClick={nextStep}
            className="px-6 py-2 bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 font-bold rounded-lg hover:shadow-lg hover:shadow-cyan-400/50 transition-all"
          >
            {currentStep === steps.length - 1 ? "Start Using VFIDE!" : "Next →"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
