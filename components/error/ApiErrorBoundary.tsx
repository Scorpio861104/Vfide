/**
 * API Error Boundary Component
 * 
 * Catches errors in API-related React components and provides
 * graceful fallback UI with error reporting.
 * 
 * Usage:
 * ```tsx
 * <ApiErrorBoundary>
 *   <YourComponent />
 * </ApiErrorBoundary>
 * ```
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { apiLogger } from '@/lib/logger.service';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    apiLogger.error('API Error Boundary caught error', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback or default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md">
            <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
            <p className="text-gray-300 text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Messaging Error Boundary
 * Specialized for messaging/social features
 */
export class MessagingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    apiLogger.error('Messaging Error Boundary caught error', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[300px] p-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 max-w-md text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-yellow-400 font-semibold mb-2">Messaging Temporarily Unavailable</h3>
            <p className="text-gray-300 text-sm mb-4">
              We're having trouble loading messages. Please try again.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Crypto Operations Error Boundary
 * Specialized for wallet/crypto operations
 */
export class CryptoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    apiLogger.error('Crypto Error Boundary caught error', {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[300px] p-4">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6 max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-purple-400 font-semibold mb-2">Transaction Error</h3>
            <p className="text-gray-300 text-sm mb-4">
              Unable to process the transaction. Your funds are safe.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
