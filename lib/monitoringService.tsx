/**
 * Performance and Error Monitoring Service
 * Tracks component render times, errors, and user interactions
 */

import React from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  props?: Record<string, unknown>;
}

interface ErrorLog {
  componentName: string;
  error: Error;
  errorInfo?: React.ErrorInfo;
  timestamp: number;
  context?: Record<string, unknown>;
}

interface UserInteraction {
  action: string;
  component: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class MonitoringService {
  private static instance: MonitoringService;
  private performanceMetrics: PerformanceMetric[] = [];
  private errorLogs: ErrorLog[] = [];
  private userInteractions: UserInteraction[] = [];
  private readonly MAX_METRICS = 100;
  private readonly MAX_ERRORS = 50;
  private readonly MAX_INTERACTIONS = 200;

  private constructor() {
    if (typeof window !== 'undefined') {
      // Log service initialization
      // MonitoringService initialized
      
      // Report metrics periodically (every 5 minutes)
      setInterval(() => this.generateReport(), 5 * 60 * 1000);
    }
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Track component render performance
   */
  trackPerformance(componentName: string, renderTime: number, props?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;

    this.performanceMetrics.push({
      componentName,
      renderTime,
      timestamp: Date.now(),
      props,
    });

    // Keep only last N metrics
    if (this.performanceMetrics.length > this.MAX_METRICS) {
      this.performanceMetrics.shift();
    }

    // Warn on slow renders (>100ms)
    if (renderTime > 100) {
      logger.warn(
        `[MonitoringService] Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`,
        props
      );
    }
  }

  /**
   * Track errors
   */
  trackError(componentName: string, error: Error, errorInfo?: React.ErrorInfo, context?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;

    const errorLog: ErrorLog = {
      componentName,
      error,
      errorInfo,
      timestamp: Date.now(),
      context,
    };

    this.errorLogs.push(errorLog);

    if (this.errorLogs.length > this.MAX_ERRORS) {
      this.errorLogs.shift();
    }

    logger.error(`[MonitoringService] Error in ${componentName}:`, error, { ...context, componentStack: errorInfo?.componentStack ?? undefined });
  }

  /**
   * Track user interactions
   */
  trackInteraction(action: string, component: string, metadata?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;

    this.userInteractions.push({
      action,
      component,
      timestamp: Date.now(),
      metadata,
    });

    if (this.userInteractions.length > this.MAX_INTERACTIONS) {
      this.userInteractions.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) {
      return null;
    }

    const componentStats: Record<string, { count: number; avgTime: number; maxTime: number; minTime: number }> = {};

    this.performanceMetrics.forEach(metric => {
      if (!componentStats[metric.componentName]) {
        componentStats[metric.componentName] = {
          count: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity,
        };
      }

      const stats = componentStats[metric.componentName]!;
      stats.count++;
      stats.avgTime = (stats.avgTime * (stats.count - 1) + metric.renderTime) / stats.count;
      stats.maxTime = Math.max(stats.maxTime, metric.renderTime);
      stats.minTime = Math.min(stats.minTime, metric.renderTime);
    });

    return componentStats;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    if (this.errorLogs.length === 0) {
      return null;
    }

    const errorsByComponent: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    this.errorLogs.forEach(log => {
      errorsByComponent[log.componentName] = (errorsByComponent[log.componentName] || 0) + 1;
      errorsByType[log.error.name] = (errorsByType[log.error.name] || 0) + 1;
    });

    return {
      total: this.errorLogs.length,
      byComponent: errorsByComponent,
      byType: errorsByType,
      recent: this.errorLogs.slice(-5),
    };
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats() {
    if (this.userInteractions.length === 0) {
      return null;
    }

    const actionCounts: Record<string, number> = {};
    const componentCounts: Record<string, number> = {};

    this.userInteractions.forEach(interaction => {
      actionCounts[interaction.action] = (actionCounts[interaction.action] || 0) + 1;
      componentCounts[interaction.component] = (componentCounts[interaction.component] || 0) + 1;
    });

    return {
      total: this.userInteractions.length,
      byAction: actionCounts,
      byComponent: componentCounts,
      recent: this.userInteractions.slice(-10),
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const performance = this.getPerformanceStats();
    const errors = this.getErrorStats();
    const interactions = this.getInteractionStats();

    const report = {
      timestamp: new Date().toISOString(),
      performance,
      errors,
      interactions,
      environment: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: navigator.connection?.effectiveType || 'unknown',
      },
    };

    // Performance report generated - send to analytics service in production
    
    return report;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.performanceMetrics = [];
    this.errorLogs = [];
    this.userInteractions = [];
    // All metrics cleared
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return {
      performance: this.performanceMetrics,
      errors: this.errorLogs,
      interactions: this.userInteractions,
    };
  }
}

export const monitoring = MonitoringService.getInstance();

/**
 * React hook for component performance tracking
 */
export function usePerformanceTracking(componentName: string, props?: Record<string, unknown>) {
  React.useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      monitoring.trackPerformance(componentName, renderTime, props);
    };
  }, [componentName, props]);
}

/**
 * React hook for interaction tracking
 */
export function useInteractionTracking(componentName: string) {
  const trackClick = React.useCallback((action: string, metadata?: Record<string, unknown>) => {
    monitoring.trackInteraction(action, componentName, metadata);
  }, [componentName]);

  return { trackClick };
}

/**
 * Higher-order component for automatic performance tracking
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const startTime = performance.now();

    React.useEffect(() => {
      return () => {
        const renderTime = performance.now() - startTime;
        monitoring.trackPerformance(name, renderTime, props as Record<string, unknown>);
};
    }, [props]);

    return <Component {...props} />;
  });
  
  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}
