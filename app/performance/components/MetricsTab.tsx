'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original performance page

export function MetricsTab() {
  return (
    <div className="space-y-6">
      <motion.div
  key="metrics"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  >
  <PerformanceMetricsGrid metrics={metrics} isLoading={isLoading} />
  </motion.div>
    </div>
  );
}
