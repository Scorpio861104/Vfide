'use client';

import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Enhanced Error Boundary with automatic error logging and recovery
 */
export class ErrorBoundary extends Component<Props, State> {
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
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // NOTE: Configure error monitoring service (e.g., Sentry, DataDog) via environment variable
      // Example with Sentry:
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
      // For now, errors are logged to console and can be captured by external monitoring tools
    }

    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary when specified props change
    if (this.state.hasError && this.props.resetOnPropsChange) {
      const shouldReset = this.props.resetOnPropsChange.some(
        (prop, index) => prop !== prevProps.resetOnPropsChange?.[index]
      );
      if (shouldReset) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1A1A1F] border border-[#2A2A2F] rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-[#F5F3E8] mb-2">Something went wrong</h1>
            <p className="text-sm text-[#6B6B78] mb-6">
              We encountered an unexpected error. Don&apos;t worry, your data is safe.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-[#0A0A0F] border border-[#2A2A2F] rounded-lg text-left overflow-auto max-h-48">
                <p className="text-xs font-mono text-red-400 mb-2">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-[#6B6B78] whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.resetError}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#00F0FF] hover:bg-[#00D8E6] text-[#0A0A0F] rounded-lg font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#2A2A3F] hover:bg-[#3A3A4F] text-[#F5F3E8] rounded-lg font-semibold transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simplified error boundary for smaller components
 */
export function SimpleErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Failed to load component</p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
