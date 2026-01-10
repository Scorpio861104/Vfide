/**
 * Premium Content Gate
 * 
 * Token-gated content with payment integration.
 * Users can unlock exclusive posts, articles, and group access.
 */

'use client';

import { useWallet } from '@/lib/crypto';
import { usePremiumContent } from '@/lib/socialPayments';
import { motion } from 'framer-motion';
import { Check, Loader, Lock, Unlock } from 'lucide-react';
import React from 'react';

interface PremiumContentGateProps {
  contentId: string;
  contentType: 'post' | 'article' | 'premium_content' | 'group_access';
  price: string;
  currency: 'ETH' | 'VFIDE';
  sellerAddress: string;
  sellerName: string;
  children: React.ReactNode;
  preview?: React.ReactNode;
  className?: string;
}

export function PremiumContentGate({
  contentId,
  contentType,
  price,
  currency,
  sellerAddress,
  sellerName,
  children,
  preview,
  className = '',
}: PremiumContentGateProps) {
  const { wallet, isConnected } = useWallet();
  const { hasAccess, isChecking, isPurchasing, purchase } = usePremiumContent(
    contentId,
    wallet?.address
  );

  const handlePurchase = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      await purchase(contentType, price, currency, sellerAddress);
      alert(`Successfully unlocked ${contentType}! 🎉`);
    } catch {
      alert('Failed to purchase content. Please try again.');
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'post':
        return 'Premium Post';
      case 'article':
        return 'Article';
      case 'premium_content':
        return 'Premium Content';
      case 'group_access':
        return 'Group Access';
      default:
        return 'Content';
    }
  };

  // Show loading state
  if (isChecking) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-[#1A1A1F]/80 backdrop-blur-lg rounded-xl border border-[#2A2A2F] flex items-center justify-center z-10">
          <div className="text-center">
            <Loader className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-[#A0A0A5]">Checking access...</p>
          </div>
        </div>
        {preview || children}
      </div>
    );
  }

  // Show unlocked content
  if (hasAccess) {
    return (
      <div className={`relative ${className}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 z-10"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
            <Unlock className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">Unlocked</span>
          </div>
        </motion.div>
        {children}
      </div>
    );
  }

  // Show locked content with purchase option
  return (
    <div className={`relative ${className}`}>
      {/* Locked Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-[#1A1A1F]/60 via-[#1A1A1F]/80 to-[#1A1A1F]/95 backdrop-blur-md rounded-xl border-2 border-purple-500/20 flex items-center justify-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-md"
        >
          {/* Lock Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 bg-linear-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20"
          >
            <Lock className="w-10 h-10 text-white" />
          </motion.div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-[#F5F3E8] mb-2">
            {getContentTypeLabel()}
          </h3>
          <p className="text-[#A0A0A5] mb-6">
            Unlock exclusive content from {sellerName}
          </p>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {[
              'Full access to premium content',
              'Support the creator directly',
              'Instant access after payment',
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3 text-sm text-[#D0D0D8]"
              >
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-purple-400" />
                </div>
                <span>{feature}</span>
              </motion.div>
            ))}
          </div>

          {/* Price */}
          <div className="bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl p-4 mb-6">
            <div className="text-sm text-[#6B6B78] mb-1">Price</div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-3xl font-bold text-[#F5F3E8]">{price}</span>
              <span className="text-xl font-medium text-purple-400">{currency}</span>
            </div>
            {wallet && (
              <div className="text-xs text-[#6B6B78] mt-2">
                Your balance: {currency === 'ETH' ? wallet.balance : wallet.tokenBalance}{' '}
                {currency}
              </div>
            )}
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={!isConnected || isPurchasing}
            className="w-full py-4 bg-linear-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95"
          >
            {isPurchasing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Unlocking...</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                <span>Unlock Now</span>
              </>
            )}
          </button>

          {!isConnected && (
            <p className="text-xs text-yellow-400 mt-4">
              Connect your wallet to unlock content
            </p>
          )}
        </motion.div>
      </div>

      {/* Preview Content (blurred) */}
      <div className="filter blur-sm pointer-events-none">
        {preview || children}
      </div>
    </div>
  );
}

/**
 * Premium Badge - Shows that content is premium
 */
export function PremiumBadge({ price, currency, className = '' }: { price: string; currency: 'ETH' | 'VFIDE'; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-linear-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full ${className}`}>
      <Lock className="w-3 h-3 text-purple-400" />
      <span className="text-xs font-bold text-purple-400">
        {price} {currency}
      </span>
    </div>
  );
}
