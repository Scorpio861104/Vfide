'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface FirstTimeUserBannerProps {
  storageKey?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

/**
 * Banner that shows helpful info to first-time users
 * Dismissible and remembers preference in localStorage
 */
export function FirstTimeUserBanner({
  storageKey = 'vfide_first_time_banner_dismissed',
  message = "Welcome to VFIDE Social! Connect with friends through encrypted messaging. Create a vault to unlock payment features.",
  actionText = "Learn More",
  onAction,
}: FirstTimeUserBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if user has dismissed before
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, 'true');
  };

  if (!isClient) return null;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative mb-6"
        >
          <div className="bg-linear-to-r from-[#00F0FF]/10 to-[#A78BFA]/10 border border-[#00F0FF]/30 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#0A0A0F]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#F5F3E8] leading-relaxed">
                  {message}
                </p>
                
                {onAction && actionText && (
                  <button
                    onClick={onAction}
                    className="mt-3 text-xs font-semibold text-[#00F0FF] hover:underline"
                  >
                    {actionText} →
                  </button>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
