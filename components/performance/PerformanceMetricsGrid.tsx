'use client';

import { motion } from 'framer-motion';
import {
  PerformanceMetric,
  getMetricTypeLabel,
  formatMetricValue,
} from '@/config/performance-dashboard';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface PerformanceMetricsGridProps {
  metrics: PerformanceMetric[];
  isLoading?: boolean;
}

export function PerformanceMetricsGrid({
  metrics,
  isLoading = false,
}: PerformanceMetricsGridProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 border-red-500/20';
      default:
        return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  if (isLoading) {
    return (
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-900 rounded-lg border border-slate-800 p-4 h-48 animate-pulse"
          />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {metrics.map((metric) => (
        <motion.div
          key={metric.id}
          variants={itemVariants}
          className={`rounded-lg border p-6 backdrop-blur-sm transition-all hover:shadow-lg ${getStatusBgColor(
            metric.status
          )}`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-400 mb-1">
                {getMetricTypeLabel(metric.type)}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {formatMetricValue(metric.value, metric.unit)}
                </span>
              </div>
            </div>
            {getStatusIcon(metric.status)}
          </div>

          {/* Thresholds */}
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Warning Threshold:</span>
              <span className="text-yellow-400 font-mono">
                {formatMetricValue(metric.threshold.warning, metric.unit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Critical Threshold:</span>
              <span className="text-red-400 font-mono">
                {formatMetricValue(metric.threshold.critical, metric.unit)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${
                metric.status === 'critical'
                  ? 'bg-red-500'
                  : metric.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (metric.value / metric.threshold.critical) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Timestamp */}
          <div className="mt-4 text-xs text-slate-500">
            {new Date(metric.timestamp).toLocaleTimeString()}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
