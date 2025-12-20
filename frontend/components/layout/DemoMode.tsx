"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { DollarSign, TrendingUp, Rocket, PartyPopper } from "lucide-react";

interface DemoStep {
  title: string;
  description: string;
  action: string;
  icon: ReactNode;
}

const iconClass = "w-8 h-8";

export function DemoMode() {
  const [showDemo, setShowDemo] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [demoProofScore, setDemoProofScore] = useState(650);
  const [demoBalance, setDemoBalance] = useState(0);

  const steps: DemoStep[] = [
    {
      icon: <DollarSign className={`${iconClass} text-green-400`} />,
      title: "Someone sent you money!",
      description: "Your friend paid you 25 USDC for selling them a video game. Watch your balance go up!",
      action: "See Payment",
    },
    {
      icon: <TrendingUp className={`${iconClass} text-blue-400`} />,
      title: "Your ProofScore increased!",
      description: "Because you received a payment successfully, your trust score went up by 10 points. Higher scores = better rewards!",
      action: "Check Score",
    },
    {
      icon: <Rocket className={`${iconClass} text-purple-400`} />,
      title: "Now you send money!",
      description: "You want to buy pizza from a local shop. Sending 15 USDC is instant and costs you $0 in fees!",
      action: "Send Payment",
    },
    {
      icon: <PartyPopper className={`${iconClass} text-yellow-400`} />,
      title: "You're a pro!",
      description: "That's how easy VFIDE is! No banks, no waiting, no huge fees. Just instant payments that make your score better.",
      action: "Start for Real",
    },
  ];

  const handleStepAction = () => {
    if (currentStep === 0) {
      setDemoBalance(25);
    } else if (currentStep === 1) {
      setDemoProofScore(660);
    } else if (currentStep === 2) {
      setDemoBalance(10);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (currentStep === 3) {
      setShowDemo(false);
      // Trigger real onboarding
    }

    if (currentStep < steps.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 1000);
    }
  };

  return (
    <>
      {!showDemo && (
        <motion.button
          onClick={() => setShowDemo(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1A1A1D] font-bold rounded-full shadow-lg hover:shadow-2xl transition-all z-40 flex items-center gap-2"
        >
          <span className="text-xl">🎮</span>
          Try Demo Mode
        </motion.button>
      )}

      <AnimatePresence>
        {showDemo && (
          <>
            {showConfetti && (
              <Confetti
                width={window.innerWidth}
                height={window.innerHeight}
                recycle={false}
                numberOfPieces={500}
              />
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tutorial Panel */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-[#2A2A2F] border-2 border-[#FFD700] rounded-2xl p-8"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-[#FFD700] font-bold text-sm font-[family-name:var(--font-body)]">
                      🎮 DEMO MODE
                    </div>
                    <button
                      onClick={() => setShowDemo(false)}
                      className="text-[#A0A0A5] hover:text-[#F5F3E8] text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-[#00F0FF]/10 rounded-full border border-[#00F0FF]/30">
                      {steps[currentStep].icon}
                    </div>
                    <h2 className="text-3xl font-bold text-[#F5F3E8] mb-3 font-[family-name:var(--font-display)]">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-lg text-[#A0A0A5] leading-relaxed font-[family-name:var(--font-body)]">
                      {steps[currentStep].description}
                    </p>
                  </div>

                  <motion.button
                    onClick={handleStepAction}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1A1A1D] font-bold rounded-lg text-lg hover:shadow-lg hover:shadow-[#FFD700]/50 transition-all"
                  >
                    {steps[currentStep].action} →
                  </motion.button>

                  <div className="flex gap-2 mt-6">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          index <= currentStep ? "bg-[#FFD700]" : "bg-[#3A3A3F]"
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Simulated Interface */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-[#1A1A1D] border-2 border-[#3A3A3F] rounded-2xl p-8"
                >
                  <div className="text-[#A0A0A5] text-sm mb-6 font-[family-name:var(--font-body)]">
                    YOUR DEMO VAULT
                  </div>

                  {/* Demo Balance */}
                  <motion.div
                    animate={demoBalance > 0 ? { scale: [1, 1.1, 1] } : {}}
                    className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 mb-4"
                  >
                    <div className="text-[#A0A0A5] text-sm mb-2">Balance</div>
                    <div className="text-4xl font-bold text-[#00F0FF]">
                      ${demoBalance.toFixed(2)}
                    </div>
                    <div className="text-[#A0A0A5] text-sm mt-1">USDC</div>
                  </motion.div>

                  {/* Demo ProofScore */}
                  <motion.div
                    animate={demoProofScore > 650 ? { scale: [1, 1.1, 1] } : {}}
                    className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6"
                  >
                    <div className="text-[#A0A0A5] text-sm mb-2">ProofScore</div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-[#FFD700]">
                        {demoProofScore}
                      </div>
                      {demoProofScore > 650 && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[#50C878] text-xl"
                        >
                          +10
                        </motion.div>
                      )}
                    </div>
                    <div className="text-[#A0A0A5] text-sm mt-1">TRUSTED Tier</div>
                  </motion.div>

                  {/* Recent Activity */}
                  <div className="mt-6">
                    <div className="text-[#A0A0A5] text-sm mb-3 font-[family-name:var(--font-body)]">
                      RECENT ACTIVITY
                    </div>
                    <div className="space-y-2">
                      {demoBalance === 25 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#50C878]/20 border border-[#50C878] rounded-lg p-3"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-[#50C878] font-bold text-sm">
                                Received
                              </div>
                              <div className="text-[#A0A0A5] text-xs">
                                From: Friend&apos;s Wallet
                              </div>
                            </div>
                            <div className="text-[#50C878] font-bold">+$25.00</div>
                          </div>
                        </motion.div>
                      )}
                      {demoBalance === 10 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-[#00F0FF]/20 border border-[#00F0FF] rounded-lg p-3"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-[#00F0FF] font-bold text-sm">
                                🍕 Sent
                              </div>
                              <div className="text-[#A0A0A5] text-xs">
                                To: Pizza Shop
                              </div>
                            </div>
                            <div className="text-[#00F0FF] font-bold">-$15.00</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
