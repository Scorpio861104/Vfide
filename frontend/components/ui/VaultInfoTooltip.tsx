'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { analytics } from '@/lib/socialAnalytics';

interface VaultInfoTooltipProps {
  trigger?: 'hover' | 'click';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip that explains what a vault is and why users might want one
 * Used in social features to educate users about vault benefits
 */
export function VaultInfoTooltip({ 
  trigger = 'hover',
  position = 'bottom' 
}: VaultInfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
      analytics.track('vault_info_viewed', { feature: 'tooltip' });
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsOpen(false);
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsOpen(!isOpen);
      if (!isOpen) {
        analytics.track('vault_info_viewed', { feature: 'tooltip' });
      }
    }
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className="p-1 rounded-full hover:bg-[#2A2A3F] transition-colors"
        aria-label="What is a vault?"
      >
        <HelpCircle className="w-4 h-4 text-[#A0A0A5]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'bottom' ? -10 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'bottom' ? -10 : 10 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${positionClasses[position]} w-80 z-50`}
          >
            <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-4 shadow-xl">
              {/* Close button for click trigger */}
              {trigger === 'click' && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-[#2A2A3F] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-[#A0A0A5]" />
                </button>
              )}

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#F5F3E8] flex items-center gap-2">
                  <span className="text-lg">🔐</span>
                  What is a Vault?
                </h4>
                
                <p className="text-xs text-[#A0A0A5] leading-relaxed">
                  A vault is your personal smart contract wallet that holds your crypto assets securely 
                  while giving you advanced features like programmable payments and automated transactions.
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#00F0FF]">With a vault, you can:</p>
                  <ul className="text-xs text-[#A0A0A5] space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-[#50C878] mt-0.5">✓</span>
                      <span>Send crypto payments directly in messages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#50C878] mt-0.5">✓</span>
                      <span>Request payments from friends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#50C878] mt-0.5">✓</span>
                      <span>Access advanced DeFi features</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#50C878] mt-0.5">✓</span>
                      <span>Automate recurring transactions</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-[#2A2A2F]">
                  <p className="text-xs text-[#6B6B78]">
                    <span className="font-semibold text-[#F5F3E8]">Note:</span> You can still use all 
                    social features (messaging, friends, groups) with just your wallet connection. 
                    The vault is only needed for payment features.
                  </p>
                </div>

                <a
                  href="/vault"
                  className="block w-full text-center py-2 px-3 bg-gradient-to-r from-[#00F0FF] to-[#A78BFA] text-[#0A0A0F] font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity"
                >
                  Create Vault →
                </a>
              </div>

              {/* Tooltip arrow */}
              <div 
                className={`absolute w-3 h-3 bg-[#1A1A2E] border-[#3A3A4F] transform rotate-45 ${
                  position === 'bottom' ? 'border-t border-l -top-1.5 left-1/2 -translate-x-1/2' :
                  position === 'top' ? 'border-b border-r -bottom-1.5 left-1/2 -translate-x-1/2' :
                  position === 'right' ? 'border-t border-l -left-1.5 top-1/2 -translate-y-1/2' :
                  'border-b border-r -right-1.5 top-1/2 -translate-y-1/2'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
