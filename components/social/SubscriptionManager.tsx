'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

/**
 * SubscriptionManager - Creator subscription management component
 * Allows users to subscribe to creators for ongoing access
 */

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
      // In production, this would call the SubscriptionManager contract
      // For now, we'll simulate with a direct transfer
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
      alert(`Successfully subscribed to ${creatorName}!`);
    }
  }, [isSuccess, creatorName]);

  React.useEffect(() => {
    if (error) {
      setIsProcessing(false);
      alert(`Subscription failed: ${error.message}`);
    }
  }, [error]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Subscribe to {creatorName}</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Get exclusive access to premium content and perks
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {SUBSCRIPTION_TIERS.map((tier) => (
          <div
            key={tier.duration}
            className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-all ${
              selectedTier?.duration === tier.duration
                ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">{tier.label}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-gray-500">ETH</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{tier.duration} days</p>
            </div>

            <ul className="space-y-2 mb-6">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(tier)}
              disabled={isProcessing || isConfirming}
              className="w-full py-3 bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
            >
              {isProcessing && selectedTier?.duration === tier.duration
                ? isConfirming
                  ? 'Confirming...'
                  : 'Processing...'
                : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>

      {!userAddress && (
        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            Connect your wallet to subscribe
          </p>
        </div>
      )}
    </div>
  );
}
