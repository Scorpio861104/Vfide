'use client';

/**
 * Wallet Error Boundary
 * 
 * Catches errors in wallet components and provides graceful fallback
 * Prevents wallet issues from crashing the entire application
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { log } from '@/lib/logging';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    log.error('Wallet component error caught by boundary', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Optional: Send to error monitoring service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackMessage = 'Wallet component encountered an error' } = this.props;

      return (
        <div 
          className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-xl border border-red-500/30"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Wallet Error</h3>
              <p className="text-sm text-zinc-400">{fallbackMessage}</p>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="w-full mb-4 p-3 bg-zinc-800/50 rounded-lg text-xs">
              <summary className="cursor-pointer text-zinc-400 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-red-400 overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            aria-label="Try again to load wallet component"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Try Again</span>
          </button>

          <p className="mt-4 text-xs text-zinc-500">
            If this problem persists, try refreshing the page or reconnecting your wallet.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use in function components
export function withWalletErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage?: string
) {
  return function WalletComponentWithErrorBoundary(props: P) {
    return (
      <WalletErrorBoundary fallbackMessage={fallbackMessage}>
        <Component {...props} />
      </WalletErrorBoundary>
    );
  };
}
