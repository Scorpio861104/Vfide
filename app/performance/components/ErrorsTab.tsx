'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original performance page

export function ErrorsTab() {
  return (
    <div className="space-y-6">
      <motion.div
  key="errors"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  >
  <ErrorTracker
    errors={errors}
    onResolveError={resolveError}
    onClearAll={clearErrors}
    onExport={handleExportErrors}
  />
  </motion.div>
    </div>
  );
}
