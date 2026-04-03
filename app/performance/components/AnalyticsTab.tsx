'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original performance page

export function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <motion.div
  key="analytics"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  >
  <UserAnalyticsDashboard analytics={analytics} />
  </motion.div>
    </div>
  );
}
