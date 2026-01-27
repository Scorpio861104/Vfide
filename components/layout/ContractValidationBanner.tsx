/**
 * Contract Validation Banner
 * 
 * Displays a warning banner when smart contracts are not properly configured.
 * Provides actionable guidance for users to set up their environment.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { validateContractAddresses, getContractErrorMessage } from '@/lib/validation';
import { logger } from '@/lib/logging';

export function ContractValidationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [validation, setValidation] = useState<ReturnType<typeof validateContractAddresses> | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this session
    const sessionDismissed = sessionStorage.getItem('contract-warning-dismissed');
    if (sessionDismissed) {
      setDismissed(true);
      return;
    }

    // Validate contracts
    const result = validateContractAddresses(CONTRACT_ADDRESSES);
    setValidation(result);

    // Show banner if contracts are missing
    if (!result.isValid) {
      setShowBanner(true);
      logger.warn('Contract validation failed', {
        missing: result.missingContracts.length,
        configured: result.configuredContracts,
        total: result.totalContracts,
      });
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem('contract-warning-dismissed', 'true');
  };

  if (!validation || validation.isValid || dismissed) {
    return null;
  }

  const errorMessage = getContractErrorMessage(
    validation.missingContracts.length,
    validation.totalContracts
  );

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-orange-500/30 backdrop-blur-sm"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Warning Icon & Message */}
              <div className="flex items-center gap-3 flex-1">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-100">
                    {errorMessage}
                  </p>
                  <p className="text-xs text-orange-200/80 mt-0.5">
                    {validation.configuredContracts} of {validation.totalContracts} contracts configured
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/setup"
                  className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Setup Guide
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-orange-200 hover:text-orange-100 transition-colors"
                  aria-label="Dismiss warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
