'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Check, Loader2, AlertCircle } from 'lucide-react';

type ConnectionStep = 'idle' | 'opening' | 'approving' | 'connecting' | 'switching' | 'connected' | 'error';

interface StepInfo {
  label: string;
  sublabel: string;
}

const STEP_INFO: Record<ConnectionStep, StepInfo> = {
  idle: { label: 'Ready', sublabel: 'Click to connect' },
  opening: { label: 'Opening Wallet', sublabel: 'Check your wallet extension' },
  approving: { label: 'Approve Connection', sublabel: 'Confirm in your wallet' },
  connecting: { label: 'Connecting', sublabel: 'Establishing connection...' },
  switching: { label: 'Switching Network', sublabel: 'Confirm network change' },
  connected: { label: 'Connected', sublabel: 'Ready to use' },
  error: { label: 'Connection Failed', sublabel: 'Please try again' },
};

/**
 * Visual connection progress indicator
 * Shows users exactly what step they're on and what to do
 */
export function ConnectionProgress({ 
  isVisible = false,
  onClose 
}: { 
  isVisible?: boolean;
  onClose?: () => void;
}) {
  const { isConnecting, isReconnecting, isConnected } = useAccount();
  const [step, setStep] = useState<ConnectionStep>('idle');
  const [_showSuccess, setShowSuccess] = useState(false);

  // Track connection state changes
  useEffect(() => {
    if (isConnecting || isReconnecting) {
      setStep('approving');
    } else if (isConnected && step !== 'idle') {
      setStep('connected');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose?.();
      }, 1500);
    }
  }, [isConnecting, isReconnecting, isConnected, step, onClose]);

  // Reset on hide
  useEffect(() => {
    if (!isVisible) {
      setStep('idle');
    } else if (isVisible && step === 'idle') {
      setStep('opening');
    }
  }, [isVisible, step]);

  const stepInfo = STEP_INFO[step];
  const isLoading = ['opening', 'approving', 'connecting', 'switching'].includes(step);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 p-6 bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl"
          >
            {/* Progress indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                {step === 'connected' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center"
                  >
                    <Check className="text-green-400" size={32} />
                  </motion.div>
                ) : step === 'error' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center"
                  >
                    <AlertCircle className="text-red-400" size={32} />
                  </motion.div>
                ) : isLoading ? (
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="text-cyan-400" size={32} />
                    </motion.div>
                  </div>
                ) : null}

                {/* Pulse effect for loading */}
                {isLoading && (
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-cyan-500/20 rounded-full"
                  />
                )}
              </div>
            </div>

            {/* Status text */}
            <div className="text-center mb-6">
              <motion.h3
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-semibold text-white mb-1"
              >
                {stepInfo.label}
              </motion.h3>
              <motion.p
                key={`${step}-sub`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-zinc-400"
              >
                {stepInfo.sublabel}
              </motion.p>
            </div>

            {/* Progress steps */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {['opening', 'approving', 'connected'].map((s, i) => {
                const stepOrder = ['idle', 'opening', 'approving', 'connecting', 'switching', 'connected'];
                const currentIndex = stepOrder.indexOf(step);
                const thisIndex = stepOrder.indexOf(s);
                const isCompleted = currentIndex > thisIndex;
                const isCurrent = s === step || (s === 'approving' && step === 'connecting');

                return (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isCompleted
                          ? 'bg-green-400'
                          : isCurrent
                          ? 'bg-cyan-400'
                          : 'bg-zinc-600'
                      }`}
                    />
                    {i < 2 && (
                      <div
                        className={`w-8 h-0.5 transition-colors ${
                          isCompleted ? 'bg-green-400' : 'bg-zinc-600'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cancel button */}
            {step !== 'connected' && (
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
