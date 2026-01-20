"use client";

import { useState, ReactNode, useEffect } from "react";
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

  const handleStepAction = (): void => {
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      // Cleanup any pending timers when component unmounts
    };
  }, []);

  return (
    <>
      {!showDemo && (
        <motion.button
          onClick={() => setShowDemo(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 px-6 py-3 bg-linear-to-r from-amber-400 to-orange-500 text-zinc-900 font-bold rounded-full shadow-lg hover:shadow-2xl transition-all z-40 flex items-center gap-2"
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
                  className="bg-zinc-800 border-2 border-amber-400 rounded-2xl p-8"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-amber-400 font-bold text-sm font-(family-name:--font-body)">
                      🎮 DEMO MODE
                    </div>
                    <button
                      onClick={() => setShowDemo(false)}
                      className="text-zinc-400 hover:text-zinc-100 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-cyan-400/10 rounded-full border border-cyan-400/30">
                      {steps[currentStep]?.icon}
                    </div>
                    <h2 className="text-3xl font-bold text-zinc-100 mb-3 font-(family-name:--font-display)">
                      {steps[currentStep]?.title}
                    </h2>
                    <p className="text-lg text-zinc-400 leading-relaxed font-(family-name:--font-body)">
                      {steps[currentStep]?.description}
                    </p>
                  </div>

                  <motion.button
                    onClick={handleStepAction}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-6 py-4 bg-linear-to-r from-amber-400 to-orange-500 text-zinc-900 font-bold rounded-lg text-lg hover:shadow-lg hover:shadow-amber-400/50 transition-all"
                  >
                    {steps[currentStep]?.action} →
                  </motion.button>

                  <div className="flex gap-2 mt-6">
                    {steps.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          index <= currentStep ? "bg-amber-400" : "bg-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Simulated Interface */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-8"
                >
                  <div className="text-zinc-400 text-sm mb-6 font-(family-name:--font-body)">
                    YOUR DEMO VAULT
                  </div>

                  {/* Demo Balance */}
                  <motion.div
                    animate={demoBalance > 0 ? { scale: [1, 1.1, 1] } : {}}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-4"
                  >
                    <div className="text-zinc-400 text-sm mb-2">Balance</div>
                    <div className="text-4xl font-bold text-cyan-400">
                      ${demoBalance.toFixed(2)}
                    </div>
                    <div className="text-zinc-400 text-sm mt-1">USDC</div>
                  </motion.div>

                  {/* Demo ProofScore */}
                  <motion.div
                    animate={demoProofScore > 650 ? { scale: [1, 1.1, 1] } : {}}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
                  >
                    <div className="text-zinc-400 text-sm mb-2">ProofScore</div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-amber-400">
                        {demoProofScore}
                      </div>
                      {demoProofScore > 650 && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-emerald-500 text-xl"
                        >
                          +10
                        </motion.div>
                      )}
                    </div>
                    <div className="text-zinc-400 text-sm mt-1">TRUSTED Tier</div>
                  </motion.div>

                  {/* Recent Activity */}
                  <div className="mt-6">
                    <div className="text-zinc-400 text-sm mb-3 font-(family-name:--font-body)">
                      RECENT ACTIVITY
                    </div>
                    <div className="space-y-2">
                      {demoBalance === 25 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-500/20 border border-emerald-500 rounded-lg p-3"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-emerald-500 font-bold text-sm">
                                Received
                              </div>
                              <div className="text-zinc-400 text-xs">
                                From: Friend&apos;s Wallet
                              </div>
                            </div>
                            <div className="text-emerald-500 font-bold">+$25.00</div>
                          </div>
                        </motion.div>
                      )}
                      {demoBalance === 10 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-cyan-400/20 border border-cyan-400 rounded-lg p-3"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-cyan-400 font-bold text-sm">
                                🍕 Sent
                              </div>
                              <div className="text-zinc-400 text-xs">
                                To: Pizza Shop
                              </div>
                            </div>
                            <div className="text-cyan-400 font-bold">-$15.00</div>
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
