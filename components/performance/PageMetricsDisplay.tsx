'use client';

import { motion } from 'framer-motion';
import { PagePerformance, ApiPerformance } from '@/config/performance-dashboard';
import { Activity, Zap } from 'lucide-react';

interface PageMetricsDisplayProps {
  pageMetrics: PagePerformance | null;
  apiMetrics: ApiPerformance[];
  isLoading?: boolean;
}

export function PageMetricsDisplay({
  pageMetrics,
  apiMetrics,
  isLoading = false,
}: PageMetricsDisplayProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const getPerformanceColor = (time: number) => {
    if (time < 1000) return 'text-green-400';
    if (time < 3000) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <motion.div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-slate-900 rounded-lg border border-slate-800 p-6 h-32 animate-pulse" />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Page Metrics */}
      {pageMetrics && (
        <motion.div
          variants={itemVariants}
          className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Page Performance</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Page Load Time</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(pageMetrics.avgLoadTime)}`}>
                {pageMetrics.avgLoadTime.toFixed(0)}ms
              </p>
              <p className="text-xs text-slate-500 mt-1">Total time to load</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Time to Interactive</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(pageMetrics.avgInteractiveTime)}`}>
                {pageMetrics.avgInteractiveTime.toFixed(0)}ms
              </p>
              <p className="text-xs text-slate-500 mt-1">Time to interact</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">First Contentful Paint</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(pageMetrics.avgFirstContentfulPaint)}`}>
                {pageMetrics.avgFirstContentfulPaint.toFixed(0)}ms
              </p>
              <p className="text-xs text-slate-500 mt-1">First visual change</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Largest Contentful Paint</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(pageMetrics.avgLargestContentfulPaint)}`}>
                {pageMetrics.avgLargestContentfulPaint.toFixed(0)}ms
              </p>
              <p className="text-xs text-slate-500 mt-1">Largest element loaded</p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Total Errors Today</p>
              <p className="text-2xl font-bold text-red-400">
                {pageMetrics.totalErrors}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {pageMetrics.errorRate.toFixed(2)}% error rate
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-2">Avg Session Duration</p>
              <p className="text-2xl font-bold text-blue-400">
                {(pageMetrics.averageSessionDuration / 60000).toFixed(1)}m
              </p>
              <p className="text-xs text-slate-500 mt-1">Average time on page</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* API Metrics */}
      {apiMetrics.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">API Performance</h3>
          </div>

          <div className="space-y-3">
            {apiMetrics.slice(0, 5).map((api, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-800/50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {api.method} {api.endpoint}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {api.totalCalls} calls
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getPerformanceColor(api.avgResponseTime)}`}>
                      {api.avgResponseTime.toFixed(0)}ms
                    </p>
                    <p className="text-xs text-green-400">
                      {api.successRate.toFixed(1)}% success
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">p50</p>
                    <p className="text-white font-mono">
                      {api.p50ResponseTime.toFixed(0)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">p95</p>
                    <p className="text-white font-mono">
                      {api.p95ResponseTime.toFixed(0)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">p99</p>
                    <p className="text-white font-mono">
                      {api.p99ResponseTime.toFixed(0)}ms
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
