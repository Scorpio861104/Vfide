'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original performance page

export function OverviewTab() {
  return (
    <div className="space-y-6">
      <motion.div
  key="overview"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="space-y-8"
  >
  <PerformanceMetricsGrid metrics={metrics} isLoading={isLoading} />

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-red-500/10 border border-red-500/20 rounded-lg p-6"
    >
    <p className="text-sm text-red-400 mb-2">Active Errors</p>
    <p className="text-3xl font-bold text-white">
    {errorStats.unresolvedCount}
    </p>
    </motion.div>

    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6"
    >
    <p className="text-sm text-cyan-400 mb-2">Active Users</p>
    <p className="text-3xl font-bold text-white">
    {analytics.activeUsers}
    </p>
    </motion.div>

    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="bg-green-500/10 border border-green-500/20 rounded-lg p-6"
    >
    <p className="text-sm text-green-400 mb-2">Avg Response Time</p>
    <p className="text-3xl font-bold text-white">
    {apiMetrics.length > 0
    ? (
    apiMetrics.reduce((sum, api) => sum + api.avgResponseTime, 0) /
    apiMetrics.length
    ).toFixed(0)
    : '0'}
    ms
    </p>
    </motion.div>
  </div>
  </motion.div>
    </div>
  );
}
