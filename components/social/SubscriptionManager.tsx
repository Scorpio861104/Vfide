'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { Check, Sparkles, Crown, Zap, Star } from 'lucide-react';

/**
 * SubscriptionManager - Creator subscription management component
 * Allows users to subscribe to creators for ongoing access
 */

// Confetti particles for success
function SuccessConfetti() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 60,
    delay: Math.random() * 0.3,
    color: ['#9333EA', '#3B82F6', '#10B981', '#F59E0B'][Math.floor(Math.random() * 4)]
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ left: `${p.x}%`, top: '50%', backgroundColor: p.color }}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: -200, opacity: 0, scale: 0, x: (Math.random() - 0.5) * 100 }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

interface SubscriptionTier {
  duration: number; // days
  price: string; // ETH
  label: string;
  features: string[];
}

interface SubscriptionManagerProps {
  creatorAddress: string;
  creatorName: string;
  className?: string;
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    duration: 30,
    price: '0.05',
    label: 'Monthly',
    features: ['All premium content', 'Exclusive Discord access', 'Monthly Q&A sessions'],
  },
  {
    duration: 90,
    price: '0.12',
    label: 'Quarterly',
    features: ['All premium content', 'Exclusive Discord access', 'Monthly Q&A sessions', 'Early content access', '20% savings'],
  },
  {
    duration: 365,
    price: '0.40',
    label: 'Annual',
    features: ['All premium content', 'Exclusive Discord access', 'Monthly Q&A sessions', 'Early content access', '1-on-1 consultation', '33% savings'],
  },
];

export function SubscriptionManager({
  creatorAddress,
  creatorName,
  className = '',
}: SubscriptionManagerProps) {
  const { address: userAddress } = useAccount();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { playSuccess, playNotification, playError } = useTransactionSounds();

  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setSelectedTier(tier);
    setIsProcessing(true);

    try {
      // Calls subscribe on the creator's contract address directly.
      // Replace with a proper SubscriptionManager contract address once deployed.
      await writeContract({
        address: creatorAddress as `0x${string}`,
        abi: [
          {
            name: 'subscribe',
            type: 'function',
            stateMutability: 'payable',
            inputs: [{ name: 'duration', type: 'uint256' }],
            outputs: [],
          },
        ],
        functionName: 'subscribe',
        args: [BigInt(tier.duration)],
        value: parseEther(tier.price),
      });
    } catch (err) {
      console.error('Subscription failed:', err);
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    if (isSuccess) {
      setIsProcessing(false);
      setSelectedTier(null);
      setShowSuccess(true);
      playSuccess();
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [isSuccess, creatorName, playSuccess]);

  React.useEffect(() => {
    if (error) {
      setIsProcessing(false);
      playError();
      alert(`Subscription failed: ${error.message}`);
    }
  }, [error, playError]);

  return (
    <div className={`space-y-6 ${className} relative`}>
      {/* Success Celebration */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <SuccessConfetti />
              <motion.div
                className="text-8xl mb-4"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                🎉
              </motion.div>
              <p className="text-3xl font-bold text-white">Subscribed!</p>
              <p className="text-gray-300 mt-2">Welcome to the community</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.h2 
          className="text-2xl font-bold mb-2 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Crown className="w-6 h-6 text-purple-500" />
          Subscribe to {creatorName}
        </motion.h2>
        <p className="text-gray-600 dark:text-gray-400">
          Get exclusive access to premium content and perks
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {SUBSCRIPTION_TIERS.map((tier, tierIndex) => (
          <motion.div
            key={tier.duration}
            className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-6 relative overflow-hidden ${
              selectedTier?.duration === tier.duration
                ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            initial={{ opacity: 0, y: 30, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: tierIndex * 0.15, type: 'spring', stiffness: 200 }}
            whileHover={{ 
              scale: 1.03, 
              borderColor: 'rgb(147, 51, 234)',
              rotateY: selectedTier?.duration === tier.duration ? 0 : 3,
              transition: { duration: 0.2 }
            }}
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          >
            {/* Popular badge for annual */}
            {tier.duration === 365 && (
              <motion.div
                className="absolute -top-1 -right-8 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-10 py-1 rotate-45"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                BEST VALUE
              </motion.div>
            )}
            
            {/* Shimmer effect on selected */}
            {selectedTier?.duration === tier.duration && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            )}

            <div className="text-center mb-4 relative z-10">
              <motion.div
                className="inline-block mb-2"
                animate={tier.duration === 365 ? { rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                {tier.duration === 30 && <Zap className="w-8 h-8 text-blue-500 mx-auto" />}
                {tier.duration === 90 && <Star className="w-8 h-8 text-purple-500 mx-auto" />}
                {tier.duration === 365 && <Crown className="w-8 h-8 text-yellow-500 mx-auto" />}
              </motion.div>
              <h3 className="text-xl font-bold mb-2">{tier.label}</h3>
              <motion.div 
                className="flex items-baseline justify-center gap-1"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + tierIndex * 0.1 }}
              >
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-gray-500">ETH</span>
              </motion.div>
              <p className="text-sm text-gray-500 mt-1">{tier.duration} days</p>
            </div>

            <ul className="space-y-2 mb-6 relative z-10">
              {tier.features.map((feature, featureIndex) => (
                <motion.li 
                  key={featureIndex} 
                  className="flex items-start gap-2 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + tierIndex * 0.1 + featureIndex * 0.05 }}
                >
                  <motion.span 
                    className="text-green-500 mt-0.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + tierIndex * 0.1 + featureIndex * 0.05, type: 'spring' }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.span>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <motion.button
              onClick={() => {
                handleSubscribe(tier);
                playNotification();
              }}
              disabled={isProcessing || isConfirming}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium relative z-10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isProcessing && selectedTier?.duration === tier.duration ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  {isConfirming ? 'Confirming...' : 'Processing...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Subscribe
                </span>
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {!userAddress && (
          <motion.div 
            className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-yellow-800 dark:text-yellow-200">
              Connect your wallet to subscribe
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
