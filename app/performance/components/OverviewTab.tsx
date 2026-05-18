'use client';

import { motion } from 'framer-motion';
import { PerformanceMetricsGrid } from '@/components/performance/PerformanceMetricsGrid';

interface OverviewTabProps {
  metrics: any[];
  isLoading?: boolean;
  errorCount?: number;
  activeUsers?: number;
  apiMetrics?: Array<{ avgResponseTime: number }>;
}

export function OverviewTab({
  metrics,
  isLoading = false,
  errorCount = 0,
  activeUsers = 0,
  apiMetrics = [],
}: OverviewTabProps) {
  const averageResponse = apiMetrics.length
    ? apiMetrics.reduce((sum, api) => sum + api.avgResponseTime, 0) / apiMetrics.length
    : 0;

  return (
    <div className="space-y-6">
      <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        <PerformanceMetricsGrid metrics={metrics} isLoading={isLoading} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
            <p className="mb-2 text-sm text-red-400">Unresolved Error Queue</p>
            <p className="text-3xl font-bold text-white">{errorCount}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-6">
            <p className="mb-2 text-sm text-cyan-400">Live User Sessions</p>
            <p className="text-3xl font-bold text-white">{activeUsers}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-lg border border-green-500/20 bg-green-500/10 p-6">
            <p className="mb-2 text-sm text-green-400">Mean Response Time</p>
            <p className="text-3xl font-bold text-white">{averageResponse.toFixed(0)}ms</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
