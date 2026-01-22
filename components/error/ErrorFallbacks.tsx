'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Wallet, CreditCard, MessageSquare, Vote, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

// ==================== TYPES ====================

export interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

// ==================== BASE FALLBACK ====================

function BaseFallback({
  error,
  reset,
  icon: Icon,
  title,
  description,
  actions,
}: ErrorFallbackProps & {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-500/20 rounded-xl shrink-0">
          <Icon className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-red-400 mb-1">{title}</h3>
          <p className="text-red-400/80 text-sm mb-4">{description}</p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4">
              <summary className="text-red-400 text-xs cursor-pointer hover:text-red-300">
                Error Details
              </summary>
              <pre className="mt-2 p-3 bg-red-500/10 rounded-lg text-red-400 text-xs overflow-auto max-h-40 font-mono">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== FEATURE-SPECIFIC FALLBACKS ====================

/**
 * Error fallback for wallet connection errors
 */
export function WalletErrorFallback({ error, reset }: ErrorFallbackProps) {
  const handleReconnect = () => {
    // Clear any cached wallet state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wagmi.wallet');
      localStorage.removeItem('wagmi.connected');
    }
    reset();
  };

  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={Wallet}
      title="Wallet Connection Error"
      description={error.message || 'Failed to connect to your wallet. Please try reconnecting.'}
      actions={
        <>
          <button
            onClick={handleReconnect}
            className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Reconnect Wallet
          </button>
          <Link
            href="/"
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Go Home
          </Link>
        </>
      }
    />
  );
}

/**
 * Error fallback for transaction-related errors
 */
export function TransactionErrorFallback({ error, reset }: ErrorFallbackProps) {
  const isUserRejection = error.message?.toLowerCase().includes('user rejected') ||
    error.message?.toLowerCase().includes('user denied');

  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={CreditCard}
      title={isUserRejection ? 'Transaction Cancelled' : 'Transaction Error'}
      description={
        isUserRejection
          ? 'You cancelled the transaction. Click retry to try again.'
          : error.message || 'Failed to process the transaction. Please try again.'
      }
      actions={
        <Link
          href="/explorer"
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          View History
        </Link>
      }
    />
  );
}

/**
 * Error fallback for dashboard/analytics errors
 */
export function DashboardErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={LayoutDashboard}
      title="Dashboard Error"
      description={error.message || 'Failed to load dashboard data. Please refresh.'}
      actions={
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Page
        </button>
      }
    />
  );
}

/**
 * Error fallback for social/messaging features
 */
export function SocialErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={MessageSquare}
      title="Social Feature Error"
      description={error.message || 'Failed to load social features. Please try again.'}
      actions={
        <Link
          href="/feed"
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back to Feed
        </Link>
      }
    />
  );
}

/**
 * Error fallback for merchant/commerce features
 */
export function MerchantErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={CreditCard}
      title="Merchant Portal Error"
      description={error.message || 'Failed to load merchant features. Please try again.'}
      actions={
        <Link
          href="/dashboard"
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Back to Dashboard
        </Link>
      }
    />
  );
}

/**
 * Error fallback for governance features
 */
export function GovernanceErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={Vote}
      title="Governance Error"
      description={error.message || 'Failed to load governance features. Please try again.'}
      actions={
        <Link
          href="/governance"
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Refresh Governance
        </Link>
      }
    />
  );
}

/**
 * Generic section error fallback
 */
export function SectionErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <BaseFallback
      error={error}
      reset={reset}
      icon={AlertTriangle}
      title="Section Error"
      description={error.message || "This section encountered an error and couldn't be displayed."}
    />
  );
}

// ==================== EXPORT MAP ====================

export const ErrorFallbacks = {
  wallet: WalletErrorFallback,
  transaction: TransactionErrorFallback,
  dashboard: DashboardErrorFallback,
  social: SocialErrorFallback,
  merchant: MerchantErrorFallback,
  governance: GovernanceErrorFallback,
  section: SectionErrorFallback,
};

export default ErrorFallbacks;
