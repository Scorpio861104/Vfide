'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original performance page

export function PagesTab() {
  return (
    <div className="space-y-6">
      <motion.div
  key="pages"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  >
  <PageMetricsDisplay
    pageMetrics={pageMetrics}
    apiMetrics={apiMetrics}
    isLoading={isLoading}
  />
  </motion.div>
    </div>
  );
}
