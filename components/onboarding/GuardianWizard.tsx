'use client';

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { encodeFunctionData } from "viem";
import { useSimpleVault } from "@/hooks/useSimpleVault";
import { useVaultHub } from "@/hooks/useVaultHub";
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from "@/lib/contracts";
import GuardianRegistryABI from "@/lib/abis/GuardianRegistry.json";
import { Shield, Users, PenLine, CheckCircle } from "lucide-react";

interface Step {
  icon: ReactNode;
  title: string;
  description: string;
}

const iconClass = "w-10 h-10 text-emerald-500";

export function GuardianWizard({ onClose, onComplete }: { onClose: () => void; onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [guardians, setGuardians] = useState(['', '', '']);
  const { executeVaultAction, userMessage, actionStatus } = useSimpleVault();
  const { vaultAddress } = useVaultHub();
  const isGuardianRegistryAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.GuardianRegistry)

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
      description: "Your vault will ask these people to be your guardians. If you ever lose your wallet, at least 2 of them can help you recover access.",
    },
  ];

  const handleAddGuardian = (index: number, value: string) => {
    const newGuardians = [...guardians];
    newGuardians[index] = value;
    setGuardians(newGuardians);
  };

  const handleSetupGuardians = async () => {
    const validGuardians = guardians.filter(g => g.startsWith('0x') && g.length === 42);
    if (validGuardians.length < 2) {
      alert('You need at least 2 guardians!');
      return;
    }

    // Encode guardian setup: call addGuardian for each valid guardian address
    const guardianRegistryAddress = CONTRACT_ADDRESSES.GuardianRegistry;
    if (!isGuardianRegistryAvailable) {
      alert('Guardian registry contract not configured.');
      return;
    }
    if (!vaultAddress) {
      alert('No vault found. Please create a vault first.');
      return;
    }

    for (const guardian of validGuardians) {
      const callData = encodeFunctionData({
        abi: GuardianRegistryABI,
        functionName: 'addGuardian',
        args: [vaultAddress, guardian as `0x${string}`],
      });
      await executeVaultAction(
        `Add Guardian ${guardian.slice(0, 6)}…`,
        guardianRegistryAddress,
        callData
      );
    }

    if (onComplete) {
      onComplete();
    }
    onClose();
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
        className="bg-zinc-800 border-2 border-emerald-500 rounded-2xl p-8 max-w-2xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 text-2xl"
        >
          ×
        </button>

        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-all ${
                index <= step ? "bg-emerald-500" : "bg-zinc-700"
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
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-emerald-500/10 rounded-full border border-emerald-500/30">
                {steps[step]?.icon}
              </div>
              <h2 className="text-3xl font-bold text-zinc-100 mb-3 font-(family-name:--font-display)">
                {steps[step]?.title}
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed font-(family-name:--font-body)">
                {steps[step]?.description}
              </p>
            </div>

            {step === 2 && (
              <div className="space-y-4 my-6">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index}>
                    <label className="block text-zinc-400 text-sm mb-2 font-(family-name:--font-body)">
                      Guardian #{index + 1} {index < 2 && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={guardians[index] || ''}
                      onChange={(e) =>  handleAddGuardian(index, e.target.value)}
                     
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-emerald-500 outline-none font-mono text-sm"
                    />
                  </div>
                ))}
                <div className="text-zinc-400 text-xs text-center">
                  Need at least 2 guardians (marked with *)
                </div>
              </div>
            )}

            {userMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg mb-6 ${
                  actionStatus === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-500'
                    : actionStatus === 'error'
                    ? 'bg-red-500/20 border border-red-500 text-red-500'
                    : 'bg-cyan-400/20 border border-cyan-400 text-cyan-400'
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
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                : "bg-zinc-700 text-zinc-100 hover:bg-zinc-700"
            }`}
          >
            ← Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSetupGuardians}
              disabled={actionStatus === 'confirming' || actionStatus === 'signing'}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionStatus === 'confirming' ? 'Setting up...' : 'Setup Guardians'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
