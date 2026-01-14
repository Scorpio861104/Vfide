/**
 * useErrorTracking Hook
 * Centralized error logging and categorization
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { ErrorLog, ErrorCategory } from '@/config/performance-dashboard';

interface UseErrorTrackingResult {
  errors: ErrorLog[];
  errorStats: {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<'low' | 'medium' | 'high', number>;
    unresolvedCount: number;
  };
  addError: (error: Omit<ErrorLog, 'id' | 'timestamp'>) => void;
  resolveError: (errorId: string) => void;
  clearErrors: () => void;
  filterBySeverity: (severity: 'low' | 'medium' | 'high') => ErrorLog[];
  filterByCategory: (category: ErrorCategory) => ErrorLog[];
  exportErrors: (format: 'json' | 'csv') => string;
  searchErrors: (query: string) => ErrorLog[];
}

const STORAGE_KEY = 'error_logs_v1';
const MAX_ERRORS = 500;

export function useErrorTracking(): UseErrorTrackingResult {
  const [errors, setErrors] = useState<ErrorLog[]>([]);

  // Load errors from localStorage on mount with SSR safety
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setErrors(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('Failed to load error logs:', e);
    }
  }, []);

  // Save errors to localStorage whenever they change with SSR safety
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
    } catch (e) {
      console.error('Failed to save error logs:', e);
    }
  }, [errors]);

  // Add a new error log
  const addError = useCallback(
    (errorData: Omit<ErrorLog, 'id' | 'timestamp'>) => {
      const newError: ErrorLog = {
        ...errorData,
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      setErrors((prev) => {
        // Keep only the most recent MAX_ERRORS entries
        const updated = [newError, ...prev];
        return updated.slice(0, MAX_ERRORS);
      });

      // Also track globally for error tracking services
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vfide:error', { detail: newError })
        );
      }
    },
    []
  );

  // Resolve an error (mark as resolved)
  const resolveError = useCallback((errorId: string) => {
    setErrors((prev) =>
      prev.map((error) =>
        error.id === errorId ? { ...error, resolved: true } : error
      )
    );
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Filter by severity
  const filterBySeverity = useCallback(
    (severity: 'low' | 'medium' | 'high') => {
      return errors.filter((error) => error.severity === severity);
    },
    [errors]
  );

  // Filter by category
  const filterByCategory = useCallback(
    (category: ErrorCategory) => {
      return errors.filter((error) => error.category === category);
    },
    [errors]
  );

  // Search errors by message
  const searchErrors = useCallback(
    (query: string) => {
      const lower = query.toLowerCase();
      return errors.filter((error) =>
        error.message.toLowerCase().includes(lower)
      );
    },
    [errors]
  );

  // Export errors
  const exportErrors = useCallback(
    (format: 'json' | 'csv') => {
      if (format === 'json') {
        return JSON.stringify(errors, null, 2);
      } else {
        // CSV format
        const headers = [
          'ID',
          'Category',
          'Severity',
          'Message',
          'URL',
          'Timestamp',
          'Resolved',
        ];
        const rows = errors.map((error) => [
          error.id,
          error.category,
          error.severity,
          `"${error.message.replace(/"/g, '""')}"`,
          error.url,
          new Date(error.timestamp).toISOString(),
          error.resolved ? 'Yes' : 'No',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map((row) => row.join(',')),
        ].join('\n');

        return csv;
      }
    },
    [errors]
  );

  // Calculate statistics
  const errorStats = {
    total: errors.length,
    byCategory: Object.values(ErrorCategory).reduce(
      (acc, category) => ({
        ...acc,
        [category]: errors.filter((e) => e.category === category).length,
      }),
      {} as Record<ErrorCategory, number>
    ),
    bySeverity: {
      low: errors.filter((e) => e.severity === 'low').length,
      medium: errors.filter((e) => e.severity === 'medium').length,
      high: errors.filter((e) => e.severity === 'high').length,
    },
    unresolvedCount: errors.filter((e) => !e.resolved).length,
  };

  // Set up global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addError({
        category: ErrorCategory.CLIENT,
        message: event.message,
        stackTrace: event.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        severity: 'high',
        resolved: false,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addError({
        category: ErrorCategory.CLIENT,
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stackTrace: event.reason?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        severity: 'high',
        resolved: false,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
    return undefined;
  }, [addError]);

  return {
    errors,
    errorStats,
    addError,
    resolveError,
    clearErrors,
    filterBySeverity,
    filterByCategory,
    exportErrors,
    searchErrors,
  };
}
