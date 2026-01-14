"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimpleVault } from "@/hooks/useSimpleVault";
import { Shield, Users, PenLine, CheckCircle } from "lucide-react";

interface Step {
  icon: ReactNode;
  title: string;
  description: string;
}

const iconClass = "w-10 h-10 text-[#50C878]";

export function GuardianWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [guardians, setGuardians] = useState(['', '', '']);
  const { executeVaultAction, userMessage, actionStatus } = useSimpleVault();

  const steps: Step[] = [
    {
      icon: <Shield className={iconClass} />,
      title: "What are Guardians?",
      description: "Guardians are like trusted friends who can help you if you lose access to your wallet. Think of them as your 'backup team' - they can help you recover your vault, but they CANNOT take your money.",
    },
    {
      icon: <Users className={iconClass} />,
      title: "Who should be a Guardian?",
      description: "Pick 3-5 people you really trust: family members, close friends, or your other wallets. They'll need a wallet address (it starts with 0x...).",
    },
    {
      icon: <PenLine className={iconClass} />,
      title: "Add your Guardians",
      description: "Enter their wallet addresses below. Don't worry if you make a mistake - you can always change them later!",
    },
    {
      icon: <CheckCircle className={iconClass} />,
      title: "Confirm & Setup",
      description: "Your vault will ask these people to be your guardians. If you ever lose your wallet, at least 3 of them can help you recover access.",
    },
  ];

  const handleAddGuardian = (index: number, value: string) => {
    const newGuardians = [...guardians];
    newGuardians[index] = value;
    setGuardians(newGuardians);
  };

  const handleSetupGuardians = async () => {
    const validGuardians = guardians.filter(g => g.startsWith('0x') && g.length === 42);
    if (validGuardians.length < 3) {
      alert('You need at least 3 guardians!');
      return;
    }

    // Encode guardian setup call via GuardianRegistry
    await executeVaultAction(
      'Setup Guardians',
      '0x...', // GuardianRegistry contract
      '0x...' // encoded setGuardians(addresses[])
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-[#2A2A2F] border-2 border-[#50C878] rounded-2xl p-8 max-w-2xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#A0A0A5] hover:text-[#F5F3E8] text-2xl"
        >
          ×
        </button>

        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-all ${
                index <= step ? "bg-[#50C878]" : "bg-[#3A3A3F]"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-[#50C878]/10 rounded-full border border-[#50C878]/30">
                {steps[step]?.icon}
              </div>
              <h2 className="text-3xl font-bold text-[#F5F3E8] mb-3 font-[family-name:var(--font-display)]">
                {steps[step]?.title}
              </h2>
              <p className="text-lg text-[#A0A0A5] leading-relaxed font-[family-name:var(--font-body)]">
                {steps[step]?.description}
              </p>
            </div>

            {step === 2 && (
              <div className="space-y-4 my-6">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index}>
                    <label className="block text-[#A0A0A5] text-sm mb-2 font-[family-name:var(--font-body)]">
                      Guardian #{index + 1} {index < 3 && <span className="text-[#FF4444]">*</span>}
                    </label>
                    <input
                      type="text"
                      value={guardians[index] || ''}
                      onChange={(e) => handleAddGuardian(index, e.target.value)}
                      placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                      className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#50C878] outline-none font-mono text-sm"
                    />
                  </div>
                ))}
                <div className="text-[#A0A0A5] text-xs text-center">
                  Need at least 3 guardians (marked with *)
                </div>
              </div>
            )}

            {userMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg mb-6 ${
                  actionStatus === 'success'
                    ? 'bg-[#50C878]/20 border border-[#50C878] text-[#50C878]'
                    : actionStatus === 'error'
                    ? 'bg-[#FF4444]/20 border border-[#FF4444] text-[#FF4444]'
                    : 'bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF]'
                }`}
              >
                {userMessage}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${
              step === 0
                ? "bg-[#3A3A3F] text-[#6A6A6F] cursor-not-allowed"
                : "bg-[#3A3A3F] text-[#F5F3E8] hover:bg-[#4A4A4F]"
            }`}
          >
            ← Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-linear-to-r from-[#50C878] to-[#40B868] text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSetupGuardians}
              disabled={actionStatus === 'confirming' || actionStatus === 'signing'}
              className="px-6 py-2 bg-linear-to-r from-[#50C878] to-[#40B868] text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionStatus === 'confirming' ? 'Setting up...' : 'Setup Guardians'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
