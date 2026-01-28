/**
 * Error Monitoring Provider Component
 * 
 * Initializes error monitoring and provides context to the app.
 */

'use client';

import { errorMonitor, ErrorReport } from '@/lib/errorMonitoring';
import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';

// Add type for statistics
interface ErrorStatistics {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byFingerprint: Record<string, number>;
  recentErrors: ErrorReport[];
}

export function ErrorMonitoringProvider() {
  const { address } = useAccount();

  useEffect(() => {
    // Set user ID when wallet is connected
    if (address) {
      errorMonitor.setUserId(address);
    }

    // Log initialization in development
    if (process.env.NODE_ENV === 'development') {
      // Error monitoring initialized

      // Add listener to log errors in development
      const unsubscribe = errorMonitor.onError((error) => {
        if (error.severity === 'critical' || error.severity === 'high') {
          console.error('🚨 Error detected:', error);
        }
      });

      return unsubscribe;
    }
    return undefined;
  }, [address]);

  // No UI, just monitoring initialization
  return null;
}

/**
 * Development Error Console Component
 * Shows errors in development mode
 */
export function DevErrorConsole() {
  const [errors, setErrors] = React.useState<ErrorReport[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [stats, setStats] = React.useState<ErrorStatistics | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Update errors periodically
    const interval = setInterval(() => {
      setErrors(errorMonitor.getErrors({ limit: 50 }));
      setStats(errorMonitor.getStatistics());
    }, 2000);

    // Listen for new errors
    const unsubscribe = errorMonitor.onError(() => {
      setErrors(errorMonitor.getErrors({ limit: 50 }));
      setStats(errorMonitor.getStatistics());
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-9999">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
      >
        <span className="font-bold">⚠️ {errors.length}</span>
        <span className="text-sm">Errors</span>
      </button>

      {/* Error Console */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-full sm:w-150 max-w-[calc(100vw-1rem)] max-h-125 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">Error Console</h3>
              <p className="text-gray-400 text-xs">
                {stats?.total} total • {stats?.bySeverity?.critical || 0} critical
              </p>
            </div>
            <button
              onClick={() => errorMonitor.clearErrors()}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Errors List */}
          <div className="overflow-y-auto max-h-100">
            {errors.map((error) => (
              <div
                key={error.id}
                className={`px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 ${
                  error.severity === 'critical'
                    ? 'border-l-4 border-l-red-500'
                    : error.severity === 'high'
                    ? 'border-l-4 border-l-orange-500'
                    : error.severity === 'medium'
                    ? 'border-l-4 border-l-yellow-500'
                    : 'border-l-4 border-l-blue-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        {error.type}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          error.severity === 'critical'
                            ? 'text-red-400'
                            : error.severity === 'high'
                            ? 'text-orange-400'
                            : error.severity === 'medium'
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {error.severity}
                      </span>
                    </div>
                    <p className="text-white text-sm font-medium wrap-break-word">
                      {error.message}
                    </p>
                    {error.context?.componentName && (
                      <p className="text-gray-400 text-xs mt-1">
                        in {error.context.componentName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-gray-300 mt-1 overflow-x-auto bg-black/30 p-2 rounded">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
