'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  RefreshCw, 
  MessageCircle, 
  ExternalLink,
  WifiOff,
  ServerCrash,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export type ErrorType = 'network' | 'contract' | 'permission' | 'validation' | 'server' | 'unknown';

interface EnhancedErrorDisplayProps {
  error: Error | string;
  type?: ErrorType;
  onRetry?: () => void | Promise<void>;
  onSupport?: () => void;
  showDetails?: boolean;
  context?: string;
}

/**
 * Enhanced error display with user-friendly messages and recovery actions
 * Converts technical errors into actionable guidance
 */
export function EnhancedErrorDisplay({
  error,
  type = 'unknown',
  onRetry,
  onSupport,
  showDetails = false,
  context,
}: EnhancedErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showTechnical, setShowTechnical] = useState(showDetails);

  const errorMessage = typeof error === 'string' ? error : error.message;
  const { title, description, icon, actions } = getErrorInfo(type, errorMessage, context);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A2E] border border-[#EF4444]/30 rounded-xl p-6"
    >
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mb-4">
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[#F5F3E8] mb-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[#A0A0A5] leading-relaxed max-w-md mb-6">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center mb-4">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#A78BFA] text-[#0A0A0F] font-semibold hover:shadow-lg hover:shadow-[#00F0FF]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
          )}

          {onSupport && (
            <button
              onClick={onSupport}
              className="px-6 py-2.5 rounded-xl bg-[#2A2A3F] text-[#F5F3E8] font-semibold hover:bg-[#3A3A4F] transition-colors flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Support
            </button>
          )}
        </div>

        {/* Suggested actions */}
        {actions.length > 0 && (
          <div className="w-full max-w-md bg-[#0A0A0F]/50 rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-[#A0A0A5] mb-3">What you can do:</p>
            <ul className="space-y-2 text-left">
              {actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-[#F5F3E8]">
                  <span className="text-[#00F0FF] mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical details toggle */}
        {errorMessage && (
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-xs text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors flex items-center gap-1"
          >
            {showTechnical ? 'Hide' : 'Show'} technical details
            <HelpCircle className="w-3 h-3" />
          </button>
        )}

        {/* Technical error message */}
        {showTechnical && errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 w-full max-w-md bg-[#0A0A0F] rounded-lg p-3 border border-[#2A2A3F]"
          >
            <pre className="text-xs text-[#A0A0A5] whitespace-pre-wrap break-words font-mono">
              {errorMessage}
            </pre>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Get user-friendly error information based on error type
 */
function getErrorInfo(type: ErrorType, message: string, context?: string) {
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (type === 'network' || lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return {
      title: 'Connection Problem',
      description: 'We couldn\'t reach the server. Please check your internet connection and try again.',
      icon: <WifiOff className="w-8 h-8" />,
      actions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Check if you\'re behind a firewall',
      ],
    };
  }

  // Contract/blockchain errors
  if (type === 'contract' || lowerMessage.includes('revert') || lowerMessage.includes('gas') || lowerMessage.includes('transaction')) {
    return {
      title: 'Transaction Failed',
      description: context || 'The blockchain transaction couldn\'t be completed. This might be due to insufficient funds, rejected signature, or network congestion.',
      icon: <ShieldAlert className="w-8 h-8" />,
      actions: [
        'Check your wallet balance',
        'Make sure you have enough for gas fees',
        'Try increasing the gas limit',
        'Confirm the transaction in your wallet',
      ],
    };
  }

  // Permission errors
  if (type === 'permission' || lowerMessage.includes('unauthorized') || lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
    return {
      title: 'Access Denied',
      description: 'You don\'t have permission to perform this action. This might require a higher ProofScore or special role.',
      icon: <ShieldAlert className="w-8 h-8" />,
      actions: [
        'Check your ProofScore level',
        'Connect the correct wallet',
        'Contact support if you believe this is an error',
      ],
    };
  }

  // Validation errors
  if (type === 'validation' || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return {
      title: 'Invalid Input',
      description: 'Some information is missing or incorrect. Please review your input and try again.',
      icon: <AlertTriangle className="w-8 h-8" />,
      actions: [
        'Check all required fields are filled',
        'Verify amounts and addresses',
        'Make sure values are in the correct format',
      ],
    };
  }

  // Server errors
  if (type === 'server' || lowerMessage.includes('500') || lowerMessage.includes('server')) {
    return {
      title: 'Server Error',
      description: 'Something went wrong on our end. Our team has been notified and is working on a fix.',
      icon: <ServerCrash className="w-8 h-8" />,
      actions: [
        'Try again in a few moments',
        'Check our status page for updates',
        'Contact support if the problem persists',
      ],
    };
  }

  // Default unknown error
  return {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem continues.',
    icon: <AlertTriangle className="w-8 h-8" />,
    actions: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try a different browser',
      'Contact support with the error details',
    ],
  };
}

/**
 * Inline error message for form fields
 */
export function InlineError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 mt-2 text-xs text-[#EF4444]"
    >
      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
      <span>{message}</span>
    </motion.div>
  );
}
