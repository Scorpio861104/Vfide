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
          <div className="bg-linear-to-r from-cyan-400/10 to-violet-400/10 border border-cyan-400/30 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-zinc-950" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 leading-relaxed">
                  {message}
                </p>
                
                {onAction && actionText && (
                  <button
                    onClick={onAction}
                    className="mt-3 text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    {actionText} →
                  </button>
                )}
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
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
